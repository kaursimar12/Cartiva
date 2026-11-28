"""Everything the voice agent needs to act as one storefront's assistant, built from its brand folder.

One deployed agent serves every brand: the token endpoint puts {"brand": "<id>"} in the job metadata,
and each call builds (or reuses) that brand's profile — catalog words for speech recognition, the
greeting, the voice and the instructions.
"""

import json
import logging
from dataclasses import dataclass, field
from functools import lru_cache

from agent.instructions import render_instructions
from app.catalog import UnknownBrandError, get_brand, get_catalog, get_categories, resolve_brand

logger = logging.getLogger("cartiva-agent")

# Words Deepgram should expect, so accented speech maps to them ("cart", not "partner").
# Deepgram refuses the whole connection (error 2006, the agent hears nothing) when the list is too
# long. The limit has shrunk over time: ~1,240 characters failed in Oct 2026, and by Nov 2026 684
# already failed while 642 worked. So the most useful words go first and we stop well under that.
STT_KEYTERM_BUDGET = 500  # total characters of all keyterms


def build_stt_keyterms(priority: list[str], product_names: list[str], budget: int = STT_KEYTERM_BUDGET) -> list[str]:
    """Priority words first, then catalog product names (shortest first, so more products fit)."""
    names = sorted(set(product_names), key=len)
    terms: list[str] = []
    used = 0
    for term in [*priority, *names]:
        if used + len(term) > budget:
            break
        terms.append(term)
        used += len(term)
    return terms


@dataclass(frozen=True)
class BrandProfile:
    id: str
    assistant_name: str
    greeting: str
    tts_voice: str
    instructions: str  # without the per-turn "reply language" block, which the agent appends
    stt_priority_keyterms: list[str]
    stt_keyterms: list[str]
    # For "one X, one Y and two Z" (shop_aisles_one_by_one): which aisle each product is in, the aisles'
    # display names and the brands in stock in each aisle (in catalog order).
    product_aisle: dict[str, str] = field(default_factory=dict)
    aisle_names: dict[str, str] = field(default_factory=dict)
    aisle_brands: dict[str, list[str]] = field(default_factory=dict)
    # Words the voice should say differently from how they're written (brand.json → agent.ttsPronunciations),
    # e.g. "7UP" → "Seven Up" (the voice read it as "seven U P"). The screen keeps the written name.
    tts_pronunciations: dict[str, str] = field(default_factory=dict)


def _aisle_brands(products) -> dict[str, list[str]]:
    brands: dict[str, list[str]] = {}
    for p in products:
        names = brands.setdefault(p.category, [])
        if p.stock and p.brand and p.brand not in names:
            names.append(p.brand)
    return brands


@lru_cache
def load_brand_profile(brand: str | None = None) -> BrandProfile:
    """The profile for a brand (default brand when None). Cached: built once per brand per process."""
    brand_id = resolve_brand(brand)
    info = get_brand(brand_id)
    agent = info["agent"]
    assistant_name = info["assistant"]["name"]
    catalog = get_catalog(brand_id)
    priority = list(agent["sttPriorityKeyterms"])
    categories = get_categories(brand_id)
    return BrandProfile(
        id=brand_id,
        assistant_name=assistant_name,
        greeting=agent["greeting"],
        tts_voice=agent["ttsVoice"],
        instructions=render_instructions(assistant_name, agent["prompt"], [category["id"] for category in categories]),
        stt_priority_keyterms=priority,
        stt_keyterms=build_stt_keyterms(priority, [p.name for p in catalog.products.values()]),
        product_aisle={p.id: p.category for p in catalog.products.values()},
        aisle_names={category["id"]: category["name"] for category in categories},
        aisle_brands=_aisle_brands(catalog.products.values()),
        tts_pronunciations=dict(agent.get("ttsPronunciations") or {}),
    )


def brand_from_job_metadata(metadata: str | None) -> str | None:
    """The brand the token endpoint wrote into the job metadata ({"brand": "pepsico"}), if any."""
    if not metadata:
        return None
    try:
        value = json.loads(metadata)
    except json.JSONDecodeError:
        logger.warning("ignoring job metadata that isn't JSON: %r", metadata[:80])
        return None
    brand = value.get("brand") if isinstance(value, dict) else None
    return brand if isinstance(brand, str) and brand else None


def profile_for_job(metadata: str | None) -> BrandProfile:
    """The profile for a call; falls back to the default brand when the metadata is missing or unknown,
    so a voice call never fails just because of a bad brand name."""
    brand = brand_from_job_metadata(metadata)
    try:
        return load_brand_profile(brand)
    except UnknownBrandError:
        logger.warning("unknown brand %r in job metadata; using the default brand", brand)
        return load_brand_profile(None)
