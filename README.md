# Badrgo Wallet Manager

An enterprise-grade, multi-currency digital wallet operations portal. Built with **React** (Frontend) and **NestJS** (Backend), this system handles robust user onboarding, wallet provisioning, and financial transaction processing backed by a highly concurrent **PostgreSQL** database.

---

## 🏗 Architecture Overview

The system follows a classic decoupled Client-Server architecture designed for scale and high concurrency.

- **Frontend (React + Vite)**: A highly responsive Single Page Application (SPA) using `TanStack Query` for aggressive caching and optimistic UI updates. Features a custom glassmorphism design system built without heavy CSS frameworks, ensuring deep control over micro-animations and accessibility.
- **Backend (NestJS + TypeORM)**: A modular, scalable API. Handles business logic, input validation (`class-validator`), and global exception handling.
- **Database Layer (PostgreSQL)**: The source of truth for financial ledgers. We utilize strict **pessimistic locking** (`pessimistic_write`) during credit and debit operations to guarantee that concurrent API requests cannot read stale balances, strictly preventing double-spending anomalies. A manual, highly optimized DDL schema provides robust relational integrity.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)
- Docker (optional, for production deployment)

### 1. Clone the Repository

```bash
git clone https://github.com/anas7310/badrgo-wallet-app.git
cd badrgo-wallet-app
```

### 2. Environment Variables

**Backend (`backend/.env`)**
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=write your db user here
DB_PASSWORD=write your db password here
DB_NAME=write your db name here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:3000
```

### 3. Local Development Server

**Database Setup**:
Ensure your PostgreSQL instance is running. Create the database and run the `backend/src/database/schema.sql` file to provision the tables and indexes.

**Start Backend**:
```bash
cd backend
npm install
npm run start:dev
```

**Start Frontend**:
```bash
cd frontend
npm install
npm run dev
```

### 3. Remarks & Known Limitations

- **No Docker**: I wanted to include Docker, but because of some hardware constraints on my local machine and the tight 24-hour deadline, I skipped it. You can just run it normally using Node and Postgres.
- **No Redis**: Normally I would use Redis for handling the idempotency cache, but I wanted to keep the local setup simple for the development phase. So instead, I handled the duplicate request checking directly inside PostgreSQL using a custom table.

### 4. Future Scope

If I had more time, here are a few things I would add to help the app scale better:
1. **Use Redis for Idempotency**: Checking the database for every single request adds a lot of load. I'd move the idempotency check to Redis so we can block duplicate requests instantly in memory.
2. **Database Partitioning**: Since the transactions table will just keep growing forever, querying it will eventually get slow. I would set up Postgres to partition the table by month so the database doesn't have to scan millions of old rows.
3. **Read Replicas**: I'd split the database traffic. All the heavy reads (like fetching the daily reports) would go to a read-replica database, keeping the main master database totally free to just handle fast debit and credit locks.

---

## 📡 API Usage & Endpoints

A fully interactive **Swagger UI** is available when the backend is running at `http://localhost:3000/api`.

**Core Endpoints:**
- `POST /users` - Onboard a new institutional user.
- `POST /wallets` - Provision a new wallet address linked to a user.
- `GET /wallets/stats` - Fetch highly optimized aggregate system statistics.
- `POST /wallets/:id/credit` - Inject funds (Idempotent).
- `POST /wallets/:id/debit` - Withdraw funds (Idempotent + Insufficient Funds Guard).

> **Idempotency Note**: All financial operations require a unique `referenceId`. If the API receives a duplicate request due to network retries, it gracefully returns the original transaction rather than processing the money twice.

---

## 💱 Multi-Currency Support

The system natively stores balances and processes metrics safely, avoiding floating-point math issues by storing everything in smallest base units (cents/halalas).
- **Frontend Dashboard**: Admin users can switch the global display currency between `QAR` (Default), `USD`, `EUR`, `GBP`, and `INR`.
- The UI handles dynamic conversion rates, allowing admins to instantly view aggregate metrics safely unified under a single preferred currency.

## 🧪 Testing & Validation

### 1. Backend Integration & E2E Tests
The backend contains comprehensive end-to-end integration tests that hit the actual test database.
To run the tests:
```bash
cd backend
npm run test:e2e
```
These tests deeply cover every critical constraint:

### User Provisioning (`users.e2e-spec.ts`)
| Scenario | Expected Output | Actual Verification |
| :--- | :--- | :--- |
| **Registration** | Create a user and return the user entity | `[PASS]` User created successfully |
| **Duplicates** | Reject duplicate email | `[PASS]` Caught Postgres duplicate key constraint |
| **Validation** | Reject invalid email format / missing fields | `[PASS]` `400: ["email must be an email"]` |

