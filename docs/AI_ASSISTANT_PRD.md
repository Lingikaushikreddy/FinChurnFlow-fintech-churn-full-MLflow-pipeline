# Nano AI Assistant - Product Requirements Document

**Document Owner:** Product / AI  
**Version:** 1.0  
**Date:** 2026-02-02  
**Status:** Draft  

---

## Executive Summary

The AI Assistant is the **core differentiator** of Nano. It transforms complex financial operations into simple voice conversations, enabling any merchant—regardless of education or tech-savviness—to manage their business money by just speaking naturally in their language.

> **Vision:** *"Sharma ji se 500 lo"* → Payment link created, WhatsApp message ready to send.

---

## Objective

Enable merchants to **complete ALL Quick Actions via voice commands** in English and Hindi, with the same ease as talking to a helper at their shop.

### Success Metrics

| Metric | Target |
|--------|--------|
| Voice command success rate | >85% |
| Time to complete action via voice | <10 seconds |
| User satisfaction (voice vs tap) | Voice preferred by 60%+ |
| Hindi command accuracy | >80% |
| Repeat voice usage (7-day retention) | >50% |

---

## Target Users

### Primary: The Kirana Store Owner
- **Language:** Hindi-first, basic English
- **Tech comfort:** Uses WhatsApp voice notes daily
- **Pain point:** "Typing is slow, I make mistakes"
- **Expectation:** "I should be able to talk to my phone like I talk to my helper"

### Secondary: The Street Vendor
- **Language:** Hindi or regional language only
- **Tech comfort:** Can make calls, use basic apps
- **Pain point:** "I can't read English menus"
- **Expectation:** "Just tell me what to do"

---

## Quick Actions Coverage

The AI Assistant MUST support voice commands for ALL 8 Quick Actions:

| # | Quick Action | Voice Command Examples (English) | Voice Command Examples (Hindi) |
|---|--------------|----------------------------------|-------------------------------|
| 1 | **Show QR** | "Show my QR code", "Open QR" | "QR दिखाओ", "मेरा QR खोलो" |
| 2 | **Create Link** | "Create payment link for 500", "Make link for Sharma ji 1000 rupees" | "500 का लिंक बनाओ", "शर्मा जी से 1000 लेना है" |
| 3 | **Send Money** | "Send 2000 to Rajesh", "Pay Ram 500" | "राजेश को 2000 भेजो", "राम को 500 दो" |
| 4 | **Contacts** | "Show my contacts", "Add new contact Suresh" | "कॉन्टैक्ट दिखाओ", "सुरेश को जोड़ो" |
| 5 | **My Store** | "Open my store", "Add product Samosa 20 rupees" | "मेरी दुकान खोलो", "समोसा जोड़ो 20 रुपये" |
| 6 | **Payroll** | "Show employees", "Pay salary to all" | "कर्मचारी दिखाओ", "सबको सैलरी दो" |
| 7 | **Reports** | "Today's collection", "Show weekly report" | "आज की कमाई", "हफ्ते की रिपोर्ट दिखाओ" |
| 8 | **AI Assistant** | "Help", "What can you do?" | "मदद करो", "क्या कर सकते हो?" |

---

## Functional Requirements

### FR1: Voice Input

#### FR1.1: Voice Activation
- **Trigger methods:**
  - Tap microphone button (primary)
  - Long-press anywhere on home screen (secondary)
  - "Hey Nano" wake word (future)
- **Visual feedback:**
  - Pulsing microphone animation while listening
  - Waveform showing voice amplitude
  - Transcript appearing in real-time

#### FR1.2: Speech-to-Text
- **Languages supported (MVP):**
  - English (India) - `en-IN`
  - Hindi - `hi-IN`
- **Accuracy requirements:**
  - Numbers: >95% (critical for amounts)
  - Names: >85% (for contacts)
  - Commands: >90%
- **Handling:**
  - Auto-detect language (no manual switch needed)
  - Handle mixed language ("Send 500 to राजेश")
  - Handle Indian English accents

