
-- Books catalog
CREATE TABLE public.library_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code text NOT NULL UNIQUE,
  title text NOT NULL,
  authors text,
  isbn text,
  category text,
  language text,
  publisher text,
  publication_year integer,
  edition text,
  copies_total integer NOT NULL DEFAULT 1 CHECK (copies_total >= 0),
  copies_available integer NOT NULL DEFAULT 1 CHECK (copies_available >= 0),
  shelf text,
  cover_url text,
  description text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO authenticated;
GRANT ALL ON public.library_books TO service_role;

ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read books" ON public.library_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lib create books" ON public.library_books FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'create'));
CREATE POLICY "Lib update books" ON public.library_books FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'update'))
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'update'));
CREATE POLICY "Lib delete books" ON public.library_books FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'delete'));

CREATE INDEX library_books_title_idx ON public.library_books (lower(title));
CREATE INDEX library_books_isbn_idx ON public.library_books (isbn);

-- Reading visits
CREATE TABLE public.library_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_out_at timestamptz,
  books_consulted text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_visits TO authenticated;
GRANT ALL ON public.library_visits TO service_role;

ALTER TABLE public.library_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read library_visits" ON public.library_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lib create visits" ON public.library_visits FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'create'));
CREATE POLICY "Lib update visits" ON public.library_visits FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'update'))
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'update'));
CREATE POLICY "Lib delete visits" ON public.library_visits FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'delete'));

CREATE INDEX library_visits_active_idx ON public.library_visits (visitor_id) WHERE checked_out_at IS NULL;

-- Loans
CREATE TABLE public.library_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE RESTRICT,
  loaned_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  returned_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned')),
  issued_by uuid REFERENCES auth.users(id),
  returned_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_loans TO authenticated;
GRANT ALL ON public.library_loans TO service_role;

ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read loans" ON public.library_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lib create loans" ON public.library_loans FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'create'));
CREATE POLICY "Lib update loans" ON public.library_loans FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'update'))
  WITH CHECK (public.has_permission(auth.uid(), 'library', 'update'));
CREATE POLICY "Lib delete loans" ON public.library_loans FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'library', 'delete'));

CREATE INDEX library_loans_active_idx ON public.library_loans (book_id) WHERE status = 'active';
CREATE INDEX library_loans_visitor_idx ON public.library_loans (visitor_id);

-- Stock management trigger
CREATE OR REPLACE FUNCTION public.library_loans_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_avail integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.library_books
       SET copies_available = copies_available - 1,
           updated_at = now()
     WHERE id = NEW.book_id
     RETURNING copies_available INTO v_avail;
    IF v_avail < 0 THEN
      RAISE EXCEPTION 'No copies available for this book';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status = 'returned' THEN
      UPDATE public.library_books
         SET copies_available = LEAST(copies_total, copies_available + 1),
             updated_at = now()
       WHERE id = NEW.book_id;
    ELSIF OLD.status = 'returned' AND NEW.status = 'active' THEN
      UPDATE public.library_books
         SET copies_available = copies_available - 1,
             updated_at = now()
       WHERE id = NEW.book_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE public.library_books
         SET copies_available = LEAST(copies_total, copies_available + 1),
             updated_at = now()
       WHERE id = OLD.book_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER library_loans_stock_trg
AFTER INSERT OR UPDATE OR DELETE ON public.library_loans
FOR EACH ROW EXECUTE FUNCTION public.library_loans_stock();

-- updated_at trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER library_books_updated_at BEFORE UPDATE ON public.library_books
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER library_loans_updated_at BEFORE UPDATE ON public.library_loans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default permissions for the new module
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_update, can_delete) VALUES
  ('admin','library', true, true, true, true),
  ('american_center','library', true, true, true, true),
  ('american_corner_gitega','library', true, false, false, false),
  ('coordinator','library', true, false, false, false),
  ('program_manager','library', true, false, false, false),
  ('public_relations','library', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
