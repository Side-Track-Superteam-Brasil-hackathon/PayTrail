SHELL := /usr/bin/env bash

.DEFAULT_GOAL := help

COMPOSE_CMD := docker compose -f infra/docker-compose.yml
PAYTRAIL_HOME ?= $(HOME)/.paytrail
PAYTRAIL_PID_FILE ?= $(PAYTRAIL_HOME)/dev.pid
PAYTRAIL_LOG_FILE ?= $(PAYTRAIL_HOME)/logs/dev-console.log

.PHONY: help up dev mock logs db-logs restart stop down stop-processes

help: ## Lista os comandos disponíveis
	@awk 'BEGIN {FS = ":.*##"; print "Uso: make <alvo> [ARGS=\"...\"]\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Sobe a aplicação real em background e mostra o progresso inicial
	@set -e; \
	source scripts/progress.sh; \
	mkdir -p "$(PAYTRAIL_HOME)/logs"; \
	if [ -f "$(PAYTRAIL_PID_FILE)" ] && kill -0 "$$(cat "$(PAYTRAIL_PID_FILE)")" 2>/dev/null; then \
		echo "PayTrail já está rodando (pid $$(cat "$(PAYTRAIL_PID_FILE)"))."; \
		echo "Logs: $(PAYTRAIL_LOG_FILE)"; \
		exit 0; \
	fi; \
	rm -f "$(PAYTRAIL_PID_FILE)"; \
	: > "$(PAYTRAIL_LOG_FILE)"; \
	setsid bash scripts/dev.sh $(ARGS) > "$(PAYTRAIL_LOG_FILE)" 2>&1 < /dev/null & \
	pid=$$!; \
	echo "$$pid" > "$(PAYTRAIL_PID_FILE)"; \
	echo "PayTrail iniciado em background (pid $$pid)."; \
	rows=0; frame=0; \
	for _ in $$(seq 1 180); do \
		if ! kill -0 "$$pid" 2>/dev/null; then \
			echo; echo "ERRO: a stack parou durante a inicialização." >&2; \
			tail -n 40 "$(PAYTRAIL_LOG_FILE)" >&2; rm -f "$(PAYTRAIL_PID_FILE)"; exit 1; \
		fi; \
		progress_rewind "$$rows"; \
		validator=$$(grep -qE 'solana-test-validator.*ok|solana devnet.*ok' "$(PAYTRAIL_LOG_FILE)" && echo done || echo wait); \
		postgres=$$(grep -q 'postgres ok' "$(PAYTRAIL_LOG_FILE)" && echo done || echo wait); \
		api=$$(grep -q 'API em .* ok' "$(PAYTRAIL_LOG_FILE)" && echo done || echo wait); \
		watcher=$$(grep -q 'watcher iniciado' "$(PAYTRAIL_LOG_FILE)" && echo done || echo wait); \
		web=$$(grep -q 'web em .* ok' "$(PAYTRAIL_LOG_FILE)" && echo done || echo wait); \
		validator_pct=$$([ "$$validator" = done ] && echo 100 || echo 50); \
		postgres_pct=$$([ "$$postgres" = done ] && echo 100 || echo 0); \
		api_pct=$$([ "$$api" = done ] && echo 100 || (grep -q 'api iniciado' "$(PAYTRAIL_LOG_FILE)" && echo 60 || echo 0)); \
		watcher_pct=$$([ "$$watcher" = done ] && echo 100 || (grep -q 'watcher iniciado' "$(PAYTRAIL_LOG_FILE)" && echo 60 || echo 0)); \
		web_pct=$$([ "$$web" = done ] && echo 100 || (grep -q 'web iniciado' "$(PAYTRAIL_LOG_FILE)" && echo 60 || echo 0)); \
		progress_line validator "$$validator_pct" "$$validator" "$$frame"; \
		progress_line postgres "$$postgres_pct" "$$postgres" "$$frame"; \
		progress_line api "$$api_pct" "$$api" "$$frame"; \
		progress_line watcher "$$watcher_pct" "$$watcher" "$$frame"; \
		progress_line web "$$web_pct" "$$web" "$$frame"; \
		rows=5; frame=$$(( (frame + 1) % 4 )); \
		if [ "$$validator$$postgres$$api$$watcher$$web" = donedonedonedonedone ]; then \
			echo "PayTrail pronto. Web: http://localhost:5173"; \
			echo "Logs: $(PAYTRAIL_LOG_FILE)"; exit 0; \
		fi; \
		sleep 1; \
	done; \
	echo; echo "ERRO: timeout aguardando a stack (180s)." >&2; \
	echo "Consulte: $(PAYTRAIL_LOG_FILE)" >&2; exit 1

dev: up ## Alias de up para compatibilidade

