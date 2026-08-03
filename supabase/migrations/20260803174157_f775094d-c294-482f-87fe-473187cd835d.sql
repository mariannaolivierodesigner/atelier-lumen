
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  domain text UNIQUE,
  logo_url text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  modules jsonb NOT NULL DEFAULT '{}'::jsonb,
  social jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  postal_code text,
  phone text,
  email text,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.service_categories(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  price_cents int NOT NULL DEFAULT 0,
  image_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX services_tenant_active_idx ON public.services (tenant_id, is_active);

CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  role_title text,
  bio text,
  photo_url text,
  specialties text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body text,
  cover_url text,
  published_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating int NOT NULL DEFAULT 5,
  body text NOT NULL,
  source text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  starts_at timestamptz NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_tenant_start_idx ON public.bookings (tenant_id, starts_at);

GRANT SELECT ON public.tenants, public.locations, public.service_categories, public.services, public.staff, public.site_sections, public.posts, public.faqs, public.reviews TO anon, authenticated;
GRANT INSERT ON public.bookings TO anon, authenticated;
GRANT ALL ON public.tenants, public.locations, public.service_categories, public.services, public.staff, public.site_sections, public.posts, public.faqs, public.reviews, public.bookings TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active tenants" ON public.tenants FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read active locations" ON public.locations FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read active categories" ON public.service_categories FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read active services" ON public.services FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read active staff" ON public.staff FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read visible sections" ON public.site_sections FOR SELECT TO anon, authenticated USING (is_visible);
CREATE POLICY "public read published posts" ON public.posts FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "public read active faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read published reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "anyone can request a booking" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Demo tenant
INSERT INTO public.tenants (slug, name, tagline, domain, theme, seo, modules, social)
VALUES ('atelier-lumen', 'Atelier Lumen', 'Beauty & wellness atelier', 'atelierlumen.beautyos.app',
  '{"primary":"oklch(0.52 0.07 55)","accent":"oklch(0.72 0.09 70)","background":"oklch(0.98 0.008 85)","font_display":"Cormorant Garamond","font_body":"Jost"}'::jsonb,
  '{"title":"Atelier Lumen — Centro estetico e spa","description":"Trattamenti viso, corpo e rituali spa su misura. Prenota online in meno di un minuto."}'::jsonb,
  '{"booking":true,"ecommerce":true,"blog":true,"loyalty":true,"giftcard":true,"crm":true}'::jsonb,
  '{"instagram":"https://instagram.com","facebook":"https://facebook.com"}'::jsonb);
