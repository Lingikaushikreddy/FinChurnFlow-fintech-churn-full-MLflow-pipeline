# Rust Integration Proposal for Razorpay Nano 🦀

## Why Rust?
For a Fintech application like **Razorpay Nano**, Rust offers three critical advantages over Python/Node.js:
1.  **Memory Safety:** Eliminates entire classes of bugs (null pointers, buffer overflows) without garbage collection pauses. Critical for handling money.
2.  **Concurrency:** Rust's `async/await` model handles thousands of concurrent transactions with a fraction of the resources.
3.  **Correctness:** Strong type system ensures business logic is valid at compile time (e.g., preventing "Double Spending" or "Negative Balance" bugs via type states).

## Proposed Upgrades

### 1. 🚀 The "Hyper-Scale" Gateway (High Impact)
**Current:** Python (FastAPI) acting as a proxy.
**Problem:** Python changes Global Interpreter Lock (GIL), limiting concurrency for high-throughput routing.
**Solution:** Rewrite `gateway` service in **Rust (Axum + Tower)**.
-   **Benefit:** 10x throughput increase.
-   **Latency:** Sub-millisecond routing overhead.
-   **Features:** Efficient Rate Limiting, Request Validation, and Authentication parsing.

### 2. 📒 Immutable Ledger Service (Critical)
**Current:** Logical handling in `payments` service (Python).
**Problem:** Financial integrity relies on application-level checks which can be buggy.
**Solution:** Create a new `ledger` microservice in **Rust (SQLx + PostgreSQL)**.
-   **Role:** The "Source of Truth" for all account balances.
-   **Mechanism:** Double-entry bookkeeping enforced by code.
-   **Safety:** ACID compliance with strict concurrency controls.

### 3. 📱 Shared Core Logic (Mobile + Backend)
**Current:** Logic duplicated in TS (Mobile) and Python (Backend).
**Solution:** Write core validation rules (GST calc, fees, input validation) in Rust.
-   **Backend:** Use via `PyO3` (Python bindings).
-   **Mobile:** Compile to Wasm or use via JSI.
-   **Benefit:** Identical logic on client and server.

## Recommended Pilot: The Ledger Service
I recommend starting by implementing the **Ledger Service** in Rust. This is the heart of the system and benefits most from Rust's safety.

### Technology Stack
-   **Framework:** `Axum` (Web Ops)
-   **Database:** `SQLx` (Async, type-checked SQL)
-   **Serialization:** `Serde` (Fast JSON)
-   **Runtime:** `Tokio`

## Implementation Plan
1.  **Scaffold** `backend/ledger` using `cargo new`.
2.  **Define** Domain Models (Account, Transaction, Entry).
3.  **Implement** API endpoints for `record_transaction` and `get_balance`.
4.  **Dockerize** and add to `docker-compose.yml`.
