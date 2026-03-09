-- Migration: 002_mcsa_intake_schema.sql
-- Requirement: Option 1 - MCSA-5875 & MCSA-5876 Identity Ingestion & Modular Intake

-- 1. PHI VAULT: Core MCSA-5875 Health Records
-- These fields are mandated by the DOT Physical and strictly contain PHI.
CREATE TABLE phi_vault.mcsa_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES phi_vault.drivers(id) ON DELETE CASCADE,
    
    -- Encrypted core metrics required for the form
    blood_pressure_sys_encrypted TEXT,
    blood_pressure_dia_encrypted TEXT,
    vision_acuity_right_encrypted TEXT,
    vision_acuity_left_encrypted TEXT,
    hearing_test_pass_encrypted TEXT,
    
    -- Encrypted JSON blob for the "Yes/No" Health History checklist (32 questions)
    health_history_encrypted TEXT, 

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. APP PUBLIC: Admin Form Configurations
-- Stores the modular, non-PHI questions that admins can add to the intake funnel
CREATE TABLE app_public.form_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_key TEXT UNIQUE NOT NULL,       -- e.g., 'upsell_sleep_study'
    field_label TEXT NOT NULL,            -- e.g., 'Do you have a CPAP machine?'
    field_type TEXT NOT NULL,             -- 'boolean', 'text', 'number'
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default modular fields for the business side
INSERT INTO app_public.form_configurations (field_key, field_label, field_type, display_order)
VALUES 
    ('priority_processing', 'Would you like to add $25 Priority Processing?', 'boolean', 1),
    ('company_paid', 'Is your employer paying for this visit?', 'boolean', 2);

-- 3. APP PUBLIC: Driver Modular Data
-- Stores the answers to the modular form configurations (No PHI allowed here)
CREATE TABLE app_public.driver_modular_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,               -- NOT a foreign key to prevent tight coupling across schemas (OBT-11)
    responses JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"priority_processing": true, "company_paid": false}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
