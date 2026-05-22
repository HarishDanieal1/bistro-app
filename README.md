# 🤵 The Intelligent Bistro — Premium AI Restaurant Experience

**The Intelligent Bistro** is a state-of-the-art, high-fidelity React Native (Expo) and Node.js web/mobile application that reimagines modern dining. It integrates a conversational AI Waiter powered by Google Gemini, real-time database-backed menu catalog synchronization, transactional checkout safety, and persistent culinary profile preferences.

---

## 📸 Core Tech Stack
* **Frontend:** React Native (Expo v52), TypeScript, Zustand State Engine, Expo Speech/Audio APIs.
* **Backend:** Node.js, Express, Prisma ORM, PostgreSQL (Supabase).
* **AI NLP Layer:** `@google/generative-ai` (Gemini 2.5 Flash SDK) for structured cart action parsing, allergy guarding, and customized flavor curation.

---

## 🌟 Advanced Features

### 1. Conversational AI Waiter & Voice Input
* **Natural Intent Parsing:** Translates unstructured conversation (e.g., *"I'd like a Wagyu burger and let's make it two order of truffle fries"*) into structured JSON state updates matching the database model.
* **Integrated Voice Interface:** Includes web speech-to-text recording, dynamic mic volume levels, and instant voice dispatch.
* **Culinary Profile & Dietary Guardian:** Customers can configure an AI Dining Profile (Vegan, Keto, allergies, spice preferences, taste notes). The AI Waiter acts as a safety guardian, checking ingredients in real-time and rejecting allergen-unsafe orders with custom warnings and active substitutions.

### 2. Standardized Real-Time Availability Sync (ON/OFF)
* **Interactive Admin Control:** Admins can toggle items on/off from the Admin Console.
* **Dynamic Customer Menu UI:** Sold-out items immediately fade to `0.6` opacity, render a bold red `"SOLD OUT"` badge, and display a disabled `"Sold Out"` checkout trigger.
* **AI Synchronization:** The live availability status is synchronized inside Gemini's prompt context, prompting it to refuse adding sold-out items to the cart and recommend active items instead.
* **Transaction-Level Safety:** The checkout API (`POST /api/orders`) performs transaction-level validation checks against the database, throwing a `400 Bad Request` if any client attempts to order a sold-out item.

### 3. Session & Cart Durability
* Zustand-based state management wrapped in persistent local/session storage middlewares to guarantee login status, customized dining profiles, and active cart items survive browser reloads (`F5`) or tab cycles seamlessly.

---

## 🗂️ Repository Structure

```
├── /db                     # Database Migrations & Prisma Engine
│   ├── prisma/             # Schema files & database seeds
│   └── package.json
│
├── /mobile                 # Expo / React Native Frontend Client
│   ├── components/         # AI Waiter, Glassmorphic Preferences Modal, MenuCard
│   ├── screens/            # Home, Scannable Menu, Persistent Cart, Profile/Admin Console
│   ├── store/              # Zustand persistent global stores
│   └── App.tsx             # App Entry & tab navigation router
│
└── /server                 # Express API backend & Gemini AI controller
    ├── index.js            # App server entry & API routes
    └── prisma.js           # Shared database client connection
```

---

## 🚀 Setup & Execution Guide

### 1. Database Setup (`/db`)
Ensure your Supabase PostgreSQL instance connection strings are active in your `.env` file:
```bash
# Navigate to db directory
cd db

# Install dependencies
npm install

# Push database schema to Supabase PostgreSQL
npx prisma db push

# Seed initial database items (Test Admin: admin@bistro.com / admin_123)
npx tsx prisma/seed.ts
```

### 2. Backend Server Setup (`/server`)
Create a `.env` file inside `/server` containing your Google Gemini API Key and database URL:
```env
PORT=5000
DATABASE_URL="your-supabase-db-url"
GEMINI_API_KEY="your-gemini-api-key"
```
Then, execute the server:
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start Express server (runs on Port 5000)
npm start
```

### 3. Frontend Client Setup (`/mobile`)
```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo Web/Mobile server
npm run web
```
Open [Bistro_App](https://bistro-app-kk6l.vercel.app/) to view the client dashboard.

---

## 🤖 AI Coding Tools Attribution
This high-fidelity application was engineered and polished with the pair-programming assistance of:
* **Antigravity (Google DeepMind):** Acted as the primary agentic AI architect, implementing real-time Zustand persistence, standard database availability rules, Gemini Waiter API context synchronization, and polishing the dark-gold premium aesthetics.
* **Claude 3.5 Sonnet / Cursor:** Utilized for writing baseline boilerplate, speed debugging, and initial layout configurations.
