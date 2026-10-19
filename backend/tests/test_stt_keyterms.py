"""The keyterm list sent to Deepgram must stay small: a list that is too long makes Deepgram refuse
the connection (error 2006) and the agent hears nothing. No network calls here."""

import agent.worker as worker


def test_keyterms_stay_under_the_budget() -> None:
    assert sum(len(term) for term in worker.STT_KEYTERMS) <= worker.STT_KEYTERM_BUDGET


def test_priority_words_are_always_included() -> None:
    assert worker.STT_KEYTERMS[: len(worker.STT_PRIORITY_KEYTERMS)] == worker.STT_PRIORITY_KEYTERMS


def test_budget_still_leaves_room_for_products() -> None:
    assert "Tomato" in worker.STT_KEYTERMS and "Potato" in worker.STT_KEYTERMS
