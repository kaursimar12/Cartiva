from fastapi import FastAPI

from app.routers import livekit

app = FastAPI(title="Cartiva API")
app.include_router(livekit.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
