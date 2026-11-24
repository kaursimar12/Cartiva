"""The saved greeting take: file round trip, frame splitting and cache keys (no network)."""

import asyncio
from pathlib import Path

from livekit import rtc

from agent.greeting_audio import _read_wav, _write_wav, cache_path, play_frames

RATE = 24000


def tone(samples: int) -> rtc.AudioFrame:
    pcm = bytes(i % 256 for i in range(samples * 2))
    return rtc.AudioFrame(pcm, sample_rate=RATE, num_channels=1, samples_per_channel=samples)


def test_wav_round_trip_keeps_the_audio_identical(tmp_path: Path) -> None:
    original = tone(RATE)  # one second
    path = tmp_path / "greeting.wav"
    _write_wav(path, original)
    loaded = _read_wav(path)
    assert loaded.sample_rate == RATE and loaded.num_channels == 1
    assert loaded.data.tobytes() == original.data.tobytes()


def test_play_frames_splits_into_20ms_frames_without_losing_samples() -> None:
    audio = tone(RATE + 100)  # one second plus a partial frame

    async def collect() -> list[rtc.AudioFrame]:
        return [f async for f in play_frames(audio)]

    frames = asyncio.run(collect())
    assert all(f.samples_per_channel == RATE // 50 for f in frames[:-1])
    assert b"".join(f.data.tobytes() for f in frames) == audio.data.tobytes()


def test_a_new_take_is_recorded_when_text_voice_or_speed_changes() -> None:
    base = cache_path("Hi", "voice-a", "cartesia/sonic-3", "normal")
    assert base == cache_path("Hi", "voice-a", "cartesia/sonic-3", "normal")
    assert base != cache_path("Hello", "voice-a", "cartesia/sonic-3", "normal")
    assert base != cache_path("Hi", "voice-b", "cartesia/sonic-3", "normal")
    assert base != cache_path("Hi", "voice-a", "cartesia/sonic-3", "slow")
