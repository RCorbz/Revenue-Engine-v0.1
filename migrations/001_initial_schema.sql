-- Migration: 001_initial_schema.sql
-- Requirement: OBT-11 (HIPAA Isolation) & OBT-18 (Immutable Audit)

-- 1. Create Isolated Schemas
CREATE SCHEMA IF NOT EXISTS phi_vault;   -- Restricted: OBT-11
CREATE SCHEMA IF NOT EXISTS app_public;  -- Unrestricted: General App Logic

-- 2. PHI VAULT: Driver Identity (Strictly Encrypted)
CREATE TABLE phi_vault.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ssn_encrypted TEXT NOT NULL,         -- OBT-20 Requirement
    dob_encrypted TEXT NOT NULL,         -- OBT-20 Requirement
    license_number_encrypted TEXT,
    fmcsa_compliant BOOLEAN DEFAULT FALSE, -- OBT-15
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APP PUBLIC: Transactions & Revenue Tracking
CREATE TABLE app_public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES phi_vault.drivers(id) ON DELETE CASCADE,
    base_amount DECIMAL(12, 2) NOT NULL,
    surcharge_amount DECIMAL(12, 2),     -- OBT-4 ($10 Increments)
    total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (base_amount + COALESCE(surcharge_amount, 0)) STORED,
    payment_rail TEXT NOT NULL,          -- OBT-10 (Square vs Tap-to-Pay)
    upsell_category TEXT,                -- OBT-13 (e.g., '$75 Tune-up')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. APP PUBLIC: Immutable Audit Trail (OBT-18)
CREATE TABLE app_public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action_type TEXT NOT NULL,           -- e.g., 'READ_PHI', 'UPDATE_DRV'
    actor_id UUID NOT NULL,
    resource_id UUID NOT NULL,
    state_hash TEXT NOT NULL,            -- SHA-256 hash for immutability check
    client_timestamp TIMESTAMPTZ NOT NULL, -- OBT-19 Integrity
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Trigger for OBT-18: Prevent Audit Deletion/Updates
CREATE OR REPLACE FUNCTION app_public.protect_audit_logs() 
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'OBT-18 Violation: Audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_immutable_audit
BEFORE UPDATE OR DELETE ON app_public.audit_logs
FOR EACH ROW EXECUTE FUNCTION app_public.protect_audit_logs();