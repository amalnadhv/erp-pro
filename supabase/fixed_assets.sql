-- Fixed Assets register
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code                     TEXT,
  name                     TEXT NOT NULL,
  category                 TEXT,
  purchase_date            DATE,
  cost                     NUMERIC(15,2) DEFAULT 0,
  salvage_value            NUMERIC(15,2) DEFAULT 0,
  useful_life              NUMERIC(6,2) DEFAULT 0,           -- years
  method                   TEXT DEFAULT 'Straight-line'
                            CHECK (method IN ('Straight-line','Reducing balance')),
  accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
  last_dep_date            DATE,
  asset_account_id         UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_name ON fixed_assets(name);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_category ON fixed_assets(category);

-- NOTE: app uses the service_role key which bypasses RLS; no policies required here.
