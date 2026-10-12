SHELL := /usr/bin/env bash

.DEFAULT_GOAL := help

.PHONY: help dev mock db-logs restart down

help: ## Lista os comandos disponíveis
	@awk 'BEGIN {FS = ":.*##"; print "Uso: make <alvo> [ARGS=\"...\"]\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Sobe a stack local completa em localnet; encerra com Ctrl+C
	bash scripts/dev.sh $(ARGS)

mock: ## Sobe o frontend com o mock OpenAPI na porta 4010
	set -e; \
	trap 'kill 0' INT TERM EXIT; \
	(cd apps/web && npm run mock) & \
	sleep 2; \
	cd apps/web && VITE_API_TARGET=http://localhost:4010 npm run dev -- --host 0.0.0.0

db-logs: ## Exibe os logs do container PostgreSQL
	test -f .env || (echo "ERRO: .env não encontrado. Execute: cp .env.example .env" >&2; exit 1); \
	docker compose --env-file .env -f infra/docker-compose.yml logs -f postgres

restart: ## Remove os containers e sobe novamente a aplicação real
	test -f .env || (echo "ERRO: .env não encontrado. Execute: cp .env.example .env" >&2; exit 1); \
	docker compose --env-file .env -f infra/docker-compose.yml down --remove-orphans
	bash scripts/dev.sh $(ARGS)

down: ## Remove containers, volumes e recursos órfãos do Compose
	test -f .env || (echo "ERRO: .env não encontrado. Execute: cp .env.example .env" >&2; exit 1); \
	docker compose --env-file .env -f infra/docker-compose.yml down --volumes --remove-orphans