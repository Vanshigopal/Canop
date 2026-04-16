Write-Host "Resetting Raquel dev database..." -ForegroundColor Cyan
docker compose -f infra/docker/docker-compose.yml down -v
docker compose -f infra/docker/docker-compose.yml up -d
Write-Host "Done. Postgres available at localhost:5432, pgAdmin at localhost:5050" -ForegroundColor Green
