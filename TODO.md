# Banking Demo App TODO

Purpose: track upcoming features in small, safe implementation sets that can be completed by GitHub Copilot with minimal context loss.

How to use this file:
- Pick one set at a time.
- Keep each implementation PR small (target: 3-8 files changed).
- Do not mix feature work and refactors in one PR.
- Require explicit acceptance checks before moving to next set.

## Guardrails (Copilot-safe execution)

- Only implement tasks listed in the current set.
- Do not infer new requirements beyond this file.
- If a dependency is missing, create a blocking task instead of guessing.
- Add or update tests for each changed flow.
- Keep mock/demo data deterministic for repeatable demos.
- Log every failure path with stable error codes.

## Roadmap Overview

- Phase 1: Observability baseline maturity
- Phase 2: Payment failure and repair foundations
- Phase 3: AI Payment Repair Agent integration
- Phase 4: Demo hardening for client/SRE use

---

## Phase 1: Observability Baseline Maturity

### Set 1.1 - Standardize structured logging across services
Goal: make logs ingestion-ready for Splunk and similar tools.

Tasks:
- Define a common JSON log schema (timestamp, service, env, trace_id, span_id, customer_id, payment_id, error_code, severity, message).
- Update each Java service logback config to include required fields.
- Add request correlation propagation through gateway and downstream services.
- Add a short log field dictionary section in README.

Acceptance:
- All services emit consistent JSON logs.
- A single payment request can be traced end-to-end by trace_id.
- Error logs include error_code and business context fields.

Out of scope:
- New business rules.

### Set 1.2 - Add custom OpenTelemetry metrics for payment lifecycle
Goal: publish demo-focused business/technical metrics.

Tasks:
- Add counters:
  - payment_submissions_total
  - payment_success_total
  - payment_failed_total
  - payment_repair_attempt_total
- Add histograms:
  - payment_processing_duration_ms
  - downstream_call_duration_ms
- Add dimensions/tags:
  - payment_rail, settlement_type, failure_reason, service_name.

Acceptance:
- Metrics are visible in Prometheus scrape output.
- Success/failure scenarios update counters as expected.
- Histogram values are populated during load runs.

Out of scope:
- Dashboard styling.

### Set 1.3 - Splunk-ready ingestion and alert starter pack
Goal: usable observability demos for logs + alerts.

Tasks:
- Verify OTEL collector pipeline for logs export target and index naming.
- Add sample Splunk saved searches for:
  - payment failure rate spikes
  - repeated card charge rejection
  - rollback execution events
- Add sample alert thresholds and runbook links.

Acceptance:
- Demo logs are searchable by payment_id and error_code.
- At least 3 alerts can be triggered by scripted failure scenarios.

Out of scope:
- Enterprise RBAC/tenant setup.

---

## Phase 2: Payment Failure and Repair Foundations

### Set 2.1 - Introduce stable error taxonomy
Goal: predictable failure handling for automation and dashboards.

Tasks:
- Create error catalog (e.g., PMT-001 insufficient_funds, PMT-002 sepa_review, PMT-003 card_blocked, PMT-004 downstream_timeout).
- Return machine-readable error_code and error_category in API responses.
- Ensure logs/metrics include the same error_code.

Acceptance:
- Each known failure path maps to a unique error_code.
- UI displays human message while retaining error_code for debugging.

Out of scope:
- Full i18n/localization.

### Set 2.2 - Add payment repairable state model
Goal: mark which failures are auto-repairable.

Tasks:
- Extend payment record with:
  - repair_status (NOT_APPLICABLE, PENDING, IN_PROGRESS, RESOLVED, MANUAL_REQUIRED)
  - repair_confidence
  - repair_notes
- Add endpoint to fetch repair queue.
- Mark only eligible failures as PENDING.

Acceptance:
- New failed payments are correctly classified as repairable/non-repairable.
- Repair queue endpoint returns deterministic ordering.

Out of scope:
- AI agent execution.

