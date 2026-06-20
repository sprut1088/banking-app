# Banking App Monorepo

Lightweight banking microservices platform with Spring Boot 3.3, React 18, Python asyncio load generator, and OpenTelemetry/Prometheus/Grafana/Jaeger/Splunk observability stack.

## Architecture

```text
									 +--------------------------+
									 |        Frontend          |
									 |  React + Vite + Nginx    |
									 |       localhost:3000     |
									 +------------+-------------+
																|
																v
										 +----------+-----------+
										 |     Gateway API      |
										 |  Spring Boot :7080   |
										 +-----+---+---+---+----+
													 |   |   |   |
				+------------------+   |   |   +------------------+
				|                      |   |                      |
				v                      v   v                      v
+---------------+   +---------------+   +---------------+   +---------------+
| Auth Service  |   | Account Svc   |   | Txn Service   |   | Card Service  |
| :7081         |   | :7082         |   | :7083         |   | :7084         |
+---------------+   +---------------+   +---------------+   +---------------+
													 |
													 v
										 +---------------+
										 | Payment Svc   |
										 | :7085         |
										 +---------------+

Load + Ops Sidecar:
	- Load Generator (FastAPI asyncio): localhost:8090

Observability:
	- OTel Collector (4317/4318/8889)
	- Prometheus (9090)
	- Grafana (3001)
	- Jaeger (16686)
	- Splunk (8000 / HEC 8088)
```

## Project Layout

```text
banking-app/
├── pom.xml
├── docker-compose.yml
├── otel-collector-config.yaml
├── prometheus.yml
├── README.md
├── frontend/
├── load-generator/
├── gateway-service/
├── auth-service/
├── account-service/
├── transaction-service/
├── card-service/
└── payment-service/
```

## Run The Full Stack

Prerequisites:
- Docker + Docker Compose

From repository root:

```bash
docker compose up --build
```

Stop and remove containers:

```bash
docker compose down
```

## Service URLs

| Component | URL | Notes |
|---|---|---|
| Frontend | http://localhost:5174 | React app via Nginx |
| Gateway API | http://localhost:7080 | Entry point for banking API |
| Auth Service | http://localhost:7081/swagger-ui/index.html | OpenAPI UI |
| Account Service | http://localhost:7082/swagger-ui/index.html | OpenAPI UI |
| Transaction Service | http://localhost:7083/swagger-ui/index.html | OpenAPI UI |
| Card Service | http://localhost:7084/swagger-ui/index.html | OpenAPI UI |
| Payment Service | http://localhost:7085/swagger-ui/index.html | OpenAPI UI |
| Load Control API | http://localhost:8090 | FastAPI control endpoints |
| Load Metrics | http://localhost:8090/metrics | Prometheus format |
| OTel Collector OTLP gRPC | http://localhost:24317 | Host-mapped collector port |
| OTel Collector OTLP HTTP | http://localhost:24318 | Host-mapped collector port |
| OTel Prometheus Exporter | http://localhost:28889/metrics | Collector metrics endpoint |

## Customer Credentials

| Username | Password | Customer ID |
|---|---|---|
| alice | pass123 | CUST001 |
| bob | pass456 | CUST002 |
| charlie | pass789 | CUST003 |
| diana | pass321 | CUST004 |
| edward | pass654 | CUST005 |
| fiona | pass987 | CUST006 |
| george | pass111 | CUST007 |
| helen | pass222 | CUST008 |

## Observability Endpoints

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Jaeger UI: http://localhost:16686
- Splunk UI: http://localhost:8000 (admin/admin123)

## Load Generator Endpoints

- Health: `GET /health`
- Current status: `GET /load/status`
- Start flows: `POST /load/start`
- Stop flows: `POST /load/stop`
- Stop all: `POST /load/stop-all`
- Reset metrics: `POST /load/reset-metrics`
- Prometheus metrics: `GET /metrics`

Base URL: http://localhost:8090

Example start all:

```bash
curl -X POST http://localhost:8090/load/start \
	-H "Content-Type: application/json" \
	-d '{"flows":["LOGIN_FLOW","PAYMENT_FLOW","CARD_FLOW","ACCOUNT_FLOW","TRANSACTION_FLOW"]}'
```

## Grafana Setup Hint

1. Open Grafana at http://localhost:3001.
2. Add data source:
	 - Type: Prometheus
	 - URL: `http://prometheus:9090`
3. Build dashboard panels using these metrics:
	 - `banking_load_payments_total`
	 - `banking_load_payments_last_10min`
	 - `banking_load_payment_latency_seconds`
	 - `banking_load_logins_total`
	 - `banking_load_distinct_users`
	 - `banking_load_card_views_total`
	 - `banking_load_flows_active`

