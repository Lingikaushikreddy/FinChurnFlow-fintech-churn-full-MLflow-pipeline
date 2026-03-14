# Development Guide

This document provides detailed information for developers working on Razorpay Nano.

## Project Structure

```
razorpay-nano/
├── mobile/                     # React Native App
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Base components (Button, Input, Card)
│   │   │   ├── AmountInput    # Currency input with quick amounts
│   │   │   ├── TransactionItem# Transaction display
│   │   │   ├── QRDisplay      # QR code with share options
│   │   │   └── ContactPicker  # Contact selection modal
│   │   ├── screens/           # Screen components
│   │   │   ├── auth/          # LoginScreen, OTPScreen, OnboardingScreen
│   │   │   ├── home/          # DashboardScreen
│   │   │   ├── payments/      # QRCodeScreen, PaymentLinksScreen
│   │   │   ├── payouts/       # PayoutScreen, ContactsScreen
│   │   │   ├── transactions/  # TransactionListScreen
│   │   │   └── profile/       # ProfileScreen
│   │   ├── navigation/        # React Navigation configuration
│   │   ├── services/          # API client (axios-based)
│   │   ├── store/             # Redux Toolkit
│   │   │   ├── slices/        # authSlice, merchantSlice, etc.
│   │   │   └── index.ts       # Store configuration
│   │   ├── hooks/             # Custom React hooks
│   │   ├── i18n/              # Internationalization (en, hi, ta, te, mr)
│   │   ├── utils/             # Formatters, validators
│   │   └── theme/             # Design system (colors, spacing, shadows)
│   └── App.tsx                # Entry point
│
├── backend/                    # FastAPI Microservices
│   ├── shared/                # Shared code
│   │   ├── config.py          # Environment configuration
│   │   ├── database/
│   │   │   ├── connection.py  # Async SQLAlchemy setup
│   │   │   └── models.py      # ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── utils/             # Security, helpers
│   ├── auth/                  # Authentication service
│   │   ├── main.py            # FastAPI app
│   │   ├── routes/auth.py     # Auth endpoints
│   │   └── services/          # JWT, OTP services
│   ├── gateway/               # API Gateway
│   │   ├── main.py            # Request routing
│   │   └── middleware/        # Auth, rate limiting
│   ├── payments/              # Payment service
│   │   ├── routes/            # QR, links, transactions
│   │   └── services/          # Mock Razorpay
│   ├── payouts/               # Payout service
│   │   ├── routes/            # Transfers, contacts
│   │   └── services/          # Mock RazorpayX
│   ├── store/                 # E-commerce service
│   ├── payroll/               # Payroll service
│   ├── ai/                    # AI/NLU service
│   ├── notifications/         # Notification service
│   └── reports/               # Analytics service
│
└── infra/
    ├── docker/
    │   └── Dockerfile.service
    └── docker-compose.yml
```

## Backend Services

### Service Ports
| Service | Port | Description |
|---------|------|-------------|
| Gateway | 8000 | API Gateway (main entry point) |
| Auth | 8001 | Authentication & JWT |
| Payments | 8002 | Payment collection |
| Payouts | 8003 | Money transfers |
| Store | 8004 | Product catalog |
| Payroll | 8005 | Employee management |
| AI | 8006 | NLU & chat |
| Notifications | 8007 | SMS/WhatsApp |
| Reports | 8008 | Analytics |

### Database Schema

The application uses PostgreSQL with the following main tables:

- **merchants** - Merchant profiles
- **transactions** - Payment/payout transactions
- **contacts** - Beneficiary contacts
- **payment_links** - Generated payment links
- **qr_codes** - Static/dynamic QR codes
- **products** - Store products
- **orders** - Customer orders
- **employees** - Payroll employees
- **salary_payments** - Salary history

### API Authentication

1. User sends phone number to `/auth/otp/send`
2. Backend sends OTP via SMS
3. User verifies with `/auth/otp/verify`
4. Backend returns JWT access + refresh tokens
5. All API calls include `Authorization: Bearer <token>`

Token lifetimes:
- Access token: 15 minutes
- Refresh token: 30 days

## Mobile App

### State Management

Redux Toolkit slices:

```typescript
// Auth slice
- isAuthenticated: boolean
- accessToken: string | null
- refreshToken: string | null
- phone: string | null
- isLoading, error

// Merchant slice
- merchant: MerchantProfile | null
- isOnboarded: boolean
- todaySummary: { collection, payouts, netBalance }

// Transactions slice
- items: Transaction[]
- isLoading, isLoadingMore
- total, page, pageSize
- filters: { type, status, dateRange }

// Contacts slice
- items: Contact[]
- searchQuery: string
- isLoading, total, page
```

### Navigation Structure

```
RootStack
├── AuthStack (if !isAuthenticated)
│   ├── Login
│   └── OTP
├── Onboarding (if !isOnboarded)
└── MainTab (if authenticated & onboarded)
    ├── Home (Dashboard)
    ├── Payments
    │   ├── QRCode
    │   └── PaymentLinks
    ├── Payouts
    │   ├── PayoutMain
    │   └── Contacts
    ├── Transactions
    └── Profile
```

### Theming

The design system is defined in `src/theme/index.ts`:

```typescript
colors: {
  primary: '#2563EB',      // Razorpay blue
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  // ...
}

spacing: {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48
}
```

### Internationalization

Supported languages:
- English (en) - Default
- Hindi (hi) - हिंदी
- Tamil (ta) - தமிழ்
- Telugu (te) - తెలుగు
- Marathi (mr) - मराठी

Usage in components:
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <Text>{t('home.greeting.morning')}</Text>;
};
```

## Running the Application

### Backend

```bash
# Start all services
cd backend
docker-compose up -d

# View logs
docker-compose logs -f gateway

# Restart a service
docker-compose restart auth

# Stop all services
docker-compose down
```

### Mobile

```bash
cd mobile

# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Testing API Endpoints

```bash
# Send OTP
curl -X POST http://localhost:8000/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Verify OTP (use 123456 for testing)
curl -X POST http://localhost:8000/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'

# Create QR code (with token)
curl -X POST http://localhost:8000/payments/qr \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

## Code Style

### TypeScript (Mobile)
- Use functional components with hooks
- Use TypeScript interfaces for props
- Follow React Native naming conventions
- Use absolute imports with path aliases

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints for all functions
- Use async/await for database operations
- Use Pydantic for request/response validation

## Adding New Features

### Adding a New Screen (Mobile)

1. Create screen component in `src/screens/<category>/`
2. Add to navigation in `src/navigation/index.tsx`
3. Add translations to all i18n files
4. Create/update Redux slice if needed

### Adding a New API Endpoint (Backend)

1. Add Pydantic schema in `shared/schemas/`
2. Add route in service's `routes/` directory
3. Update service's `main.py` to include route
4. Add to gateway routing if needed

### Adding a New Language

1. Create translation file: `src/i18n/<code>.json`
2. Import in `src/i18n/index.ts`
3. Add to `LANGUAGES` array
4. Add to resources object

## Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check if PostgreSQL is running
docker-compose ps db

# View database logs
docker-compose logs db
```

**Redis connection error:**
```bash
# Check Redis status
docker-compose ps redis
```

### Mobile Issues

**Metro bundler issues:**
```bash
# Clear cache
npm start -- --reset-cache

# Clean build (iOS)
cd ios && rm -rf build && pod install && cd ..

# Clean build (Android)
cd android && ./gradlew clean && cd ..
```

**Dependencies issues:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```
