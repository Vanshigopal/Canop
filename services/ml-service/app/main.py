from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import close_db, init_db
from app.routers import dropout, health, omr, performance, training


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(
    title="Canop ML Service",
    version="0.1.0",
    description="Internal ML microservice for Canop platform",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://api:3001"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": "validation_failed",
            "details": exc.errors(),
        },
    )


app.include_router(health.router, tags=["health"])
app.include_router(omr.router, prefix="/omr", tags=["omr"])
app.include_router(dropout.router, prefix="/dropout", tags=["dropout"])
app.include_router(performance.router, prefix="/performance", tags=["performance"])
app.include_router(training.router, prefix="/training", tags=["training"])
