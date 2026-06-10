-- ============================================
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Delete the phantom CLASSES table (uppercase) if it exists
-- Keep only the lowercase "classes" table
DROP TABLE IF EXISTS "CLASSES";

-- 2. Fix RLS policy on classes table: change from public to authenticated
-- First, drop existing public policies
DROP POLICY IF EXISTS "Allow public read access" ON classes;
DROP POLICY IF EXISTS "Enable read access for all users" ON classes;
DROP POLICY IF EXISTS "Allow public select" ON classes;

-- Enable RLS if not already enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create authenticated-only read policy
CREATE POLICY "Allow authenticated read access"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin to insert/update/delete classes
CREATE POLICY "Allow admin full access"
  ON classes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
