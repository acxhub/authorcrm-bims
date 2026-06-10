-- Add lead_miner role below leads_manager in the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'lead_miner' AFTER 'leads_manager';
