-- Tax Configuration Table: maps countries to tax rules
-- This is the single source of truth for tax rates, names, and compliance per country

CREATE TABLE IF NOT EXISTS tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country VARCHAR(100) UNIQUE NOT NULL,
  tax_name VARCHAR(50) NOT NULL DEFAULT 'VAT',
  standard_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  reduced_rate NUMERIC(5,2) DEFAULT 0,
  zero_rate NUMERIC(5,2) DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  tax_authority VARCHAR(200),
  compliance_mode VARCHAR(50) DEFAULT 'None',
  tax_id_label VARCHAR(50) DEFAULT 'Tax ID',
  invoice_label VARCHAR(100) DEFAULT 'Tax Invoice',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with major countries
INSERT INTO tax_config (country, tax_name, standard_rate, reduced_rate, currency, tax_authority, compliance_mode, tax_id_label, invoice_label) VALUES
-- GCC VAT
('UAE', 'VAT', 5, 0, 'AED', 'Federal Tax Authority (FTA)', 'FTA e-Invoice', 'TRN', 'Tax Invoice'),
('Saudi Arabia', 'VAT', 15, 0, 'SAR', 'Zakat, Tax and Customs Authority (ZATCA)', 'ZATCA FATOORA', 'VAT Number', 'Tax Invoice'),
('Bahrain', 'VAT', 10, 0, 'BHD', 'National Bureau for Revenue (NBR)', 'None', 'TRN', 'Tax Invoice'),
('Oman', 'VAT', 5, 0, 'OMR', 'Tax Authority (TA)', 'None', 'Tax Registration Number', 'Tax Invoice'),
('Kuwait', 'VAT', 0, 0, 'KWD', 'General Authority of Zakat and Income Tax', 'None', 'Tax ID', 'Invoice'),
('Qatar', 'VAT', 0, 0, 'QAR', 'General Tax Authority (GTA)', 'None', 'Tax ID', 'Invoice'),
-- South Asia
('India', 'GST', 18, 5, 'INR', 'Central Board of Indirect Taxes (CBIC)', 'GST e-Invoice', 'GSTIN', 'Tax Invoice'),
('Pakistan', 'Sales Tax', 17, 0, 'PKR', 'Federal Board of Revenue (FBR)', 'FBR Invoice', 'NTN / STRN', 'Tax Invoice'),
('Bangladesh', 'VAT', 15, 0, 'BDT', 'National Board of Revenue (NBR)', 'None', 'BIN', 'Tax Invoice'),
('Sri Lanka', 'VAT', 15, 0, 'LKR', 'Inland Revenue Department', 'None', 'TIN / VAT Reg No', 'Tax Invoice'),
-- Africa
('South Africa', 'VAT', 15, 0, 'ZAR', 'South African Revenue Service (SARS)', 'None', 'VAT Registration No', 'Tax Invoice'),
('Egypt', 'VAT', 14, 0, 'EGP', 'Egyptian Tax Authority (ETA)', 'None', 'Tax Registration No', 'Tax Invoice'),
('Nigeria', 'VAT', 7.5, 0, 'NGN', 'Federal Inland Revenue Service (FIRS)', 'None', 'TIN', 'VAT Invoice'),
('Kenya', 'VAT', 16, 0, 'KES', 'Kenya Revenue Authority (KRA)', 'e-Invoice', 'PIN', 'Tax Invoice'),
-- Europe
('UK', 'VAT', 20, 5, 'GBP', 'HM Revenue & Customs (HMRC)', 'Making Tax Digital', 'VAT Registration No', 'VAT Invoice'),
('Germany', 'VAT', 19, 7, 'EUR', 'Bundeszentralamt für Steuern', 'None', 'USt-IdNr', 'Rechnung'),
('France', 'VAT', 20, 5.5, 'EUR', 'Direction Générale des Finances Publiques', 'None', 'Numéro TVA', 'Facture'),
('Turkey', 'KDV', 20, 10, 'TRY', 'Revenue Administration (GİB)', 'e-Invoice', 'VKN', 'Fatura'),
-- Americas
('USA', 'Sales Tax', 0, 0, 'USD', 'State Tax Authorities', 'None', 'EIN / SSN', 'Invoice'),
('Canada', 'GST/HST', 5, 0, 'CAD', 'Canada Revenue Agency (CRA)', 'None', 'Business Number / GST Reg', 'Tax Invoice'),
('Brazil', 'ICMS', 17, 0, 'BRL', 'Receita Federal', 'NF-e', 'CNPJ / CPF', 'Nota Fiscal'),
-- Asia Pacific
('Australia', 'GST', 10, 0, 'AUD', 'Australian Taxation Office (ATO)', 'None', 'ABN / GST Reg', 'Tax Invoice'),
('New Zealand', 'GST', 15, 0, 'NZD', 'Inland Revenue (IRD)', 'None', 'NZBN / GST Reg', 'Tax Invoice'),
('Singapore', 'GST', 9, 0, 'SGD', 'Inland Revenue Authority (IRAS)', 'None', 'GST Reg No', 'Tax Invoice'),
('Malaysia', 'SST', 10, 0, 'MYR', 'Royal Malaysian Customs (RMCD)', 'None', 'SST Registration No', 'Tax Invoice'),
-- Default / No Tax
('Global', 'Tax', 0, 0, 'USD', 'N/A', 'None', 'Tax ID', 'Invoice')
ON CONFLICT (country) DO UPDATE SET
  tax_name = EXCLUDED.tax_name,
  standard_rate = EXCLUDED.standard_rate,
  reduced_rate = EXCLUDED.reduced_rate,
  currency = EXCLUDED.currency,
  tax_authority = EXCLUDED.tax_authority,
  compliance_mode = EXCLUDED.compliance_mode,
  tax_id_label = EXCLUDED.tax_id_label,
  invoice_label = EXCLUDED.invoice_label,
  updated_at = NOW();

-- RLS
ALTER TABLE tax_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_config_tenant_isolation" ON tax_config FOR ALL USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_tax_config_country ON tax_config(country);

-- Function to get tax config for a country
CREATE OR REPLACE FUNCTION get_tax_config(p_country TEXT)
RETURNS TABLE (
  tax_name VARCHAR(50),
  standard_rate NUMERIC(5,2),
  reduced_rate NUMERIC(5,2),
  currency VARCHAR(10),
  tax_authority VARCHAR(200),
  compliance_mode VARCHAR(50),
  tax_id_label VARCHAR(50),
  invoice_label VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT tc.tax_name, tc.standard_rate, tc.reduced_rate, tc.currency,
         tc.tax_authority, tc.compliance_mode, tc.tax_id_label, tc.invoice_label
  FROM tax_config tc
  WHERE tc.country = p_country AND tc.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
