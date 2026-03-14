# How to Enable Real AI Agent (Gemini)

You can switch Nano from "Mock Mode" to "Real AI Mode" by providing a Google Gemini API Key.

## 1. Get an API Key
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Create a fresh API key.

## 2. Configure Nano
1.  Open `backend/.env` (create it if it doesn't exist).
2.  Add the line:
    ```bash
    GEMINI_API_KEY=AIzaSy...YourKeyHere
    ```

## 3. Verify
1.  Restart the backend:
    ```bash
    cd backend
    docker-compose restart ai
    ```
2.  Use the App's Voice feature.
    *   **Mock Ear:** It will still "hear" one of the random mock phrases (e.g., "Show my QR code").
    *   **Real Brain:** The *response* will now differ. Instead of a hardcoded string, it will be a dynamic, polite response from Gemini (e.g., "Sure, here is your QR code for receiving payments...").

## 4. Current Hybrid State
| Component | Status | Note |
| :--- | :--- | :--- |
| **Transcription (Ear)** | 🟡 Mock | Uses random hardcoded phrases. |
| **Logic (Brain)** | 🟢 Real | Uses Gemini 1.5 Pro to decide actions. |
| **Action (Hand)** | 🟢 Real | Navigates to actual app screens. |
