/**
 * Sistema de Logging de Seguridad Avanzado
 * Maneja el registro, almacenamiento y análisis de eventos de seguridad
 */

// Configuración del logger
const SECURITY_CONFIG = {
  maxLogEntries: 1000,
  alertThresholds: {
    failedAttempts: 5,
    suspiciousActivity: 3,
    timeWindow: 300000 // 5 minutos
  },
  logLevels: {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    ALERT: 'alert'
  }
};

// Tipos de eventos de seguridad
const SECURITY_EVENTS = {
  // Autenticación y autorización
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  
  // Validación de entrada
  INPUT_VALIDATION_FAILED: 'input_validation_failed',
  XSS_ATTEMPT: 'xss_attempt',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  
  // Formularios
  FORM_SUBMISSION: 'form_submission',
  HONEYPOT_TRIGGERED: 'honeypot_triggered',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Navegación y URLs
  URL_PARAM_VALIDATION_FAILED: 'url_param_validation_failed',
  INVALID_SEARCH_PARAM: 'invalid_search_param',
  INVALID_FILTER_PARAM: 'invalid_filter_param',
  URL_TOO_LONG: 'url_too_long',
  
  // Actividad sospechosa
  SUSPICIOUS_USER_AGENT: 'suspicious_user_agent',
  MULTIPLE_FAILED_ATTEMPTS: 'multiple_failed_attempts',
  DEVTOOLS_DETECTED: 'devtools_detected',
  CONSOLE_ACCESS_BLOCKED: 'console_access_blocked',
  
  // Sistema
  SECURITY_SCAN_DETECTED: 'security_scan_detected',
  BOT_ACTIVITY: 'bot_activity',
  FILTERS_CLEARED: 'filters_cleared'
};

class SecurityLogger {
  constructor() {
    this.logs = this.loadLogs();
    this.alerts = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    // Limpiar logs antiguos al inicializar
    this.cleanOldLogs();
  }
  
  /**
   * Genera un ID único para la sesión
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Carga logs existentes desde localStorage
   */
  loadLogs() {
    try {
      const stored = localStorage.getItem('security_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Error loading security logs:', error);
      return [];
    }
  }
  
  /**
   * Guarda logs en localStorage
   */
  saveLogs() {
    try {
      // Mantener solo los últimos N logs
      if (this.logs.length > SECURITY_CONFIG.maxLogEntries) {
        this.logs = this.logs.slice(-SECURITY_CONFIG.maxLogEntries);
      }
      localStorage.setItem('security_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Error saving security logs:', error);
    }
  }
  
