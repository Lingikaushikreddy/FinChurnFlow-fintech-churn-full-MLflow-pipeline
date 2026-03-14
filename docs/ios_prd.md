# Nano — iOS PRD (Quick Actions MVP)
**Document owner:** Product / Mobile  
**Version:** 1.0  
**Date:** 2026-02-01  
**Location:** `docs/ios_prd.md` (alongside `docs/PRD.md`)

---

## Objective
Deliver an iOS app where the **Quick Actions** on the home screen are **fully functional end-to-end** for a small merchant:
- **Collect money** (QR + payment links)
- **Send money** (payouts)
- **Track money** (transactions + reports)
- **Optionally sell** (catalog/store link) in Beta

This PRD is specific to iOS implementation and acceptance criteria; it aligns with the broader product vision in `docs/PRD.md`.

---

## Target users
- **Primary:** Small merchants who use WhatsApp + UPI daily (e.g., kirana, café, book shop, fruit/veg shop)
- **Key constraint:** In-store usage is time-constrained; flows must be fast, reliable, and low cognitive load.

---

## Key assumptions (explicit)
1. **Collections tracking requirement:** Merchant wants to know **how much is coming via UPI at the shop**.
2. **MVP approach chosen:** **Option 1 (gateway QR)** is acceptable to the business (e.g., Razorpay QR).  
   - This enables accurate, automatic transaction recording via provider events.
3. **Nano is not a bank:** “Send Money” requires a payouts provider (e.g., RazorpayX) and merchant onboarding/KYC as required.

---

## Success metrics (MVP)
- **Quick Actions usability**
  - 100% of Quick Action tiles navigate to a working screen (no dead taps).
  - 90%+ of users can complete “Show QR” and “Create Link” on first attempt (internal QA).
- **Performance**
  - Home screen renders within 1s after app is ready.
  - “Show QR” displays a scannable QR within 2s on a good network.
- **Reliability**
  - Payment/payout status updates are consistent with provider status (webhooks as source of truth).

---

## Scope

### MVP (must ship)
Quick Actions:
- **Show QR** (collections)
- **Create Link** (collections)
- **Send Money** (payouts)
- **Contacts** (beneficiaries)
- **My Store** (catalog + orders + checkout)
- **Reports** (basic)

Platform foundations:
- Auth (OTP) + secure token storage
- Merchant profile & provider connection state
- Transaction list for money-in/money-out
- Webhook-backed status updates (server-side)

### Beta (next)
Quick Actions:
- **Payroll** (employee list + payouts)
- **AI Assistant** (text chat for key intents)

---

## Non-goals (MVP)
- Full “offline-first” ordering (queue-and-sync) for store checkout
- Advanced analytics (forecasting, inventory alerts)
- Multi-outlet / multi-user permissions

---

## Home: Quick Actions grid (definition of “working”)
A tile is considered **working** only if:
- Tap navigates to a real screen (not placeholder)
- The screen completes at least one “happy path” action
- Errors are handled (validation, disconnected provider, network)
- Results persist (shows up in history/transactions)

---

## Functional requirements by Quick Action

## 1) Show QR (Collections)
**User story:** As a merchant, I want to show my shop QR quickly so customers can pay.

### UX / screens
- Home → **Show QR** → `QRScreen`

### Required behavior
- Display a **provider-backed QR** (gateway QR) associated with the merchant account.
- Show merchant name + optional store name.
- Actions:
  - **Share QR** using iOS Share Sheet (image/PDF)
  - **Save** to Photos (permission-gated)

### States
- Loading
- QR ready
- Provider not connected → CTA “Connect provider”
- Error → retry

### Acceptance criteria
- QR is scannable by common UPI apps.
- QR content shown is the provider QR, not a static `upi://pay` VPA-only QR (MVP assumption).

---

## 2) Create Link (Collections)
**User story:** As a merchant, I want to create a payment link and share it on WhatsApp.

### UX / screens
- Home → **Create Link** → `CreatePaymentLinkScreen`
- After creation → `PaymentLinkDetailsScreen`

### Inputs
- Amount (required)
- Note/description (optional)
- Customer phone (optional; improves sharing/reminders)

### Required behavior
- Create a provider payment link via backend.
- Show:
  - Link URL (copy/share)
  - Status (`created`, `paid`, `expired`, `failed`)
  - Created time, amount, reference id
