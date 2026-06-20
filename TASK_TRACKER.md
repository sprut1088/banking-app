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

## Phase 5 - Real Banking UX and Domain Feature Depth

### P5-T1 Design System Foundations
- [ ] Task ID: P5-T1
- Set: 5.1
- Functional outcome: UI looks cohesive and enterprise-banking grade.
- Technical scope:
  - Define typography scale, spacing tokens, color semantics, and elevation rules.
  - Implement reusable components: button, input, card, table, badge, modal, toast.
  - Add dark/light and high-contrast variants.
- Dependencies: none
- Owner: UNASSIGNED
- Status: IN_REVIEW
- Started On: 2026-06-20
- Closed On: _
- Evidence: Added tokenized theme system (light/dark/high-contrast), reusable UI primitives (Button, InputField, Card, Badge, DataTable, Modal, Toast), and integrated primitives into login/dashboard/navbar without changing business API flows.
- Acceptance checks:
  - All major screens use shared components and tokens.
  - Accessibility contrast checks pass for key views.

### P5-T2 Navigation and Information Architecture Refresh
- [ ] Task ID: P5-T2
- Set: 5.1
- Functional outcome: app navigation feels like a real retail banking portal.
- Technical scope:
  - Add sidebar/top-nav sections: Overview, Accounts, Cards, Payments, Transfers, Statements, Security, Support.
  - Add breadcrumb and page-level context headers.
  - Add global search entry point.
- Dependencies: P5-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - User reaches any key workflow in <=3 clicks.
  - Active navigation and route guards work consistently.

### P5-T3 Customer Profile and KYC Snapshot
- [ ] Task ID: P5-T3
- Set: 5.2
- Functional outcome: demo includes realistic customer identity context.
- Technical scope:
  - Add profile page with KYC level, risk band, residency, and verification status.
  - Add editable contact preferences and communication channels.
  - Add mock document verification timeline.
- Dependencies: P5-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Profile data loads from API and persists mock updates.
  - KYC state is visible in payment and transfer eligibility decisions.

### P5-T4 Account Portfolio Experience
- [ ] Task ID: P5-T4
- Set: 5.2
- Functional outcome: accounts page resembles multi-product banking view.
- Technical scope:
  - Add account cards for current/savings/loan with balances and trend chips.
  - Add mini balance trend chart for 7d/30d windows.
  - Add account nicknames and favorite account pinning.
- Dependencies: P5-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Portfolio view supports at least 3 account types.
  - Trends and totals stay consistent with transaction data.

### P5-T5 Beneficiaries and Payees Management
- [ ] Task ID: P5-T5
- Set: 5.3
- Functional outcome: users can manage trusted recipients like a real bank app.
- Technical scope:
  - Add beneficiary CRUD with alias, IBAN/account, bank code, country, risk flag.
  - Add verification states: pending, verified, blocked.
  - Add search and filter by status and country.
- Dependencies: P5-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Payment initiation enforces beneficiary status rules.
  - Blocked beneficiaries are prevented with clear errors.

### P5-T6 Transfer and Payment Journey Upgrade
- [ ] Task ID: P5-T6
- Set: 5.3
- Functional outcome: transfer journey supports realistic rails and scheduling.
- Technical scope:
  - Add transfer types: own account, domestic external, international mock.
  - Add scheduling: now, future date, recurring template.
  - Add fee estimate and execution ETA preview.
- Dependencies: P5-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - User can submit instant and SEPA flows with ETA/fees visible.
  - Scheduled transfers are listed with editable/cancel states.

### P5-T7 Card Management Console
- [ ] Task ID: P5-T7
- Set: 5.4
- Functional outcome: card controls mirror modern digital banking apps.
- Technical scope:
  - Add card lock/unlock toggle and channel controls (ATM, ecommerce, POS).
  - Add spend limit controls per day/week/month.
  - Add virtual card create/delete mock flow.
- Dependencies: P5-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Card control changes affect authorization simulation paths.
  - Audit trail captures all control updates.

### P5-T8 Statements and Export Center
- [ ] Task ID: P5-T8
- Set: 5.4
- Functional outcome: demo includes realistic statement workflows.
- Technical scope:
  - Add monthly statement listing by account/card.
  - Add PDF/CSV export mock endpoints and UI actions.
  - Add filters for amount, merchant, category, and status.
- Dependencies: P5-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Statement generation works for at least 6 months mock history.
  - Export actions are logged for compliance demo.

---

## Phase 6 - Accelerator and Automation Demo Enablement

### P6-T1 Demo Persona and Data Seeder
- [ ] Task ID: P6-T1
- Set: 6.1
- Functional outcome: one command prepares rich demo users and events.
- Technical scope:
  - Seed personas: student, salaried, SME owner, high-net-worth.
  - Seed account/card/payment histories with realistic distributions.
  - Add deterministic seed mode for repeatable demos.
