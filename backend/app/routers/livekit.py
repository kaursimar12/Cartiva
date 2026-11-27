import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends
from livekit import api
from pydantic import BaseModel

from app.catalog import resolve_brand
from app.config import Settings, get_settings

router = APIRouter(prefix="/api/livekit", tags=["livekit"])


class TokenRequest(BaseModel):
    """Which storefront the voice session is for. Optional: older clients send no body (default brand)."""

    brand: str | None = None


class TokenResponse(BaseModel):
    """What the browser needs to join a voice session."""

    token: str
    url: str
    room_name: str
    identity: str


@router.post("/token")
def create_token(
    settings: Annotated[Settings, Depends(get_settings)],
    body: Annotated[TokenRequest | None, Body()] = None,
) -> TokenResponse:
    """Creates a new private room for one shopping voice session and a pass to join it.

    The token also dispatches the voice agent and tells it which storefront this call is for
    (job metadata), so one deployed agent can serve every brand.
    """
    brand = resolve_brand(body.brand if body else None)
    room_name = f"{brand}-{uuid.uuid4().hex[:8]}"
    identity = f"shopper-{uuid.uuid4().hex[:8]}"

    token = (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret.get_secret_value())
        .with_identity(identity)
        .with_name("Shopper")
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .with_room_config(
            api.RoomConfiguration(
                agents=[
                    api.RoomAgentDispatch(
                        agent_name=settings.cartiva_agent_name,
                        metadata=json.dumps({"brand": brand}),
                    )
                ]
            )
        )
        .to_jwt()
    )

    return TokenResponse(token=token, url=settings.livekit_url, room_name=room_name, identity=identity)
