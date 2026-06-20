# P1-T5 Splunk Alert Starter Rules Runbook

This runbook defines three starter alerts for demo and SRE proposal walkthroughs.

Prerequisites:
- P1-T3 implemented (payment metrics and failure behavior available).
- P1-T4 completed (Splunk ingestion validated).
- Base search returns events:
  - `index=banking source="banking-app" sourcetype="java-otel"`

Related assets:
- Search template: `splunk/savedsearches.p1-t5.conf.template`
- Ingestion validation: `SPLUNK_VALIDATION.md`

## Alert 1: Payment Failure Spike

Intent:
- Detect unusual payment failure volume in short intervals.

Splunk search:
```spl
index=banking source="banking-app" sourcetype="java-otel" (message="*Payment*FAILED*" OR error_code=*)
| bin _time span=5m
| stats count as failures by _time
| where failures >= 3
```

Threshold and evaluation:
- Trigger threshold: `failures >= 3`
- Evaluation window: `last 10m`
- Schedule: every `2m`

Alert payload fields to include:
- `_time`
- `failures`
- `service`
- `trace_id`
- `payment_id`
- `error_code`

Trigger scenario:
- Execute 3 failed payments within 5 minutes.
- Example failure paths:
  - reference includes `FAIL`
  - SEPA payment above threshold

Response steps:
1. Group by `error_code` and `service` to identify top cause.
2. Check if failures are rail-specific (`payment_rail`).
3. Trace one sample via `trace_id` across services.

## Alert 2: Card Rejection Burst

Intent:
- Detect concentrated card payment rejection patterns.

Splunk search:
```spl
index=banking source="banking-app" sourcetype="java-otel" (message="*Card payment failed*" OR message="*Card charge rejected*" OR error_code=PMT-003)
| bin _time span=5m
| stats count as card_rejections values(payment_id) as payment_ids by _time
| where card_rejections >= 2
```

Threshold and evaluation:
- Trigger threshold: `card_rejections >= 2`
- Evaluation window: `last 10m`
- Schedule: every `2m`

Alert payload fields to include:
- `_time`
- `card_rejections`
- `payment_ids`
- `customer_id`
- `error_code`
- `trace_id`

Trigger scenario:
- Run two card rail failures in short interval.
- Example:
  - choose `CARD` rail with disallowed payee `PAY005`
  - attempt payment with blocked/insufficient card conditions

Response steps:
1. Confirm whether failures are policy (`payee mismatch`) or credit/status related.
2. Check card service logs for rejection reason distribution.
3. Validate if same customer/payee pattern repeats.

## Alert 3: Rollback Execution Event

Intent:
- Flag any account rollback flow activation as high-interest technical event.

Splunk search:
```spl
index=banking source="banking-app" sourcetype="java-otel" message="*Payment rollback executed*"
| bin _time span=15m
| stats count as rollback_count values(payment_id) as payment_ids by _time
| where rollback_count >= 1
```

Threshold and evaluation:
- Trigger threshold: `rollback_count >= 1`
- Evaluation window: `last 30m`
- Schedule: every `5m`

Alert payload fields to include:
- `_time`
- `rollback_count`
- `payment_ids`
- `trace_id`
- `customer_id`
- `service`

Trigger scenario:
- Cause transaction-service posting failure after account debit.
- Observe rollback invocation in payment service logs.

Response steps:
1. Validate rollback succeeded by checking account balance adjustment logs.
2. Confirm original downstream failure reason in same trace.
3. Mark scenario as technical resilience demo evidence.

## Suggested Severity and Routing

- Payment Failure Spike: `High` -> App support + SRE channel
- Card Rejection Burst: `Medium` -> Payments support channel
- Rollback Execution Event: `Critical` -> SRE + engineering on-call

## Evidence Checklist for P1-T5 Closure

- Saved searches created/imported from template.
- Screenshot or export of each alert definition (query + schedule).
- Proof each alert triggered using scripted scenario.
- Alert payload sample including `service`, `trace_id`, `payment_id`, `error_code`.
