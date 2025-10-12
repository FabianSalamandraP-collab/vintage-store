# Documentación del Panel de Administración - Sur Occidente

## Acceso al Panel Admin

### URL de Acceso
```
http://localhost:4321/admin/login
```

### Credenciales por Defecto
- **Usuario:** `admin`
- **Contraseña:** Configurada vía variable de entorno `ADMIN_DEFAULT_PASSWORD`

> **IMPORTANTE:** Las credenciales por defecto deben configurarse en el archivo `.env` antes del primer uso.

## Sistema de Seguridad Implementado

### Características de Seguridad

#### 1. Control de Intentos Fallidos
- **Máximo de intentos:** 5 intentos fallidos por IP
- **Tiempo de bloqueo:** 15 minutos automáticos
- **Reset automático:** Después del tiempo de bloqueo

#### 2. Sistema CAPTCHA
- **Activación:** Después de 3 intentos fallidos
- **Pregunta:** "¿Cuánto es 3 + 4?"
- **Respuesta correcta:** `7`

#### 3. Gestión de Sesiones
- **Duración estándar:** 30 minutos
- **Opción "Recordar":** 7 días (checkbox disponible)
- **Expiración automática:** Sí
- **Cookies seguras:** HttpOnly, SameSite=strict

#### 4. Monitoreo de Seguridad
- **Logging de intentos:** Todos los intentos se registran en consola
- **Tracking por IP:** Seguimiento de intentos por dirección IP
- **User-Agent tracking:** Registro del navegador utilizado
- **Session ID único:** Cada sesión tiene un identificador único

## 🚀 Configuración Inicial

### Paso 1: Configurar Variables de Entorno
Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

Configurar las siguientes variables:
```env
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_DEFAULT_PASSWORD=your-secure-admin-password-here
```

### Paso 2: Iniciar el Servidor
```bash
npm run dev
```

### Paso 3: Navegar al Login
Abrir en el navegador: `http://localhost:4321/admin/login`

### Paso 4: Completar el Formulario
1. **Usuario:** Ingresar `admin`
2. **Contraseña:** Usar la configurada en `ADMIN_DEFAULT_PASSWORD`
3. **CAPTCHA:** Solo si aparece (respuesta: `7`)
4. **Recordar sesión:** Marcar si deseas sesión extendida
5. **Clic en:** "Acceder al Panel"

### Paso 5: Acceso Exitoso
Serás redirigido automáticamente a: `http://localhost:4321/admin`

## ⚠️ Situaciones de Bloqueo

### Si tu cuenta está bloqueada:
1. **Esperar:** 15 minutos desde el último intento fallido
2. **Verificar:** Que estás usando las credenciales correctas
3. **Reintentar:** Después del tiempo de espera

### Mensaje de bloqueo típico:
```
"Cuenta bloqueada. Intenta de nuevo en X minutos."
```

## 🔧 Configuración Técnica

### Variables de Seguridad
```javascript
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,        // Máximo intentos fallidos
  lockoutDuration: 15 * 60 * 1000,  // 15 minutos en ms
  sessionTimeout: 30 * 60 * 1000,   // 30 minutos en ms
  requireCaptcha: true,        // CAPTCHA habilitado
  secretKey: process.env.JWT_SECRET || 'fallback-key'
};
```

### Estructura de Sesión
```javascript
{
  user: 'admin',
  loginTime: '2024-01-01T12:00:00.000Z',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'uuid-único'
}
```

## 📊 Logs de Seguridad

### Eventos Registrados
- ✅ **Login exitoso:** `[SECURITY] Login exitoso: admin desde IP`
- ❌ **Login fallido:** `[SECURITY] Login fallido: admin desde IP (intento X)`
- 🔒 **Cuenta bloqueada:** Automático después de 5 intentos
- ⏰ **Sesión expirada:** Limpieza automática de cookies

## 🛠️ Mantenimiento y Administración

### Cambiar Contraseña
1. Actualizar la variable `ADMIN_DEFAULT_PASSWORD` en el archivo `.env`
2. Reiniciar el servidor para aplicar los cambios

### Ajustar Configuración de Seguridad
Modificar las constantes en `SECURITY_CONFIG`:
- `maxFailedAttempts`: Cambiar número de intentos
- `lockoutDuration`: Ajustar tiempo de bloqueo
- `sessionTimeout`: Modificar duración de sesión

### Producción vs Desarrollo
- **Desarrollo:** `secure: false` en cookies
- **Producción:** `secure: true` (solo HTTPS)
- **Logs:** En producción usar base de datos en lugar de consola

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. No puedo acceder
- ✅ Verificar que el servidor esté corriendo
- ✅ Confirmar URL correcta: `/admin/login`
- ✅ Verificar configuración de variables de entorno

#### 2. Cuenta bloqueada
- ⏰ Esperar 15 minutos completos
- 🔄 Limpiar cookies del navegador
- 🆕 Usar ventana de incógnito

#### 3. CAPTCHA no aparece
- 📝 Hacer 3 intentos fallidos primero
- 🔢 Respuesta correcta es siempre `7`

#### 4. Sesión expira muy rápido
- ☑️ Marcar "Recordar sesión por 7 días"
- 🕐 Sesión estándar: 30 minutos
- 🕐 Sesión extendida: 7 días

## 📞 Soporte

Para problemas técnicos o dudas sobre el panel de administración:
1. Revisar logs en la consola del navegador
2. Verificar logs del servidor en terminal
3. Consultar esta documentación
4. Contactar al equipo de desarrollo

---

**Última actualización:** Enero 2024  
**Versión del sistema:** 2.1 - Seguridad Mejorada con Variables de Entorno  
**Proyecto:** Vintage Store - Sur Occidente