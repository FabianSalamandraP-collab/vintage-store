import { getAuthenticatedUser, hasRole, USER_ROLES } from '../utils/auth.js';
import { logSecurityEvent } from '../utils/database.js';

/**
 * Middleware de autenticación para rutas administrativas
 * @param {Request} request - Request de Astro
 * @param {Response} response - Response de Astro
 * @param {Function} next - Función next
 * @returns {Response|void} Redirección o continúa
 */
export function requireAuth(request, redirectTo = '/admin/login') {
  const user = getAuthenticatedUser(request);
  
  if (!user) {
    // Log intento de acceso no autorizado
    logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      severity: 'medium'
    });
    
    return Response.redirect(new URL(redirectTo, request.url));
  }
  
  return user;
}

/**
 * Middleware que requiere un rol específico
 * @param {Request} request - Request de Astro
 * @param {string} requiredRole - Rol requerido
 * @param {string} redirectTo - URL de redirección
 * @returns {Response|Object} Redirección o usuario autenticado
 */
export function requireRole(request, requiredRole = USER_ROLES.VIEWER, redirectTo = '/admin/login') {
  const user = requireAuth(request, redirectTo);
  
  if (user instanceof Response) {
    return user; // Ya es una redirección
  }
  
  if (!hasRole(user, requiredRole)) {
    // Log intento de acceso con permisos insuficientes
    logSecurityEvent({
      type: 'INSUFFICIENT_PERMISSIONS',
      userId: user.id,
      userRole: user.role,
      requiredRole,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      severity: 'high'
    });
    
    return Response.redirect(new URL('/admin/unauthorized', request.url));
  }
  
  return user;
}

/**
 * Middleware solo para administradores
 * @param {Request} request - Request de Astro
 * @returns {Response|Object} Redirección o usuario autenticado
 */
export function requireAdmin(request) {
  return requireRole(request, USER_ROLES.ADMIN);
}

/**
 * Middleware para moderadores y administradores
 * @param {Request} request - Request de Astro
 * @returns {Response|Object} Redirección o usuario autenticado
 */
export function requireModerator(request) {
  return requireRole(request, USER_ROLES.MODERATOR);
}

/**
 * Obtiene la IP del cliente
 * @param {Request} request - Request de Astro
 * @returns {string} IP del cliente
 */
export function getClientIP(request) {
  // Intentar obtener la IP real del cliente
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  // Fallback a la IP de la conexión
  return request.headers.get('x-forwarded-for') || 'unknown';
}

/**
 * Rate limiting simple en memoria
 */
const rateLimitStore = new Map();

/**
 * Middleware de rate limiting
 * @param {Request} request - Request de Astro
 * @param {Object} options - Opciones de rate limiting
 * @returns {Response|null} Response de error o null si está permitido
 */
export function rateLimit(request, options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutos
    maxRequests = 100, // máximo 100 requests por ventana
    message = 'Demasiadas solicitudes, intenta de nuevo más tarde'
  } = options;
  
  const ip = getClientIP(request);
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Obtener o crear registro para esta IP
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }
  
  const requests = rateLimitStore.get(ip);
  
  // Filtrar requests dentro de la ventana de tiempo
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  if (recentRequests.length >= maxRequests) {
    // Log intento de rate limiting
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      ip,
      requestCount: recentRequests.length,
      maxRequests,
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      severity: 'medium'
    });
    
    return new Response(JSON.stringify({ error: message }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(windowMs / 1000)
      }
    });
  }
  
  // Agregar esta request al registro
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);
  
  return null; // Permitir la request
}

/**
 * Middleware de rate limiting específico para login
 * @param {Request} request - Request de Astro
 * @returns {Response|null} Response de error o null si está permitido
 */
export function loginRateLimit(request) {
  return rateLimit(request, {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // máximo 5 intentos de login por IP
    message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos'
  });
}

/**
 * Middleware de rate limiting para rutas administrativas
 * @param {Request} request - Request de Astro
 * @returns {Response|null} Response de error o null si está permitido
 */
export function adminRateLimit(request) {
  return rateLimit(request, {
    windowMs: 5 * 60 * 1000, // 5 minutos
    maxRequests: 50, // máximo 50 requests por 5 minutos
    message: 'Demasiadas solicitudes administrativas, intenta de nuevo más tarde'
  });
}

/**
 * Limpia el store de rate limiting periódicamente
 */
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  for (const [ip, requests] of rateLimitStore.entries()) {
    const recentRequests = requests.filter(timestamp => timestamp > oneHourAgo);
    if (recentRequests.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, recentRequests);
    }
  }
}, 60 * 60 * 1000); // Limpiar cada hora

/**
 * Middleware de protección CSRF simple
 * @param {Request} request - Request de Astro
 * @returns {Response|null} Response de error o null si está permitido
 */
export function csrfProtection(request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return null; // No verificar CSRF para requests de solo lectura
  }
  
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Verificar que el origin o referer coincida con el host
  const validOrigin = origin && origin.includes(host);
  const validReferer = referer && referer.includes(host);
  
  if (!validOrigin && !validReferer) {
    logSecurityEvent({
      type: 'CSRF_ATTACK_ATTEMPT',
      ip: getClientIP(request),
      origin,
      referer,
      host,
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      severity: 'high'
    });
    
    return new Response(JSON.stringify({ error: 'CSRF token inválido' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return null;
}

export { getClientIP };