# Cafe Manager — Setup Guide

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- A [Supabase](https://supabase.com) account (free tier is enough)
- Expo Go app on your phone **or** a simulator (iOS Simulator / Android Emulator)

---

## Step 1 — Fix npm permissions (one-time, if needed)

If you see `EACCES` errors from npm, run:

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `cafe-manager`) and a strong database password
3. Select the region closest to you
4. Wait ~2 minutes for the project to provision

---

## Step 3 — Run the database schema

1. In your Supabase dashboard go to **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run** — you should see "Success" for each statement

---

## Step 4 — Get your Supabase credentials

In your Supabase dashboard go to **Project Settings → API**:

| Field | Where to find it |
|-------|-----------------|
| Project URL | `https://<ref>.supabase.co` |
| Anon/Public key | Under "Project API keys" → `anon public` |

---

## Step 5 — Configure environment variables

```bash
cd CafeApp
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Note:** Variables prefixed with `EXPO_PUBLIC_` are automatically available in your app via `process.env`. Never commit `.env` to git.

---

## Step 6 — Install dependencies

```bash
cd CafeApp
npm install
```

---

## Step 7 — Run the app

```bash
npm start
```

- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with the **Expo Go** app on your phone

---

## Step 8 — First launch

1. **Register** a new account with your email and password
2. If email confirmation is enabled in Supabase (default), check your inbox and click the link
3. **Log in** — you'll be prompted to create your cafe
4. Enter your cafe name and tap **Create Cafe**
5. You're in!

---

## Disabling email confirmation (optional, for development)

In Supabase → **Authentication → Providers → Email** → turn off **"Confirm email"**. This lets you log in immediately after registering.

---

## Project structure

```
CafeApp/
├── App.tsx                        # Root component
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth + cafe state
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Stack + tab navigation
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Login / Register
│   │   ├── DashboardScreen.tsx      # Today's summary
│   │   ├── TransactionsScreen.tsx   # List with delete
│   │   ├── AddTransactionScreen.tsx # Add income/expense
│   │   ├── DailyReportScreen.tsx    # Per-day breakdown
│   │   └── ShiftsScreen.tsx         # Staff & shift management
│   ├── components/
│   │   └── StatCard.tsx             # Dashboard stat card
│   ├── services/
│   │   ├── supabase.ts              # Supabase client
│   │   ├── auth.ts                  # Auth helpers
│   │   ├── cafes.ts                 # Cafe CRUD
│   │   ├── transactions.ts          # Transaction CRUD + reports
│   │   └── shifts.ts                # Employee + shift CRUD
│   └── types/
│       └── index.ts                 # Shared TypeScript types
supabase/
└── schema.sql                       # Full PostgreSQL schema + RLS
```

---

## Security notes

- Row Level Security (RLS) is enabled on all tables — users can only access their own cafe's data
- Auth tokens are stored in `expo-secure-store` (device keychain), not AsyncStorage
- The anon key is safe to embed in the client; RLS enforces data isolation at the database level

---

## Extending the app

| Feature | How |
|---------|-----|
| Multiple cafes per user | Remove `maybeSingle()` in `getCafeByOwner`, add a cafe picker |
| Push notifications | Add `expo-notifications` + Supabase Edge Functions |
| Export to CSV | Add `expo-sharing` + client-side CSV generation |
| Realtime updates | Use `supabase.channel()` subscriptions in screen hooks |
| Employee login | Add an `employees.user_id` column + separate RLS role |
