import pytest

from agent.language import detect_language


@pytest.mark.parametrize(
    "said",
    [
        "Add two kilos of tomatoes",
        "What's my total?",
        "Do you have milk?",  # "do" alone is not Hindi
        "Take the 2 kg one",
        "yes add them",
        "",
    ],
)
def test_english_stays_english(said):
    assert detect_language(said) == "english"


@pytest.mark.parametrize("said", ["मुझे टमाटर चाहिए", "हाँ, डाल दो", "Surf Excel वाला दो"])
def test_devanagari_is_hindi(said):
    assert detect_language(said) == "hindi"


@pytest.mark.parametrize("said", ["mujhe tomatoes chahiye", "haan dal do", "doodh kitne ka hai"])
def test_hindi_in_english_letters_is_hinglish(said):
    assert detect_language(said) == "hinglish"


def test_language_block_names_the_language_and_numbers():
    from agent.language import VOICE_LANGUAGE, language_instructions

    block = language_instructions("english")
    assert "Reply language right now" in block and "English" in block and "Numbers" in block
    assert VOICE_LANGUAGE == {"english": "en", "hindi": "hi", "hinglish": "hi"}
