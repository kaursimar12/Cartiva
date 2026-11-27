from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.catalog import UnknownBrandError
from app.config import get_settings
from app.routers import livekit, payment, shopping_list

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
app.include_router(shopping_list.router)


@app.exception_handler(UnknownBrandError)
def unknown_brand(_: Request, error: UnknownBrandError) -> JSONResponse:
    """Any endpoint asked for a storefront that doesn't exist: same error shape as the other API errors."""
    return JSONResponse(
        status_code=400,
        content={"detail": {"code": "UNKNOWN_BRAND", "message": f"Unknown store “{error}”."}},
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}
