"""The greeting is played from one recorded take, so "Hi, I'm Cartiva" sounds the same every call.

A text-to-speech voice says the same sentence slightly differently each time (tone, pace, emphasis).
For the one sentence every shopper hears, we synthesize it once, save it as a WAV file in
backend/.cache/, and replay that file afterwards. Changing the text, voice or model records a new take;
delete the file to re-record a take you don't like.
"""

import asyncio
import hashlib
import logging
import wave
from collections.abc import AsyncIterator
from pathlib import Path

from livekit import rtc
from livekit.agents import tts as agents_tts

logger = logging.getLogger("cartiva-agent")

CACHE_DIR = Path(__file__).resolve().parents[1] / ".cache"
FRAME_MS = 20  # replay in 20 ms frames, like live speech


def cache_path(text: str, voice: str, model: str, speed: str) -> Path:
    key = hashlib.sha256(f"{model}|{voice}|{speed}|{text}".encode()).hexdigest()[:16]
    return CACHE_DIR / f"greeting-{key}.wav"


def _write_wav(path: Path, frame: rtc.AudioFrame) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(frame.num_channels)
        wav.setsampwidth(2)  # 16-bit PCM, what the TTS returns
        wav.setframerate(frame.sample_rate)
        wav.writeframes(frame.data.tobytes())


def _read_wav(path: Path) -> rtc.AudioFrame:
    with wave.open(str(path), "rb") as wav:
        channels, rate = wav.getnchannels(), wav.getframerate()
        pcm = wav.readframes(wav.getnframes())
    return rtc.AudioFrame(pcm, sample_rate=rate, num_channels=channels, samples_per_channel=len(pcm) // (2 * channels))


async def _record(tts: agents_tts.TTS, text: str) -> rtc.AudioFrame | None:
    frames: list[rtc.AudioFrame] = []
    async with tts.synthesize(text) as stream:
        async for chunk in stream:
            frames.append(chunk.frame)
    return rtc.combine_audio_frames(frames) if frames else None


async def load_greeting(tts: agents_tts.TTS, text: str, voice: str, model: str, speed: str) -> rtc.AudioFrame | None:
    """The saved take of the greeting, recording it first if there is none yet. None if that failed."""
    path = cache_path(text, voice, model, speed)
    try:
        if path.exists():
            return await asyncio.to_thread(_read_wav, path)  # file work off the audio loop
        audio = await _record(tts, text)
        if audio is not None:
            await asyncio.to_thread(_write_wav, path, audio)
            logger.info("recorded the greeting take: %s", path.name)
        return audio
    except Exception:  # never lose the greeting over this: the caller falls back to live speech
        logger.exception("could not load or record the greeting take")
        return None


async def play_frames(audio: rtc.AudioFrame) -> AsyncIterator[rtc.AudioFrame]:
    """Splits one long frame into 20 ms frames for session.say(audio=...)."""
    step = audio.sample_rate * FRAME_MS // 1000
    data = audio.data  # int16 samples, interleaved by channel
    per_frame = step * audio.num_channels
    for start in range(0, len(data), per_frame):
        chunk = data[start : start + per_frame]
        yield rtc.AudioFrame(
            chunk.tobytes(), sample_rate=audio.sample_rate, num_channels=audio.num_channels,
            samples_per_channel=len(chunk) // audio.num_channels,
        )
