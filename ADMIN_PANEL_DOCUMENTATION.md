# 📋 Documentación del Panel de Administración - Sur Occidente

## 🔐 Acceso al Panel Admin

### URL de Acceso
```
http://localhost:4321/admin/login
```

### Credenciales por Defecto
- **Usuario:** `admin`
- **Contraseña:** `admin123`

## 🛡️ Sistema de Seguridad Implementado

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

## 🚀 Cómo Acceder al Panel

### Paso 1: Iniciar el Servidor
```bash
npm run dev
```

### Paso 2: Navegar al Login
Abrir en el navegador: `http://localhost:4321/admin/login`

### Paso 3: Completar el Formulario
1. **Usuario:** Ingresar `admin`
2. **Contraseña:** Ingresar `admin123`
3. **CAPTCHA:** Solo si aparece (respuesta: `7`)
4. **Recordar sesión:** Marcar si deseas sesión extendida
5. **Clic en:** "Acceder al Panel"

### Paso 4: Acceso Exitoso
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
  secretKey: 'sur-occidente-admin-2024'  // Clave secreta
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
1. Editar el archivo: `src/pages/admin/login.astro`
2. Buscar: `passwordHash` en `SECURITY_CONFIG`
3. Generar nuevo hash para la nueva contraseña
4. Actualizar la función `verifyPassword()`

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
- ✅ Usar credenciales exactas: `admin` / `admin123`

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
**Versión del sistema:** 2.0 - Seguridad Mejorada  
**Proyecto:** Vintage Store - Sur Occidente