- Dependencies: P5-T4, P5-T8
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Seeder can recreate identical scenario data with same seed key.
  - Each persona has distinct behavior and KPI profile.

### P6-T2 Scenario Timeline Orchestrator
- [ ] Task ID: P6-T2
- Set: 6.1
- Functional outcome: presenter can run scripted business storylines end-to-end.
- Technical scope:
  - Define scenario DSL for timed events and expected outcomes.
  - Add execute/pause/resume controls.
  - Emit event timeline logs for playback.
- Dependencies: P6-T1, P4-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - At least 5 scenarios run deterministically.
  - Timeline replay matches expected event order.

### P6-T3 Workflow Automation Hooks
- [ ] Task ID: P6-T3
- Set: 6.2
- Functional outcome: app integrates with automation platforms for accelerator demos.
- Technical scope:
  - Add outbound webhook events for payment status, alert fire, and remediation decision.
  - Add signed webhook payloads and retry policy.
  - Add sample connectors for Logic Apps/Power Automate/Zapier mock.
- Dependencies: P6-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Webhooks deliver with signature and idempotency key.
  - Failed deliveries retry with backoff and dead-letter logging.

### P6-T4 Business Rules No-code Console
- [ ] Task ID: P6-T4
- Set: 6.2
- Functional outcome: non-developer presenters can change thresholds and policies live.
- Technical scope:
  - Add UI for editing rule parameters (limits, review thresholds, alert sensitivity).
  - Persist versioned rule sets with rollback.
  - Add preview mode showing impacted transactions before apply.
- Dependencies: P6-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Rule changes apply without service restart.
  - Rollback restores previous behavior in one action.

### P6-T5 KPI Storyboard Dashboard
- [ ] Task ID: P6-T5
- Set: 6.3
- Functional outcome: executive viewers get value narrative in one screen.
- Technical scope:
  - Add storyboard cards: conversion, failed payments avoided, MTTR, automation savings.
  - Add scenario-aware annotations on KPI charts.
  - Add before/after comparison mode.
- Dependencies: P6-T2, P3-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Dashboard updates live during scenario execution.
  - Before/after metrics are attributable to specific automation steps.

### P6-T6 Demo Recording and Replay Pack
- [ ] Task ID: P6-T6
- Set: 6.3
- Functional outcome: pre-recorded and live demos stay consistent.
- Technical scope:
  - Capture event stream and UI snapshots per scenario run.
  - Add replay mode with timeline scrubber.
  - Export replay package for offline demo environments.
- Dependencies: P6-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Replay reproduces KPI and alert milestones accurately.
  - Export package runs without internet dependency.

---

## Phase 7 - GenAI Banking Assistant Experience

### P7-T1 Domain Knowledge Base and RAG Index
- [ ] Task ID: P7-T1
- Set: 7.1
- Functional outcome: assistant answers banking/product questions grounded in app data.
- Technical scope:
  - Build knowledge sources: product policies, fees, runbooks, FAQ.
  - Create chunking and metadata strategy (topic, region, policy_version).
  - Add retrieval evaluation set with expected answers.
- Dependencies: P5-T6, P6-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Retrieval returns relevant chunks for top 25 demo queries.
  - Hallucination rate is measured and below agreed threshold.

### P7-T2 Conversational Banking Copilot UI
- [ ] Task ID: P7-T2
- Set: 7.1
- Functional outcome: user can ask natural-language questions in-app.
- Technical scope:
  - Add assistant panel with citations and follow-up suggestions.
  - Support intents: explain charge, summarize spend, next best action.
  - Add session context memory toggle.
- Dependencies: P7-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Responses include source citations and confidence bands.
  - UX works on desktop and tablet layouts.

### P7-T3 Natural-language to Query Translator
- [ ] Task ID: P7-T3
- Set: 7.2
- Functional outcome: business users can query transactions without SQL/SPL skills.
- Technical scope:
  - Translate NL intents to safe query templates.
  - Add query guardrails and allowlisted fields.
  - Render generated query and result explanation.
- Dependencies: P7-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Top 20 analytics prompts produce valid queries.
  - Unsafe/unbounded prompts are blocked with guidance.

### P7-T4 AI-assisted Ops Summary Generator
- [ ] Task ID: P7-T4
- Set: 7.2
- Functional outcome: generated incident and daily summaries reduce manual effort.
- Technical scope:
  - Generate daily payment health and alert summary from logs/metrics.
  - Add incident timeline synthesis from trace-linked events.
  - Include human-editable output before publish.
- Dependencies: P1-T5, P6-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Summary includes accurate counts and root-cause hints.
  - Operators can edit and export summary artifacts.

