-- ============================================================
-- Cafe Management App — Supabase Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- -------------------------------------------------------
-- EXTENSION
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- CAFES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS cafes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage their cafe"
  ON cafes FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- -------------------------------------------------------
-- EMPLOYEES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage employees"
  ON employees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = employees.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = employees.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- TRANSACTIONS
-- -------------------------------------------------------
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  amount     NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  type       transaction_type NOT NULL,
  category   TEXT NOT NULL DEFAULT 'General',
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage transactions"
  ON transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = transactions.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = transactions.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- SHIFTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id     UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_cash  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  end_cash    NUMERIC(10, 2),
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  note        TEXT
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = shifts.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = shifts.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- USEFUL VIEW: daily_summary
-- Returns per-day totals for the authenticated user's cafe
-- -------------------------------------------------------
CREATE OR REPLACE VIEW daily_summary AS
SELECT
  t.cafe_id,
  DATE(t.created_at AT TIME ZONE 'UTC') AS day,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) -
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS profit
FROM transactions t
GROUP BY t.cafe_id, DATE(t.created_at AT TIME ZONE 'UTC')
ORDER BY day DESC;
