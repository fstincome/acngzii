
-- Drop has_role/has_permission AND dependent policies via CASCADE
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_permission(uuid, public.app_module, text) CASCADE;

-- Swap enum
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'american_center',
  'american_corner_gitega',
  'coordinator',
  'program_manager'
);

-- Migrate user_roles
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING (
    CASE role::text
      WHEN 'admin' THEN 'admin'
      WHEN 'national_coordinator' THEN 'american_center'
      WHEN 'director' THEN 'coordinator'
      WHEN 'reception' THEN 'program_manager'
      ELSE 'program_manager'
    END
  )::public.app_role;

-- Drop stale rows for removed roles in role_permissions before cast
DELETE FROM public.role_permissions
  WHERE role::text IN ('director', 'reception', 'national_coordinator');

ALTER TABLE public.role_permissions
  ALTER COLUMN role TYPE public.app_role
  USING (role::text::public.app_role);

DROP TYPE public.app_role_old;

-- Recreate has_role with american_center as admin-like
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (role = 'american_center' AND _role = 'admin'))
  )
$$;

-- Recreate has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module public.app_module, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_user_row public.user_permissions%ROWTYPE;
  v_role_row public.role_permissions%ROWTYPE;
  v_col boolean;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF v_role IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_user_row FROM public.user_permissions WHERE user_id = _user_id AND module = _module;
  IF FOUND THEN
    v_col := CASE _action
      WHEN 'view' THEN v_user_row.can_view
      WHEN 'create' THEN v_user_row.can_create
      WHEN 'update' THEN v_user_row.can_update
      WHEN 'delete' THEN v_user_row.can_delete
      ELSE false END;
    RETURN v_col;
  END IF;

  SELECT * INTO v_role_row FROM public.role_permissions WHERE role = v_role AND module = _module;
  IF FOUND THEN
    v_col := CASE _action
      WHEN 'view' THEN v_role_row.can_view
      WHEN 'create' THEN v_role_row.can_create
      WHEN 'update' THEN v_role_row.can_update
      WHEN 'delete' THEN v_role_row.can_delete
      ELSE false END;
    RETURN v_col;
  END IF;

  RETURN false;
END;
$$;

-- Recreate dropped policies
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage role permissions insert" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage role permissions update" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage role permissions delete" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own permissions or admin" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert user permissions" ON public.user_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user permissions" ON public.user_permissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user permissions" ON public.user_permissions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
