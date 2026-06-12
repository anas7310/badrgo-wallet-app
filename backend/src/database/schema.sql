-- =============================================================================
-- Badrgo Wallet Portal — Manual Schema + Indexes
-- Run this in psql or pgAdmin AFTER creating the database:
--   CREATE DATABASE badrgo_wallet;
--   \c badrgo_wallet
--   \i schema.sql
--
-- NOTE: If you are using synchronize:true in development, TypeORM will have
-- already created the base tables. In that case, run only the INDEX section
-- (Part 3) to add indexes without recreating tables.
-- =============================================================================


-- =============================================================================
-- PART 1: ENUMS
-- =============================================================================

CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE wallet_status_enum AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE transaction_type_enum AS ENUM ('CREDIT', 'DEBIT');


-- =============================================================================
-- PART 2: TABLES
-- =============================================================================

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE "user" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR NOT NULL,
    phone       VARCHAR NOT NULL,
    email       VARCHAR NOT NULL,
    status      user_status_enum NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT uq_user_email UNIQUE (email),
    CONSTRAINT uq_user_phone UNIQUE (phone)
);

-- ─── wallet ───────────────────────────────────────────────────────────────────
CREATE TABLE "wallet" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"    UUID NOT NULL,
    currency    VARCHAR NOT NULL DEFAULT 'USD',
    balance     BIGINT NOT NULL DEFAULT 0,   -- stored in cents, never floating point
    status      wallet_status_enum NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_wallet_user FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE RESTRICT
);

-- ─── transaction ──────────────────────────────────────────────────────────────
CREATE TABLE "transaction" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "walletId"      UUID NOT NULL,
    type            transaction_type_enum NOT NULL,
    amount          BIGINT NOT NULL,           -- in cents
    "balanceBefore" BIGINT NOT NULL,           -- snapshot before operation
    "balanceAfter"  BIGINT NOT NULL,           -- snapshot after operation
    "referenceId"   VARCHAR NOT NULL,          -- idempotency key
    description     VARCHAR,
    "createdAt"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT fk_transaction_wallet FOREIGN KEY ("walletId") REFERENCES "wallet"(id) ON DELETE RESTRICT,
    CONSTRAINT uq_transaction_reference UNIQUE ("referenceId")  -- prevents duplicate processing at DB level
);

-- ─── idempotency_record ───────────────────────────────────────────────────────
CREATE TYPE idempotency_status_enum AS ENUM ('IN_PROGRESS', 'SUCCESS', 'FAILED');

CREATE TABLE "idempotency_record" (
    "idempotencyKey" VARCHAR PRIMARY KEY,
    "status" idempotency_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
    "responseCode" INT,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);



-- =============================================================================
-- PART 3: INDEXES
-- Rationale for each index is documented inline.
-- =============================================================================

-- ─── user indexes ─────────────────────────────────────────────────────────────

-- email and phone are already covered by the UNIQUE constraints above,
-- which implicitly create B-Tree indexes in PostgreSQL.

-- Filter users by status (e.g. list only ACTIVE users)
CREATE INDEX idx_user_status ON "user" (status);


-- ─── wallet indexes ───────────────────────────────────────────────────────────

-- Most common query: "find all wallets for a given user"
-- Used when a user logs in and we need to show their wallets.
CREATE INDEX idx_wallet_user_id ON "wallet" ("userId");

-- Filter wallets by status across the whole system (e.g. dashboard active count)
CREATE INDEX idx_wallet_status ON "wallet" (status);

-- Composite: find active wallets for a specific user in one index scan
-- Covers: WHERE "userId" = $1 AND status = 'ACTIVE'
CREATE INDEX idx_wallet_user_status ON "wallet" ("userId", status);


-- ─── transaction indexes ──────────────────────────────────────────────────────

-- Most critical: "get all transactions for a wallet, newest first"
-- This is hit on every wallet detail page load.
-- DESC on createdAt matches the ORDER BY createdAt DESC in WalletsService.getTransactions()
CREATE INDEX idx_transaction_wallet_created ON "transaction" ("walletId", "createdAt" DESC);

-- Daily summary report: "all transactions on a given date"
-- DATE(createdAt) is used in the WHERE clause in ReportsService.dailySummary()
-- A regular index on createdAt works here; PostgreSQL will use it for date range scans.
CREATE INDEX idx_transaction_created ON "transaction" ("createdAt");

-- Filter by type within a wallet (e.g. show only CREDIT transactions)
CREATE INDEX idx_transaction_wallet_type ON "transaction" ("walletId", type);

-- referenceId is already covered by the UNIQUE constraint above (implicit index).
-- No extra index needed — the unique constraint IS the index.


-- =============================================================================
-- PART 4: TRIGGER — auto-update updatedAt on wallet and user rows
-- PostgreSQL does not auto-update updatedAt like TypeORM does in app layer,
-- so we add a trigger as a safety net for any direct SQL updates.
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_updated_at
  BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_wallet_updated_at
  BEFORE UPDATE ON "wallet"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- VERIFY: list all indexes created
-- =============================================================================
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user', 'wallet', 'transaction')
ORDER BY tablename, indexname;