#### FR1.3: Listening States
| State | Duration | User Feedback |
|-------|----------|---------------|
| Listening | Max 10 sec | Waveform + "Listening..." |
| Processing | Max 3 sec | "Processing..." spinner |
| No speech detected | After 5 sec silence | "I didn't hear anything. Try again?" |
| Error | Immediate | "Sorry, please try again" |

---

### FR2: Intent Recognition

#### FR2.1: Supported Intents

| Intent | Trigger Phrases (EN) | Trigger Phrases (HI) | Required Entities |
|--------|---------------------|---------------------|-------------------|
| `show_qr` | "show qr", "open qr", "my qr code" | "qr दिखाओ", "qr खोलो" | None |
| `create_payment_link` | "create link", "payment link for [amount]" | "लिंक बनाओ", "[amount] का लिंक" | amount (optional), recipient (optional) |
| `send_money` | "send [amount] to [name]", "pay [name]" | "[name] को [amount] भेजो" | amount (required), recipient (required) |
| `show_contacts` | "show contacts", "my contacts" | "कॉन्टैक्ट दिखाओ" | None |
| `add_contact` | "add contact [name]" | "[name] को जोड़ो" | name (required) |
| `open_store` | "open store", "my store", "products" | "दुकान खोलो", "प्रोडक्ट" | None |
| `add_product` | "add product [name] [price]" | "[name] जोड़ो [price]" | name (required), price (optional) |
| `show_employees` | "show employees", "staff list" | "कर्मचारी दिखाओ" | None |
| `pay_salary` | "pay salary", "process salary" | "सैलरी दो", "सैलरी भेजो" | employee (optional, default=all) |
| `check_balance` | "today's collection", "how much earned" | "आज की कमाई", "कितना हुआ" | period (optional) |
| `show_report` | "show report", "weekly report" | "रिपोर्ट दिखाओ" | period (optional) |
| `help` | "help", "what can you do" | "मदद", "क्या कर सकते हो" | None |

#### FR2.2: Entity Extraction

| Entity | Pattern Examples | Validation |
|--------|-----------------|------------|
| `amount` | "500", "₹500", "500 rupees", "पांच सौ" | Must be positive number |
| `recipient` | "Rajesh", "राजेश", "Sharma ji" | Match against contacts |
| `product_name` | "Samosa", "समोसा", "Chai" | Any text |
| `period` | "today", "weekly", "आज", "हफ्ते" | Enum: today/week/month |

#### FR2.3: Confidence Handling

| Confidence Level | Action |
|-----------------|--------|
| >0.85 | Execute immediately |
| 0.6 - 0.85 | Confirm with user: "Did you mean...?" |
| <0.6 | Ask to repeat: "I didn't understand. Please try again." |

---

### FR3: Action Execution

#### FR3.1: Show QR
```
User: "Show my QR"
AI: "Here's your QR code. Customers can scan to pay you."
→ Navigate to QR Screen
→ QR code displayed with share options
```

#### FR3.2: Create Payment Link
```
User: "Create link for 500 rupees"
AI: "Creating ₹500 payment link..."
→ API call to create link
AI: "Done! Link created. Share on WhatsApp?"
→ Show: [Share WhatsApp] [Copy Link] [Share Other]
```

**With recipient:**
```
User: "Sharma ji se 500 lo"
AI: "Creating ₹500 link for Sharma ji. Should I send on WhatsApp?"
→ [Send to Sharma ji] [Just Copy Link]
```

#### FR3.3: Send Money
```
User: "Send 2000 to Rajesh"
AI: "Sending ₹2,000 to Rajesh (rajesh@upi). Please confirm with PIN."
→ Show PIN entry
→ On success: "Done! ₹2,000 sent to Rajesh. UTR: ABC123"
```

**Contact not found:**
```
User: "Send 1000 to Mohan"
AI: "I don't have Mohan in your contacts. Do you want to add them?"
→ [Add Mohan] [Enter UPI ID] [Cancel]
```

