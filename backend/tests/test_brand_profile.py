"""One deployed agent serves every storefront: each call builds its brand's profile from the job metadata.
No network, no LLM: these only check what the agent would be configured with."""

import json
import re
import shutil
from pathlib import Path

import pytest

import agent.worker as worker
from agent import brand_profile
from agent.brand_profile import (
    STT_KEYTERM_BUDGET,
    brand_from_job_metadata,
    load_brand_profile,
    profile_for_job,
)
from agent.instructions import PROMPT_SLOTS
from app import catalog as catalog_module
from app.config import get_settings

REAL_BRANDS = get_settings().brands_dir
GROCERY_WORDS = re.compile(r"tomato|potato|onion|vegetable|grocer|\bvim\b|pril|surf excel|amul|banana|guava|cartiva", re.I)


def _clear_caches() -> None:
    catalog_module.known_brands.cache_clear()
    catalog_module._load_catalog.cache_clear()
    catalog_module._load_brand.cache_clear()
    catalog_module._load_categories.cache_clear()
    brand_profile.load_brand_profile.cache_clear()


@pytest.fixture
def with_teststore(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """BRANDS_DIR = real Cartiva + a small "teststore" (a cola shop) with its own agent settings."""
    shutil.copytree(REAL_BRANDS / "cartiva", tmp_path / "cartiva")
    store = tmp_path / "teststore"
    store.mkdir()
    (store / "products.json").write_text(json.dumps([
        {"id": "t1", "name": "Fizz Cola", "category": "colas", "price": 40, "unit": "750 ml",
         "stock": True, "availableQuantity": 10},
    ]), encoding="utf-8")
    (store / "categories.json").write_text(json.dumps([
        {"id": "colas", "name": "Colas", "description": "", "image": ""},
        {"id": "water", "name": "Water", "description": "", "image": ""},
    ]), encoding="utf-8")
    (store / "offers.json").write_text("[]", encoding="utf-8")
    (store / "delivery.json").write_text(json.dumps({"fee": 30, "freeAbove": 199}), encoding="utf-8")
    brand = json.loads((REAL_BRANDS / "cartiva" / "brand.json").read_text(encoding="utf-8"))
    brand["id"] = "teststore"
    brand["assistant"]["name"] = "Fizzy"
    brand["agent"] = {
        "greeting": "Hi, I'm Fizzy! Which drink would you like?",
        "ttsVoice": "voice-test",
        "sttPriorityKeyterms": ["cart", "Fizzy", "cola"],
        "prompt": {slot: f"<{slot} for cola>" for slot in PROMPT_SLOTS},
    }
    (store / "brand.json").write_text(json.dumps(brand), encoding="utf-8")

    monkeypatch.setattr(get_settings(), "brands_dir", tmp_path)
    _clear_caches()
    yield
    _clear_caches()


# ---------------------------------------------------------------- every real brand


@pytest.mark.parametrize("brand_id", catalog_module.known_brands())
def test_every_real_brand_builds_a_complete_profile(brand_id: str) -> None:
    profile = load_brand_profile(brand_id)

    assert profile.id == brand_id
    assert profile.assistant_name in profile.instructions
    assert profile.assistant_name in profile.greeting
    assert not re.search(r"\{\w+\}", profile.instructions), "every template slot must be filled"
    assert sum(len(t) for t in profile.stt_keyterms) <= STT_KEYTERM_BUDGET
    assert profile.stt_keyterms[: len(profile.stt_priority_keyterms)] == profile.stt_priority_keyterms


def test_instructions_list_the_stores_own_aisles() -> None:
    profile = load_brand_profile("cartiva")
    aisles = [c["id"] for c in catalog_module.get_categories("cartiva")]

    assert f"category ids: {', '.join(aisles)}." in profile.instructions


def test_default_assistant_still_uses_the_cartiva_profile() -> None:
    assistant = worker.CartivaAssistant()  # what the conversation tests construct
    assert assistant.instructions.startswith(load_brand_profile().instructions)
    assert worker.STT_KEYTERMS == load_brand_profile().stt_keyterms


# ---------------------------------------------------------------- a second brand really switches


def test_a_second_brand_gets_its_own_assistant(with_teststore) -> None:
    profile = load_brand_profile("teststore")

    assert profile.assistant_name == "Fizzy"
    assert profile.greeting.startswith("Hi, I'm Fizzy")
    assert profile.tts_voice == "voice-test"
    assert "You are Fizzy" in profile.instructions
    assert "<tie_example for cola>" in profile.instructions
    assert "category ids: colas, water." in profile.instructions
    assert "Fizz Cola" in profile.stt_keyterms
    assert not GROCERY_WORDS.search(profile.instructions), "no grocery examples may leak into another brand"


def test_the_assistant_takes_the_calls_profile(with_teststore) -> None:
    assistant = worker.CartivaAssistant(load_brand_profile("teststore"))
    assert "You are Fizzy" in assistant.instructions


# ---------------------------------------------------------------- job metadata


@pytest.mark.parametrize(
    ("metadata", "brand"),
    [
        ('{"brand": "pepsico"}', "pepsico"),
        (None, None),
        ("", None),
        ("not json", None),
        ('{"other": 1}', None),
        ('["pepsico"]', None),
        ('{"brand": ""}', None),
    ],
)
def test_brand_is_read_from_job_metadata(metadata: str | None, brand: str | None) -> None:
    assert brand_from_job_metadata(metadata) == brand


def test_unknown_brand_in_metadata_falls_back_to_the_default() -> None:
    assert profile_for_job('{"brand": "no-such-store"}').id == get_settings().default_brand


def test_metadata_picks_the_brand(with_teststore) -> None:
    assert profile_for_job('{"brand": "teststore"}').assistant_name == "Fizzy"
    assert profile_for_job(None).id == "cartiva"
