# 🧠 Nano: AI Strategy & Value Proposition

**Status:** Draft
**Context:** Transforming Nano from a "Digital Ledger" to an "Intelligent Assistant".

---

## 1. Current Project Stage Analysis

**The Reality:**
Right now, Nano is a **Passive Tool**.
*   It records what happened (Transactions).
*   It shows what is happening (Stock levels).
*   *AI Status:* **Scaffolded but Sleeping.** The backend has `voice.py` and `chat.py`, but they return hardcoded "Mock" responses.

**The Opportunity:**
Shift Nano to an **Active Partner**.
*   It should *hear* what happened (Voice).
*   It should *predict* what will happen (Stockouts/Bad Debt).

---

## 2. AI for the Merchant (The "Smart Manager")

For the busy *Kirana* owner who has no time to type or analyze data.

### 🗣️ 1. The Vernacular Voice Ledger (High Impact)
*   **Problem:** Typing "Hamu Rice 25kg paid 500 pending 200" takes 30 seconds.
*   **AI Solution:**
    *   **Input:** Merchant interacts in Hindi/Tamil: *"Ramesh ke khate mein 200 rupay likh de."*
    *   **AI Action:** Transcribes -> Extracts Entity (Ramesh) -> Extracts Intent (Debit) -> Extracts Amount (200) -> **Updates DB**.
    *   **Tech:** OpenAI Whisper / Google STT + Gemini Flash (for intent).

### 📉 2. "Stock Prophet" (Inventory Prediction)
*   **Problem:** Dead stock sits on shelves; popular items run out on weekends.
*   **AI Solution:**
    *   **Analysis:** "You usually sell 50 packets of Milk on Friday evenings."
    *   **Action:** Friday 4 PM Notification: *"Stock Alert: You only have 10 packets of Milk. Order 40 more now?"*
    *   **Value:** Prevents lost sales.

### 🛡️ 3. Credit Risk Scoring (The "Udhaar" Guard)
*   **Problem:** Merchant gives credit blindly and forgets to collect.
*   **AI Solution:**
    *   Analyze repayment history of customers.
    *   **Visual Cue:** Show a "Green/Red" dot next to a customer's name.
    *   **Advice:** *"Be careful, Raju pays late 80% of the time. Limit credit to ₹500."*

### 🎨 4. Auto-Marketing (WhatsApp Status)
*   **Problem:** Merchant wants to run a sale but can't design posters.
*   **AI Solution:** Generative Image AI (Stable Diffusion/DALL-E).
    *   **Prompt:** "Festival Sale on Rice and Oil."
    *   **Output:** Generates a festive banner with the shop's name.
    *   **Action:** One-tap share to WhatsApp Status.

---

## 3. AI for the Customer (The "Concierge")

For the end-user shopping at the Nano-powered store.

### 💬 1. WhatApp Shopping Bot
*   **Problem:** Customers don't want to download an app for a grocery store.
*   **AI Solution:**
    *   Customer sends photo of a handwritten grocery list to Shop's WhatsApp.
    *   **AI Action:** Vision API extracts items -> Checks Shop Inventory -> meaningful reply: *"We have everything except Brown Bread. Total is ₹450. Send?"*

### 🔔 2. Smart Savings Alerts
*   **Problem:** Missing discounts.
*   **AI Solution:**
    *   "Hey Priya, the Basmati Rice you bought last month is ₹50 off today!"

---

## 4. Technical Roadmap: From Mock to Real

### Step 1: The "Brains" (Backend)
*   **Action:** Integrate **Gemini Flash** (Fast/Cheap) into `backend/shared/ai_client.py`.
*   **Goal:** Replace hardcoded intent classification with LLM calls.

### Step 2: The "Ears" (Mobile)
*   **Action:** Implement **React Native Voice** or **Google Speech API**.
*   **Goal:** Capture raw audio and send to backend `/ai/transcribe`.

### Step 3: The "Eyes" (Vision)
*   **Action:** Integrate **Gemini Pro Vision**.
*   **Goal:** Allow "Scan Product" to identify items without barcodes (using packaging recognition).

---

## 5. Summary

| Feature | For Whom? | Value Prop | Technology |
| :--- | :--- | :--- | :--- |
| **Voice Ledger** | Merchant | Speed (10x faster than typing) | Whisper / STT |
| **Stock Prophet** | Merchant | Cash Flow (No dead stock) | Time-series ML |
| **Shopping Bot** | Customer | Convenience (No app needed) | LLM + Inventory DB |

**Winner Strategy:** Start with **Voice**. It breaks the literacy barrier and is the biggest wow factor for the Indian market.
