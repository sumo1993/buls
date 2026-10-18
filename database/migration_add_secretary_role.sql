-- Add secretary to user_role enum
-- Run this FIRST separately before migration_settings_table.sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'secretary';