#### FR3.4: Open Contacts
```
User: "Show contacts"
AI: "Opening your contacts..."
→ Navigate to Contacts Screen
```

#### FR3.5: Add Contact
```
User: "Add contact Suresh"
AI: "Adding Suresh. What's their UPI ID or phone number?"
User: "9876543210"
AI: "Added Suresh with phone 9876543210."
```

#### FR3.6: Open Store
```
User: "Open my store"
AI: "Opening your store..."
→ Navigate to Store Screen
```

#### FR3.7: Add Product
```
User: "Add product Samosa 20 rupees"
AI: "Adding Samosa at ₹20. Want to add a photo?"
→ [Add Photo] [Skip] 
→ "Samosa added to your store!"
```

#### FR3.8: Show Employees
```
User: "Show employees"
AI: "You have 3 employees. Opening payroll..."
→ Navigate to Payroll Screen
```

#### FR3.9: Pay Salary
```
User: "Pay salary"
AI: "3 employees pending salary. Total: ₹45,000. Process all?"
→ [Pay All ₹45,000] [Select Employees] [Cancel]
→ PIN verification
→ "Salaries sent to 3 employees!"
```

#### FR3.10: Check Balance / Reports
```
User: "Aaj kitna hua?"
AI: "Today's collection: ₹12,500 from 8 payments. 
     Payouts: ₹3,000
     Net: ₹9,500"
→ [View Details] [Share Report]
```

---

### FR4: Voice Response (Text-to-Speech)

#### FR4.1: Response Voice
- Use natural Indian English/Hindi voice
- Speed: Slightly slower than default (0.9x)
- Pitch: Friendly, not robotic

#### FR4.2: Response Strategy
| Scenario | Voice Response | Screen Action |
|----------|---------------|---------------|
| Simple info | Full voice response | Show info card |
| Action needed | Short confirmation | Show action buttons |
| Error | Apologize + suggest | Show retry option |
| Long data | Summary only | Navigate to full screen |

#### FR4.3: Interruptible
- User can tap anywhere to stop voice response
- New voice command cancels current response

---

### FR5: Conversation Context

#### FR5.1: Multi-turn Conversations
```
User: "Create payment link"
AI: "For how much?"
User: "500"
AI: "Creating ₹500 link... Done! Share on WhatsApp?"
User: "Yes"
AI: → Opens WhatsApp share
```

#### FR5.2: Context Memory
- Remember last 5 exchanges
- Remember last mentioned:
  - Amount
  - Recipient
  - Product
- Context expires after 2 minutes of inactivity

#### FR5.3: Corrections
```
User: "Send 500 to Rajesh"
AI: "Sending ₹500 to Rajesh..."
User: "No, 5000"
AI: "Okay, sending ₹5,000 to Rajesh instead. Confirm?"
```

---

### FR6: Error Handling

| Error | User Message | Recovery |
|-------|--------------|----------|
| No internet | "You're offline. Try again when connected." | Queue action if possible |
| API failure | "Something went wrong. Please try again." | Retry button |
| Low confidence | "I'm not sure I understood. Did you mean...?" | Show options |
| Unsupported language | "I understand English and Hindi. Please try again." | - |
| Amount too high | "That's a large amount (₹1,00,000). Please confirm." | Confirm dialog |
| Contact not found | "I don't have [name] in contacts. Add them?" | Add contact flow |
| Insufficient balance | "You don't have enough balance for this payout." | Show balance |

---

## Non-Functional Requirements

### NFR1: Performance
| Metric | Requirement |
|--------|-------------|
| Voice-to-text latency | <2 seconds |
| Intent recognition | <500ms |
| Action execution | <3 seconds |
| Total voice-to-result | <6 seconds |

### NFR2: Reliability
- Offline fallback: Show error, allow manual action
- Retry mechanism: Auto-retry once on failure
- Graceful degradation: If AI fails, offer manual flow

