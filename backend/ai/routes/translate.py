"""Translation routes using Sarvam AI."""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..services.translation import SarvamTranslationService, get_translation_service, LANG_CODE_MAP

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str = Field(..., max_length=1000)
    target_lang: str
    source_lang: str = "en"
    mode: str = "formal"


class TranslateBatchRequest(BaseModel):
    texts: Dict[str, str] = Field(..., description="Key-value pairs to translate")
    target_lang: str
    source_lang: str = "en"


class TransliterateRequest(BaseModel):
    text: str = Field(..., max_length=1000)
    source_lang: str = "hi"
    target_lang: str = "en"
    spoken_form: bool = False


@router.post("/translate")
async def translate_text(
    request: TranslateRequest,
    svc: SarvamTranslationService = Depends(get_translation_service),
):
    result = await svc.translate(
        text=request.text,
        target_lang=request.target_lang,
        source_lang=request.source_lang,
        mode=request.mode,
    )
    return {"translated_text": result, "target_lang": request.target_lang}


@router.post("/translate/batch")
async def translate_batch(
    request: TranslateBatchRequest,
    svc: SarvamTranslationService = Depends(get_translation_service),
):
    import asyncio
    results = {}

    async def _translate_one(key: str, text: str):
        results[key] = await svc.translate(text, request.target_lang, request.source_lang)

    tasks = [_translate_one(k, v) for k, v in request.texts.items()]
    await asyncio.gather(*tasks)
    return {"translations": results}


@router.post("/transliterate")
async def transliterate_text(
    request: TransliterateRequest,
    svc: SarvamTranslationService = Depends(get_translation_service),
):
    result = await svc.transliterate(
        text=request.text,
        source_lang=request.source_lang,
        target_lang=request.target_lang,
        spoken_form=request.spoken_form,
    )
    return {"transliterated_text": result}


@router.get("/translate/languages")
async def get_supported_languages():
    return {
        "languages": [
            {"code": k, "sarvam_code": v, "name": name}
            for k, v, name in [
                ("en", "en-IN", "English"), ("hi", "hi-IN", "Hindi"),
                ("ta", "ta-IN", "Tamil"), ("te", "te-IN", "Telugu"),
                ("mr", "mr-IN", "Marathi"), ("bn", "bn-IN", "Bengali"),
                ("gu", "gu-IN", "Gujarati"), ("kn", "kn-IN", "Kannada"),
                ("ml", "ml-IN", "Malayalam"), ("od", "od-IN", "Odia"),
                ("pa", "pa-IN", "Punjabi"), ("as", "as-IN", "Assamese"),
            ]
        ]
    }
