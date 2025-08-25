import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware para autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware para verificar se é admin ou manager
const requireManagerOrAdmin = (req, res, next) => {
  if (!req.user || (!req.user.roles?.includes('admin') && !req.user.roles?.includes('manager'))) {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }
  next();
};

// GET /api/audit/logs - Buscar logs de auditoria
router.get('/logs', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const {
      userId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      severity
    } = req.query;

    const filters = {};
    
    if (userId) filters.userId = userId;
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    // Simular busca de logs (implementar com banco de dados real)
    const mockLogs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        userId: 'user123',
        type: 'LOGIN',
        severity: 'INFO',
        message: 'User logged in successfully',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        metadata: { loginMethod: 'password' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userId: 'user456',
        type: 'FAILED_LOGIN',
        severity: 'WARNING',
        message: 'Failed login attempt',
        ip: '192.168.1.101',
        userAgent: 'Mozilla/5.0...',
        metadata: { reason: 'invalid_password', attempts: 3 }
      }
    ];

    const totalCount = mockLogs.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = mockLogs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        userId,
        type,
        startDate,
        endDate,
        severity
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit/user/:userId - Buscar logs de um usuário específico
router.get('/user/:userId', authenticateToken, requireManagerOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, type } = req.query;

    // Verificar se o usuário pode ver seus próprios logs ou se é admin/manager
    if (req.user.id !== userId && !req.user.roles?.includes('admin') && !req.user.roles?.includes('manager')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Simular busca de logs do usuário
    const userLogs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'LOGIN',
        severity: 'INFO',
        message: 'User logged in successfully',
        ip: '192.168.1.100',
        metadata: { loginMethod: 'password' }
      }
    ];

    res.json({
      userId,
      logs: userLogs.slice(0, limit),
      totalCount: userLogs.length
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit/stats - Estatísticas de auditoria
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    // Simular estatísticas
    const stats = {
      period,
      totalEvents: 1250,
      eventsByType: {
        LOGIN: 450,
        LOGOUT: 420,
        FAILED_LOGIN: 85,
        PASSWORD_CHANGE: 25,
        PROFILE_UPDATE: 120,
        FILE_UPLOAD: 95,
        FILE_DOWNLOAD: 55
      },
      eventsBySeverity: {
        INFO: 1050,
        WARNING: 150,
        ERROR: 35,
        CRITICAL: 15
      },
      topUsers: [
        { userId: 'user123', eventCount: 45, lastActivity: new Date().toISOString() },
        { userId: 'user456', eventCount: 38, lastActivity: new Date(Date.now() - 1800000).toISOString() },
        { userId: 'user789', eventCount: 32, lastActivity: new Date(Date.now() - 3600000).toISOString() }
      ],
      suspiciousActivity: [
        {
          type: 'MULTIPLE_FAILED_LOGINS',
          userId: 'user999',
          count: 8,
          lastOccurrence: new Date(Date.now() - 900000).toISOString(),
          severity: 'HIGH'
        },
        {
          type: 'UNUSUAL_ACCESS_PATTERN',
          userId: 'user888',
          description: 'Access from multiple countries',
          lastOccurrence: new Date(Date.now() - 1800000).toISOString(),
          severity: 'MEDIUM'
        }
      ],
      systemHealth: {
        errorRate: 2.8,
        avgResponseTime: 245,
        activeUsers: 156,
        peakHour: '14:00-15:00'
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit/export - Exportar logs de auditoria
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      format = 'json',
      startDate,
      endDate,
      userId,
      type
    } = req.query;

    // Validar formato
    if (!['json', 'csv', 'xlsx'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Supported: json, csv, xlsx' });
    }

    // Simular dados para exportação
    const exportData = [
      {
        timestamp: new Date().toISOString(),
        userId: 'user123',
        type: 'LOGIN',
        severity: 'INFO',
        message: 'User logged in successfully',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      }
    ];

    // Log da exportação
    req.auditLog({
      type: 'AUDIT_EXPORT',
      severity: 'INFO',
      message: `Audit logs exported in ${format} format`,
      metadata: {
        format,
        recordCount: exportData.length,
        filters: { startDate, endDate, userId, type }
      }
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      res.json(exportData);
    } else if (format === 'csv') {
      // Simular CSV
      const csvHeader = 'timestamp,userId,type,severity,message,ip\n';
      const csvData = exportData.map(log => 
        `${log.timestamp},${log.userId},${log.type},${log.severity},"${log.message}",${log.ip}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.status(501).json({ error: 'XLSX export not implemented yet' });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/audit/alert - Configurar alertas de auditoria
router.post('/alert', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      conditions,
      actions,
      enabled = true
    } = req.body;

    // Validar entrada
    if (!name || !conditions || !actions) {
      return res.status(400).json({ error: 'Name, conditions, and actions are required' });
    }

    // Simular criação de alerta
    const alert = {
      id: `alert_${Date.now()}`,
      name,
      description,
      conditions,
      actions,
      enabled,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id,
      triggeredCount: 0,
      lastTriggered: null
    };

    // Log da criação do alerta
    req.auditLog({
      type: 'ALERT_CREATED',
      severity: 'INFO',
      message: `Audit alert '${name}' created`,
      metadata: { alertId: alert.id, conditions, actions }
    });

    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating audit alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/audit/alerts - Listar alertas configurados
router.get('/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Simular lista de alertas
    const alerts = [
      {
        id: 'alert_1',
        name: 'Multiple Failed Logins',
        description: 'Alert when user has more than 5 failed login attempts in 10 minutes',
        conditions: {
          type: 'FAILED_LOGIN',
          threshold: 5,
          timeWindow: '10m'
        },
        actions: ['email', 'slack'],
        enabled: true,
        triggeredCount: 12,
        lastTriggered: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'alert_2',
        name: 'Suspicious File Access',
        description: 'Alert when user accesses files outside normal hours',
        conditions: {
          type: 'FILE_ACCESS',
          timeRange: '22:00-06:00'
        },
        actions: ['email'],
        enabled: true,
        triggeredCount: 3,
        lastTriggered: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching audit alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/audit/alert/:alertId - Deletar alerta
router.delete('/alert/:alertId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Log da exclusão do alerta
    req.auditLog({
      type: 'ALERT_DELETED',
      severity: 'INFO',
      message: `Audit alert deleted`,
      metadata: { alertId }
    });

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;