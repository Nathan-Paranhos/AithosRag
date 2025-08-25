import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticação para o API Gateway
 */
export class AuthMiddleware {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Middleware para verificar token JWT
   */
  authenticate = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Token de acesso requerido',
          code: 'MISSING_TOKEN'
        });
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        req.user = decoded;
        next();
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        return res.status(401).json({
          error: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  };

  /**
   * Middleware opcional de autenticação (não falha se não houver token)
   */
  optionalAuth = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        req.user = decoded;
      } catch (jwtError) {
        req.user = null;
      }
      
      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      req.user = null;
      next();
    }
  };

  /**
   * Middleware para verificar roles específicas
   */
  requireRole = (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Autenticação requerida',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role].filter(Boolean);
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'Permissões insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredRoles,
          current: userRoles
        });
      }

      next();
    };
  };

  /**
   * Middleware para verificar se o usuário é admin
   */
  requireAdmin = (req, res, next) => {
    return this.requireRole(['admin', 'super_admin'])(req, res, next);
  };

  /**
   * Middleware para verificar se o usuário é o proprietário do recurso
   */
  requireOwnership = (userIdField = 'userId') => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Autenticação requerida',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          error: 'ID do usuário não fornecido',
          code: 'USER_ID_REQUIRED'
        });
      }

      // Admin pode acessar qualquer recurso
      if (req.user.roles && (req.user.roles.includes('admin') || req.user.roles.includes('super_admin'))) {
        return next();
      }

      // Usuário só pode acessar seus próprios recursos
      if (req.user.id !== resourceUserId && req.user.userId !== resourceUserId) {
        return res.status(403).json({
          error: 'Acesso negado ao recurso',
          code: 'ACCESS_DENIED'
        });
      }

      next();
    };
  };

  /**
   * Extrai informações do token sem validar
   */
  extractTokenInfo = (token) => {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  };

  /**
   * Verifica se o token está expirado
   */
  isTokenExpired = (token) => {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  };

  /**
   * Middleware para rate limiting baseado em usuário
   */
  userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const userRequests = new Map();
    
    return (req, res, next) => {
      const userId = req.user?.id || req.ip;
      const now = Date.now();
      
      if (!userRequests.has(userId)) {
        userRequests.set(userId, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      const userLimit = userRequests.get(userId);
      
      if (now > userLimit.resetTime) {
        userRequests.set(userId, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (userLimit.count >= maxRequests) {
        return res.status(429).json({
          error: 'Muitas requisições',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: userLimit.resetTime
        });
      }
      
      userLimit.count++;
      next();
    };
  };
}

export default AuthMiddleware;