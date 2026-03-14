# Phase 1: Beta Launch Plan (Week 1-2)

**Status:** Ready with Mocks
**Target:** 10 Selected Merchants
**Scope:** Internal Testing & Verification

## 1. Feature Scope (English Only)

The Beta will focus on validating **Voice-to-Action** workflow using the following supported intents:

| Intent | Voice Command (Examples) | Expected Action | Status |
| :--- | :--- | :--- | :--- |
| **Show QR** | "Show my QR code", "Display QR" | Navigates to QR Screen | ✅ Ready |
| **Create Link** | "Create a payment link for 500", "Generate link" | Navigates to Link Creation | ✅ Ready |
| **Check Balance** | "Show today's collection", "Check balance" | Shows Dashboard/Reports | ✅ Ready |

## 2. Technical Setup

- **Voice Engine:** Uses `MockTranscriber` (Backend).
- **Language:** Hardcoded to `en-IN` for Beta.
- **Data:** Uses `MockPaymentGateway` (No real money).

## 3. Verification Steps (For Tester)

1.  **Login** to the app using any mobile number (OTP is simulated: `123456`).
2.  Press the **Microphone Button** on the Dashboard.
3.  **Speak** one of the commands (e.g., "Show my QR code").
    *   *Note: Since this is using a Random Mock, you may need to try 2-3 times to get the specific intent if the randomizer picks another phrase.*
4.  **Verify** navigation happens correctly.

## 4. Success Criteria

- [ ] 10/10 Merchants can navigate to QR code via voice.
- [ ] 10/10 Merchants can check balance via voice.
- [ ] Latency < 2 seconds for response.

## 5. Next Steps (Post-Beta)

- [ ] Enable Hindi (`hi-IN`) support.
- [ ] Connect Real Google Speech-to-Text API.
