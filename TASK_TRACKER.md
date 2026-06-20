# Banking Demo App Phase-wise Task Tracker

This tracker is designed for a 4-person team where anyone can pick a task, execute it, and close it without extra coordination overhead.

Related roadmap: [TODO.md](TODO.md)

## Team Roster

- R1: _Unassigned Name_
- R2: _Unassigned Name_
- R3: _Unassigned Name_
- R4: _Unassigned Name_

## Status Legend

- READY: can be picked now
- IN_PROGRESS: actively being worked
- BLOCKED: waiting on dependency/decision
- IN_REVIEW: PR open, pending review
- CLOSED: merged and verified

## Pick and Close Workflow

1. Pick a READY task and set Owner to R1/R2/R3/R4.
2. Change Status to IN_PROGRESS and set Started On date.
3. Open PR and set Status to IN_REVIEW.
4. After merge and validation, mark checkbox as done, set Status to CLOSED, and fill Closed On + Evidence.

Update format:
- Owner: R1/R2/R3/R4
- Dates: YYYY-MM-DD
- Evidence: PR link, commit SHA, screenshot/log snippet location

---

## Phase 1 - Observability Baseline Maturity

### P1-T1 Structured JSON Logging Schema
- [ ] Task ID: P1-T1
- Set: 1.1
- Functional outcome: all service logs are ingestion-ready and searchable by key business attributes.
- Technical scope:
  - Define schema fields: timestamp, service, env, trace_id, span_id, customer_id, payment_id, error_code, severity, message.
  - Update logback configs in all Java services.
  - Ensure field names are identical across services.
- Dependencies: none
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Standardized logback JSON schema in auth/account/transaction/card/payment/gateway `logback-spring.xml` files.
- Acceptance checks:
  - JSON logs emitted from gateway, payment, account, card, transaction, auth services.
  - Search by payment_id returns correlated entries.

### P1-T2 Correlation Propagation E2E
- [ ] Task ID: P1-T2
- Set: 1.1
- Functional outcome: one request can be traced across gateway and downstream services.
- Technical scope:
  - Ensure trace/span headers are propagated by gateway proxy calls.
  - Validate OTEL context is present in all downstream logs.
  - Add fallback correlation ID generation for non-traced calls.
- Dependencies: P1-T1
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Added CorrelationMdcFilter to all Spring services, propagated trace and correlation headers in gateway proxy and payment downstream RestTemplate interceptor.
- Acceptance checks:
  - Single payment path shows same trace_id in all services.
  - Missing-header requests still carry generated correlation id.

### P1-T3 Payment Lifecycle Metrics Instrumentation
- [ ] Task ID: P1-T3
- Set: 1.2
- Functional outcome: dashboards can show payment health and latency.
- Technical scope:
  - Add counters: payment_submissions_total, payment_success_total, payment_failed_total, payment_repair_attempt_total.
  - Add histograms: payment_processing_duration_ms, downstream_call_duration_ms.
  - Add labels: payment_rail, settlement_type, failure_reason, service_name.
- Dependencies: P1-T1
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Added PaymentMetricsRecorder with counters and histograms; instrumented payment submission/success/failure/repair and downstream/account/card/transaction call latencies in PaymentService.
- Acceptance checks:
  - Metrics visible in /actuator/prometheus (or collector export endpoint).
  - Success/failure scenarios increment expected series.

### P1-T4 Splunk Ingestion Pipeline Validation
- [ ] Task ID: P1-T4
- Set: 1.3
- Functional outcome: logs reliably arrive in Splunk with searchable dimensions.
- Technical scope:
  - Validate otel collector exporters and index/source mapping.
  - Verify structured fields remain queryable in destination.
  - Document ingestion assumptions and local test commands.
- Dependencies: P1-T1
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Added `SPLUNK_VALIDATION.md` runbook and `scripts/validate-p1-t4.ps1` static validator for existing hardcoded splunk_hec mapping and logs pipeline checks.
- Acceptance checks:
  - Query by error_code and payment_id returns events.
  - At least one full transaction journey visible in Splunk.

### P1-T5 Alert Starter Rules
- [ ] Task ID: P1-T5
- Set: 1.3
- Functional outcome: demo can show actionable alerts and SRE signal quality.
- Technical scope:
  - Define 3 alerts: payment failure spike, card rejection burst, rollback event.
  - Add threshold and evaluation windows.
  - Add runbook references to each alert.
- Dependencies: P1-T3, P1-T4
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Added `splunk/savedsearches.p1-t5.conf.template` with 3 alert searches, thresholds and windows; added `SPLUNK_ALERT_RUNBOOK.md` with trigger scripts, payload fields and response runbooks.
- Acceptance checks:
  - All 3 alerts trigger using scripted failure scenarios.
  - Alert payload includes service and error_code context.

