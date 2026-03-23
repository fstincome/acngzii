
-- Products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'snacks',
  price integer NOT NULL DEFAULT 0,
  cost_price integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete products" ON public.products FOR DELETE TO authenticated USING (true);

-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  visitor_id text NOT NULL,
  table_number integer NOT NULL DEFAULT 1,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow authenticated update orders" ON public.orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete orders" ON public.orders FOR DELETE TO authenticated USING (true);

-- Order items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow authenticated update order_items" ON public.order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete order_items" ON public.order_items FOR DELETE TO authenticated USING (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
