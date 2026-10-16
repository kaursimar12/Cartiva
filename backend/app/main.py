from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import livekit, payment

settings = get_settings()

app = FastAPI(title="Cartiva API")

# Let only our own frontend (CORS_ORIGINS) call this API from a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(livekit.router)
app.include_router(payment.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
