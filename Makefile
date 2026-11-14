.PHONY: help setup dev test build seed clean

help:
	@echo "GreenPay Bengaluru — Operational Commands"
	@echo "  make setup   - Install all node & python dependencies"
	@echo "  make dev     - Run development environment"
	@echo "  make test    - Run pytest suite, token contrast audit, and validator tests"
	@echo "  make build   - Build Citizen web app and Admin ops portal"
	@echo "  make seed    - Seed 12 months of realistic Bengaluru pilot data"

setup:
	npm install
	cd apps/api && pip install -r requirements.txt
	@echo "Setup completed successfully."

dev:
	@echo "Starting development services..."
	@echo "Citizen Web: http://localhost:5173"
	@echo "Admin Ops:   http://localhost:5174"
	@echo "FastAPI:     http://localhost:8000/docs"

test:
	@echo "Running backend test suite (SQLite & PostgreSQL triggers)..."
	python -m pytest apps/api/tests -v
	@echo "Running WCAG 2.2 AA token contrast verification..."
	npm run test:tokens
	@echo "Running business configuration validator test..."
	npx tsx packages/config/business_config.test.ts

build:
	npm run build:web
	npm run build:admin
	@echo "All production bundles compiled successfully."

seed:
	python apps/api/app/seed.py

clean:
	rm -rf apps/web/dist apps/admin/dist