### Wallet Financial Operations (`wallets.e2e-spec.ts`)
| Scenario | Expected Output | Actual Verification |
| :--- | :--- | :--- |
| **Funding** | Credit wallet and strictly record accurate `balanceBefore` and `balanceAfter` | `[PASS]` Credits correctly appended to balances |
| **Missing Params** | Reject credit requests with missing `referenceId` | `[PASS]` `400: ["Idempotency-Key header is required"]` |
| **Invalid Amounts**| Reject credit with amount = `0` or negative numbers | `[PASS]` `400: ["amount must be at least 1 cent"]` |
| **Withdrawals** | Debit wallet and verify final balance matches `balanceBefore - amount` | `[PASS]` Debits successfully processed |
| **Insufficient** | Prevent a debit if balance drops below `0` | `[PASS]` `400: "Insufficient balance... requested: 9999999.99 USD"` |
| **Idempotency** | Prevent duplicate operations. Reused `referenceId` returns cached transaction | `[PASS]` Secondary requests bypassed controller safely |

### 2. Concurrency & Idempotency Strategy
Financial systems require absolute precision under high load:
- **Concurrency**: We use a `pessimistic_write` row-level lock on the `Wallet` entity when processing a transaction. This ensures that if two users attempt to withdraw funds simultaneously, Request B must wait for Request A to commit its transaction. This mathematically eliminates the classic race condition (double spending).
- **Idempotency**: Every financial request must carry a UUID `referenceId`. Before taking action, the system checks the `transactions` table. If the `referenceId` exists, it skips execution and safely returns the historical transaction. This guards against network retries firing the same charge twice.

### 3. Frontend Manual Test Checklist
When validating the frontend, follow this checklist to verify full system stability:
- [ ] **Onboarding**: Click `Create User`. Fill out the form. Verify the new user appears in the system and triggers a success notification.
- [ ] **Provisioning**: Click `Create Wallet`, assign it to the newly created user in `USD` or `QAR`.
- [ ] **Credit Simulation**: Click `Credit Wallet`. Paste the new wallet UUID. Credit `$500.00`. Verify the **Total Balance** card immediately updates.
- [ ] **Debit Guard**: Click `Debit Wallet`. Attempt to withdraw `$600.00`. Verify the UI throws an explicit *Insufficient Balance* error.
- [ ] **Multi-currency Toggle**: Use the top-right display currency dropdown to select `EUR` or `GBP`. Verify the 6 metrics cards instantly recalculate the sums without reloading.
- [ ] **Idempotency Check**: Run a credit with a specific `referenceId`. Then manually run a second credit with the **exact same** `referenceId`. Verify the balance did not increase twice.

### 4. Bonus: Seed Data
To populate the application quickly with realistic testing data:
```bash
cd backend
npm run seed
```
*(This triggers a custom script that populates dummy users, wallets, and historical transactions).*

---

## ⚠️ Known Limitations

1. **Exchange Rates**: Currency exchange rates in the frontend dashboard are currently fixed constants for demonstration purposes. A production scale-up would require integrating a live Oracle or Forex API (e.g., Fixer.io).
2. **Authentication Layer**: This is designed as an internal Admin Operations Portal. It currently lacks a JWT or OAuth2 identity layer. Network access should remain strictly bound behind an internal VPN or VPC.
3. **Pagination**: The `/transactions` endpoint retrieves all historical transactions for a wallet. This should be paginated (Cursor or Offset) before going to deep production.

---

## 🤖 AI Usage Disclosure

> **AI Tooling Accounted for Development**

While AI tools were utilized to accelerate boilerplate generation (such as scaffolding NestJS modules, generating CSS gradients, and formatting `package.json` scripts, idempotency cache querying), the core architecture, business logic, and database schemas were heavily manually architected.

**Manually Designed Systems & Tradeoffs Chosen:**
- **Pessimistic Locking & Financial Integrity**: AI defaults to simple `+=` updates. I manually enforced explicit TypeORM query runners utilizing `pessimistic_write` row-level locks and strict idempotency checks via unique constraints.
- **Database Optimization**: Instead of relying solely on automated TypeORM synchronization, I manually engineered the DDL schema (`schema.sql`) to include highly specific compound indexing on foreign keys and timestamps to optimize read queries.
- **State Management Tradeoff**: Deliberately chose `TanStack Query` over `Redux` to avoid client-side state bloating, keeping the UI strictly synchronized with server-state.
- **Currency Engine**: Manually bypassed the backend's raw aggregate logic to ensure cross-currency totals were mathematically sound on the frontend, enforcing a strict separation of concerns.
