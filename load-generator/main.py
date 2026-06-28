import asyncio
import logging
import os
from contextlib import suppress
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from load_runner import (
    get_runtime_config,
    run_account_flow,
    run_card_flow,
    run_login_flow,
    run_payment_flow,
    run_transaction_flow,
    update_runtime_config,
)
from metrics_store import MetricsStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Banking Load Generator", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://10.235.21.132:3000",
        "http://frontend:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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

AUTO_START_FLOWS = os.getenv("AUTO_START_FLOWS", "false").strip().lower() in {"1", "true", "yes", "y", "on"}


class FlowRequest(BaseModel):
    flows: List[str] = Field(default_factory=list)


class LoadConfigRequest(BaseModel):
    total_tps_min: Optional[float] = Field(default=None, gt=0)
    total_tps_max: Optional[float] = Field(default=None, gt=0)
    screen_flow_count: Optional[float] = Field(default=None, gt=0)
    gateway_url: Optional[str] = None


def _normalize_flows(requested: List[str]) -> List[str]:
    if not requested:
        return []
    invalid = [f for f in requested if f not in FLOW_RUNNERS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid flows: {', '.join(invalid)}")
    return requested


def _effective_total_tps_bounds(flows_active: Dict[str, bool], cfg: Dict[str, float]) -> tuple[float, float]:
    active_flow_count = sum(1 for active in flows_active.values() if active)
    if active_flow_count == 0:
        return 0.0, 0.0

    ratio = active_flow_count / max(1.0, float(cfg["screen_flow_count"]))
    min_tps = float(cfg["total_tps_min"]) * ratio
    max_tps = float(cfg["total_tps_max"]) * ratio
    return round(min_tps, 2), round(max_tps, 2)


async def _start_requested_flows(requested: List[str]) -> List[str]:
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
    return started


@app.on_event("startup")
async def startup_event():
    if not AUTO_START_FLOWS:
        logger.info("AUTO_START_FLOWS disabled, waiting for /load/start")
        return

    started = await _start_requested_flows(list(FLOW_RUNNERS.keys()))
    if started:
        logger.info("Auto-started flows: %s", ", ".join(started))
    else:
        logger.info("All flows were already running on startup")


@app.on_event("shutdown")
async def shutdown_event():
    await stop_all_flows()


@app.get("/health")
async def health():
    summary = await store.get_summary()
    return {"status": "ok", "uptime_seconds": summary["uptime_seconds"]}


@app.get("/load/status")
async def load_status():
    summary = await store.get_summary()
    cfg = get_runtime_config()
    effective_min_tps, effective_max_tps = _effective_total_tps_bounds(summary["flows_active"], cfg)
    summary.update(
        {
            "target_total_tps_min": round(float(cfg["total_tps_min"]), 2),
            "target_total_tps_max": round(float(cfg["total_tps_max"]), 2),
            "screen_flow_count": round(float(cfg["screen_flow_count"]), 2),
            "effective_total_tps_min": effective_min_tps,
            "effective_total_tps_max": effective_max_tps,
            "gateway_url": cfg["gateway_url"],
        }
    )
    return summary


@app.get("/load/config")
async def get_load_config():
    return get_runtime_config()


@app.post("/load/config")
async def set_load_config(req: LoadConfigRequest):
    current = get_runtime_config()

    next_min = req.total_tps_min if req.total_tps_min is not None else float(current["total_tps_min"])
    next_max = req.total_tps_max if req.total_tps_max is not None else float(current["total_tps_max"])
    if next_min > next_max:
        raise HTTPException(status_code=400, detail="total_tps_min must be less than or equal to total_tps_max")

    updated = update_runtime_config(
        total_tps_min=req.total_tps_min,
        total_tps_max=req.total_tps_max,
        screen_flow_count=req.screen_flow_count,
        gateway_url=req.gateway_url,
    )
    return {"message": "Load configuration updated", "config": updated}


@app.post("/load/start")
async def start_flows(req: FlowRequest):
    requested = _normalize_flows(req.flows)
    if not requested:
        requested = list(FLOW_RUNNERS.keys())

    started = await _start_requested_flows(requested)

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
