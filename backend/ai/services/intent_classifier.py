"""Intent classification for natural language understanding."""

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class Intent:
    """Classified intent with entities."""
    intent: str
    confidence: float
    entities: Dict[str, Any]


class IntentClassifier:
    """
    Rule-based intent classifier for payment-related commands.
    Supports multiple Indian languages (Hinglish, Hindi, English, Marathi, Telugu).
    """

    # Intent patterns (regex-based)
    INTENT_PATTERNS = {
        "show_qr": [
            r"(show|open|display|see|view)\s*(my\s*)?(qr|qr\s*code)",
            r"qr\s*(code)?\s*(show|open|display|dikhao|kholo)",
            r"(my|mera)\s*qr(\s*code)?",
            r"scan\s*(code|qr)",
            r"payment\s*qr",
            r"(download|share)\s*(my\s*)?(qr|qr\s*code)",
            # Hindi
            r"qr\s*(दिखाओ|खोलो|दिखा)",
            r"(मेरा|मेरी)\s*qr",
            r"(qr|क्युआर)\s*(कोड|code)?\s*(दिखाओ|show)",
            r"(scan|स्कैन).*(karo|karne)",
            # Marathi
            r"qr\s*(कोड)?\s*(दाखवा|दाखव|उघडा)",
            r"(माझा|माझी)\s*qr(\s*कोड)?",
            # Hinglish
            r"qr\s*(code)?\s*(dikha\s*do|dikha\s*de)",
            r"apna\s*qr\s*(dikhao|kholo)",
            # Telugu
            r"qr\s*(కోడ్)?\s*(చూపించు|చూపు|తెరువు)",
            r"(నా|నాకు)\s*qr(\s*కోడ్)?",
            r"qr\s*(code)?\s*(choopinchu|choopu|chudu|chupinchu)",
        ],
        "create_payment_link": [
            r"(create|make|generate|bana|banao).*(payment\s*link|link)",
            r"(payment\s*)?link.*(create|make|bana|banao|for|of)",
            r"(create|make|generate)\s*(a\s*)?(payment\s*)?link",
            r"link\s*(for|of)\s*(\d+|₹)",
            r"(\d+|₹\d+)\s*(ka|का)?\s*link",
            # Hindi
            r"पेमेंट\s*लिंक\s*(बनाओ|बनाना)",
            r"लिंक\s*(बनाओ|बनाना)",
            r"(\d+)\s*(का|रुपये\s*का)?\s*लिंक",
            # Marathi
            r"पेमेंट\s*लिंक\s*(बनवा|तयार\s*करा)",
            r"लिंक\s*(बनवा|तयार\s*करा)",
            r"(\d+)\s*(चा|रुपयांचा)?\s*लिंक",
            # Hinglish
            r"payment\s*link\s*(bana\s*do|bana\s*de)",
            r"ek\s*link\s*(bana|banao|bana\s*do)",
            # Telugu
            r"(పేమెంట్\s*)?లింక్\s*(సృష్టించు|పంపు|చేయి)",
            r"(\d+)\s*(రూపాయల)?\s*లింక్",
            r"(naaku|naku)\s*(\d+)\s*(ki|link)\s*(link|pampu|panpu)",
            r"link\s*(pampu|panpu|pattu|cheyi)",
        ],
        "check_balance": [
            r"(check|show|what|how much|kitna|kitni).*(balance|collection|kamai|earnings|money)",
            r"(balance|collection|kamai|earnings).*(check|show|batao|dikhao)",
            r"(today|aaj|today's).*(collection|kamai|earning|income|sale|sales)",
            r"how\s*much\s*(did\s*i|have\s*i)?\s*(earn|make|collect)",
            r"(my|today's?)\s*(earnings?|collection|balance|sales?)",
            r"what('?s|\s+is)\s*(my\s*)?(balance|collection|earnings?)",
            # Hindi
            r"आज\s*की\s*(कमाई|collection|सेल)",
            r"(कितना|कितनी)\s*(पैसा|balance|कमाई)",
            r"(आज|अभी)\s*(कितना|कितनी)\s*(हुआ|आया|मिला)",
            # Marathi
            r"आजचे\s*(उत्पन्न|collection|विक्री)",
            r"(किती|कितीय)\s*(पैसे|balance|उत्पन्न)",
            r"(शिल्लक|balance)\s*(दाखवा|सांगा)",
            # Hinglish
            r"aaj\s*(ki|ka)\s*(kamai|collection|sale)",
            r"kitna\s*(paisa|balance|kamai)\s*(hai|hua|aaya)",
            # Telugu
            r"ఈరోజు\s*(సంపాదన|collection|అమ్మకాలు)",
            r"(ఎంత|ఎంతో)\s*(డబ్బు|balance|సంపాదన)",
            r"(naa|naa\s*yokka)\s*(balance|collection|kamai)",
            r"(eppudu|eeroju)\s*(entha|sammpadana)",
            r"eeroju\s*(kamai|collection|balance|entha)",
        ],
        "send_payout": [
            r"(send|transfer|pay|bhejo|dena|de).*(money|payment|rupees|rupaye|₹|\d+)",
            r"(₹|\d+).*(send|transfer|bhejo|dena|de).*(to|ko)",
            r"(पैसे|रुपये|₹\d+).*(भेजो|भेजना|ट्रांसफर)",
            r"(send|transfer|bhejo)\s+(\d+|₹\d+)",
            # Marathi
            r"(पैसे|रुपये|₹\d+).*(पाठवा|पाठव|ट्रान्सफर)",
            r"(\w+)\s*(ला|ना)\s*(\d+|₹\d+)\s*(पाठवा|पाठव|द्या)",
            # Hinglish
            r"paise\s*(bhejo|bhej\s*do|transfer\s*karo)",
            r"(\w+)\s*ko\s*(\d+|₹\d+)\s*(bhejo|bhej\s*do|de\s*do|dena)",
            r"(\d+|₹\d+)\s*(rupaye|rs)?\s*(\w+)\s*ko\s*(bhejo|de\s*do|transfer)",
            # Telugu
            r"(dabbu|paisa|pesa)\s*(pampu|panpu|iyyu|ivvu)",
            r"(\w+)\s*(ki|ku)\s*(\d+|₹\d+)\s*(pampu|panpu|iyyu|ivvu)",
            r"(\d+|₹\d+)\s*(\w+)\s*(ki|ku)\s*(pampu|iyyu|transfer)",
            r"(డబ్బు|పేమెంట్)\s*(పంపు|ఇవ్వు)",
        ],
        "add_product": [
            r"(add|create|new).*(product|item)",
            r"(product|item).*(add|create|jodo|jodhna)",
            r"(नया|new)\s*(product|प्रोडक्ट)",
            r"(प्रोडक्ट|product)\s*(जोड़ो|add)",
            # Marathi
            r"(नवीन|नवा)\s*(product|प्रॉडक्ट|वस्तू)",
            r"(प्रॉडक्ट|वस्तू)\s*(जोडा|add)",
            # Hinglish
            r"naya\s*(product|item|cheez)\s*(add|jodo|daal)",
            r"dukan\s*(ki|ke)\s*(cheezein|products?|items?)\s*(dikhao|batao|add)",
            r"product\s*(add\s*karo|jodo|daal\s*do)",
            # Telugu
            r"(product|item)\s*(add\s*cheyi|pettu|chey)",
            r"(kotta|kotha)\s*(product|vastuvu)\s*(pettu|add|chey)",
            r"(ప్రోడక్ట్|వస్తువు)\s*(జోడించు|యాడ్\s*చేయి|పెట్టు)",
        ],
        "pay_salary": [
            r"(pay|process|do).*(salary|salaries|wages)",
            r"salary.*(pay|process|bhejo|karo)",
            r"(सैलरी|salary)\s*(भेजो|process|pay)",
            r"(वेतन|तनख्वाह).*(भेजो|दो)",
            # Marathi
            r"(पगार|वेतन)\s*(द्या|पाठवा|करा)",
            r"(सर्व|सगळ्या)\s*(कर्मचार्‍यांचा|कर्मचाऱ्यांचा)?\s*(पगार|वेतन)",
            # Hinglish
            r"staff\s*ko\s*salary\s*(do|bhejo|de\s*do)",
            r"sabko\s*salary\s*(bhejo|de\s*do|karo)",
            r"salary\s*(bhej\s*do|de\s*do|process\s*karo)",
            # Telugu
            r"salary\s*(ivvu|iyvu|pampu|process\s*cheyi)",
            r"(andhariki|andariki|staff)\s*salary\s*(ivvu|iyvu|pampu)",
            r"(jeettam|jeetham|జీతం)\s*(ivvu|iyvu|pampu|చెల్లించు)",
        ],
        "get_report": [
            r"(show|get|generate).*(report|summary|analytics)",
            r"(report|summary).*(show|generate|dikhao|batao)",
            r"(रिपोर्ट|report)\s*(दिखाओ|बनाओ|show)",
            r"(monthly|weekly|daily).*(report|summary)",
            # Marathi
            r"(अहवाल|रिपोर्ट)\s*(दाखवा|तयार\s*करा)",
            r"(दैनिक|साप्ताहिक|मासिक)\s*(अहवाल|रिपोर्ट)",
            # Hinglish
            r"report\s*(dikhao|dikha\s*do|batao|bata\s*do)",
            r"(aaj|weekly|monthly)\s*(ka|ki)?\s*report\s*(dikhao|do|batao)?",
            # Telugu
            r"(eeroju|ivaala|ee\s*roju)\s*(katha|report|vivaram)\s*(cheppu|choopinchu|check\s*cheyi|cheyi|ivvu)",
            r"report\s*(choopinchu|cheppu|cheyi|ivvu)",
            r"(daily|weekly|monthly)\s*(katha|report)\s*(cheppu|choopinchu|cheyi)",
            r"(రిపోర్ట్|కథ)\s*(చూపించు|చెప్పు|ఇవ్వు)",
            r"ఈరోజు\s*(కథ|రిపోర్ట్|సమాచారం)",
            r"katha\s*(check|cheppu|choopinchu|cheyi)",
        ],
        "help": [
            r"^(help|madad|sahayata|kya kar sakte)$",
            r"(what can you do|what all|kya kya|help me)",
            r"(मदद|help|सहायता)",
            r"(क्या\s*कर\s*सकते|what\s*can)",
            # Marathi
            r"(मदत|साहाय्य|काय\s*करू\s*शकता)",
            # Telugu
            r"(help|sahayam|madad)\s*(kavali|ivvu|cheyi)",
            r"(emi|em)\s*(cheyali|cheyyaali|cheyagalaru)",
            r"(సహాయం|మదద్)\s*(కావాలి|ఇవ్వు)",
        ],
        "add_credit": [
            # Hinglish Khaata patterns
            r"(khaata|khata|ledger|udhaar|udhar)\s*(mein|me|mai)?\s*(likho|likh\s*do|add|jodo|daal|daalo)",
            r"(add|jodo|likho|likh\s*do|daal|daalo)\s*(credit|udhaar|udhar|khaata|khata)",
            r"(hisab|hisaab)\s*(karo|likho|add|mein\s*daal)",
            r"(\w+)\s*(ke|ka|ki)\s*(khaate|khate|khaata|khata)\s*(mein|me|mai)\s*(\d+)\s*(likho|likh\s*do|add|daal)",
            r"(\d+)\s*(rupaye|rs|₹)?\s*(\w+)\s*(ke|ka|ki)\s*(khaate|khate|naam|name)\s*(pe|par|mein|me)",
            r"(\w+)\s*(ko|ke\s*naam)\s*(\d+|₹\d+)\s*(ka|ki)?\s*(udhaar|udhar|credit)",
            r"(\w+)\s*(ne|ka)\s*(\d+|₹\d+)\s*(liya|udhar\s*liya|kharid)",
            r"(\w+)\s*(ka|ki|ke)\s*(udhaar|udhar|hisaab|hisab)",
            # English credit patterns
            r"add\s*(\d+|₹\d+)\s*(to|for|in)\s*(\w+)(\s*'?s?)?\s*(account|ledger|credit|khaata)?",
            r"(\w+)(\s*'?s?)?\s*(owes?|credit|debit|udhaar)\s*(\d+|₹\d+)",
            r"(record|note|write)\s*(credit|debit|udhaar).*(for|of)\s*(\w+)",
            # Telugu
            r"(udhaar|udhar|khaata)\s*(rayi|raasi|rasuko|add\s*cheyi)",
            r"(\w+)\s*(peru|per)\s*(meeda|meedha)\s*(\d+)\s*(rayi|rasuko|likho)",
            r"(\w+)\s*(ki|ku)\s*(\d+|₹\d+)\s*(udhaar|udhar|credit)\s*(rayi|cheyi)",
            r"(ఉధార్|ఖాతా)\s*(రాయి|రాసుకో|జోడించు)",
        ],
        "share_whatsapp": [
            # Hinglish WhatsApp patterns
            r"(whatsapp|wa|whats\s*app)\s*(pe|par|on|se)?\s*(bhejo|send|share|forward)",
            r"(send|share|bhejo|forward).*(invoice|bill|link|message|msg|yaad).*(whatsapp|wa|whats\s*app)",
            r"(msg|message|yaad|reminder)\s*(whatsapp|wa)\s*(pe|par|se)?\s*(bhejo|send|karo)",
            r"(\w+)\s*(ji|sahab|bhai|ko)\s*(\d+|₹\d+)\s*(ka|ki)?\s*(link|bill|yaad|reminder)\s*(bhejo|send)",
            r"(\w+)\s*(ko|ke\s*paas)\s*(whatsapp|wa|msg)\s*(bhejo|karo|send)",
            r"(whatsapp|wa)\s*(karo|bhejo)\s*(\w+)\s*(ko|ke\s*paas)",
            # English WhatsApp patterns
            r"(send|share)\s*(payment\s*)?link\s*(to|for)\s*(\w+)\s*(on|via|through)\s*(whatsapp|wa)",
            r"(whatsapp|wa)\s*(\w+)\s*(about|for)\s*(payment|₹?\d+)",
            r"remind\s*(\w+)\s*(on|via|through)\s*(whatsapp|wa)",
            # Telugu
            r"(whatsapp|wa)\s*(lo|loo)\s*(pampu|panpu|share|send)",
            r"(\w+)\s*(ki|ku)\s*(whatsapp|wa)\s*(pampu|panpu|cheyi)",
            r"(whatsapp|వాట్సాప్)\s*(లో|లోకి)\s*(పంపు|షేర్)",
        ],
    }

    # Entity extraction patterns
    ENTITY_PATTERNS = {
        "amount": [
            r"₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)",
            r"(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(rupees|rupaye|rs|रुपये|रुपए)",
            r"(rupees|rs|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)",
            r"(\d+(?:,\d{3})*)\s*(?:hundred|thousand|lakh|crore)?",
        ],
        "recipient": [
            r"(?:to|ko)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:ko|को|to)",
            r"([A-Z][a-z]+)\s+(?:ko|को|to)",
        ],
        "customer_name": [
            # Hinglish name extraction for credit/khaata
            r"(\w+)\s*(ke|ka|ki)\s*(khaate|khate|khaata|khata|naam|name)",
            r"(\w+)\s*(ji|sahab|bhai|ko)\s*(\d+|₹)",
            r"(for|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
            r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:'s|ka|ki|ke)",
            r"(\w+)\s*(ne|ka|ki)\s*(\d+|₹\d+)\s*(liya|udhar|udhaar)",
            r"(\w+)\s*(ko|ke\s*paas|ke\s*liye)",
        ],
        "direction": [
            r"\b(credit|jama|diya|de\s*diya|bheja)\b",
            r"\b(debit|liya|udhar\s*liya|lena|kharid)\b",
        ],
        "product_name": [
            r"(?:add|create|jodo)\s+(?:product\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)",
            r"(?:product|item)\s+(?:called\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)",
        ],
        "report_type": [
            r"(daily|weekly|monthly|yearly)\s*(?:report|summary)?",
            r"(?:report|summary)\s+(?:for\s+)?(today|yesterday|this\s+week|this\s+month)",
        ],
        "phone": [
            r"(\+91\s*)?([6-9]\d{9})",
            r"(\d{10})\b",
        ],
    }

    def classify(self, text: str) -> Optional[Intent]:
        """Classify the intent of the given text."""
        text_lower = text.lower().strip()

        best_intent = None
        best_confidence = 0.0

        for intent_name, patterns in self.INTENT_PATTERNS.items():
            for pattern in patterns:
                try:
                    if re.search(pattern, text_lower, re.IGNORECASE):
                        # Calculate confidence based on pattern specificity
                        confidence = 0.8 + (len(pattern) / 100)
                        confidence = min(confidence, 0.99)

                        if confidence > best_confidence:
                            best_intent = intent_name
                            best_confidence = confidence
                except re.error:
                    continue

        if not best_intent:
            return None

        # Extract entities
        entities = self._extract_entities(text)

        # For credit intents, extract direction
        if best_intent == "add_credit":
            entities["direction"] = self._extract_direction(text)

        return Intent(
            intent=best_intent,
            confidence=best_confidence,
            entities=entities,
        )

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities from the text."""
        entities = {}

        for entity_name, patterns in self.ENTITY_PATTERNS.items():
            if entity_name == "direction":
                continue  # handled separately
            for pattern in patterns:
                try:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        # Get the captured group
                        value = match.group(1) if match.lastindex else match.group(0)

                        # Process amount
                        if entity_name == "amount":
                            value = self._parse_amount(value)

                        # Clean up names
                        if entity_name in ("customer_name", "recipient"):
                            value = self._clean_name(value)

                        if value:
                            entities[entity_name] = value
                            break
                except re.error:
                    continue

        return entities

    def _extract_direction(self, text: str) -> str:
        """Extract credit/debit direction from text."""
        text_lower = text.lower()
        debit_words = ["liya", "udhar liya", "lena", "kharid", "debit", "le gaya", "le gaye"]
        credit_words = ["diya", "de diya", "bheja", "credit", "jama", "de diye"]

        for word in debit_words:
            if word in text_lower:
                return "debit"
        for word in credit_words:
            if word in text_lower:
                return "credit"
        # Default: debit means customer owes money (most common khaata usage)
        return "debit"

    def _clean_name(self, name: str) -> Optional[str]:
        """Clean and validate extracted name."""
        if not name:
            return None
        name = name.strip()
        # Remove common non-name words
        stop_words = {
            "the", "a", "an", "for", "of", "to", "in", "on", "at",
            "ke", "ka", "ki", "ko", "ne", "mein", "me", "pe", "par",
            "add", "create", "show", "check", "help",
        }
        if name.lower() in stop_words:
            return None
        if len(name) < 2:
            return None
        return name.title()

    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string to float."""
        try:
            # Remove commas and currency symbols
            cleaned = re.sub(r"[₹,\s]", "", str(amount_str))

            # Handle multipliers
            lower = amount_str.lower() if isinstance(amount_str, str) else ""
            if "hundred" in lower:
                return float(cleaned) * 100
            elif "thousand" in lower or "hazar" in lower or "hazaar" in lower:
                return float(cleaned) * 1000
            elif "lakh" in lower:
                return float(cleaned) * 100000
            elif "crore" in lower:
                return float(cleaned) * 10000000

            result = float(cleaned)
            return result if result > 0 else None
        except (ValueError, TypeError):
            return None

    def get_suggestions(self, intent: Optional[Intent]) -> List[str]:
        """Get follow-up suggestions based on intent."""
        if not intent:
            return [
                "Show my QR code",
                "Create payment link for ₹500",
                "Check today's collection",
                "Help",
            ]

        suggestions_map = {
            "show_qr": [
                "Create payment link",
                "Check balance",
                "Share QR on WhatsApp",
            ],
            "create_payment_link": [
                "₹100",
                "₹500",
                "₹1000",
                "Custom amount",
            ],
            "check_balance": [
                "Show transactions",
                "Weekly report",
                "Show my QR",
            ],
            "send_payout": [
                "Recent contacts",
                "Add new contact",
                "Bulk transfer",
            ],
            "add_product": [
                "Add category",
                "View products",
                "Upload image",
            ],
            "pay_salary": [
                "All employees",
                "Select employees",
                "View pending",
            ],
            "get_report": [
                "Daily report",
                "Weekly report",
                "Monthly report",
            ],
            "help": [
                "Payment links",
                "Payouts",
                "Khaata / Udhaar",
                "WhatsApp bhejo",
            ],
            "add_credit": [
                "Raju ka hisaab dikhao",
                "Udhaar clear karo",
                "Khaata overview",
            ],
            "share_whatsapp": [
                "Send Invoice",
                "Share Payment Link",
                "Send Reminder",
            ],
        }

        return suggestions_map.get(intent.intent, ["Help"])
