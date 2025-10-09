-- Esquema de Base de Datos para Sur Occidente Vintage Store
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de productos (actualizada con control de stock)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  condition VARCHAR(50) DEFAULT 'Muy bueno',
  featured BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active', -- active, sold, reserved, inactive
  tags TEXT[], -- Array de tags
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Control de stock
  stock_quantity INTEGER DEFAULT 0,
  stock_status VARCHAR(20) DEFAULT 'available', -- available, low_stock, out_of_stock, discontinued
  min_stock_level INTEGER DEFAULT 1,
  max_stock_level INTEGER DEFAULT 100,
  
  -- Metadatos adicionales
  sku VARCHAR(100) UNIQUE,
  weight DECIMAL(8,2), -- en gramos
  dimensions JSONB, -- {width, height, depth} en cm
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de imágenes de productos
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de variantes/tallas
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(20),
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de historial de productos
CREATE TABLE IF NOT EXISTS product_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- created, updated, stock_changed, status_changed, deleted
  field_name VARCHAR(100), -- campo que cambió
  old_value TEXT, -- valor anterior
  new_value TEXT, -- nuevo valor
  changed_by VARCHAR(100), -- usuario que hizo el cambio
  notes TEXT, -- notas adicionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL, -- in, out, adjustment, reserved, released
  quantity INTEGER NOT NULL, -- cantidad (positiva o negativa)
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason VARCHAR(100), -- sale, purchase, adjustment, damage, etc.
  reference_id UUID, -- ID de venta, compra, etc.
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de estadísticas del sitio
CREATE TABLE IF NOT EXISTS site_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON contact_messages(read);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_messages_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar categorías iniciales
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Camisetas', 'camisetas', 'Camisetas vintage y retro de diferentes épocas, desde los 70s hasta los 90s', 1),
('Vinilos', 'vinilos', 'Discos de vinilo vintage y ediciones especiales de todos los géneros', 2),
('Accesorios', 'accesorios', 'Accesorios vintage únicos y coleccionables para completar tu look', 3),
('Chaquetas', 'chaquetas', 'Chaquetas vintage y retro de diferentes estilos y épocas', 4),
('Pantalones', 'pantalones', 'Pantalones vintage con estilo urbano y auténtico', 5)
ON CONFLICT (slug) DO NOTHING;

-- Habilitar Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (permitir lectura pública, escritura solo para autenticados)
-- Lectura pública para productos y categorías
CREATE POLICY "Allow public read access on categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Allow public read access on product_images" ON product_images FOR SELECT USING (true);
CREATE POLICY "Allow public read access on product_variants" ON product_variants FOR SELECT USING (true);

-- Escritura solo para usuarios autenticados (admin)
CREATE POLICY "Allow authenticated users to manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage product_images" ON product_images FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to manage product_variants" ON product_variants FOR ALL USING (auth.role() = 'authenticated');

-- Mensajes de contacto: inserción pública, gestión solo para autenticados
CREATE POLICY "Allow public insert on contact_messages" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to manage contact_messages" ON contact_messages FOR ALL USING (auth.role() = 'authenticated');

-- Estadísticas solo para autenticados
CREATE POLICY "Allow authenticated users to manage site_stats" ON site_stats FOR ALL USING (auth.role() = 'authenticated');