  /**
   * Limpia logs antiguos (más de 24 horas)
   */
  cleanOldLogs() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.logs = this.logs.filter(log => log.timestamp > oneDayAgo);
    this.saveLogs();
  }
  
  /**
   * Registra un evento de seguridad
   */
  logEvent(eventType, data = {}, level = SECURITY_CONFIG.logLevels.INFO) {
    const logEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      eventType,
      level,
      data: this.sanitizeLogData(data),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer || 'direct'
    };
    
    this.logs.push(logEntry);
    this.saveLogs();
    
    // Verificar si necesita generar alertas
    this.checkForAlerts(eventType, logEntry);
    
    // Log en consola para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY ${level.toUpperCase()}]`, eventType, data);
    }
    
    return logEntry.id;
  }
  
  /**
   * Genera un ID único para el log
   */
  generateLogId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
  
  /**
   * Sanitiza datos sensibles antes de guardar
   */
  sanitizeLogData(data) {
    const sanitized = { ...data };
    
    // Remover datos sensibles
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    // Truncar strings muy largos
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
        sanitized[key] = sanitized[key].substring(0, 500) + '...[TRUNCATED]';
      }
    });
    
    return sanitized;
  }
  
  /**
   * Verifica patrones sospechosos y genera alertas
   */
  checkForAlerts(eventType, logEntry) {
    const now = Date.now();
    const timeWindow = SECURITY_CONFIG.alertThresholds.timeWindow;
    const recentLogs = this.logs.filter(log => now - log.timestamp < timeWindow);
    
    // Verificar múltiples intentos fallidos
    if (this.isFailureEvent(eventType)) {
      const failureCount = recentLogs.filter(log => this.isFailureEvent(log.eventType)).length;
      if (failureCount >= SECURITY_CONFIG.alertThresholds.failedAttempts) {
        this.generateAlert('MULTIPLE_FAILURES', {
          count: failureCount,
          timeWindow: timeWindow / 1000,
          lastEvent: logEntry
        });
      }
    }
    
    // Verificar actividad sospechosa
    if (this.isSuspiciousEvent(eventType)) {
      const suspiciousCount = recentLogs.filter(log => this.isSuspiciousEvent(log.eventType)).length;
      if (suspiciousCount >= SECURITY_CONFIG.alertThresholds.suspiciousActivity) {
        this.generateAlert('SUSPICIOUS_PATTERN', {
          count: suspiciousCount,
          timeWindow: timeWindow / 1000,
          events: recentLogs.filter(log => this.isSuspiciousEvent(log.eventType))
        });
      }
    }
  }
  
  /**
   * Verifica si un evento es de tipo fallo
   */
  isFailureEvent(eventType) {
    const failureEvents = [
      SECURITY_EVENTS.LOGIN_FAILURE,
      SECURITY_EVENTS.INPUT_VALIDATION_FAILED,
      SECURITY_EVENTS.URL_PARAM_VALIDATION_FAILED,
      SECURITY_EVENTS.RATE_LIMIT_EXCEEDED
    ];
    return failureEvents.includes(eventType);
  }
  
  /**
   * Verifica si un evento es sospechoso
   */
  isSuspiciousEvent(eventType) {
    const suspiciousEvents = [
      SECURITY_EVENTS.XSS_ATTEMPT,
      SECURITY_EVENTS.SQL_INJECTION_ATTEMPT,
      SECURITY_EVENTS.HONEYPOT_TRIGGERED,
      SECURITY_EVENTS.DEVTOOLS_DETECTED,
      SECURITY_EVENTS.SECURITY_SCAN_DETECTED
    ];
    return suspiciousEvents.includes(eventType);
  }
  
  /**
   * Genera una alerta de seguridad
   */
  generateAlert(alertType, data) {
    const alert = {
      id: 'alert_' + Date.now(),
      type: alertType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data,
      level: SECURITY_CONFIG.logLevels.ALERT
    };
    
    this.alerts.push(alert);
    
    // Log crítico
    console.warn('[SECURITY ALERT]', alertType, data);
    
    // En producción, aquí se enviaría la alerta al servidor
    if (process.env.NODE_ENV === 'production') {
      this.sendAlertToServer(alert);
    }
  }
  
  /**
   * Envía alerta al servidor (placeholder)
   */
  async sendAlertToServer(alert) {
    try {
      // Aquí iría la lógica para enviar al servidor
      console.log('Alert would be sent to server:', alert);
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }
  
  /**
   * Obtiene estadísticas de seguridad
   */
  getSecurityStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const recentLogs = this.logs.filter(log => log.timestamp > oneDayAgo);
    
    const stats = {
      totalEvents: recentLogs.length,
      criticalEvents: recentLogs.filter(log => log.level === SECURITY_CONFIG.logLevels.CRITICAL).length,
      warningEvents: recentLogs.filter(log => log.level === SECURITY_CONFIG.logLevels.WARNING).length,
      alertsGenerated: this.alerts.length,
      sessionDuration: now - this.startTime,
      eventsByType: {},
      hourlyDistribution: {}
    };
    
    // Contar eventos por tipo
    recentLogs.forEach(log => {
      stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;
    });
    
    // Distribución por hora
    recentLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1;
    });
    
    return stats;
  }
  
  /**
   * Exporta logs para análisis
   */
  exportLogs(format = 'json') {
    const exportData = {
      exportTimestamp: Date.now(),
      sessionId: this.sessionId,
      logs: this.logs,
      alerts: this.alerts,
      stats: this.getSecurityStats()
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    }
    
    // Formato CSV para logs
    if (format === 'csv') {
      const headers = ['timestamp', 'eventType', 'level', 'url', 'userAgent'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          new Date(log.timestamp).toISOString(),
          log.eventType,
          log.level,
          log.url,
          `"${log.userAgent}"`
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
    
    return exportData;
  }
  
  /**
   * Limpia todos los logs y alertas
   */
  clearLogs() {
    this.logs = [];
    this.alerts = [];
    localStorage.removeItem('security_logs');
    console.log('Security logs cleared');
  }
}

// Instancia global del logger
const securityLogger = new SecurityLogger();

// Funciones de conveniencia para logging
export const logSecurityEvent = (eventType, data, level) => {
  return securityLogger.logEvent(eventType, data, level);
};

export const logCritical = (eventType, data) => {
  return securityLogger.logEvent(eventType, data, SECURITY_CONFIG.logLevels.CRITICAL);
};

export const logWarning = (eventType, data) => {
  return securityLogger.logEvent(eventType, data, SECURITY_CONFIG.logLevels.WARNING);
};

export const getSecurityStats = () => {
  return securityLogger.getSecurityStats();
};

export const exportSecurityLogs = (format) => {
  return securityLogger.exportLogs(format);
};

export const clearSecurityLogs = () => {
  return securityLogger.clearLogs();
};

// Funciones de estadísticas y análisis
export function getSecurityStats() {
  const logs = securityLogger.logs;
  const now = Date.now();
  const sessionStart = securityLogger.sessionStart;
  
  // Contar eventos por nivel
  const criticalEvents = logs.filter(log => log.level === 'critical').length;
  const warningEvents = logs.filter(log => log.level === 'warning').length;
  const alertsGenerated = securityLogger.alerts.length;
  
  // Contar eventos por tipo
  const eventsByType = {};
  logs.forEach(log => {
    eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
  });
  
  // Distribución horaria
  const hourlyDistribution = {};
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });
  
  return {
    totalEvents: logs.length,
    criticalEvents,
    warningEvents,
    alertsGenerated,
    eventsByType,
    hourlyDistribution,
    sessionDuration: now - sessionStart,
    sessionId: securityLogger.sessionId
  };
}

