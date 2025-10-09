import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Configuración de JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sur-occidente-secret-key-2024';
const JWT_EXPIRES_IN = '24h';

// Configuración de bcrypt
const SALT_ROUNDS = 12;

/**
 * Genera un hash seguro de la contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Hash de la contraseña
 */
export async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error al hashear la contraseña');
  }
}

/**
 * Verifica si una contraseña coincide con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coincide, false si no
 */
export async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Error al verificar la contraseña');
  }
}

/**
 * Genera un token JWT
 * @param {Object} payload - Datos del usuario
 * @returns {string} Token JWT
 */
export function generateToken(payload) {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    throw new Error('Error al generar el token');
  }
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extrae el token de las cookies de la request
 * @param {Request} request - Request de Astro
 * @returns {string|null} Token o null si no existe
 */
export function getTokenFromRequest(request) {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  const tokenCookie = cookies
    .split(';')
    .find(cookie => cookie.trim().startsWith('auth-token='));
  
  return tokenCookie ? tokenCookie.split('=')[1] : null;
}

/**
 * Verifica si el usuario está autenticado
 * @param {Request} request - Request de Astro
 * @returns {Object|null} Usuario autenticado o null
 */
export function getAuthenticatedUser(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  const payload = verifyToken(token);
  return payload;
}

/**
 * Genera una cookie de autenticación
 * @param {string} token - Token JWT
 * @returns {string} String de cookie
 */
export function generateAuthCookie(token) {
  return `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`;
}

/**
 * Genera una cookie para logout
 * @returns {string} String de cookie para eliminar
 */
export function generateLogoutCookie() {
  return 'auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/';
}

/**
 * Roles de usuario disponibles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  VIEWER: 'viewer'
};

/**
 * Verifica si el usuario tiene el rol requerido
 * @param {Object} user - Usuario autenticado
 * @param {string} requiredRole - Rol requerido
 * @returns {boolean} True si tiene el rol, false si no
 */
export function hasRole(user, requiredRole) {
  if (!user || !user.role) return false;
  
  const roleHierarchy = {
    [USER_ROLES.VIEWER]: 1,
    [USER_ROLES.MODERATOR]: 2,
    [USER_ROLES.ADMIN]: 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

/**
 * Genera un ID único para sesiones
 * @returns {string} ID único
 */
export function generateSessionId() {
  return crypto.randomUUID();
}

/**
 * Valida el formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido, false si no
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida la fortaleza de la contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} Resultado de validación
 */
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const isValid = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  
  return {
    isValid,
    errors: [
      ...(password.length < minLength ? ['Mínimo 8 caracteres'] : []),
      ...(!hasUpperCase ? ['Al menos una mayúscula'] : []),
      ...(!hasLowerCase ? ['Al menos una minúscula'] : []),
      ...(!hasNumbers ? ['Al menos un número'] : []),
      ...(!hasSpecialChar ? ['Al menos un carácter especial'] : [])
    ]
  };
}

// Función para obtener el IP del cliente
export function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Función para destruir una sesión
export async function destroySession(sessionToken) {
  if (!sessionToken) {
    return { success: false, error: 'No session token provided' };
  }
  
  try {
    // Verificar y decodificar el token
    const decoded = verifyToken(sessionToken);
    if (!decoded || !decoded.sessionId) {
      return { success: false, error: 'Invalid session token' };
    }
    
    // Importar deleteSession de database.js
    const { deleteSession } = await import('./database.js');
    const deleted = deleteSession(decoded.sessionId);
    
    if (deleted) {
      return { 
        success: true, 
        userId: decoded.userId,
        sessionId: decoded.sessionId 
      };
    } else {
      return { success: false, error: 'Session not found in database' };
    }
  } catch (error) {
    console.error('Error destroying session:', error);
    return { success: false, error: error.message };
  }
}