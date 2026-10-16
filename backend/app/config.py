from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ folder (this file is backend/app/config.py, so go up two levels)
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """All backend settings, read from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8")

    # LiveKit (required - the app refuses to start without them)
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: SecretStr

    # Razorpay (test keys while developing: rzp_test_...)
    razorpay_key_id: str
    razorpay_key_secret: SecretStr

    # OpenAI (reads photos of grocery lists)
    openai_api_key: SecretStr
    openai_vision_model: str = "gpt-4.1-mini"

    # Optional, with defaults
    cors_origins: list[str] = ["http://localhost:3000"]
    data_dir: Path = BACKEND_DIR.parent / "frontend" / "data"


@lru_cache
def get_settings() -> Settings:
    """Reads the settings once and reuses them afterwards."""
    return Settings()
