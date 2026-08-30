-- Auditor information on company profile (pre-fills the Audit Report)
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS auditor_firm text;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS auditor_name text;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS auditor_license text;
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS auditor_address text;
