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

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:7080")
TOTAL_TPS_MIN = float(os.getenv("TOTAL_TPS_MIN", "2"))
TOTAL_TPS_MAX = float(os.getenv("TOTAL_TPS_MAX", "3"))
SCREEN_FLOW_COUNT = float(os.getenv("SCREEN_FLOW_COUNT", "5"))

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


def _next_sleep_seconds():
    total_tps = random.uniform(min(TOTAL_TPS_MIN, TOTAL_TPS_MAX), max(TOTAL_TPS_MIN, TOTAL_TPS_MAX))
    per_flow_tps = max(0.05, total_tps / max(1.0, SCREEN_FLOW_COUNT))
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
                response = await client.post(f"{GATEWAY_URL}/api/auth/login", json={"username": username, "password": password})
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
                await client.get(
                    f"{GATEWAY_URL}/api/accounts/{customer_id}",
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
                await client.get(
                    f"{GATEWAY_URL}/api/transactions/{customer_id}",
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
                await client.get(
                    f"{GATEWAY_URL}/api/cards/{customer_id}",
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
                response = await client.post(
                    f"{GATEWAY_URL}/api/payments/submit",
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
