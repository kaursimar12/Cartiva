"""Works out which language the shopper just spoke, so Cartiva can answer in the same one.

The speech-to-text runs in "multi" mode, and the model alone sometimes answers English in Hindi.
A plain rule on the transcript is more reliable: Devanagari script means Hindi, common Hindi words
written in English letters mean Hinglish, anything else is English.
"""

import re
from typing import Literal

Language = Literal["english", "hindi", "hinglish"]

DEVANAGARI = re.compile(r"[ऀ-ॿ]")

# Everyday Hindi words shoppers say in English letters ("mujhe tomatoes chahiye", "haan dal do").
HINGLISH_WORDS = {
    "mujhe", "muje", "chahiye", "chaiye", "hai", "hain", "kya", "kitna", "kitne", "aur", "nahi", "nahin",
    "haan", "han", "dal", "daal", "do", "karo", "kar", "mera", "meri", "mere", "wala", "wali", "ek", "kilo",
    "bhi", "toh", "abhi", "batao", "dikhao", "hatao", "bas", "theek", "thik", "accha", "acha", "aap",
    "aloo", "tamatar", "pyaaz", "doodh", "sabzi", "chawal", "kaun", "sa", "se", "ko", "ka", "ki", "ke",
}
# Words that are Hindi but also common in English, so they never count on their own.
AMBIGUOUS = {"do", "kilo", "sa", "se", "ko", "ka", "ki", "ke", "han", "ek", "bhi", "toh", "kar", "aur", "hai"}
HINGLISH_THRESHOLD = 2  # this many Hindi words (at least one unambiguous) → Hinglish


def detect_language(text: str) -> Language:
    """English unless the words clearly say otherwise."""
    if DEVANAGARI.search(text):
        return "hindi"
    words = re.findall(r"[a-z]+", text.lower())
    hindi = [w for w in words if w in HINGLISH_WORDS]
    if len(hindi) >= HINGLISH_THRESHOLD and any(w not in AMBIGUOUS for w in hindi):
        return "hinglish"
    return "english"


REPLY_RULES: dict[Language, str] = {
    "english": "The shopper just spoke English. Reply only in English, with no Hindi words.",
    "hindi": "The shopper just spoke Hindi. Reply in Hindi (Devanagari), keeping product and brand names in English.",
    "hinglish": "The shopper just spoke Hinglish. Reply in Hinglish: Hindi in Devanagari mixed with English words.",
}
