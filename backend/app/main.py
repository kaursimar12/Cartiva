from fastapi import FastAPI

app = FastAPI(title="Cartiva API")


@app.get("/api/health")
def health():
    return {"status": "ok"}
