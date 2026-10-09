import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from livekit import api
from pydantic import BaseModel

from app.config import Settings, get_settings

router = APIRouter(prefix="/api/livekit", tags=["livekit"])


class TokenResponse(BaseModel):
    """What the browser needs to join a voice session."""

    token: str
    url: str
    room_name: str
    identity: str


@router.post("/token")
def create_token(settings: Annotated[Settings, Depends(get_settings)]) -> TokenResponse:
    """Creates a new private room for one shopping voice session and a pass to join it."""
    room_name = f"cartiva-{uuid.uuid4().hex[:8]}"
    identity = f"shopper-{uuid.uuid4().hex[:8]}"

    token = (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret.get_secret_value())
        .with_identity(identity)
        .with_name("Shopper")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )

    return TokenResponse(token=token, url=settings.livekit_url, room_name=room_name, identity=identity)
