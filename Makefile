SHELL := /usr/bin/env bash

.DEFAULT_GOAL := help

API_DIR := apps/api
WEB_DIR := apps/web
WATCHER_DIR := apps/watcher

.PHONY: help check-env install db-up db-down db-logs \
	api-build api-run api-test api-package \
	web-dev web-build web-typecheck \
	watcher-dev watcher-build watcher-test watcher-typecheck \
	build test dev dev-no-web e2e e2e-smoke

help: ## Lista os comandos disponíveis
	@awk 'BEGIN {FS = ":.*##"; print "Uso: make <alvo> [ARGS=\"...\"]\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

check-env: ## Verifica se o arquivo .env existe
	@test -f .env || (echo "ERRO: .env não encontrado. Execute: cp .env.example .env" >&2; exit 1)

install: ## Instala dependências Node de web, watcher e ferramentas E2E
	bash scripts/install-deps.sh

db-up: check-env ## Sobe o PostgreSQL via Docker Compose
	docker compose --env-file .env -f infra/docker-compose.yml up -d

db-down: ## Para o PostgreSQL do Docker Compose
	docker compose --env-file .env -f infra/docker-compose.yml down

db-logs: ## Exibe os logs do PostgreSQL
	docker compose --env-file .env -f infra/docker-compose.yml logs -f postgres

api-build: ## Compila a API sem executar testes
	cd $(API_DIR) && mvn -B -DskipTests package

api-package: ## Cria o JAR executável da API
	cd $(API_DIR) && mvn -B package

api-run: check-env ## Inicia a API com o perfil dev na porta 8080
	set -a; source .env; set +a; cd $(API_DIR) && mvn spring-boot:run -Dspring-boot.run.profiles=dev

api-test: ## Executa os testes unitários da API
	cd $(API_DIR) && mvn test

web-dev: ## Inicia o frontend Vite na porta 5173
	cd $(WEB_DIR) && npm run dev

web-build: ## Faz o typecheck e build de produção do frontend
	cd $(WEB_DIR) && npm run build

web-typecheck: ## Verifica os tipos TypeScript do frontend
	cd $(WEB_DIR) && npm run typecheck

watcher-dev: check-env ## Inicia o watcher Solana usando o .env
	cd apps/watcher && npm run dev

watcher-build: ## Compila o watcher TypeScript
	cd apps/watcher && npm run build

watcher-test: ## Executa os testes do watcher
	cd apps/watcher && npm test

watcher-typecheck: ## Verifica os tipos TypeScript do watcher
	cd apps/watcher && npm run typecheck

build: api-build web-build watcher-build ## Compila API, frontend e watcher

test: api-test watcher-test ## Executa os testes automatizados principais

dev: ## Sobe a stack local completa em localnet; encerra com Ctrl+C
	bash scripts/dev.sh $(ARGS)

dev-no-web: ## Sobe API, watcher e localnet sem o frontend
	bash scripts/dev.sh --no-web $(ARGS)

e2e: ## Executa os cenários E2E A1-A9; use ARGS para filtrar
	bash scripts/e2e.sh $(ARGS)

e2e-smoke: ## Executa somente o smoke test do watcher
	bash scripts/e2e.sh --watcher-smoke $(ARGS)