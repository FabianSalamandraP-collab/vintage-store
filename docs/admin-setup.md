# Configuración del panel de admin con datos reales

Sigue estos pasos para conectar el panel de administración a Supabase y usar datos reales con seguridad.

## 1) Variables de entorno
Crea o actualiza tu `.env` (o variables en el entorno de despliegue):

- `PUBLIC_SUPABASE_URL` = URL del proyecto Supabase
- `PUBLIC_SUPABASE_ANON_KEY` = anon key para lecturas públicas
- `SUPABASE_SERVICE_ROLE_KEY` = service-role key para operaciones de escritura desde el admin
- `ADMIN_DEFAULT_PASSWORD` (opcional, solo desarrollo) o `ADMIN_PASSWORD_HASH` (recomendado)

Si usas `ADMIN_PASSWORD_HASH`, el login verificará la contraseña con `bcryptjs`.

## 2) Esquema de base de datos
Importa el esquema SQL:

- Abre el SQL editor de Supabase
- Copia el contenido de `supabase/schema.sql`
- Ejecuta el script (crea tablas y políticas RLS básicas)

Tablas incluidas:
- `categories`, `products`, `product_images`, `product_variants`, `product_history`, `stock_movements`

RLS:
- Lecturas públicas permitidas de productos activos y sus tablas relacionadas
- Escrituras se realizan con `service-role` (bypassa RLS)

## 3) Semillas iniciales (opcional)
Inserta categorías y un producto de prueba desde el SQL editor:

```sql
insert into public.categories(name, slug) values
  ('Ropa', 'ropa'),
  ('Accesorios', 'accesorios');

insert into public.products(name, slug, price, is_active, stock_quantity, category_id)
values ('Camiseta vintage', 'camiseta-vintage', 45000, true, 10,
        (select id from public.categories where slug='ropa'));
```

## 4) Seguridad del login admin
- El archivo `src/pages/admin/login.astro` ahora:
  - Verifica contraseña con `bcryptjs` si `ADMIN_PASSWORD_HASH` está definido
  - Aplica rate limiting por IP a intentos de login
  - Mantiene fallback a `ADMIN_DEFAULT_PASSWORD` solo para desarrollo

Para generar un hash bcrypt en tu equipo:

```bash
node -e "(async ()=>{const bcrypt=require('bcryptjs'); const salt=await bcrypt.genSalt(10); console.log(await bcrypt.hash('TU_PASSWORD', salt));})();"
```

Copia el hash resultante en `ADMIN_PASSWORD_HASH`.

## 5) Cliente Supabase service-role
- Se agregó `supabaseAdmin` en `src/lib/supabase.js`
- `src/lib/database.js` usa `supabaseAdmin || supabase` para operaciones de escritura:
  - `createProduct`, `updateProduct`, `updateStock`, `deleteProduct`, `logProductHistory`, `logStockMovement`

## 6) Flujo de productos y stock
- Las páginas admin (`products.astro`, `stock.astro`, `history.astro`) ya conectan con `lib/database.js`
- Con las variables configuradas y el esquema en Supabase, podrás:
  - Crear/editar productos
  - Ajustar stock y ver movimientos
  - Consultar historial de cambios

## 7) Pruebas rápidas
- Inicia el proyecto y abre `/admin/login`
- Inicia sesión con tu contraseña configurada
- Ve a `/admin/products` y crea/edita un producto
- Ve a `/admin/stock` para ajustar inventario
- Verifica en Supabase que las tablas reciben datos

## 8) Despliegue
- Asegúrate de configurar todas las variables en el entorno de producción
- Usa siempre `ADMIN_PASSWORD_HASH` (no `ADMIN_DEFAULT_PASSWORD`)
- Mantén privada la `SUPABASE_SERVICE_ROLE_KEY`

## 9) Notas
- Si habilitas más RLS, recuerda que el admin usa `service-role` y no necesita políticas de inserción/actualización
- El sitio público consulta productos activos (`is_active=true`)