---

## Phase 2 - Payment Failure and Repair Foundations

### P2-T1 Error Taxonomy Catalog
- [ ] Task ID: P2-T1
- Set: 2.1
- Functional outcome: failures are stable, classifiable, and automatable.
- Technical scope:
  - Define error codes and categories (PMT-001..PMT-00N).
  - Map each known payment/card/account failure path to one code.
  - Add catalog markdown file for shared reference.
- Dependencies: none
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - No known failure path returns uncoded generic error.
  - Catalog includes cause, HTTP status, retryability.

### P2-T2 API Error Contract Upgrade
- [ ] Task ID: P2-T2
- Set: 2.1
- Functional outcome: API clients and UI receive machine-readable error payloads.
- Technical scope:
  - Extend exception handlers to return error_code, error_category, message.
  - Keep backwards-compatible message field for UI.
  - Update gateway passthrough behavior if needed.
- Dependencies: P2-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - All payment-related errors contain error_code and category.
  - Frontend still displays human-readable failure messages.

### P2-T3 Repair State Model in Payment Records
- [ ] Task ID: P2-T3
- Set: 2.2
- Functional outcome: failed payments are triaged for repair automation.
- Technical scope:
  - Extend payment record with repair_status, repair_confidence, repair_notes.
  - Populate defaults for success and failure paths.
  - Add deterministic ordering field for repair queue.
- Dependencies: P2-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Repairable failures become PENDING.
  - Non-repairable failures become MANUAL_REQUIRED.

### P2-T4 Repair Queue Endpoint
- [ ] Task ID: P2-T4
- Set: 2.2
- Functional outcome: operator/agent can fetch next repair candidates reliably.
- Technical scope:
  - Add endpoint for fetching queue with filters (status, error_code, age).
  - Ensure stable sort order (oldest first or policy-driven).
  - Add pagination for safety.
- Dependencies: P2-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Queue ordering is deterministic across calls.
  - API contract documented in swagger/readme.

### P2-T5 Remediation Tool APIs
- [ ] Task ID: P2-T5
- Set: 2.3
- Functional outcome: bounded internal actions are available for later agent use.
- Technical scope:
  - Add internal endpoints: retry_payment, switch_rail_account_to_card, release_sepa_review.
  - Enforce policy checks and idempotency rules.
  - Return clear action outcomes and updated repair state.
- Dependencies: P2-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Invalid transitions are blocked with explicit error_code.
  - Successful actions update payment and audit records.

### P2-T6 Repair Audit Trail
- [ ] Task ID: P2-T6
- Set: 2.3
- Functional outcome: every repair action is traceable for demo and governance.
- Technical scope:
  - Add audit fields: actor, reason, timestamp, previous_state, new_state.
  - Emit structured audit logs and metrics for actions.
  - Add endpoint to fetch audit trail per payment_id.
- Dependencies: P2-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - All remediation calls create an audit record.
  - Audit records can be queried by payment_id.

---

## Phase 3 - AI Payment Repair Agent Integration

### P3-T1 Tool Contract Specification
- [ ] Task ID: P3-T1
- Set: 3.1
- Functional outcome: Agent Studio can discover and invoke approved tools predictably.
- Technical scope:
  - Define JSON schema for tool input/output.
  - Version contract (v1) and add compatibility policy.
  - Provide examples for investigation and remediation tools.
- Dependencies: P2-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Contract validates all existing tool payloads.
  - Contract doc includes allowed error responses.

### P3-T2 Tool Registry Endpoint
- [ ] Task ID: P3-T2
- Set: 3.1
- Functional outcome: agent can list capabilities before action.
- Technical scope:
  - Add discovery endpoint returning tool metadata and constraints.
  - Include auth requirement, rate limits, and side-effect flags.
  - Add caching headers for efficient polling.
- Dependencies: P3-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Endpoint returns all supported tools with deterministic ordering.
  - Unknown tool invocations are rejected safely.

### P3-T3 Confidence Gate Policy Engine
- [ ] Task ID: P3-T3
- Set: 3.2
- Functional outcome: auto-fix only executes for confidence > 95%.
- Technical scope:
  - Add confidence_score in repair decision object.
  - Implement policy gate branch logic (>0.95 execute, <=0.95 suggest).
  - Persist policy decision reason in audit logs.
- Dependencies: P2-T6
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Both branches demonstrable via test scenarios.
  - Decision and threshold visible in logs.

### P3-T4 Agent Action Idempotency and Safety
- [ ] Task ID: P3-T4
- Set: 3.3
- Functional outcome: repeated agent calls cannot create duplicate side effects.
- Technical scope:
  - Add idempotency keys for remediation actions.
  - Add duplicate request detection with replay-safe response.
  - Add per-tool max-action safeguards.
