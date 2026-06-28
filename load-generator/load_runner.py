import asyncio
import base64
import logging
import os
import random
import time
import uuid

import httpx

from metrics_store import MetricsStore

logger = logging.getLogger(__name__)

_RUNTIME_CONFIG = {
    "gateway_url": os.getenv("GATEWAY_URL", "http://localhost:7080"),
    "total_tps_min": float(os.getenv("TOTAL_TPS_MIN", "2")),
    "total_tps_max": float(os.getenv("TOTAL_TPS_MAX", "3")),
    "screen_flow_count": float(os.getenv("SCREEN_FLOW_COUNT", "5")),
}

CUSTOMER_CREDENTIALS = {
    "CUST001": ("alice", "pass123"),
    "CUST002": ("bob", "pass456"),
    "CUST003": ("charlie", "pass789"),
    "CUST004": ("diana", "pass321"),
    "CUST005": ("edward", "pass654"),
    "CUST006": ("fiona", "pass987"),
    "CUST007": ("george", "pass111"),
    "CUST008": ("helen", "pass222"),
}
CUSTOMERS = list(CUSTOMER_CREDENTIALS.keys())
PAYEES = ["PAY001", "PAY002", "PAY003", "PAY004", "PAY005"]


def get_runtime_config():
    return dict(_RUNTIME_CONFIG)


def update_runtime_config(total_tps_min=None, total_tps_max=None, screen_flow_count=None, gateway_url=None):
    if total_tps_min is not None:
        _RUNTIME_CONFIG["total_tps_min"] = float(total_tps_min)
    if total_tps_max is not None:
        _RUNTIME_CONFIG["total_tps_max"] = float(total_tps_max)
    if screen_flow_count is not None:
        _RUNTIME_CONFIG["screen_flow_count"] = float(screen_flow_count)
    if gateway_url is not None and gateway_url.strip():
        _RUNTIME_CONFIG["gateway_url"] = gateway_url.strip()
    return get_runtime_config()


def _next_sleep_seconds():
    cfg = get_runtime_config()
    total_tps = random.uniform(min(cfg["total_tps_min"], cfg["total_tps_max"]), max(cfg["total_tps_min"], cfg["total_tps_max"]))
    per_flow_tps = max(0.05, total_tps / max(1.0, cfg["screen_flow_count"]))
    return max(0.01, 1.0 / per_flow_tps)


def _basic_auth(customer_id):
    username, password = CUSTOMER_CREDENTIALS[customer_id]
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
    return f"Basic {token}"


async def run_login_flow(store: MetricsStore, stop_event: asyncio.Event):
    idx = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            customer_id = CUSTOMERS[idx % len(CUSTOMERS)]
            username, password = CUSTOMER_CREDENTIALS[customer_id]
            start = time.perf_counter()
            ok = False
            try:
                gateway_url = get_runtime_config()["gateway_url"]
                response = await client.post(f"{gateway_url}/api/auth/login", json={"username": username, "password": password})
                ok = response.status_code == 200
            except Exception as exc:
                logger.warning("LOGIN_FLOW request failed: %s", exc)
            finally:
                await store.record_login(username, ok, (time.perf_counter() - start) * 1000)
            idx += 1
            await asyncio.sleep(_next_sleep_seconds())


async def run_account_flow(store: MetricsStore, stop_event: asyncio.Event):
    idx = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            customer_id = CUSTOMERS[idx % len(CUSTOMERS)]
            start = time.perf_counter()
            try:
                gateway_url = get_runtime_config()["gateway_url"]
                await client.get(
                    f"{gateway_url}/api/accounts/{customer_id}",
                    headers={"Authorization": _basic_auth(customer_id)},
                )
                await store.record_account_view((time.perf_counter() - start) * 1000)
            except Exception as exc:
                logger.warning("ACCOUNT_FLOW request failed: %s", exc)
            idx += 1
            await asyncio.sleep(_next_sleep_seconds())


async def run_transaction_flow(store: MetricsStore, stop_event: asyncio.Event):
    idx = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            customer_id = CUSTOMERS[idx % len(CUSTOMERS)]
            start = time.perf_counter()
            try:
                gateway_url = get_runtime_config()["gateway_url"]
                await client.get(
                    f"{gateway_url}/api/transactions/{customer_id}",
                    headers={"Authorization": _basic_auth(customer_id)},
                )
                await store.record_transaction_view((time.perf_counter() - start) * 1000)
            except Exception as exc:
                logger.warning("TRANSACTION_FLOW request failed: %s", exc)
            idx += 1
            await asyncio.sleep(_next_sleep_seconds())


async def run_card_flow(store: MetricsStore, stop_event: asyncio.Event):
    idx = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            customer_id = CUSTOMERS[idx % len(CUSTOMERS)]
            start = time.perf_counter()
            try:
                gateway_url = get_runtime_config()["gateway_url"]
                await client.get(
                    f"{gateway_url}/api/cards/{customer_id}",
                    headers={"Authorization": _basic_auth(customer_id)},
                )
                await store.record_card_view(customer_id, (time.perf_counter() - start) * 1000)
            except Exception as exc:
                logger.warning("CARD_FLOW request failed: %s", exc)
            idx += 1
            await asyncio.sleep(_next_sleep_seconds())


async def run_payment_flow(store: MetricsStore, stop_event: asyncio.Event):
    idx = 0
    payee_idx = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            customer_id = CUSTOMERS[idx % len(CUSTOMERS)]
            username, _ = CUSTOMER_CREDENTIALS[customer_id]
            payee_id = PAYEES[payee_idx % len(PAYEES)]
            body = {
                "customerId": customer_id,
                "fromAccount": f"{customer_id}-MAIN-ACC",
                "toPayeeId": payee_id,
                "amount": round(random.uniform(1, 500), 2),
                "reference": f"Load-Test-{uuid.uuid4()}",
                "currency": "EUR",
            }
            start = time.perf_counter()
            ok = False
            try:
                gateway_url = get_runtime_config()["gateway_url"]
                response = await client.post(
                    f"{gateway_url}/api/payments/submit",
                    headers={"Authorization": _basic_auth(customer_id)},
                    json=body,
                )
                ok = response.status_code in (200, 201)
                if not ok:
                    logger.warning("PAYMENT_FLOW non-success status=%s user=%s", response.status_code, username)
            except Exception as exc:
                logger.warning("PAYMENT_FLOW request failed: %s", exc)
            finally:
                await store.record_payment(ok, (time.perf_counter() - start) * 1000)
            idx += 1
            payee_idx += 1
            await asyncio.sleep(_next_sleep_seconds())