// Función para exportar logs
export function exportSecurityLogs(format = 'json') {
  const logs = securityLogger.logs;
  const alerts = securityLogger.alerts;
  const stats = getSecurityStats();
  
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      sessionId: securityLogger.sessionId,
      totalLogs: logs.length,
      totalAlerts: alerts.length
    },
    statistics: stats,
    logs,
    alerts
  };
  
  if (format === 'json') {
    return JSON.stringify(exportData, null, 2);
  } else if (format === 'csv') {
    const csvHeaders = 'Timestamp,Level,Event Type,Message,IP,User Agent,Session ID\n';
    const csvRows = logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level;
      const eventType = log.eventType;
      const message = `"${log.message.replace(/"/g, '""')}"`;
      const ip = log.metadata.ip || '';
      const userAgent = `"${(log.metadata.userAgent || '').replace(/"/g, '""')}"`;
      const sessionId = log.sessionId;
      
      return `${timestamp},${level},${eventType},${message},${ip},${userAgent},${sessionId}`;
    }).join('\n');
    
    return csvHeaders + csvRows;
  } else {
    throw new Error('Formato no soportado. Use "json" o "csv".');
  }
}

// Función para limpiar logs
export function clearSecurityLogs() {
  securityLogger.logs = [];
  securityLogger.alerts = [];
  
  // Limpiar localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('security_logs');
    localStorage.removeItem('security_alerts');
  }
  
  // Log del evento de limpieza
  securityLogger.log('SYSTEM_MAINTENANCE', 'Security logs cleared', 'info', {
    action: 'clear_logs',
    timestamp: Date.now()
  });
}

// Exportar constantes
export { SECURITY_EVENTS, SECURITY_CONFIG };

// Exportar la instancia del logger
export default securityLogger;