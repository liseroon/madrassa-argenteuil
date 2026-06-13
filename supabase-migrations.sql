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

-- 3. Messages: recipients must be able to read messages sent to them.
-- Without this, parents could not see messages sent by the admin.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read their messages" ON messages;
CREATE POLICY "Participants can read their messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (expediteur_id = auth.uid() OR destinataire_id = auth.uid());

DROP POLICY IF EXISTS "Senders can insert their own messages" ON messages;
CREATE POLICY "Senders can insert their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (expediteur_id = auth.uid());
