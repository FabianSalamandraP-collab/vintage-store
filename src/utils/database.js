import { hashPassword } from './auth.js';

// Base de datos en memoria (en producción usar una base de datos real)
let users = [];
let sessions = [];
let securityLogs = [];
let analytics = {
  pageViews: [],
  userActions: [],
  contactSubmissions: [],
  productViews: []
};

// Usuario administrador por defecto
const defaultAdmin = {
  id: '1',
  username: 'admin',
  email: 'admin@suroccidente.com',
  password: '', // Se establecerá con hash
  role: 'admin',
  createdAt: new Date().toISOString(),
  lastLogin: null,
  isActive: true,
  loginAttempts: 0,
  lockedUntil: null
};

// Inicializar base de datos
export async function initializeDatabase() {
  if (users.length === 0) {
    // Crear usuario admin por defecto
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'changeMe123!';
    defaultAdmin.password = await hashPassword(defaultPassword);
    users.push(defaultAdmin);
    
    console.log('Base de datos inicializada con usuario admin por defecto');
    console.log('Email: admin@suroccidente.com');
    console.log('Contraseña: [CONFIGURADA VÍA VARIABLE DE ENTORNO]');
  }
}

// === GESTIÓN DE USUARIOS ===

/**
 * Obtiene todos los usuarios
 * @returns {Array} Lista de usuarios (sin contraseñas)
 */
export function getAllUsers() {
  return users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

/**
 * Busca un usuario por email
 * @param {string} email - Email del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
export function findUserByEmail(email) {
  return users.find(user => user.email === email) || null;
}

/**
 * Busca un usuario por ID
 * @param {string} id - ID del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
export function findUserById(id) {
  return users.find(user => user.id === id) || null;
}

/**
 * Crea un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Object} Usuario creado (sin contraseña)
 */
export function createUser(userData) {
  const newUser = {
    id: (users.length + 1).toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true,
    loginAttempts: 0,
    lockedUntil: null
  };
  
  users.push(newUser);
  
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Actualiza un usuario
 * @param {string} id - ID del usuario
 * @param {Object} updateData - Datos a actualizar
 * @returns {Object|null} Usuario actualizado o null
 */
export function updateUser(id, updateData) {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  users[userIndex] = { ...users[userIndex], ...updateData };
  
  const { password, ...userWithoutPassword } = users[userIndex];
  return userWithoutPassword;
}

/**
 * Elimina un usuario
 * @param {string} id - ID del usuario
 * @returns {boolean} True si se eliminó, false si no
 */
export function deleteUser(id) {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) return false;
  
  users.splice(userIndex, 1);
  return true;
}

/**
 * Actualiza el último login del usuario
 * @param {string} id - ID del usuario
 */
export function updateLastLogin(id) {
  const user = findUserById(id);
  if (user) {
    user.lastLogin = new Date().toISOString();
    user.loginAttempts = 0;
    user.lockedUntil = null;
  }
}

/**
 * Incrementa los intentos de login fallidos
 * @param {string} email - Email del usuario
 */
export function incrementLoginAttempts(email) {
  const user = findUserByEmail(email);
  if (user) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    
    // Bloquear cuenta después de 5 intentos fallidos
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos
    }
  }
}

// === GESTIÓN DE SESIONES ===

/**
 * Crea una nueva sesión
 * @param {Object} sessionData - Datos de la sesión
 * @returns {Object} Sesión creada
 */
export function createSession(sessionData) {
  const session = {
    id: crypto.randomUUID(),
    ...sessionData,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  sessions.push(session);
  return session;
}

/**
 * Busca una sesión por ID
 * @param {string} sessionId - ID de la sesión
 * @returns {Object|null} Sesión encontrada o null
 */
export function findSessionById(sessionId) {
  return sessions.find(session => session.id === sessionId) || null;
}

/**
 * Elimina una sesión
 * @param {string} sessionId - ID de la sesión
 * @returns {boolean} True si se eliminó, false si no
 */
export function deleteSession(sessionId) {
  const sessionIndex = sessions.findIndex(session => session.id === sessionId);
  if (sessionIndex === -1) return false;
  
  sessions.splice(sessionIndex, 1);
  return true;
}

/**
 * Limpia sesiones expiradas
 */
export function cleanExpiredSessions() {
  const now = new Date();
  sessions = sessions.filter(session => {
    const lastActivity = new Date(session.lastActivity);
    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
    return hoursSinceActivity < 24; // Sesiones válidas por 24 horas
  });
}

// === LOGS DE SEGURIDAD ===

/**
 * Registra un evento de seguridad
 * @param {Object} logData - Datos del log
 */
export function logSecurityEvent(logData) {
  const log = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...logData
  };
  
  securityLogs.push(log);
  
  // Mantener solo los últimos 1000 logs
  if (securityLogs.length > 1000) {
    securityLogs = securityLogs.slice(-1000);
  }
}

