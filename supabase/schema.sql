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
-- PRODUCTS (inventory / menu catalogue)
-- -------------------------------------------------------
CREATE TYPE product_category AS ENUM ('drink', 'food');

CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id      UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     product_category NOT NULL,
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already exists, run: ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = products.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = products.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- ORDERS
-- -------------------------------------------------------
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'completed');

CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id      UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  table_number TEXT,
  status       order_status NOT NULL DEFAULT 'pending',
  is_paid      BOOLEAN NOT NULL DEFAULT FALSE,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = orders.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = orders.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- ORDER ITEMS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage order items"
  ON order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN cafes c ON c.id = o.cafe_id
      WHERE o.id = order_items.order_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN cafes c ON c.id = o.cafe_id
      WHERE o.id = order_items.order_id
        AND c.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- PURCHASE ORDERS (supplier orders)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id    UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  supplier   TEXT NOT NULL,
  note       TEXT,
  total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage purchase_orders"
  ON purchase_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = purchase_orders.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cafes
      WHERE cafes.id = purchase_orders.cafe_id
        AND cafes.owner_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- PURCHASE ORDER ITEMS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name      TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost         NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cafe owner can manage purchase_order_items"
  ON purchase_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN cafes c ON c.id = po.cafe_id
      WHERE po.id = purchase_order_items.purchase_order_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      JOIN cafes c ON c.id = po.cafe_id
      WHERE po.id = purchase_order_items.purchase_order_id
        AND c.owner_id = auth.uid()
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
