import asyncio
import logging
from contextlib import suppress
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from load_runner import (
    run_account_flow,
    run_card_flow,
    run_login_flow,
    run_payment_flow,
    run_transaction_flow,
)
from metrics_store import MetricsStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Banking Load Generator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://10.235.21.132:3000", "http://frontend:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = MetricsStore()
flow_tasks: Dict[str, asyncio.Task] = {}
flow_stop_events: Dict[str, asyncio.Event] = {}

FLOW_RUNNERS = {
    "LOGIN_FLOW": run_login_flow,
    "ACCOUNT_FLOW": run_account_flow,
    "TRANSACTION_FLOW": run_transaction_flow,
    "CARD_FLOW": run_card_flow,
    "PAYMENT_FLOW": run_payment_flow,
}


class FlowRequest(BaseModel):
    flows: List[str] = Field(default_factory=list)


def _normalize_flows(requested: List[str]) -> List[str]:
    if not requested:
        return []
    invalid = [f for f in requested if f not in FLOW_RUNNERS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid flows: {', '.join(invalid)}")
    return requested


@app.get("/health")
async def health():
    summary = await store.get_summary()
    return {"status": "ok", "uptime_seconds": summary["uptime_seconds"]}


@app.get("/load/status")
async def load_status():
    return await store.get_summary()


@app.post("/load/start")
async def start_flows(req: FlowRequest):
    requested = _normalize_flows(req.flows)
    if not requested:
        requested = list(FLOW_RUNNERS.keys())

    started = []
    for flow in requested:
        if flow in flow_tasks and not flow_tasks[flow].done():
            continue
        stop_event = asyncio.Event()
        flow_stop_events[flow] = stop_event
        task = asyncio.create_task(FLOW_RUNNERS[flow](store, stop_event), name=flow)
        flow_tasks[flow] = task
        await store.set_flow_active(flow, True)
        started.append(flow)

    if not started:
        raise HTTPException(status_code=409, detail="Requested flows are already running")

    return {"started": started, "message": "Load started"}


@app.post("/load/stop")
async def stop_flows(req: FlowRequest):
    requested = _normalize_flows(req.flows) if req.flows else list(flow_tasks.keys())
    stopped = []

    for flow in requested:
        event = flow_stop_events.get(flow)
        task = flow_tasks.get(flow)
        if event is None or task is None:
            continue

        event.set()
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

        flow_stop_events.pop(flow, None)
        flow_tasks.pop(flow, None)
        await store.set_flow_active(flow, False)
        stopped.append(flow)

    return {"stopped": stopped, "message": "Flows stopped"}


@app.post("/load/stop-all")
async def stop_all_flows():
    for flow in list(flow_tasks.keys()):
        event = flow_stop_events.get(flow)
        task = flow_tasks.get(flow)
        if event is not None:
            event.set()
        if task is not None:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        flow_stop_events.pop(flow, None)
        flow_tasks.pop(flow, None)
        await store.set_flow_active(flow, False)

    return {"message": "All flows stopped"}


@app.post("/load/reset-metrics")
async def reset_metrics():
    await store.reset()
    return {"message": "Metrics reset"}


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)
