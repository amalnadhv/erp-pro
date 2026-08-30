CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(30) UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(30),
    customer_address TEXT,
    customer_vat VARCHAR(50),
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 15,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(30) DEFAULT 'Cash',
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION set_invoice_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_no IS NULL OR NEW.invoice_no = '' THEN
    NEW.invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invoice_no ON invoices;
CREATE TRIGGER trg_set_invoice_no
BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION set_invoice_no();

-- ============ CUSTOMER MASTER (extended fields) ============
ALTER TABLE customers ADD COLUMN IF NOT EXISTS code VARCHAR(30) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cust_type VARCHAR(30) DEFAULT 'Company';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'SAR';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Net 30';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS price_list VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vat_no VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_code VARCHAR(30);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 30;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_address TEXT;

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ============ SUPPLIER MASTER (same structure as customer) ============
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE,
    name VARCHAR(255),
    cust_type VARCHAR(30) DEFAULT 'Company',
    category VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(30),
    mobile VARCHAR(30),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'SAR',
    payment_terms VARCHAR(50) DEFAULT 'Net 30',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    price_list VARCHAR(50),
    vat_no VARCHAR(50),
    account_code VARCHAR(30),
    credit_days INTEGER DEFAULT 30,
    sales_person VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sup_type VARCHAR(30) DEFAULT 'Distributor';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS min_order_qty INTEGER DEFAULT 1;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_iban VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pref_payment VARCHAR(30) DEFAULT 'Bank Transfer';

-- ============ STOCK MASTER (extended product fields) ============
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(30) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,2) DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'ITM-' || LPAD((SELECT COUNT(*) + 1 FROM products)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_product_code ON products;
CREATE TRIGGER trg_set_product_code
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION set_product_code();