mock: ## Sobe o frontend com o mock OpenAPI na porta 4010
	set -e; source scripts/progress.sh; \
	trap 'kill 0' INT TERM EXIT; \
	mkdir -p "$(PAYTRAIL_HOME)/logs"; \
	progress_title 'PayTrail mock'; \
	progress_line prism 0 running 0; \
	(cd apps/web && npm run mock > "$(PAYTRAIL_HOME)/logs/mock-prism.log" 2>&1) & prism_pid=$$!; \
	for _ in $$(seq 1 30); do ss -ltn 2>/dev/null | grep -q ':4010 ' && break; sleep 1; done; \
	if ! ss -ltn 2>/dev/null | grep -q ':4010 '; then progress_line prism 100 error 0; tail -n 30 "$(PAYTRAIL_HOME)/logs/mock-prism.log"; exit 1; fi; \
	progress_rewind 1; progress_line prism 100 done 0; \
	progress_line web 0 running 0; \
	(cd apps/web && VITE_API_TARGET=http://localhost:4010 npm run dev -- --host 0.0.0.0 > "$(PAYTRAIL_HOME)/logs/mock-web.log" 2>&1) & web_pid=$$!; \
	for _ in $$(seq 1 60); do ss -ltn 2>/dev/null | grep -q ':5173 ' && break; sleep 1; done; \
	if ! ss -ltn 2>/dev/null | grep -q ':5173 '; then progress_line web 100 error 0; tail -n 30 "$(PAYTRAIL_HOME)/logs/mock-web.log"; exit 1; fi; \
	progress_rewind 1; progress_line web 100 done 0; \
	echo "Mock pronto. Web: http://localhost:5173"; \
	wait "$$web_pid"

logs: ## Exibe os logs do PostgreSQL
	if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env logs -f postgres; \
	else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) logs -f postgres; fi

db-logs: logs ## Alias de logs para compatibilidade

stop-processes:
	@set -e; source scripts/progress.sh; \
	progress_title 'Parando PayTrail'; \
	progress_line processes 0 running 0; \
	if [ -f "$(PAYTRAIL_PID_FILE)" ]; then \
		pid=$$(cat "$(PAYTRAIL_PID_FILE)"); \
		kill -TERM -- -"$$pid" 2>/dev/null || kill -TERM "$$pid" 2>/dev/null || true; \
		rm -f "$(PAYTRAIL_PID_FILE)"; \
	fi; \
	stop_port() { \
		port="$$1"; \
		pids=$$(ss -ltnp 2>/dev/null | awk -v port=":$$port" '$$4 ~ port"$$" {print}' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); \
		for pid in $$pids; do kill -TERM "$$pid" 2>/dev/null || true; done; \
	}; \
	stop_port 8899; stop_port 8080; stop_port 5173; \
	progress_rewind 1; progress_line processes 100 done 0

restart: stop-processes ## Reinicia a aplicação em background sem remover dados do banco
	@if command -v docker >/dev/null 2>&1; then echo "Containers que serão removidos e recriados:"; if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env ps -a --format '  {{.Name}} | {{.State}}' || true; else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) ps -a --format '  {{.Name}} | {{.State}}' || true; fi; else echo "Docker não instalado; nenhum container para reiniciar."; fi
	@source scripts/progress.sh; progress_title 'Containers: reinício'; \
	if command -v docker >/dev/null 2>&1; then \
		if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env down --remove-orphans; \
		else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) down --remove-orphans; fi; \
	fi
	@source scripts/progress.sh; progress_line containers 100 done 0
	$(MAKE) up ARGS="$(ARGS)"

stop: stop-processes ## Para a aplicação sem remover containers, volumes ou dados
	@source scripts/progress.sh; progress_title 'Containers: pausa'; progress_line containers 50 running 0
	@if command -v docker >/dev/null 2>&1; then echo "Containers que serão pausados:"; if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env ps -a --format '  {{.Name}} | {{.State}}' || true; else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) ps -a --format '  {{.Name}} | {{.State}}' || true; fi; fi
	@bash scripts/pg.sh stop >/dev/null 2>&1 || true
	@if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env stop >/dev/null 2>&1 || true; \
	else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) stop >/dev/null 2>&1 || true; fi
	@if command -v docker >/dev/null 2>&1; then echo "Containers pausados:"; if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env ps -a --format '  {{.Name}} | {{.State}}' || true; else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) ps -a --format '  {{.Name}} | {{.State}}' || true; fi; fi
	@source scripts/progress.sh; progress_line containers 100 done 0
	@echo "PayTrail parado. Containers e volumes foram preservados."

down: stop-processes ## Encerra a aplicação e remove containers, volumes e órfãos
	@if command -v docker >/dev/null 2>&1; then echo "Containers que serão removidos:"; if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env ps -a --format '  {{.Name}} | {{.State}}' || true; else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) ps -a --format '  {{.Name}} | {{.State}}' || true; fi; else echo "Docker não instalado; nenhum container para remover."; fi
	@source scripts/progress.sh; progress_title 'Containers: remoção'; progress_line containers 50 running 0
	if command -v docker >/dev/null 2>&1; then \
		if [ -f .env ]; then $(COMPOSE_CMD) --env-file .env down --volumes --remove-orphans; \
		else POSTGRES_PASSWORD=unused $(COMPOSE_CMD) down --volumes --remove-orphans; fi; \
	fi
	@echo "Containers removidos pelo Compose."; source scripts/progress.sh; progress_line containers 100 done 0