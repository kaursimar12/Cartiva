"""Reads a photo of a shopping list (handwritten or printed) with an OpenAI vision model."""

import base64
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from openai import OpenAI, OpenAIError
from pydantic import BaseModel

from app.catalog import get_brand
from app.config import Settings, get_settings

router = APIRouter(prefix="/api/list", tags=["shopping list"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_ITEMS = 50

PROMPT_TEMPLATE = """You read photos of {kind} shopping lists (handwritten or printed; English, Hindi or Hinglish).
Return every {kind} item on the list. For each item:
- name: the product in simple English, singular, as a shop would call it
  (e.g. {examples}). Translate Hindi,
  e.g. {hindi}.
- quantity: the number written for the item, or null if there is none.
- unit: the unit written ("kg", "g", "l", "ml", "dozen", "pack", "piece"), or null.
- original: the item text exactly as written.
Ignore crossed-out items, prices, dates, totals and anything that is not a {kind} item.
If the image is not a shopping list, return an empty list."""


def build_prompt(brand: dict) -> str:
    """The vision prompt for one storefront: its kind of items and its own product examples (brand.json)."""
    scan = brand["listScan"]
    return PROMPT_TEMPLATE.format(
        kind=scan["itemKind"],
        examples=", ".join(f'"{name}"' for name in scan["examples"]),
        hindi=scan["hindiExamples"],
    )


class ScannedItem(BaseModel):
    name: str
    quantity: float | None
    unit: str | None
    original: str


class ScannedList(BaseModel):
    items: list[ScannedItem]


def get_openai_client(settings: Annotated[Settings, Depends(get_settings)]) -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key.get_secret_value())


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


@router.post("/scan")
def scan_list(
    image: Annotated[UploadFile, File(description="Photo of a grocery list (JPEG, PNG or WebP, max 5 MB)")],
    settings: Annotated[Settings, Depends(get_settings)],
    client: Annotated[OpenAI, Depends(get_openai_client)],
    brand: Annotated[str | None, Form(description="Storefront the list is for; default brand when left out")] = None,
) -> ScannedList:
    """Turns a photo of a shopping list into a structured list. Matching to products happens in the browser."""
    prompt = build_prompt(get_brand(brand))  # unknown brand → 400 before the photo is even read
    if image.content_type not in ALLOWED_TYPES:
        raise _error(415, "UNSUPPORTED_IMAGE", "Please upload a JPEG, PNG or WebP photo.")

    data = image.file.read(MAX_IMAGE_BYTES + 1)  # read at most 1 byte more than allowed
    if not data:
        raise _error(400, "EMPTY_IMAGE", "The uploaded file is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise _error(413, "IMAGE_TOO_LARGE", "The photo is larger than 5 MB.")

    data_url = f"data:{image.content_type};base64,{base64.b64encode(data).decode()}"
    try:
        response = client.responses.parse(
            model=settings.openai_vision_model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": data_url},
                    ],
                }
            ],
            text_format=ScannedList,
        )
    except OpenAIError as error:
        raise _error(502, "SCAN_FAILED", "Couldn't read the photo right now. Please try again.") from error

    parsed = response.output_parsed
    if parsed is None:
        raise _error(502, "SCAN_FAILED", "Couldn't read the photo. Try a clearer picture.")
    return ScannedList(items=parsed.items[:MAX_ITEMS])
