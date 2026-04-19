# Canop ML Service

Internal Python microservice for OMR scanning, dropout risk prediction, and
performance prediction. Runs as a Docker container on port 8000.

## Local dev (without Docker)

```bash
cd services/ml-service
pip install uv
uv pip install --system -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

## Bootstrap models (first run)

Both models must be trained once before predictions are available:

```bash
curl -X POST http://localhost:8000/training/dropout/bootstrap -H "x-api-key: dev-internal-key"
curl -X POST http://localhost:8000/training/performance/bootstrap -H "x-api-key: dev-internal-key"
```

Model files persist under `app/models/trained/` and are mounted as a Docker
volume in `infra/docker/docker-compose.yml`.

## Tests

```bash
pytest
```

## Endpoints

| Method | Path                               | Description                     |
| ------ | ---------------------------------- | ------------------------------- |
| GET    | /health                            | Service liveness                |
| GET    | /ready                             | DB connectivity check           |
| POST   | /omr/scan                          | Score a bubble sheet image      |
| POST   | /dropout/predict                   | Dropout risk for one student    |
| POST   | /dropout/predict-batch             | Dropout risk for a list         |
| POST   | /performance/predict               | Next-exam performance estimate  |
| POST   | /training/dropout/bootstrap        | Train classifier on synthetic   |
| POST   | /training/performance/bootstrap    | Train regressor on synthetic    |
| GET    | /training/models/status            | Check which models are trained  |

All endpoints except `/health` and `/ready` require `x-api-key` header matching
`ML_SERVICE_API_KEY` env var.
