# Nano
## Product Requirements Document (PRD)
### End-to-End Money Movement App for Small Merchants

---

**Version:** 1.0  
**Date:** January 2026

---

## Executive Summary

Nano is a mobile-first money management platform designed specifically for India's 63+ million small merchants. These merchants—kirana store owners, street vendors, local service providers, and small home businesses—currently rely on fragmented UPI apps for payment acceptance but struggle with opening online stores, managing payouts, handling payroll, and generating business reports.

**Our Core Vision:** Make business money management as simple as using any consumer payment app.

Nano transforms complex financial operations into intuitive, WhatsApp-like interactions powered by AI, enabling any merchant to manage their complete money flow—incoming payments, outgoing payouts, employee salaries, and business insights—all from a single, self-serve, no-code mobile application.

---

## Target User Personas

### Primary Persona: The Kirana Store Owner

**Demographics:**
- Age: 35-50 years
- Location: Tier-2/3 city
- Education: 12th pass
- Annual Revenue: ₹15-50 lakhs
- Tech Comfort: Uses WhatsApp, UPI apps, YouTube daily

**Pain Points:**
- "I don't know how much I actually made this month"
- "Creating a website costs ₹50,000 and I don't understand it"
- "Paying my helper's salary on time is always a hassle"
- "I want to sell online but don't know how to start"

**Success Criteria:**
- Complete tasks in under 3 taps
- No English required
- Works on ₹8,000 smartphone
- Instant clarity on money in/out

---

## Product Principles

1. **Vernacular-First:** Every interaction available in 10+ Indian languages
2. **Voice-Native:** Type or speak—AI understands both
3. **3-Tap Maximum:** Any core action completed in ≤3 taps
4. **Offline-Resilient:** Core features work with intermittent connectivity
5. **B2C Familiarity:** UI patterns from apps they already love
6. **Zero Learning Curve:** If you can use WhatsApp, you can use Nano

---

## Core Features

### Module 1: Accept Payments (Money In)

#### Instant Payment Page
- Creation Time: < 60 seconds
- Required Fields: Business name, UPI ID, photo (optional)
- Payment Methods: UPI, Cards, Wallets, Netbanking
- Languages: 12 Indian languages

#### No-Code Online Store
- Products Limit: Up to 100 products (free tier)
- Image Upload: Camera capture or gallery
- Inventory: Optional stock tracking
- Checkout: Integrated payment

#### Flexible Pricing System

**Problem:** Vegetable vendors, fruit sellers, and many kirana stores deal with daily price changes based on wholesale market (mandi) rates. Fixed pricing doesn't work for them.

**Solution:** Multiple pricing modes designed for real-world merchant needs:

| Pricing Mode | Use Case | How It Works |
|--------------|----------|--------------|
| **Fixed Price** | Packaged goods, fixed MRP items | Standard price display |
| **Market Rate** | Vegetables, fruits, eggs | Shows "Market Rate - Call to confirm" |
| **Call for Price** | Bulk orders, custom items | Customer contacts merchant for quote |

**Quick Price Update Features:**

1. **Voice-Based Updates**
   - *"Tamatar 50 rupay, pyaaz 35 rupay, aloo same rehne do"*
   - AI parses and updates prices in seconds
   - Supports Hindi and regional languages

2. **Bulk Price Update Screen**
   - Single screen showing all products with current prices
   - Update multiple prices in under 30 seconds
   - One-tap save for morning price updates

3. **Daily Rate Board**
   - Auto-generate today's price list
   - Share as image to WhatsApp Status/Groups
   - Customers see latest prices before ordering

4. **Price Templates** (Phase 3)
   - Save common price configurations
   - "Monday Prices", "Weekend Prices", "Festival Prices"
   - Load and adjust templates quickly

**Price Unit Flexibility:**
- Per kg, per 500g, per 250g
- Per piece, per dozen
- Per bunch, per packet

#### Payment Links
- Link Generation: < 5 seconds
- Auto-reminder via SMS/WhatsApp
- Partial Payment: Supported
- Tracking: Real-time status

#### Smart QR Code
- Dynamic QR with amount pre-fill
- Instant notification on payment
- Daily collection summary
- Printable standee format

---

### Module 2: Send Payments (Money Out)

#### Vendor Payouts
- Payment Modes: IMPS, NEFT, UPI
- Beneficiary Add: UPI ID, Bank Account, or Phone
- Verification: Penny drop verification
- Bulk Upload: CSV/Excel for multiple payments

#### Bill Payments
- Electricity, mobile, DTH, gas
- BBPS integration
- Auto-fetch bill amount
- Due date reminders

#### Payroll Management
- Employees: Up to 25 (free tier)
- Payment Schedule: Monthly, bi-weekly, weekly
- Auto-Pay: Option to auto-disburse on set date
- Advance Tracking: Record advances, auto-deduct

---

### Module 3: Business Intelligence

#### Unified Dashboard
- Today's money in/out at a glance
- Quick actions for common tasks
- Recent activity feed
- Proactive insights

#### Smart Reports
- Daily Summary (9 PM daily)
- Weekly Digest
- Monthly P&L
- GST-Ready quarterly summary

#### AI Business Insights
- Sales pattern analysis
- Payment reminder suggestions
- Cash flow forecasting
- Inventory alerts

---

## Technical Architecture

### Mobile App (Frontend)
- Framework: React Native (0.73+)
- Language: TypeScript
- State Management: Redux Toolkit
- UI: React Native Paper

### Microservices (Backend)
- Framework: FastAPI (Python 3.11+)
- Database: PostgreSQL (AsyncPG), Redis
- ORM: SQLAlchemy 2.0
- AI Engine: Google Gemini Pro
- Infrastructure: Docker Compose

---

## Roadmap

- **Phase 1: MVP** - Core Payments & Payouts
- **Phase 2: Beta** - Online Store Builder & Payroll
- **Phase 3: Scale** - Full Voice AI & Advanced Analytics

---

*This PRD is a living document and will be updated as we learn more from users and market feedback.*
