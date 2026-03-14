"""Sarvam AI Translation Service using Mayura model."""

import logging
from typing import Optional

import httpx

from shared.config import settings

logger = logging.getLogger(__name__)

# Language code mapping (short code -> Sarvam BCP-47)
LANG_CODE_MAP = {
    "en": "en-IN", "hi": "hi-IN", "ta": "ta-IN", "te": "te-IN",
    "mr": "mr-IN", "bn": "bn-IN", "gu": "gu-IN", "kn": "kn-IN",
    "ml": "ml-IN", "od": "od-IN", "pa": "pa-IN", "as": "as-IN",
}


class SarvamTranslationService:
    """Translation service using Sarvam AI Mayura model."""

    TRANSLATE_URL = "https://api.sarvam.ai/translate"
    TRANSLITERATE_URL = "https://api.sarvam.ai/transliterate"

    def __init__(self):
        self.api_key = settings.sarvam_api_key
        self.headers = {
            "Content-Type": "application/json",
            "api-subscription-key": self.api_key or "",
        }

    async def translate(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "en",
        mode: str = "formal",
    ) -> str:
        """Translate text using Sarvam Mayura."""
        if not self.api_key:
            logger.warning("Sarvam API key not set, returning original text")
            return text

        source_code = LANG_CODE_MAP.get(source_lang, source_lang)
        target_code = LANG_CODE_MAP.get(target_lang, target_lang)

        if source_code == target_code:
            return text

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TRANSLATE_URL,
                    headers=self.headers,
                    json={
                        "input": text,
                        "source_language_code": source_code,
                        "target_language_code": target_code,
                        "model": settings.sarvam_translate_model,
                        "mode": mode,
                        "enable_preprocessing": True,
                        "numerals_format": "international",
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    return response.json().get("translated_text", text)
                logger.error(f"Translation failed: {response.status_code} {response.text}")
        except Exception as e:
            logger.error(f"Translation error: {e}")

        return text

    async def transliterate(
        self,
        text: str,
        source_lang: str = "hi",
        target_lang: str = "en",
        spoken_form: bool = False,
    ) -> str:
        """Transliterate text between scripts."""
        if not self.api_key:
            return text

        source_code = LANG_CODE_MAP.get(source_lang, source_lang)
        target_code = LANG_CODE_MAP.get(target_lang, target_lang)

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TRANSLITERATE_URL,
                    headers=self.headers,
                    json={
                        "input": text,
                        "source_language_code": source_code,
                        "target_language_code": target_code,
                        "numerals_format": "international",
                        "spoken_form": spoken_form,
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    return response.json().get("transliterated_text", text)
        except Exception as e:
            logger.error(f"Transliteration error: {e}")

        return text

    async def translate_for_notification(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "en",
    ) -> str:
        """Translate notifications with modern-colloquial mode for natural feel."""
        return await self.translate(text, target_lang, source_lang, mode="modern-colloquial")


# Singleton
_translation_service: Optional[SarvamTranslationService] = None


async def get_translation_service() -> SarvamTranslationService:
    global _translation_service
    if _translation_service is None:
        _translation_service = SarvamTranslationService()
    return _translation_service
