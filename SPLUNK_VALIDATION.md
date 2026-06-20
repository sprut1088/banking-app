# P1-T4 Splunk Ingestion Pipeline Validation

This runbook validates Splunk ingestion using the existing hardcoded `splunk_hec` mapping in `otel-collector-config.yaml`.

Scope covered:
- Validate exporter mapping (endpoint, token, source, sourcetype, index)
- Verify logs pipeline exports to `splunk_hec`
- Verify searchable fields in Splunk (`payment_id`, `error_code`, `trace_id`)

## 1. Assumptions

- Splunk is running and reachable at `http://10.235.21.132:8088/services/collector` from the `otel-collector` container.
- Splunk HEC token in `otel-collector-config.yaml` is valid and allowed to write to index `banking`.
- P1-T1 and P1-T2 are already implemented (structured logs + correlation propagation).
- Stack is started from repo root with `docker compose up --build`.

## 2. Static Config Validation

Run from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-p1-t4.ps1
```

Expected output:
- PASS for `splunk_hec` endpoint/token/source/sourcetype/index
- PASS for logs pipeline exporters containing `splunk_hec`

## 3. Runtime Validation (Collector)

Run from repo root:

```powershell
docker compose logs otel-collector --tail 300
```

Check for:
- No repeated auth errors (`401`, `403`) for `splunk_hec`
- No connection errors (`connection refused`, `timeout`)
- No permanent export failures/retries

Optional filtered checks:

```powershell
docker compose logs otel-collector --tail 500 | findstr /I "splunk_hec error failed 401 403 timeout refused"
```

## 4. Generate Test Events

Create a few app events via UI:
- Login success
- Payment success
- Payment failure (use reference containing `FAIL`)

This ensures both normal and error logs are emitted.

## 5. Splunk Search Validation

In Splunk Search UI, use:

```spl
index=banking source="banking-app" sourcetype="java-otel"
```

Then verify dimensions:

```spl
index=banking payment_id=*
```

```spl
index=banking error_code=* OR message="*failed*"
```

```spl
index=banking trace_id=* | stats count by trace_id
```

For journey check, pick one trace id and run:

```spl
index=banking trace_id="<trace-id>"
```

## 6. Evidence To Attach In TASK_TRACKER

- Output of `scripts/validate-p1-t4.ps1`
- Collector log snippet showing healthy export behavior
- Splunk screenshot/query result for `payment_id=*`
- Splunk screenshot/query result for a single `trace_id` journey
- Splunk screenshot/query result for failure search (`error_code` or failed message)

## 7. Common Issues

- HEC 401/403:
  - Token invalid, disabled, or missing index permission
- Connectivity failure:
  - Splunk not reachable from collector container IP/network
- Missing fields in Splunk:
  - Upstream logs not JSON (re-check P1-T1)
  - Extraction/parsing settings in Splunk need adjustment
