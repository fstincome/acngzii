-- Permissions module enum
CREATE TYPE public.app_module AS ENUM ('visitors', 'programs', 'statistics', 'scanner');

-- role_permissions
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module app_module NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read role permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage role permissions insert"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage role permissions update"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage role permissions delete"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_permissions (override per user)
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own permissions or admin"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert user permissions"
  ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user permissions"
  ON public.user_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user permissions"
  ON public.user_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_program_tasks_updated_at();

CREATE TRIGGER user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_program_tasks_updated_at();

-- has_permission helper
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module app_module, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
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

-- Seed defaults
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete) VALUES
  ('director', 'visitors',  true, true, true, true),
  ('director', 'programs',  true, true, true, true),
  ('director', 'statistics', true, false, false, false),
  ('director', 'scanner',   true, true, false, false),
  ('reception', 'visitors',  true, true, false, false),
  ('reception', 'programs',  true, false, false, false),
  ('reception', 'statistics', false, false, false, false),
  ('reception', 'scanner',   true, true, false, false),
  ('national_coordinator', 'visitors',  true, true, true, true),
  ('national_coordinator', 'programs',  true, true, true, true),
  ('national_coordinator', 'statistics', true, true, true, true),
  ('national_coordinator', 'scanner',   true, true, true, true),
  ('admin', 'visitors',  true, true, true, true),
  ('admin', 'programs',  true, true, true, true),
  ('admin', 'statistics', true, true, true, true),
  ('admin', 'scanner',   true, true, true, true)
ON CONFLICT (role, module) DO NOTHING;
