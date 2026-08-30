-- ============================================================
-- AUTHORIZATION: Role-Based Access Control
-- Run this AFTER admin.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role            TEXT NOT NULL CHECK (role IN ('Admin','Manager','Accountant','Sales Rep','Warehouse','Viewer')),
  module          TEXT NOT NULL,
  can_view        BOOLEAN DEFAULT FALSE,
  can_create      BOOLEAN DEFAULT FALSE,
  can_edit        BOOLEAN DEFAULT FALSE,
  can_delete      BOOLEAN DEFAULT FALSE,
  can_approve     BOOLEAN DEFAULT FALSE,
  can_print       BOOLEAN DEFAULT FALSE,
  UNIQUE(role, module)
);

-- Seed default permissions (Admin gets all, Viewer gets minimal)
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_print) VALUES
  -- Admin = everything
  ('Admin', 'Company Profile',       TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Users & Roles',         TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
  ('Admin', 'Document Numbering',    TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
  ('Admin', 'Chart of Accounts',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Journal Entry',         TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'A/R Invoice',           TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Purchase Order',        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Stock Master',          TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Customer',              TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Supplier',              TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Incoming Payments',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('Admin', 'Outgoing Payments',     TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  -- Manager
  ('Manager', 'A/R Invoice',         TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Purchase Order',      TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Stock Master',        TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Customer',            TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Supplier',            TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Incoming Payments',   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Outgoing Payments',   TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Journal Entry',       TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Manager', 'Chart of Accounts',   TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  -- Accountant
  ('Accountant', 'Chart of Accounts',TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Accountant', 'Journal Entry',    TRUE, TRUE, TRUE, FALSE, TRUE, TRUE),
  ('Accountant', 'Incoming Payments',TRUE, TRUE, FALSE, FALSE, TRUE, TRUE),
  ('Accountant', 'Outgoing Payments',TRUE, TRUE, FALSE, FALSE, TRUE, TRUE),
  ('Accountant', 'A/R Invoice',      TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Accountant', 'Purchase Order',   TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  -- Sales Rep
  ('Sales Rep', 'A/R Invoice',       TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Sales Rep', 'Customer',          TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
  ('Sales Rep', 'Stock Master',      TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Sales Rep', 'Incoming Payments', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
  -- Warehouse
  ('Warehouse', 'Stock Master',      TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
  ('Warehouse', 'Purchase Order',    TRUE, FALSE, TRUE, FALSE, FALSE, TRUE),
  -- Viewer
  ('Viewer', 'A/R Invoice',          TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Viewer', 'Purchase Order',       TRUE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('Viewer', 'Stock Master',         TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Viewer', 'Customer',             TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('Viewer', 'Supplier',             TRUE, FALSE, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_rp_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_rp_module ON role_permissions(module);