- Sharing:
  - Primary CTA: “Share” (iOS Share Sheet; WhatsApp should appear if installed)

### Acceptance criteria
- The payment link, once paid, updates to `paid` in-app without manual refresh beyond normal polling/reload (webhook-backed).

---

## 3) Send Money (Payouts)
**User story:** As a merchant, I want to pay a supplier/staff to settle dues quickly.

### UX / screens
- Home → **Send Money**
  - If no beneficiaries: route to `AddContactScreen`
  - Else: `SelectBeneficiaryScreen` → `SendMoneyScreen` → `PayoutStatusScreen`

### Inputs
- Beneficiary (required)
- Amount (required)
- Note (optional)
- Payout method (implicit from beneficiary: UPI vs bank)

### Required behavior
- Create payout using provider via backend.
- Show payout status and reference:
  - `queued/processing/success/failed`
  - provider reference id; UTR if available
- Save to payout history.

### Acceptance criteria
- A completed payout appears in transaction history and reports.

---

## 4) Contacts (Beneficiaries)
**User story:** As a merchant, I want to save suppliers/staff so payouts are fast.

### UX / screens
- Home → **Contacts** → `ContactsScreen`
- Add/edit → `AddContactScreen`

### Data model (minimum)
- name (required)
- phone (optional)
- upi_id (optional)
- bank_account + ifsc (optional)
- type/tag (optional: supplier/staff/customer)

### Required behavior
- List + search
- Add/edit/delete (soft delete acceptable)
- Validate:
  - UPI ID format if provided
  - IFSC format if provided

### Acceptance criteria
- Contacts created here are selectable in “Send Money”.

---

## 5) Reports (Basic)
**User story:** As a merchant, I want to see today’s collections/payouts and weekly totals.

### UX / screens
- Home → **Reports** → `ReportsOverviewScreen`
  - “Today”
  - “Last 7 days”
  - Transactions list shortcut

### Required data
- Total collections (money in)
- Total payouts (money out)
- Net (in - out)
- Optional breakdown: QR vs links

### Export/share (optional MVP)
- Share a summary snapshot via iOS Share Sheet

### Acceptance criteria
- Report totals match transactions for the same time window.

---

## Beta Quick Actions (definition only)

## 6) Payroll (Beta)
**Goal:** Maintain employees and run payouts (individual + batch).

Minimum Beta requirements:
- Employee CRUD
- Salary run (batch payouts)
- Payroll history

## 7) AI Assistant (Beta)
**Goal:** Text chat for quick intents.

Minimum Beta intents:
- Create payment link for amount
- “How much received today?”
- Initiate payout to a contact

---

## iOS platform requirements
- **iOS support:** iOS 15+ (or set in project config)
- **Security:** store auth tokens in Keychain
- **Sharing:** use iOS Share Sheet for QR, links, reports
- **Notifications (optional MVP):** push notifications for `payment_received` / `payout_completed`

---

## Backend/API requirements (minimum contract)
iOS needs stable endpoints that abstract provider details:

### Auth
- Request OTP
- Verify OTP → session token
- Get merchant profile (includes provider connection status)

### Collections
- Get QR (payload or image URL)
- Create payment link
- Get payment link details/status
- List transactions (collections)

### Payouts
- Create/update/delete beneficiary/contact
- Create payout
- Get payout status
- List payouts/transactions

### Reports
- Aggregates for today + last 7 days

### Webhooks (server-side)
- Provider webhook receiver(s) with signature verification
- Idempotent event processing

---

## Edge cases & error handling (MVP)
- Provider disconnected / KYC incomplete → block actions with clear CTA
- Network failure → retry, show last known state
- Duplicate webhook events → idempotent handling
- Status mismatch → provider is source of truth; refresh on open

---

## QA acceptance checklist (MVP)
- Tapping each MVP Quick Action navigates correctly.
- Show QR renders and can be scanned to pay.
- Create Link creates a link, can be paid, status becomes `paid` in app.
- Send Money can pay a test beneficiary; status resolves to success/failure and is persisted.
- Contacts can add/edit and is used by Send Money.
- My Store publishes a shareable store link/QR; customer can open it in browser, create an order, pay, and the order is marked paid in Nano.
- Reports totals match the underlying transaction list.