/**
 * Obtiene los logs de seguridad
 * @param {number} limit - Límite de logs a retornar
 * @returns {Array} Lista de logs
 */
export function getSecurityLogs(limit = 100) {
  return securityLogs
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// === ANALYTICS ===

/**
 * Registra una vista de página
 * @param {Object} pageViewData - Datos de la vista
 */
export function logPageView(pageViewData) {
  analytics.pageViews.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...pageViewData
  });
  
  // Mantener solo los últimos 10000 registros
  if (analytics.pageViews.length > 10000) {
    analytics.pageViews = analytics.pageViews.slice(-10000);
  }
}

/**
 * Registra una acción de usuario
 * @param {Object} actionData - Datos de la acción
 */
export function logUserAction(actionData) {
  analytics.userActions.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...actionData
  });
  
  if (analytics.userActions.length > 5000) {
    analytics.userActions = analytics.userActions.slice(-5000);
  }
}

/**
 * Registra un envío de formulario de contacto
 * @param {Object} submissionData - Datos del envío
 */
export function logContactSubmission(submissionData) {
  analytics.contactSubmissions.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...submissionData
  });
}

/**
 * Obtiene los envíos de formularios de contacto
 * @param {number} limit - Límite de envíos a retornar
 * @returns {Array} Lista de envíos de contacto
 */
export function getContactSubmissions(limit = 100) {
  return analytics.contactSubmissions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Registra una vista de producto
 * @param {Object} productViewData - Datos de la vista
 */
export function logProductView(productViewData) {
  analytics.productViews.push({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...productViewData
  });
  
  if (analytics.productViews.length > 5000) {
    analytics.productViews = analytics.productViews.slice(-5000);
  }
}

/**
 * Obtiene estadísticas de analytics
 * @returns {Object} Estadísticas
 */
export function getAnalytics() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    pageViews: {
      total: analytics.pageViews.length,
      last24h: analytics.pageViews.filter(pv => new Date(pv.timestamp) > last24h).length,
      last7d: analytics.pageViews.filter(pv => new Date(pv.timestamp) > last7d).length,
      last30d: analytics.pageViews.filter(pv => new Date(pv.timestamp) > last30d).length
    },
    userActions: {
      total: analytics.userActions.length,
      last24h: analytics.userActions.filter(ua => new Date(ua.timestamp) > last24h).length,
      last7d: analytics.userActions.filter(ua => new Date(ua.timestamp) > last7d).length,
      last30d: analytics.userActions.filter(ua => new Date(ua.timestamp) > last30d).length
    },
    contactSubmissions: {
      total: analytics.contactSubmissions.length,
      last24h: analytics.contactSubmissions.filter(cs => new Date(cs.timestamp) > last24h).length,
      last7d: analytics.contactSubmissions.filter(cs => new Date(cs.timestamp) > last7d).length,
      last30d: analytics.contactSubmissions.filter(cs => new Date(cs.timestamp) > last30d).length
    },
    productViews: {
      total: analytics.productViews.length,
      last24h: analytics.productViews.filter(pv => new Date(pv.timestamp) > last24h).length,
      last7d: analytics.productViews.filter(pv => new Date(pv.timestamp) > last7d).length,
      last30d: analytics.productViews.filter(pv => new Date(pv.timestamp) > last30d).length
    }
  };
}

// Inicializar la base de datos al importar el módulo
initializeDatabase();

// Limpiar sesiones expiradas cada hora
setInterval(cleanExpiredSessions, 60 * 60 * 1000);