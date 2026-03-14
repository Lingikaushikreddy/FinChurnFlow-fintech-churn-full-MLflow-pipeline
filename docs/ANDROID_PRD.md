# 📱 Nano: Android "Market Winner" PRD

**Version:** 1.0
**Target:** Indian SME / Kirana Market (Tier 2/3 Cities)
**Goal:** Build the lightest, fastest, and most trusted business OS for Android.

---

## 1. The Core Philosophy: "Zero Friction"

In India, if an app takes >5 seconds to open or uses >50MB data, it gets uninstalled.
**The Golden Rule:** The app must work on a ₹5,000 phone with 2G network flexibility.

---

## 2. Technical Commandments (Non-Negotiables)

### 2.1. The "15MB Challenge" (APK Size)
*   **Requirement:** Production APK size must remain under **15MB**.
*   **Strategy:**
    *   Enable **ProGuard / R8 Resource Shrinking** aggressively.
    *   Use **Hermes Engine** for smaller JS bundle size.
    *   Convert all assets to **WebP**; no heavy PNGs.
    *   Dynamic delivery for non-critical features (download on demand).

### 2.2. Offline-First Architecture (The Backbone)
*   **Requirement:** The app must be fully functional without internet.
*   **Tech Stack:** `WatermelonDB` (SQLite wrapper).
*   **Behavior:**
    *   **Write:** Sales, Attendance, Invoices are written locally immediately.
    *   **Sync:** Background `WorkManager` job syncs data when connectivity is restored.
    *   **Indicator:** non-intrusive "Offline Mode" banner; "Saved to Device" toast.

### 2.3. Performance Metrics
*   **Cold Start:** < 1.5 seconds.
*   **Frame Rate:** Consistent 60fps on Snapdragon 4-series / MediaTek Helio G-series.
*   **Memory:** Max heap usage < 150MB.

---

## 3. Indian Market Features (The "Wow" Factor)

### 3.1. Vernacular Voice Interface ("Nano Voice")
*   **Overview:** Replace typing with speaking.
*   **Languages:** Hindi, Tamil, Telugu, Marathi, Hinglish.
*   **Use Cases:**
    *   *Merchant says:* "Ramesh ko 500 rupay advance diya."
    *   *App Action:* Creates 'Salary Advance' entry for employee 'Ramesh' for ₹500.
*   **Integration:** Google Speech Recognition API (Android Native) -> Maps to App Intents.

### 3.2. One-Tap SMS & WhatsApp Integration
*   **SMS Retriever API:** Auto-read OTPs. Zero manual entry.
*   **WhatsApp Deep Linking:**
    *   Send Payment Link -> Opens WhatsApp directly with pre-filled message.
    *   Send Salary Slip -> Opens WhatsApp with PDF attached.
    *   *Why?* Lowers trust barrier. "It's not an app, it's just WhatsApp".

### 3.3. "Khata" Ledger Sync
*   **Requirement:** Auto-backup of ledger data.
*   **Trust:** Daily automated PDF report sent to Merchant's WhatsApp at 9 PM (Shop Closing time).

---

## 4. User Interface Guidelines (Native Feel)

*   **Typography:** Use Google Fonts optimized for Indian languages (e.g., *Noto Sans*). Ensure legible font sizes (min 14sp) for older eyes.
*   **Navigation:** Bottom Navigation Bar (Thumb zone). Avoid top-left hamburger menus.
*   **Visuals:** High contrast. Avoid subtle greys. Use distinct colors for "Money In" (Green) and "Money Out" (Red).

---

## 5. Development Roadmap (Android Studio Focus)

### Sprint 1: The Foundation (Week 1-2)
*   Setup **WatermelonDB**.
*   Configure **Hermes** & **ProGuard**.
*   Implement **SMS Retriever API**.

### Sprint 2: The Core Loop (Week 3-4)
*   Build **Background Sync** (WorkManager).
*   Implement **WhatsApp Intent** sharing.
*   Optimize **Cold Start** time.

### Sprint 3: The Magic (Week 5-6)
*   Integrate **Voice-to-Action** floating button.
*   Add **Language Switcher** toggle (Instant switch).

---

## 6. Success Metrics
1.  **Retention:** Day-30 retention > 40%.
2.  **Daily Active Users (DAU):** Avg opens per day > 5.
3.  **Crash Rate:** < 0.2% (Vital for trust).

**Verdict:** Focusing on these specific Android capabilities will differentiate Nano from generic cross-platform apps that feel heavy and slow.
