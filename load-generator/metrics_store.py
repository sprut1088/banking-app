import asyncio
import statistics
import time
from collections import deque
from prometheus_client import Counter, Gauge, Histogram

LOGINS_TOTAL = Counter("banking_load_logins_total", "Total login attempts")
PAYMENTS_TOTAL = Counter("banking_load_payments_total", "Total payment attempts")
PAYMENTS_SUCCESS = Counter("banking_load_payments_success_total", "Total successful payments")
PAYMENTS_FAILED = Counter("banking_load_payments_failed_total", "Total failed payments")
CARD_VIEWS_TOTAL = Counter("banking_load_card_views_total", "Total card views")
ACCOUNT_VIEWS_TOTAL = Counter("banking_load_account_views_total", "Total account views")
TRANSACTION_VIEWS_TOTAL = Counter("banking_load_transaction_views_total", "Total transaction views")

PAYMENT_LATENCY = Histogram("banking_load_payment_latency_seconds", "Payment latency", buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5))
LOGIN_LATENCY = Histogram("banking_load_login_latency_seconds", "Login latency")
CARD_LATENCY = Histogram("banking_load_card_latency_seconds", "Card latency")

DISTINCT_USERS_GAUGE = Gauge("banking_load_distinct_users", "Distinct users logged in")
PAYMENTS_LAST_10MIN_GAUGE = Gauge("banking_load_payments_last_10min", "Payments in last 10 minutes")
FLOWS_ACTIVE_GAUGE = Gauge("banking_load_flows_active", "Flow active state", ["flow"])


class MetricsStore:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.started_at = time.time()
        self.total_logins = 0
        self.successful_logins = 0
        self.failed_logins = 0
        self.total_account_views = 0
        self.total_transaction_views = 0
        self.total_card_views = 0
        self.total_payments_submitted = 0
        self.successful_payments = 0
        self.failed_payments = 0
        self.login_latency_ms = []
        self.card_latency_ms = []
        self.payment_latency_ms = []
        self.account_latency_ms = []
        self.transaction_latency_ms = []
        self.distinct_users_logged_in = set()
        self.distinct_card_customers = set()
        self.payments_last_10_min = deque()
        self.flows_active = {
            "LOGIN_FLOW": False,
            "ACCOUNT_FLOW": False,
            "TRANSACTION_FLOW": False,
            "CARD_FLOW": False,
            "PAYMENT_FLOW": False,
        }

    def _append_latency(self, bucket, value, max_items=100):
        bucket.append(round(value, 2))
        if len(bucket) > max_items:
            bucket.pop(0)

    def _purge_old_payments(self):
        now = time.time()
        while self.payments_last_10_min and now - self.payments_last_10_min[0] > 600:
            self.payments_last_10_min.popleft()

    async def set_flow_active(self, flow, active):
        async with self.lock:
            self.flows_active[flow] = active
            FLOWS_ACTIVE_GAUGE.labels(flow=flow).set(1 if active else 0)

    async def record_login(self, username, ok, latency_ms):
        async with self.lock:
            self.total_logins += 1
            LOGINS_TOTAL.inc()
            self._append_latency(self.login_latency_ms, latency_ms)
            LOGIN_LATENCY.observe(latency_ms / 1000.0)
            if ok:
                self.successful_logins += 1
                self.distinct_users_logged_in.add(username)
            else:
                self.failed_logins += 1
            DISTINCT_USERS_GAUGE.set(len(self.distinct_users_logged_in))

    async def record_account_view(self, latency_ms):
        async with self.lock:
            self.total_account_views += 1
            ACCOUNT_VIEWS_TOTAL.inc()
            self._append_latency(self.account_latency_ms, latency_ms)

    async def record_transaction_view(self, latency_ms):
        async with self.lock:
            self.total_transaction_views += 1
            TRANSACTION_VIEWS_TOTAL.inc()
            self._append_latency(self.transaction_latency_ms, latency_ms)

    async def record_card_view(self, customer_id, latency_ms):
        async with self.lock:
            self.total_card_views += 1
            CARD_VIEWS_TOTAL.inc()
            self._append_latency(self.card_latency_ms, latency_ms)
            CARD_LATENCY.observe(latency_ms / 1000.0)
            self.distinct_card_customers.add(customer_id)

    async def record_payment(self, ok, latency_ms):
        async with self.lock:
            self.total_payments_submitted += 1
            PAYMENTS_TOTAL.inc()
            self._append_latency(self.payment_latency_ms, latency_ms)
            PAYMENT_LATENCY.observe(latency_ms / 1000.0)
            self.payments_last_10_min.append(time.time())
            self._purge_old_payments()
            PAYMENTS_LAST_10MIN_GAUGE.set(len(self.payments_last_10_min))
            if ok:
                self.successful_payments += 1
                PAYMENTS_SUCCESS.inc()
            else:
                self.failed_payments += 1
                PAYMENTS_FAILED.inc()

    async def get_summary(self):
        async with self.lock:
            self._purge_old_payments()
            p95_payment = 0.0
            if self.payment_latency_ms:
                ordered = sorted(self.payment_latency_ms)
                idx = max(0, int(len(ordered) * 0.95) - 1)
                p95_payment = ordered[idx]

            def avg(values):
                return round(statistics.mean(values), 2) if values else 0.0

            return {
                "total_logins": self.total_logins,
                "successful_logins": self.successful_logins,
                "failed_logins": self.failed_logins,
                "total_account_views": self.total_account_views,
                "total_transaction_views": self.total_transaction_views,
                "total_card_views": self.total_card_views,
                "total_payments_submitted": self.total_payments_submitted,
                "successful_payments": self.successful_payments,
                "failed_payments": self.failed_payments,
                "payments_last_10_min_count": len(self.payments_last_10_min),
                "avg_payment_latency_ms": avg(self.payment_latency_ms),
                "avg_login_latency_ms": avg(self.login_latency_ms),
                "avg_card_latency_ms": avg(self.card_latency_ms),
                "p95_payment_latency_ms": round(p95_payment, 2),
                "distinct_users_count": len(self.distinct_users_logged_in),
                "distinct_card_customers_count": len(self.distinct_card_customers),
                "uptime_seconds": int(time.time() - self.started_at),
                "flows_active": dict(self.flows_active),
            }

    async def reset(self):
        async with self.lock:
            self.total_logins = 0
            self.successful_logins = 0
            self.failed_logins = 0
            self.total_account_views = 0
            self.total_transaction_views = 0
            self.total_card_views = 0
            self.total_payments_submitted = 0
            self.successful_payments = 0
            self.failed_payments = 0
            self.login_latency_ms.clear()
            self.card_latency_ms.clear()
            self.payment_latency_ms.clear()
            self.account_latency_ms.clear()
            self.transaction_latency_ms.clear()
            self.distinct_users_logged_in.clear()
            self.distinct_card_customers.clear()
            self.payments_last_10_min.clear()
            self.started_at = time.time()
            DISTINCT_USERS_GAUGE.set(0)
            PAYMENTS_LAST_10MIN_GAUGE.set(0)
