# Configuración de Supabase para Sur Occidente

Esta guía te ayudará a configurar Supabase como base de datos para tu tienda vintage.

## Paso 1: Crear Cuenta en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Regístrate con GitHub, Google o email
4. Crea una nueva organización (opcional)

## Paso 2: Crear Proyecto

1. Haz clic en "New Project"
2. Selecciona tu organización
3. Configura tu proyecto:
   - **Name**: `sur-occidente-store`
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: South America (São Paulo) - más cercano a Colombia
   - **Pricing Plan**: Free (perfecto para empezar)
4. Haz clic en "Create new project"
5. Espera 2-3 minutos mientras se crea

## Paso 3: Configurar Base de Datos

### 3.1 Ejecutar Schema SQL
1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Haz clic en "New query"
3. Copia y pega todo el contenido del archivo `database-schema.sql`
4. Haz clic en "Run" para ejecutar
5. Verifica que se crearon las tablas en **Table Editor**

### 3.2 Obtener Credenciales
1. Ve a **Settings** → **API**
2. Copia estos valores:
   - **Project URL** (ejemplo: `https://abcdefgh.supabase.co`)
   - **anon public** key (clave pública)
   - **service_role** key (clave privada - ¡mantén secreta!)

## Paso 4: Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto:
```bash
cp .env.example .env
```

2. Edita `.env` con tus credenciales:
```env
# Configuración de Supabase
PUBLIC_SUPABASE_URL=https://tu-proyecto-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_muy_larga_aqui
SUPABASE_SERVICE_KEY=tu_clave_de_servicio_muy_larga_aqui
```

## Paso 5: Migrar Datos Existentes

### 5.1 Configurar Script de Migración
1. Edita `migrate-to-supabase.js`
2. Reemplaza las credenciales:
```javascript
const SUPABASE_URL = 'https://tu-proyecto-id.supabase.co'
const SUPABASE_SERVICE_KEY = 'tu_clave_de_servicio_aqui'
```

### 5.2 Ejecutar Migración
```bash
node migrate-to-supabase.js
```

Esto migrará:
- Todas las categorías
- Todos los productos
- Imágenes de productos
- Variantes/tallas

## Paso 6: Probar Conexión

1. Reinicia el servidor de desarrollo:
```bash
npm run dev
```

2. Ve a tu sitio web
3. Los productos ahora se cargan desde Supabase
4. Si hay problemas, automáticamente usa los archivos JSON como respaldo

## Paso 7: Configurar Seguridad (Opcional)

### 7.1 Configurar Autenticación
1. Ve a **Authentication** → **Settings**
2. Configura proveedores de login si necesitas
3. Para el admin, puedes usar email/password

### 7.2 Revisar Políticas RLS
1. Ve a **Authentication** → **Policies**
2. Verifica que las políticas estén activas
3. Los productos son públicos para lectura
4. Solo usuarios autenticados pueden modificar

## Paso 8: Panel de Administración

Una vez configurado Supabase, tu panel de admin podrá:
- Crear productos nuevos
- Editar productos existentes
- Eliminar productos
- Gestionar stock
- Ver estadísticas reales

## Verificación

### Comprobar que todo funciona:
1. **Productos se cargan**: Ve a `/productos`
2. **Búsqueda funciona**: Busca algo en la página
3. **Categorías funcionan**: Filtra por categoría
4. **Admin panel**: Ve a `/admin` (después de login)

### Si algo no funciona:
- Verifica las variables de entorno
- Revisa la consola del navegador
- Comprueba los logs de Supabase
- El sistema automáticamente usa JSON como respaldo

## Consejos

### Desarrollo:
- Usa la clave `anon` para el frontend
- Usa la clave `service_role` solo para scripts de migración
- Nunca expongas la `service_role` key en el frontend

### Producción:
- Configura las variables en Vercel
- Habilita RLS (Row Level Security)
- Considera un plan de pago si creces mucho

### Respaldo:
- Supabase hace respaldos automáticos
- Puedes exportar datos desde el dashboard
- Los archivos JSON siguen funcionando como respaldo

## Solución de Problemas

### Error: "Invalid API key"
- Verifica que copiaste las claves correctamente
- Asegúrate de usar la clave correcta (anon vs service_role)

### Error: "Table doesn't exist"
- Ejecuta el schema SQL completo
- Verifica que las tablas aparezcan en Table Editor

### Productos no se cargan
- Revisa la consola del navegador
- El sistema debería usar JSON como respaldo automáticamente

### Migración falla
- Verifica que usas la `service_role` key en el script
- Comprueba que las tablas existan antes de migrar

## Soporte

- **Documentación Supabase**: [docs.supabase.com](https://docs.supabase.com)
- **Discord Supabase**: Comunidad muy activa
- **GitHub Issues**: Para problemas específicos del código

¡Listo! Tu tienda ahora tiene una base de datos profesional