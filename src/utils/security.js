// src/utils/security.js

/**
 * Sanitiza input del usuario para prevenir XSS
 * @param {string} input - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
export function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && 
         email.length <= 254 && 
         email.length >= 5;
}

/**
 * Valida texto general
 * @param {string} text - Texto a validar
 * @param {number} maxLength - Longitud máxima
 * @param {number} minLength - Longitud mínima
 * @returns {boolean} - True si es válido
 */
export function validateText(text, maxLength = 1000, minLength = 1) {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Valida número de teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - True si es válido
 */
export function validatePhone(phone) {
  if (!phone) return true; // Campo opcional
  const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Rate limiting simple usando localStorage
 * @param {string} key - Clave para el rate limit
 * @param {number} windowMs - Ventana de tiempo en ms
 * @param {number} maxAttempts - Máximo intentos
 * @returns {boolean} - True si está permitido
 */
export function checkRateLimit(key, windowMs = 30000, maxAttempts = 1) {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(key) || '[]');
  
  // Filtrar intentos dentro de la ventana de tiempo
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return false;
  }
  
  // Agregar intento actual
  recentAttempts.push(now);
  localStorage.setItem(key, JSON.stringify(recentAttempts));
  
  return true;
}

/**
 * Verifica si una acción está limitada por rate limiting
 * @param {string} key - Clave para el rate limit
 * @param {number} maxAttempts - Máximo intentos
 * @param {number} windowMs - Ventana de tiempo en ms
 * @returns {boolean} - True si está limitado
 */
export function isRateLimited(key, maxAttempts, windowMs) {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  const recentAttempts = attempts.filter(time => now - time < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    return true;
  }
  
  recentAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(recentAttempts));
  return false;
}

/**
 * Sanitiza parámetros de URL
 * @param {string} param - Parámetro a sanitizar
 * @param {number} maxLength - Longitud máxima
 * @returns {string|undefined} - Parámetro sanitizado
 */
export function sanitizeURLParam(param, maxLength = 100) {
  if (!param || typeof param !== 'string') return undefined;
  
  const cleaned = param
    .replace(/[<>"'&\x00-\x1f\x7f-\x9f]/g, '')
    .trim();
  
  return cleaned.length > maxLength ? 
    cleaned.substring(0, maxLength) : 
    cleaned;
}

/**
 * Valida parámetros de URL según reglas específicas
 * @param {Object} params - Parámetros a validar
 * @param {Object} rules - Reglas de validación
 * @returns {Object} - Resultado de validación
 */
export function validateUrlParams(params, rules = {}) {
  const result = {
    isValid: true,
    sanitizedParams: {},
    errors: []
  };
  
  for (const [key, value] of Object.entries(params)) {
    const rule = rules[key] || {};
    const maxLength = rule.maxLength || 100;
    const required = rule.required || false;
    const pattern = rule.pattern;
    
    // Verificar si es requerido
    if (required && (!value || value.trim() === '')) {
      result.isValid = false;
      result.errors.push(`${key} es requerido`);
      continue;
    }
    
    // Sanitizar valor
    const sanitized = sanitizeURLParam(value, maxLength);
    
    // Verificar patrón si existe
    if (pattern && sanitized && !pattern.test(sanitized)) {
      result.isValid = false;
      result.errors.push(`${key} tiene formato inválido`);
      continue;
    }
    
    result.sanitizedParams[key] = sanitized;
  }
  
  return result;
}

/**
 * Logging de eventos de seguridad
 * Integrado con el sistema de logging avanzado
 */
// Logging simplificado usando localStorage
function logToAdvancedLogger(type, data) {
  const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
  logs.push({
    type,
    data,
    timestamp: Date.now(),
    level: 'info'
  });
  localStorage.setItem('security_logs', JSON.stringify(logs.slice(-100)));
}

const SECURITY_EVENTS = {
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION: 'SQL_INJECTION',
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

export function logSecurityEvent(eventType, data = {}) {
  // Usar el sistema de logging avanzado
  return logToAdvancedLogger(eventType, data);
}

// Re-exportar eventos de seguridad para compatibilidad
export { SECURITY_EVENTS };

/**
 * Monitor de seguridad para detectar amenazas
 */
export class SecurityMonitor {
  constructor() {
    this.events = [];
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Monitor de intentos de XSS
    this.monitorXSSAttempts();
    
    // Monitor de rate limiting
    this.monitorRateLimiting();
    
    // Monitor de errores de validación
    this.monitorValidationErrors();
  }
  
  monitorXSSAttempts() {
    const originalLog = console.error;
    console.error = (...args) => {
      if (args.some(arg => 
        typeof arg === 'string' && 
        arg.includes('script')
      )) {
        this.logThreat('XSS_ATTEMPT', { args });
      }
      originalLog.apply(console, args);
    };
  }
  
  monitorRateLimiting() {
    // Implementar monitoreo de rate limiting
  }
  
  monitorValidationErrors() {
    // Implementar monitoreo de errores de validación
  }
  
  logThreat(type, data) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      data,
      url: window.location.href
    };
    
    this.events.push(event);
    
    // En producción, enviar a servicio de monitoreo
    if (this.events.length > 100) {
      this.sendToSecurityService(this.events.splice(0, 50));
    }
  }
  
  sendToSecurityService(events) {
    // Implementar envío a servicio de seguridad
    console.warn('[SECURITY MONITOR]', events);
  }
}

// Inicializar monitor si estamos en el navegador
if (typeof window !== 'undefined') {
  window.securityMonitor = new SecurityMonitor();
}