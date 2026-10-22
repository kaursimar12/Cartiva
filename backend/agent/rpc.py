"""The agent's side of the RPC bridge: calls methods registered in the shopper's browser."""

import json
import logging
from typing import Any

from livekit import rtc
from livekit.agents import get_job_context

logger = logging.getLogger("cartiva-agent.rpc")

RPC_TIMEOUT_SECONDS = 8.0  # browser actions now wait until the page is on screen (up to ~4.5 s)


class BrowserRpcError(Exception):
    """The shopper's browser could not be reached, or the method failed."""


async def call_browser(method: str, payload: dict[str, Any] | None = None) -> Any:
    """Calls an RPC method in the shopper's browser (e.g. "cart.get") and returns its JSON result."""
    room = get_job_context().room

    # The shopper is the only "standard" participant in the room (the agent is an "agent" participant).
    shopper = next(
        (p for p in room.remote_participants.values() if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD),
        None,
    )
    if shopper is None:
        raise BrowserRpcError("The shopper's browser is not connected.")

    try:
        raw = await room.local_participant.perform_rpc(
            destination_identity=shopper.identity,
            method=method,
            payload=json.dumps(payload or {}),
            response_timeout=RPC_TIMEOUT_SECONDS,
        )
    except rtc.RpcError as error:
        logger.warning("rpc %s failed: %s", method, error.message)
        raise BrowserRpcError(error.message) from error

    logger.info("rpc %s ok", method)
    return json.loads(raw)