### Set 2.3 - Add remediation action APIs (safe internal tools)
Goal: expose bounded tool actions for future agent use.

Tasks:
- Add internal endpoints for:
  - retry_payment
  - switch_rail_account_to_card (where policy allows)
  - release_sepa_review (demo-only approval path)
- Add audit fields: actor, reason, timestamp, previous_state, new_state.

Acceptance:
- Every remediation action writes audit logs.
- Invalid actions are rejected with clear error codes.

Out of scope:
- Full workflow engine.

---

## Phase 3: AI Payment Repair Agent Integration

### Set 3.1 - Define agent contract and tool registry
Goal: deterministic interface between app and Agent Studio.

Tasks:
- Define tool contract JSON for investigation + remediation tools.
- Add endpoint for tool discovery and capability metadata.
- Add strict input validation and max-action safeguards.

Acceptance:
- Agent can list tools and invoke only allowed operations.
- Rejected tool calls include clear reason and policy reference.

Out of scope:
- LLM prompt experimentation.

### Set 3.2 - Confidence-based auto-resolve policy
Goal: auto-resolve when confidence > 95%, suggest otherwise.

Tasks:
- Add confidence_score field to repair evaluation response.
- Implement policy gate:
  - confidence > 0.95: execute remediation
  - confidence <= 0.95: return recommendation only
- Persist decision traces and rationale in audit logs.

Acceptance:
- Both branches (auto-resolve and suggest-only) are demonstrable.
- Policy decision is visible in logs and UI/admin endpoint.

Out of scope:
- Model training/fine-tuning.

### Set 3.3 - Agent observability and SRE controls
Goal: make agent actions observable and safe.

Tasks:
- Add agent metrics:
  - repair_agent_runs_total
  - repair_agent_autofix_total
  - repair_agent_suggest_total
  - repair_agent_error_total
- Add kill-switch and read-only mode for demos.
- Add replay-safe idempotency keys for actions.

Acceptance:
- Agent activity appears in dashboards with success/error rates.
- Kill-switch prevents remediation while preserving investigation.

Out of scope:
- Multi-agent orchestration.

---

## Phase 4: Demo Hardening for Client and SRE Proposals

### Set 4.1 - Curated business scenarios pack
Goal: mature demo storytelling with repeatable outcomes.

Tasks:
- Add scenario presets:
  - salary day high volume
  - card outage burst
  - sepa review backlog
  - intermittent downstream timeout
- Add one-click scenario trigger endpoints.
- Add teardown/reset endpoint for clean reruns.

Acceptance:
- Each scenario can be started/stopped/reset predictably.
- Scenario metadata includes expected KPIs and alerts.

Out of scope:
- Chaos in production-like infra.

### Set 4.2 - Dashboard and alert templates bundle
Goal: ready-to-use client demo assets.

Tasks:
- Provide versioned dashboard JSON templates.
- Provide alert rule templates mapped to error taxonomy.
- Add screenshot-free walkthrough docs with expected values.

Acceptance:
- New environment can import templates and run demo in under 15 minutes.

Out of scope:
- Vendor-specific premium features.

### Set 4.3 - Reliability and quality gates
Goal: avoid regressions before demos.

Tasks:
- Add smoke tests for login, account payment, card payment, failure cases.
- Add API contract tests for critical endpoints.
- Add pre-demo checklist script to validate service health, logs, and metrics.

Acceptance:
- CI/local check reports pass/fail with clear reasons.
- Demo team can run one command for readiness verification.

Out of scope:
- Full performance certification.

---

## Suggested Execution Order (first 6 sets)

1. Set 1.1
2. Set 1.2
3. Set 2.1
4. Set 2.2
5. Set 2.3
6. Set 3.1

Rationale: build observable, deterministic failure foundations before connecting Agent Studio behavior.

## Definition of Done (applies to every set)

- Scope limited to current set only.
- Tests updated/added for changed behavior.
- Logs include required context fields.
- Metrics updated where relevant.
- README or runbook updated if user-visible behavior changed.
- Demo script remains repeatable from clean startup.