### NFR3: Privacy
- Voice data: Process locally when possible
- No voice recording storage
- Sensitive data (PIN, amounts) never spoken by AI
- Comply with data protection regulations

### NFR4: Accessibility
- Voice speed adjustable
- Visual feedback for hearing impaired
- Large tap targets for voice button
- High contrast mode support

---

## User Interface

### UI1: Voice Button
- **Location:** Bottom-right FAB on all screens
- **Size:** 56x56 dp
- **States:**
  - Idle: Microphone icon
  - Listening: Pulsing animation + waveform
  - Processing: Spinner
  - Error: Red tint + shake

### UI2: Chat Interface
- **Access:** Tap AI Assistant quick action OR long-hold voice button
- **Layout:**
  - Message bubbles (user right, AI left)
  - Suggestion chips below input
  - Voice button integrated with text input

### UI3: Inline Voice Response
- When voice command executed from home screen:
  - Show minimal overlay with response
  - Action buttons inline
  - Auto-dismiss after action or 10 seconds

---

## Localization

### L1: Languages (MVP)
| Language | Code | Voice Input | Voice Output | UI |
|----------|------|-------------|--------------|-----|
| English (India) | en-IN | ✅ | ✅ | ✅ |
| Hindi | hi-IN | ✅ | ✅ | ✅ |

### L2: Languages (Phase 2)
| Language | Code | Priority |
|----------|------|----------|
| Tamil | ta-IN | High |
| Telugu | te-IN | High |
| Marathi | mr-IN | Medium |
| Kannada | kn-IN | Medium |
| Bengali | bn-IN | Medium |

### L3: Mixed Language Support
- Handle code-switching: "Send 500 rupees to राजेश"
- Detect primary language from first few words
- Numbers always recognized in both formats

---

## Technical Architecture

