"""Voice input processing routes."""

import base64
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant
from ..services.gemini_client import SarvamClient, get_sarvam_client
from ..services.intent_classifier import IntentClassifier

router = APIRouter()


class VoiceRequest(BaseModel):
    """Voice input request."""
    audio_base64: str = Field(..., description="Base64 encoded audio data")
    format: str = Field(default="wav", description="Audio format (wav, mp3, webm)")
    language: str = Field(default="hi-IN", description="Language code")
    session_id: Optional[UUID] = None


class VoiceResponse(BaseModel):
    """Voice processing response."""
    transcription: str
    language_detected: str
    confidence: float
    chat_response: Optional[dict] = None


class TTSRequest(BaseModel):
    """Text-to-speech request."""
    text: str = Field(..., description="Text to synthesize into speech")
    language: str = Field(default="hi-IN", description="Target language code")
    speaker: str = Field(default="meera", description="Speaker voice name")


class TTSResponse(BaseModel):
    """Text-to-speech response."""
    audio_base64: str = Field(..., description="Base64 encoded audio data")
    format: str = Field(default="wav", description="Audio format")
    language: str = Field(..., description="Language code used for synthesis")


@router.post("/transcribe", response_model=VoiceResponse)
async def transcribe_voice(
    request: VoiceRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
    sarvam: SarvamClient = Depends(get_sarvam_client),
):
    """
    Transcribe voice input and optionally process as chat.
    Uses Sarvam AI Saaras V3 STT in production, with Whisper and mock fallbacks.
    """
    merchant = await get_merchant_from_token(authorization, db)

    # Decode base64 audio
    try:
        audio_data = base64.b64decode(request.audio_base64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 audio data",
        )

    # Transcribe using Sarvam STT > Whisper > Mock fallback
    transcription = await transcribe_audio(audio_data, request.language, request.format)

    # Process transcription through chat if session provided
    chat_response = None
    if request.session_id and transcription:
        # Classify intent
        classifier = IntentClassifier()
        intent_result = classifier.classify(transcription)

        # Generate response using Sarvam AI
        # We need to construct conversation history or context,
        # but for now we'll pass empty history as voice is usually one-off or short context
        response_text, action = await sarvam.generate_response(
            message=transcription,
            intent=intent_result,
            merchant_context={
                "name": merchant.name,
                "business_name": merchant.business_name,
                "upi_id": merchant.upi_id,
            },
            conversation_history=[],
        )

        chat_response = {
            "message": response_text,
            "action": action,
            "intent": intent_result.intent if intent_result else None,
        }

    return VoiceResponse(
        transcription=transcription,
        language_detected=request.language,
        confidence=0.95,  # Mock confidence
        chat_response=chat_response,
    )


async def transcribe_audio(audio_data: bytes, language: str, format: str = "wav") -> str:
    """
    Transcribe audio using available STT service.
    Priority: Sarvam AI Saaras V3 > Whisper API > Mock fallback.
    In production, set SARVAM_API_KEY or WHISPER_API_KEY env var.
    """
    import os
    import logging

    logger = logging.getLogger(__name__)

    # Try Sarvam AI Saaras V3 Speech-to-Text (primary)
    sarvam_key = settings.sarvam_api_key
    if sarvam_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sarvam.ai/speech-to-text",
                    headers={"api-subscription-key": sarvam_key},
                    files={"file": ("audio.wav", audio_data, f"audio/{format}")},
                    data={"language_code": language, "model": "saaras:v3"},
                    timeout=30.0,
                )
                if response.status_code == 200:
                    result = response.json()
                    transcript = result.get("transcript", "")
                    if transcript:
                        logger.info("Sarvam STT transcription successful")
                        return transcript
            logger.warning("Sarvam STT returned no results, falling back to Whisper")
        except Exception as e:
            logger.warning(f"Sarvam STT failed: {e}, falling back to Whisper")

    # Try OpenAI Whisper API (fallback)
    whisper_key = os.environ.get("WHISPER_API_KEY") or getattr(settings, "whisper_api_key", None)
    if whisper_key:
        try:
            import tempfile

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(audio_data)
                temp_path = f.name

            async with httpx.AsyncClient() as client:
                with open(temp_path, "rb") as audio_file:
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {whisper_key}"},
                        files={"file": ("audio.wav", audio_file, "audio/wav")},
                        data={"model": "whisper-1", "language": language[:2]},
                        timeout=30.0,
                    )
                    if response.status_code == 200:
                        return response.json().get("text", "")
            logger.warning("Whisper API returned no results, falling back to mock")
        except Exception as e:
            logger.warning(f"Whisper API failed: {e}, falling back to mock")
        finally:
            import os as _os
            try:
                _os.unlink(temp_path)
            except Exception:
                pass

    # Mock fallback for development
    logger.info(f"Using mock transcription for language: {language}")
    mock_responses = {
        "hi-IN": [
            "पेमेंट लिंक बनाओ",
            "आज की कमाई बताओ",
            "राम को पांच सौ रुपये भेजो",
            "नया प्रोडक्ट जोड़ो",
            "मेरा QR कोड दिखाओ",
            "राजू का पांच सौ लिखो",
            "सभी कर्मचारियों की सैलरी भेजो",
        ],
        "en-IN": [
            "Create a payment link",
            "Show today's collection",
            "Send 500 rupees to Ram",
            "Add new product",
            "Show my QR code",
            "Write Raju's 500 in khaata",
            "Process all salaries",
        ],
        "ta-IN": [
            "பணம் அனுப்பு",
            "இன்றைய வருமானம் காட்டு",
            "QR குறியீடு காட்டு",
        ],
        "te-IN": [
            "పేమెంట్ లింక్ సృష్టించు",
            "నేటి సంపాదన చూపించు",
            "QR కోడ్ చూపించు",
        ],
        "mr-IN": [
            "पेमेंट लिंक बनवा",
            "आजचे उत्पन्न दाखवा",
            "QR कोड दाखवा",
        ],
    }

    import random
    responses = mock_responses.get(language, mock_responses["en-IN"])
    return random.choice(responses)