### P7-T5 Prompt Safety, Policy and Redaction Layer
- [ ] Task ID: P7-T5
- Set: 7.3
- Functional outcome: assistant is safe for enterprise demo environments.
- Technical scope:
  - Add PII/PCI redaction before prompt and response rendering.
  - Add prohibited-intent guardrails and response policies.
  - Add prompt/response audit logs with retention settings.
- Dependencies: P7-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Sensitive fields are masked in logs and UI.
  - Policy violations are blocked with deterministic messaging.

### P7-T6 Model Evaluation Harness for Demos
- [ ] Task ID: P7-T6
- Set: 7.3
- Functional outcome: assistant quality can be demonstrated with measurable scores.
- Technical scope:
  - Add offline eval suite: groundedness, relevance, actionability, latency.
  - Add scenario-specific golden answers.
  - Track version-over-version quality trend.
- Dependencies: P7-T1, P7-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Eval report generated in one command.
  - Regressions fail threshold gate.

---

## Phase 8 - Agentic AI Control Plane and Human Oversight

### P8-T1 Agent Goal Planner Service
- [ ] Task ID: P8-T1
- Set: 8.1
- Functional outcome: complex support goals are decomposed into safe sub-tasks.
- Technical scope:
  - Define planner input/output contract.
  - Implement plan decomposition with step dependencies.
  - Add max-step and max-cost constraints.
- Dependencies: P3-T2, P7-T5
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Planner emits deterministic plans for known scenarios.
  - Constraint violations halt execution safely.

### P8-T2 Agent Executor with Tool Permissioning
- [ ] Task ID: P8-T2
- Set: 8.1
- Functional outcome: agents can execute approved actions under strict controls.
- Technical scope:
  - Add permission matrix by role, tool, and environment.
  - Add action sandbox and dry-run mode.
  - Add signed execution records.
- Dependencies: P8-T1, P3-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Unauthorized tool calls are denied and audited.
  - Dry-run produces expected diff/output preview.

### P8-T3 Human-in-the-loop Approval Workbench
- [ ] Task ID: P8-T3
- Set: 8.2
- Functional outcome: high-risk actions require explicit reviewer approval.
- Technical scope:
  - Add approval queue UI with risk score and rationale.
  - Add approve/reject/escalate actions with SLA timers.
  - Add dual-control option for critical operations.
- Dependencies: P8-T2
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Critical actions cannot execute without required approvals.
  - Approval history is immutable and searchable.

### P8-T4 Multi-agent Collaboration Simulator
- [ ] Task ID: P8-T4
- Set: 8.2
- Functional outcome: demos can showcase coordinator/specialist agent patterns.
- Technical scope:
  - Add coordinator and specialist roles (fraud analyst, payments ops, SRE assistant).
  - Add shared memory envelope and conflict resolution rules.
  - Add collaboration trace visualization.
- Dependencies: P8-T1
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - At least 3 multi-agent scenarios execute end-to-end.
  - Collaboration trace shows role handoffs and decisions.

### P8-T5 Agent Governance and Compliance Pack
- [ ] Task ID: P8-T5
- Set: 8.3
- Functional outcome: agent operations meet enterprise governance expectations.
- Technical scope:
  - Add policy checks for data residency, access scope, and action categories.
  - Add monthly governance report export.
  - Add controls mapping to common compliance frameworks.
- Dependencies: P8-T3
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Governance report includes policy breaches and remediations.
  - Controls mapping is available for proposal documents.

### P8-T6 Agent Failure Injection and Recovery Suite
- [ ] Task ID: P8-T6
- Set: 8.3
- Functional outcome: resilience of agentic workflows can be demonstrated live.
- Technical scope:
  - Inject failures: tool timeout, malformed output, dependency outage, policy denial.
  - Add automatic fallback strategies and retry policies.
  - Measure recovery KPIs (time to safe state, task completion rate).
- Dependencies: P8-T2, P8-T4
- Owner: UNASSIGNED
- Status: READY
- Started On: _
- Closed On: _
- Evidence: _
- Acceptance checks:
  - Failure scenarios recover to safe state without data corruption.
  - Recovery KPIs are visible in dashboards and logs.

---

## Expansion Sprint Slice (Recommended)

Start with these 10 tasks to maximize demo impact quickly:

- [ ] P5-T1 Design System Foundations
- [ ] P5-T2 Navigation and Information Architecture Refresh
- [ ] P5-T4 Account Portfolio Experience
- [ ] P5-T6 Transfer and Payment Journey Upgrade
- [ ] P6-T1 Demo Persona and Data Seeder
- [ ] P6-T2 Scenario Timeline Orchestrator
- [ ] P6-T3 Workflow Automation Hooks
- [ ] P7-T1 Domain Knowledge Base and RAG Index
- [ ] P7-T2 Conversational Banking Copilot UI
- [ ] P8-T3 Human-in-the-loop Approval Workbench

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
