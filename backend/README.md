# Badrgo Wallet Manager (Backend API)

This is the backend service for the Mini Operations Wallet Portal. It is built using **NestJS**, **TypeORM**, and **PostgreSQL**.

## Architecture & Features

- **Strict Validation**: All endpoints use `class-validator` DTOs to enforce strict payload structures.
- **Concurrency Safety**: Critical financial transactions (`/wallets/:id/credit` and `/wallets/:id/debit`) use Postgres `pessimistic_write` row-level locking via TypeORM Query Runners. This completely eliminates race conditions when high-volume operations overlap.
- **Idempotency**: Implemented as a reusable `@Injectable` NestJS Interceptor. All state-mutating financial operations require an `Idempotency-Key` header (mapped to `referenceId`). Duplicate requests are gracefully aborted, and the initial successful response is served from cache instead of double-crediting balances.
- **Safe Math**: All balances and transaction amounts are processed as integers (`cents`), securely evading floating-point inaccuracies.

## Installation

```bash
$ npm install
```

## Running the application

Ensure your PostgreSQL instance is running and configured according to the `.env` file.

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## E2E Testing & Validation Results

The API is fully verified through comprehensive end-to-end (e2e) tests mapping to a test database.

```bash
$ npm run test:e2e
```

### Coverage Report

**User Provisioning (`users.e2e-spec.ts`)**
| Scenario | Expected Output | Actual Verification |
| :--- | :--- | :--- |
| **Registration** | Create a user and return the user entity | `[PASS]` User created successfully |
| **Duplicates** | Reject duplicate email | `[PASS]` Caught Postgres duplicate key constraint |
| **Validation** | Reject invalid email format / missing fields | `[PASS]` `400: ["email must be an email"]` |

**Wallet Financial Operations (`wallets.e2e-spec.ts`)**
| Scenario | Expected Output | Actual Verification |
| :--- | :--- | :--- |
| **Funding** | Credit wallet and strictly record accurate `balanceBefore` and `balanceAfter` | `[PASS]` Credits correctly appended to balances |
| **Missing Params** | Reject credit requests with missing `referenceId` | `[PASS]` `400: ["Idempotency-Key header is required"]` |
| **Invalid Amounts**| Reject credit with amount = `0` or negative numbers | `[PASS]` `400: ["amount must be at least 1 cent"]` |
| **Withdrawals** | Debit wallet and verify final balance matches `balanceBefore - amount` | `[PASS]` Debits successfully processed |
| **Insufficient** | Prevent a debit if balance drops below `0` | `[PASS]` `400: "Insufficient balance... requested: 9999999.99 USD"` |
| **Idempotency** | Prevent duplicate operations. Reused `referenceId` returns cached transaction | `[PASS]` Secondary requests bypassed controller safely |

**Test Output:**
```text
Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        9.078 s
```