@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest):
    """
    Synthesize text to speech using Sarvam AI Bulbul V3 TTS.
    Returns base64 encoded audio data.
    """
    import logging

    logger = logging.getLogger(__name__)

    sarvam_key = settings.sarvam_api_key
    if sarvam_key:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sarvam.ai/text-to-speech",
                    headers={
                        "Content-Type": "application/json",
                        "api-subscription-key": sarvam_key,
                    },
                    json={
                        "inputs": [request.text],
                        "target_language_code": request.language,
                        "speaker": request.speaker,
                        "model": "bulbul:v2",
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    result = response.json()
                    audios = result.get("audios", [])
                    if audios:
                        logger.info("Sarvam TTS synthesis successful")
                        return TTSResponse(
                            audio_base64=audios[0],
                            format="wav",
                            language=request.language,
                        )
            logger.warning("Sarvam TTS returned no audio data")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="TTS service returned no audio data",
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Sarvam TTS failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"TTS service error: {str(e)}",
            )

    # Mock fallback when no API key is configured
    logger.info("Using mock TTS response (no SARVAM_API_KEY configured)")
    return TTSResponse(
        audio_base64="",
        format="wav",
        language=request.language,
    )


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported voice input languages and TTS speakers."""
    return {
        "languages": [
            {"code": "hi-IN", "name": "Hindi", "native_name": "हिंदी"},
            {"code": "en-IN", "name": "English (India)", "native_name": "English"},
            {"code": "ta-IN", "name": "Tamil", "native_name": "தமிழ்"},
            {"code": "te-IN", "name": "Telugu", "native_name": "తెలుగు"},
            {"code": "mr-IN", "name": "Marathi", "native_name": "मराठी"},
            {"code": "bn-IN", "name": "Bengali", "native_name": "বাংলা"},
            {"code": "gu-IN", "name": "Gujarati", "native_name": "ગુજરાતી"},
            {"code": "kn-IN", "name": "Kannada", "native_name": "ಕನ್ನಡ"},
            {"code": "ml-IN", "name": "Malayalam", "native_name": "മലയാളം"},
            {"code": "or-IN", "name": "Odia", "native_name": "ଓଡ଼ିଆ"},
            {"code": "pa-IN", "name": "Punjabi", "native_name": "ਪੰਜਾਬੀ"},
            {"code": "as-IN", "name": "Assamese", "native_name": "অসমীয়া"},
        ],
        "tts_speakers": [
            {"id": "meera", "name": "Meera", "gender": "female", "description": "Default female voice"},
            {"id": "pavithra", "name": "Pavithra", "gender": "female", "description": "Female voice"},
            {"id": "kalpana", "name": "Kalpana", "gender": "female", "description": "Female voice"},
            {"id": "kore", "name": "Kore", "gender": "male", "description": "Male voice"},
            {"id": "arvind", "name": "Arvind", "gender": "male", "description": "Male voice"},
        ],
    }
