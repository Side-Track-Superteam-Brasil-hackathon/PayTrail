SHELL := /usr/bin/env bash

.DEFAULT_GOAL := help

COMPOSE_CMD := docker compose -f infra/docker-compose.yml

.PHONY: help up dev mock logs db-logs restart down

help: ## Lista os comandos disponíveis
	@awk 'BEGIN {FS = ":.*##"; print "Uso: make <alvo> [ARGS=\"...\"]\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Sobe a aplicação real completa; encerra com Ctrl+C
	bash scripts/dev.sh $(ARGS)

dev: up ## Alias de up para compatibilidade

mock: ## Sobe o frontend com o mock OpenAPI na porta 4010
	set -e; \
	trap 'kill 0' INT TERM EXIT; \
	(cd apps/web && npm run mock) & \
	sleep 2; \
	cd apps/web && VITE_API_TARGET=http://localhost:4010 npm run dev -- --host 0.0.0.0

logs: ## Exibe os logs do PostgreSQL
	if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env logs -f postgres; \
	else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) logs -f postgres; fi

db-logs: logs ## Alias de logs para compatibilidade

restart: ## Reinicia a aplicação sem remover dados do banco
	-pkill -f 'solana-test-validator.*--rpc-port' 2>/dev/null || true
	-pkill -f 'paytrail-api-0.1.0.jar' 2>/dev/null || true
	-pkill -f 'tsx src/index.ts' 2>/dev/null || true
	-pkill -f 'vite --host' 2>/dev/null || true
	if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env down --remove-orphans; \
	else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) down --remove-orphans; fi
	bash scripts/dev.sh $(ARGS)

down: ## Encerra a aplicação e remove containers, volumes e órfãos
	-pkill -f 'solana-test-validator.*--rpc-port' 2>/dev/null || true
	-pkill -f 'paytrail-api-0.1.0.jar' 2>/dev/null || true
	-pkill -f 'tsx src/index.ts' 2>/dev/null || true
	-pkill -f 'vite --host' 2>/dev/null || true
	if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env down --volumes --remove-orphans; \
	else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) down --volumes --remove-orphans; fi