### T1: Components
```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Voice Input │→ │ Speech-to-  │→ │ Intent Classifier   │  │
│  │ (react-     │  │ Text        │  │ (local + Gemini)    │  │
│  │ native-     │  │ (Google/    │  │                     │  │
│  │ voice)      │  │ on-device)  │  │                     │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                               │              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────▼──────────┐  │
│  │ Text-to-    │← │ Response    │← │ Action Executor     │  │
│  │ Speech      │  │ Generator   │  │ (API calls)         │  │
│  │ (Expo/      │  │             │  │                     │  │
│  │ native)     │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AI Service  │  │ Gemini API  │  │ Business Services   │  │
│  │ - Intent    │→ │ (fallback   │→ │ - Payments          │  │
│  │   parsing   │  │  for complex│  │ - Payouts           │  │
│  │ - Entity    │  │  queries)   │  │ - Store             │  │
│  │   extraction│  │             │  │ - Payroll           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### T2: Data Flow
1. User speaks → Voice captured
2. Audio → Speech-to-Text → Text transcript
3. Text → Intent Classifier → Intent + Entities
4. Intent → Action Executor → API calls
5. Result → Response Generator → Text response
6. Text → Text-to-Speech → Voice output

### T3: Offline Handling
- Intent classification: Works offline (regex-based)
- Speech-to-Text: Requires network (can use on-device models in future)
- Actions: Queue if offline, execute when online

---

## Testing Requirements

### Test1: Voice Recognition Accuracy
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| English amount | "five hundred rupees" | 500 |
| Hindi amount | "पांच सौ रुपये" | 500 |
| Mixed | "500 rupees को राजेश को" | amount=500, recipient=राजेश |
| Indian accent | "Create payment link" (various accents) | intent=create_payment_link |

### Test2: Intent Classification
| Test Case | Input | Expected Intent |
|-----------|-------|-----------------|
| Create link (EN) | "Make a payment link for 500" | create_payment_link |
| Create link (HI) | "500 का लिंक बनाओ" | create_payment_link |
| Send money (EN) | "Transfer 1000 to Amit" | send_money |
| Send money (HI) | "अमित को 1000 भेजो" | send_money |
| Check balance | "Aaj kitna hua?" | check_balance |
| Open QR | "QR code dikhao" | show_qr |

### Test3: End-to-End Flows
- [ ] Voice → Create Link → Share WhatsApp
- [ ] Voice → Send Money → PIN → Success
- [ ] Voice → Add Product → Photo → Save
- [ ] Voice → Pay Salary → Confirm → PIN → Success
- [ ] Voice → Check Balance → Show Report

### Test4: Error Scenarios
- [ ] No internet during voice command
- [ ] Unintelligible speech
- [ ] Unknown contact name
- [ ] Amount exceeds balance
- [ ] Background noise handling

---

## Rollout Plan

### Phase 1: Beta (Week 1-2)
- English only
- Basic intents: show_qr, create_link, check_balance
- Internal testing with 10 merchants

### Phase 2: Hindi Support (Week 3-4)
- Add Hindi voice recognition
- Add Hindi intents
- Expand to send_money, open_store
- Beta with 50 merchants

### Phase 3: Full Launch (Week 5-6)
- All 8 Quick Actions
- Multi-turn conversations
- Voice response (TTS)
- Public release

### Phase 4: Regional Languages (Future)
- Tamil, Telugu, Marathi
- Based on user demand analysis

---

## Success Criteria for MVP

| Criteria | Target |
|----------|--------|
| Voice command completion rate | >80% |
| Average time to complete action | <8 seconds |
| User complaints about voice | <5% of feedback |
| Voice feature usage (DAU) | >30% of active users |
| Merchant NPS for voice feature | >40 |

---

## Open Questions

1. **Wake word:** Should we implement "Hey Nano" for hands-free activation?
2. **Offline STT:** Should we invest in on-device speech recognition for offline use?
3. **Dialect support:** How do we handle regional Hindi dialects (Bhojpuri, Marwari)?
4. **Accessibility:** Should voice responses be mandatory or optional?

---

## Appendix: Sample Conversations

### A1: Happy Path - Create Payment Link
```
👤 User: "500 ka link banao"
🤖 AI: "₹500 का पेमेंट लिंक बना रहा हूं..."
🤖 AI: "लिंक तैयार है! WhatsApp पर भेजें?"
   [WhatsApp पर भेजें] [लिंक कॉपी करें]
👤 User taps "WhatsApp पर भेजें"
→ WhatsApp opens with pre-filled message
```

### A2: Happy Path - Send Money
```
👤 User: "Rajesh ko 2000 bhejo"
🤖 AI: "राजेश (rajesh@upi) को ₹2,000 भेज रहा हूं। PIN डालें।"
   [PIN Entry: ____]
👤 User enters PIN
🤖 AI: "✅ ₹2,000 भेज दिए! UTR: HDFC123456"
   [ठीक है] [रसीद भेजें]
```

### A3: Error Recovery - Contact Not Found
```
👤 User: "Mohan ko 500 do"
🤖 AI: "मोहन आपके contacts में नहीं है। जोड़ना है?"
   [मोहन जोड़ें] [UPI ID डालें] [रद्द करें]
👤 User: "UPI ID daal do"
🤖 AI: "मोहन का UPI ID बताएं"
👤 User: "mohan@oksbi"
🤖 AI: "₹500 mohan@oksbi को भेज रहा हूं। PIN डालें।"
```

### A4: Multi-turn - Report Query
```
👤 User: "Aaj kitna hua?"
🤖 AI: "आज: ₹12,500 आए, ₹3,000 गए। Net: ₹9,500"
👤 User: "Kal?"
🤖 AI: "कल: ₹8,200 आए, ₹1,500 गए। Net: ₹6,700"
👤 User: "Poore hafte ka?"
🤖 AI: "इस हफ्ते: ₹52,000 आए, ₹12,000 गए। Net: ₹40,000"
   [पूरी रिपोर्ट देखें]
```

---

*This PRD is a living document and will be updated based on user feedback and technical learnings.*
