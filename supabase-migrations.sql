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

-- 4. Auto-create public.users row on auth signup so the contacts list is
--    populated immediately, without waiting for the user's first login.
--    Also backfills existing auth users who have no public.users row yet.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nom, role, classe_id, statut)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'admin'),
    NULLIF(new.raw_user_meta_data->>'classe_id', '')::uuid,
    CASE WHEN COALESCE(new.raw_user_meta_data->>'role', 'admin') IN ('parent', 'moualima')
         THEN 'en_attente'
         ELSE 'actif'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create public.users rows for existing auth users who don't have one.
INSERT INTO public.users (id, email, nom, role, classe_id, statut)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'nom', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'admin'),
  NULLIF(raw_user_meta_data->>'classe_id', '')::uuid,
  CASE WHEN COALESCE(raw_user_meta_data->>'role', 'admin') IN ('parent', 'moualima')
       THEN 'en_attente'
       ELSE 'actif'
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;
