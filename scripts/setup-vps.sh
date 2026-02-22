#!/bin/bash
set -e

echo "=== Subtitle Burner VPS Setup ==="

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. Please re-login and re-run this script."
  exit 0
fi

# Check .env
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
  echo "Please edit .env with your configuration, then re-run this script."
  exit 1
fi

# Build and start
echo "Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for postgres
echo "Waiting for PostgreSQL..."
sleep 5

# Run migrations
echo "Running database migrations..."
docker compose -f docker-compose.prod.yml exec web ./node_modules/.bin/prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma

# Health check
echo "Checking health..."
sleep 3
if curl -sf http://localhost/api/health > /dev/null; then
  echo "=== Setup complete! Application is running at http://localhost ==="
else
  echo "Warning: Health check failed. Check logs with: docker compose -f docker-compose.prod.yml logs"
fi