- Dependencies: P3-T2, P3-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Replayed action returns same logical result, no duplicate mutation.
  - Safety limits are enforced and logged.

### P3-T5 Agent Telemetry Pack
- [ ] Task ID: P3-T5
- Set: 3.3
- Functional outcome: SRE can monitor agent behavior and risk posture.
- Technical scope:
  - Add counters: repair_agent_runs_total, repair_agent_autofix_total, repair_agent_suggest_total, repair_agent_error_total.
  - Add dimensions: tool_name, decision_type, error_code.
  - Add trace spans for agent decision and action execution.
- Dependencies: P3-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Agent metrics visible and increase during demos.
  - Errors attributable by tool_name and error_code.

### P3-T6 Kill Switch and Read-only Mode
- [ ] Task ID: P3-T6
- Set: 3.3
- Functional outcome: demo can safely disable auto-remediation.
- Technical scope:
  - Add runtime flag for kill switch.
  - Add read-only mode allowing investigation but no state mutation.
  - Expose current mode via health/admin endpoint.
- Dependencies: P3-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Kill switch blocks remediation APIs.
  - Read-only mode allows diagnostics calls only.

---

## Phase 4 - Demo Hardening for Client and SRE Proposals

### P4-T1 Scenario Preset Engine
- [ ] Task ID: P4-T1
- Set: 4.1
- Functional outcome: presenter can trigger business/technical scenarios quickly.
- Technical scope:
  - Add preset definitions: salary_day_high_volume, card_outage_burst, sepa_review_backlog, downstream_timeout_flap.
  - Store scenario metadata: expected KPIs, expected alerts, duration.
  - Add API to list available presets.
- Dependencies: P1-T5, P3-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Presets are discoverable and deterministic.
  - Metadata aligns with dashboard expectations.

### P4-T2 One-click Trigger and Reset Controls
- [ ] Task ID: P4-T2
- Set: 4.1
- Functional outcome: demos can start/stop/reset without manual data cleanup.
- Technical scope:
  - Add trigger endpoint per scenario.
  - Add stop and reset endpoints.
  - Ensure reset restores mock data baseline across services.
- Dependencies: P4-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Same scenario yields repeatable outputs after reset.
  - No stale state from previous run.

### P4-T3 Dashboard Template Bundle
- [ ] Task ID: P4-T3
- Set: 4.2
- Functional outcome: client demo environment setup is fast and consistent.
- Technical scope:
  - Provide versioned dashboard JSON templates.
  - Include service health, payment funnel, agent actions, failure taxonomy panels.
  - Add import instructions for each tool target.
- Dependencies: P1-T3, P3-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Fresh environment import takes under 15 minutes.
  - Dashboard shows non-empty data during scenario run.

### P4-T4 Alert Template Bundle
- [ ] Task ID: P4-T4
- Set: 4.2
- Functional outcome: preconfigured alert stories for SRE proposals.
- Technical scope:
  - Add alert templates mapped to error taxonomy and agent metrics.
  - Include severity and escalation routing examples.
  - Add runbook links for each alert.
- Dependencies: P2-T1, P1-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Trigger tests validate each alert rule.
  - Alert payload contains actionable context.

### P4-T5 Smoke and Contract Test Suite
- [ ] Task ID: P4-T5
- Set: 4.3
- Functional outcome: regressions are caught before customer demos.
- Technical scope:
  - Add smoke tests: login, account payment success, card payment success, 3 failure scenarios.
  - Add API contract tests for payment, repair queue, remediation actions.
  - Add deterministic fixtures and cleanup hooks.
- Dependencies: P2-T5, P3-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - One command executes smoke + contract suites.
  - Failures show clear root cause.

### P4-T6 Pre-demo Readiness Command
- [ ] Task ID: P4-T6
- Set: 4.3
- Functional outcome: team can verify demo readiness in one step.
- Technical scope:
  - Add script to check service health, key metrics, log ingestion, and scenario API reachability.
  - Print pass/fail with remediation hints.
  - Add short operator guide in docs.
- Dependencies: P4-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Script returns non-zero on failed checks.
  - Output is readable for non-developers.

---

## Current Sprint Slice (Recommended)

Start with these 6 tasks for highest value and lowest risk:

- [ ] P1-T1 Structured JSON Logging Schema
- [ ] P1-T2 Correlation Propagation E2E
- [ ] P1-T3 Payment Lifecycle Metrics Instrumentation
- [ ] P2-T1 Error Taxonomy Catalog
- [ ] P2-T2 API Error Contract Upgrade
- [ ] P2-T3 Repair State Model in Payment Records

## Weekly Review Template

- Completed this week:
  - _task IDs_
- In progress:
  - _task IDs + blocker_
- Blocked:
  - _task IDs + dependency owner_
- Planned next week:
  - _task IDs_
