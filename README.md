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

Secret handling for Splunk HEC token:

1. Copy `.env.local.example` to `.env.local`.
2. Set `SPLUNK_HEC_TOKEN` in `.env.local`.
3. Start with env file:

```bash
docker compose --env-file .env.local up --build
```

Telemetry routing in `.env.local`:
- `SPLUNK_HEC_ENDPOINT` (logs to Splunk HEC, typically `http://<host>:8088/services/collector`)
- `SPLUNK_INDEX` (Splunk index, e.g. `banking`)
- `OPENSEARCH_ENDPOINT` (logs to OpenSearch, e.g. `http://10.235.21.132:9200`)
- `OPENSEARCH_LOGS_INDEX` (OpenSearch logs index, e.g. `banking`)
- `PROMETHEUS_REMOTE_WRITE_ENDPOINT` (metrics remote write endpoint, e.g. `http://10.235.21.132:9090/api/v1/write`)
- `JAEGER_TRACES_ENDPOINT` (trace ingest endpoint, e.g. `http://10.235.21.132:8080/jaeger/api/traces`)

Current collector behavior:
- Logs exported to both Splunk HEC and OpenSearch.
- Metrics exported to local Prometheus scrape endpoint (`:8889`) and Prometheus remote-write endpoint.
- Traces exported to Jaeger endpoint.

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

## Splunk Validation And Alert Assets

- Ingestion validation runbook: [SPLUNK_VALIDATION.md](SPLUNK_VALIDATION.md)
- Alert starter runbook: [SPLUNK_ALERT_RUNBOOK.md](SPLUNK_ALERT_RUNBOOK.md)
- Splunk saved-search template: [splunk/savedsearches.p1-t5.conf.template](splunk/savedsearches.p1-t5.conf.template)

Quick validation command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-p1-t4.ps1
```

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

## Demo Scenarios (3 Success + 3 Failure)

Use these scripts during presentation to get deterministic outcomes.

### Demo Preparation (Do Once)

1. Start stack: `docker compose up --build`
2. Open frontend: http://localhost:5174
3. Login as:
	 - Username: `alice`
	 - Password: `pass123`
4. Open these pages in browser tabs:
	 - Dashboard
	 - Transactions
	 - Cards
	 - Payments

Optional reset between scenarios:
- Restart stack (`docker compose down` then `docker compose up --build`) to return to clean in-memory demo data.

---

### Success 1: Account + Instant Payment (Balance Must Decrease)

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `ACCOUNT`.
3. Set Settlement Type = `INSTANT`.
4. Select Payee = `Irish Utilities Ltd` (`PAY001`).
5. Amount = `25.00`.
6. Reference = `DEMO-S1-INSTANT`.
7. Click Submit Payment.

Expected outcomes:
- Success banner appears with status `SUCCESS`.
- Payment History row shows:
	- Rail = `ACCOUNT`
	- Mode = `INSTANT`
	- Status = `SUCCESS`
- Account balance decreases.
- Transactions page shows a new debit row for this payment.

Observability talking points:
- Payment service logs show payment success and orchestration.
- Account service logs show balance update.
- Transaction service logs show new transaction creation.

---

### Success 2: Card + Instant Payment (Card Transactions Separate)

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `CARD`.
3. Set Settlement Type = `INSTANT`.
4. Select Payee = `Digital Media Subscriptions` (`PAY003`).
5. Amount = `40.00`.
6. Reference = `DEMO-S2-CARD`.
7. Click Submit Payment.
8. Go to Cards page.

Expected outcomes:
- Success banner appears with status `SUCCESS`.
- Payment History row shows Rail = `CARD`, Status = `SUCCESS`.
- Cards page shows:
	- Lower Available Credit.
	- New row in Card Transactions with status `SUCCESS`.
- Transactions page (account ledger) does not receive this card row.

Observability talking points:
- Card service logs show card charge approved.
- Payment service logs show card rail orchestration success.

---

### Success 3: Account + SEPA Payment Under Threshold

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `ACCOUNT`.
3. Set Settlement Type = `SEPA`.
4. Select Payee = `City Rent Services` (`PAY002`).
5. Amount = `150.00`.
6. Reference = `DEMO-S3-SEPA-OK`.
7. Click Submit Payment.

Expected outcomes:
- Success banner appears with status `SUCCESS`.
- Payment History row shows Mode = `SEPA`, Status = `SUCCESS`.
- Account balance decreases and account transaction is created.

Observability talking points:
- Payment service logs show SEPA happy path.
- Account + transaction services show downstream updates.

---

### Failure 1: Simulated Failure Keyword in Reference

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `ACCOUNT`.
3. Set Settlement Type = `INSTANT`.
4. Select Payee = `Irish Utilities Ltd` (`PAY001`).
5. Amount = `20.00`.
6. Reference = `DEMO-F1-FAIL-KEYWORD`.
7. Click Submit Payment.

Expected outcomes:
- Error banner with status `FAILED`.
- Payment History row created with:
	- Status = `FAILED`
	- Failure Reason contains simulated failure message.
- No account balance change.

Observability talking points:
- Payment service warn log indicates deterministic rejection via reference rule.

---

### Failure 2: SEPA Compliance Review Path (> 2000)

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `ACCOUNT`.
3. Set Settlement Type = `SEPA`.
4. Select Payee = `City Rent Services` (`PAY002`).
5. Amount = `2500.00`.
6. Reference = `DEMO-F2-SEPA-REVIEW`.
7. Click Submit Payment.

Expected outcomes:
- Error banner with status `FAILED`.
- Payment History row has Mode = `SEPA`, Status = `FAILED`.
- Failure Reason mentions compliance/review path.
- No account balance change.

Observability talking points:
- Payment service warn log shows SEPA threshold rejection.

---

### Failure 3: Card Rail Blocked for Credit Card Repayment Payee

Click-by-click:
1. Go to Payments.
2. Set Payment Rail = `CARD`.
3. Set Settlement Type = `INSTANT`.
4. Select Payee = `Credit Card Repayments` (`PAY005`).
5. Amount = `30.00`.
6. Reference = `DEMO-F3-CARD-PAYEE`.
7. Click Submit Payment.

Expected outcomes:
- Error banner with status `FAILED`.
- Payment History row has Rail = `CARD`, Status = `FAILED`.
- Failure Reason states card rail is not allowed for that payee.
- No change in available card credit.

Observability talking points:
- Payment service warn log shows business-rule rejection for rail/payee mismatch.

---

### Presenter Checklist (Quick Verification)

- Account rail success updates both balance and account transaction list.
- Card rail success updates card transactions and available credit separately.
- Failed payments are visible in Payment History with explicit reason.
- Service logs clearly differentiate success and rejection paths for observability storytelling.

