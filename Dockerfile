# Cartiva voice agent (backend/agent/worker.py) for LiveKit Cloud: `lk agent deploy` from the repo root.
# Built from the repo root so the catalog in frontend/data is copied in (the agent reads it via DATA_DIR).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

WORKDIR /app/backend

# Dependencies first, so code changes don't reinstall them.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY frontend/data /app/frontend/data

# PYTHONPATH: worker.py imports `agent.*` and `app.*`, which live in /app/backend.
ENV PATH="/app/backend/.venv/bin:$PATH" PYTHONPATH=/app/backend DATA_DIR=/app/frontend/data/brands/cartiva

CMD ["python", "agent/worker.py", "start"]
