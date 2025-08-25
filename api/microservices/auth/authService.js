import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import EventEmitter from 'events';

class AuthService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3001,
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: options.jwtExpiresIn || '24h',
      refreshTokenExpiresIn: options.refreshTokenExpiresIn || '7d',
      bcryptRounds: options.bcryptRounds || 12,
      maxLoginAttempts: options.maxLoginAttempts || 5,
      lockoutDuration: options.lockoutDuration || 15 * 60 * 1000, // 15 minutes
      ...options
    };

    this.app = express();
    this.server = null;
    
    // In-memory storage (in production, use a database)
    this.users = new Map();
    this.refreshTokens = new Map();
    this.loginAttempts = new Map();
    this.sessions = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupDefaultUsers();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 requests per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/auth', authLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`🔐 Auth Service: ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        users: this.users.size,
        activeSessions: this.sessions.size
      });
    });

    // Register user
    this.app.post('/auth/register', [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
      body('name').isLength({ min: 2 }).trim().escape(),
      body('role').optional().isIn(['user', 'admin', 'moderator'])
    ], this.register.bind(this));

    // Login user
    this.app.post('/auth/login', [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 1 })
    ], this.login.bind(this));

    // Refresh token
    this.app.post('/auth/refresh', this.refreshToken.bind(this));

    // Logout
    this.app.post('/auth/logout', this.authenticateToken.bind(this), this.logout.bind(this));

    // Get user profile
    this.app.get('/auth/profile', this.authenticateToken.bind(this), this.getProfile.bind(this));

    // Update user profile
    this.app.put('/auth/profile', [
      this.authenticateToken.bind(this),
      body('name').optional().isLength({ min: 2 }).trim().escape(),
      body('email').optional().isEmail().normalizeEmail()
    ], this.updateProfile.bind(this));

    // Change password
    this.app.put('/auth/change-password', [
      this.authenticateToken.bind(this),
      body('currentPassword').isLength({ min: 1 }),
      body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    ], this.changePassword.bind(this));

    // Admin routes
    this.app.get('/auth/users', this.authenticateToken.bind(this), this.requireRole('admin'), this.getUsers.bind(this));
    this.app.delete('/auth/users/:userId', this.authenticateToken.bind(this), this.requireRole('admin'), this.deleteUser.bind(this));
    this.app.put('/auth/users/:userId/role', this.authenticateToken.bind(this), this.requireRole('admin'), this.updateUserRole.bind(this));

    // Session management
    this.app.get('/auth/sessions', this.authenticateToken.bind(this), this.getSessions.bind(this));
    this.app.delete('/auth/sessions/:sessionId', this.authenticateToken.bind(this), this.deleteSession.bind(this));
  }

  setupDefaultUsers() {
    // Create default admin user
    const adminUser = {
      id: 'admin-001',
      email: 'admin@aithos.com',
      name: 'System Administrator',
      role: 'admin',
      password: bcrypt.hashSync('Admin123!@#', this.options.bcryptRounds),
      createdAt: new Date().toISOString(),
      isActive: true,
      lastLogin: null,
      loginCount: 0
    };

    this.users.set(adminUser.email, adminUser);
    console.log('👤 Default admin user created: admin@aithos.com / Admin123!@#');
  }

  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, name, role = 'user' } = req.body;

      // Check if user already exists
      if (this.users.has(email)) {
        return res.status(409).json({
          error: 'User already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.options.bcryptRounds);

      // Create user
      const user = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        role,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        isActive: true,
        lastLogin: null,
        loginCount: 0
      };

      this.users.set(email, user);

      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Create session
      const session = this.createSession(user, req);

      this.emit('userRegistered', { user: this.sanitizeUser(user), session });

      res.status(201).json({
        message: 'User registered successfully',
        user: this.sanitizeUser(user),
        ...tokens
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;
      const clientIp = req.ip;

      // Check login attempts
      const attempts = this.loginAttempts.get(clientIp) || { count: 0, lastAttempt: null };
      
      if (attempts.count >= this.options.maxLoginAttempts) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < this.options.lockoutDuration) {
          return res.status(429).json({
            error: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil((this.options.lockoutDuration - timeSinceLastAttempt) / 1000)
          });
        } else {
          // Reset attempts after lockout period
          this.loginAttempts.delete(clientIp);
        }
      }

      // Find user
      const user = this.users.get(email);
      if (!user || !user.isActive) {
        this.recordFailedLogin(clientIp);
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        this.recordFailedLogin(clientIp);
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Reset login attempts on successful login
      this.loginAttempts.delete(clientIp);

      // Update user login info
      user.lastLogin = new Date().toISOString();
      user.loginCount++;

      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Create session
      const session = this.createSession(user, req);

      this.emit('userLoggedIn', { user: this.sanitizeUser(user), session });

      res.json({
        message: 'Login successful',
        user: this.sanitizeUser(user),
        ...tokens
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required'
        });
      }

      // Verify refresh token
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData || tokenData.expiresAt < Date.now()) {
        this.refreshTokens.delete(refreshToken);
        return res.status(401).json({
          error: 'Invalid or expired refresh token'
        });
      }

      const user = this.users.get(tokenData.email);
      if (!user || !user.isActive) {
        this.refreshTokens.delete(refreshToken);
        return res.status(401).json({
          error: 'User not found or inactive'
        });
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      this.emit('tokenRefreshed', { user: this.sanitizeUser(user) });

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const sessionId = req.headers['x-session-id'];

      // Remove refresh token
      if (refreshToken) {
        this.refreshTokens.delete(refreshToken);
      }

      // Remove session
      if (sessionId) {
        this.sessions.delete(sessionId);
      }

      this.emit('userLoggedOut', { user: this.sanitizeUser(req.user) });

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getProfile(req, res) {
    try {
      res.json({
        user: this.sanitizeUser(req.user)
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, email } = req.body;
      const user = req.user;

      // Check if email is already taken by another user
      if (email && email !== user.email && this.users.has(email)) {
        return res.status(409).json({
          error: 'Email already taken'
        });
      }

      // Update user data
      if (name) user.name = name;
      if (email && email !== user.email) {
        // Update email key in users map
        this.users.delete(user.email);
        user.email = email;
        this.users.set(email, user);
      }

      user.updatedAt = new Date().toISOString();

      this.emit('userUpdated', { user: this.sanitizeUser(user) });

      res.json({
        message: 'Profile updated successfully',
        user: this.sanitizeUser(user)
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = req.user;

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.options.bcryptRounds);
      user.password = hashedPassword;
      user.updatedAt = new Date().toISOString();

      this.emit('passwordChanged', { user: this.sanitizeUser(user) });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getUsers(req, res) {
    try {
      const users = Array.from(this.users.values()).map(user => this.sanitizeUser(user));
      
      res.json({
        users,
        total: users.length
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      
      // Find user by ID
      let userToDelete = null;
      let userEmail = null;
      
      for (const [email, user] of this.users) {
        if (user.id === userId) {
          userToDelete = user;
          userEmail = email;
          break;
        }
      }

      if (!userToDelete) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Prevent deleting the last admin
      if (userToDelete.role === 'admin') {
        const adminCount = Array.from(this.users.values()).filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot delete the last admin user'
          });
        }
      }

      // Delete user
      this.users.delete(userEmail);
      
      // Clean up user sessions and tokens
      this.cleanupUserData(userId);

      this.emit('userDeleted', { user: this.sanitizeUser(userToDelete) });

      res.json({
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role'
        });
      }

      // Find user by ID
      let userToUpdate = null;
      
      for (const user of this.users.values()) {
        if (user.id === userId) {
          userToUpdate = user;
          break;
        }
      }

      if (!userToUpdate) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Prevent removing admin role from the last admin
      if (userToUpdate.role === 'admin' && role !== 'admin') {
        const adminCount = Array.from(this.users.values()).filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot remove admin role from the last admin user'
          });
        }
      }

      userToUpdate.role = role;
      userToUpdate.updatedAt = new Date().toISOString();

      this.emit('userRoleUpdated', { user: this.sanitizeUser(userToUpdate) });

      res.json({
        message: 'User role updated successfully',
        user: this.sanitizeUser(userToUpdate)
      });

    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getSessions(req, res) {
    try {
      const userSessions = Array.from(this.sessions.values())
        .filter(session => session.userId === req.user.id)
        .map(session => ({
          id: session.id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          isActive: session.isActive
        }));

      res.json({
        sessions: userSessions
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteSession(req, res) {
    try {
      const { sessionId } = req.params;
      const session = this.sessions.get(sessionId);

      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          error: 'Session not found'
        });
      }

      this.sessions.delete(sessionId);

      res.json({
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Middleware functions
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    try {
      const decoded = jwt.verify(token, this.options.jwtSecret);
      const user = this.users.get(decoded.email);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'User not found or inactive'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      });
    }
  }

  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      if (req.user.role !== requiredRole && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Helper functions
  generateTokens(user) {
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      this.options.jwtSecret,
      { expiresIn: this.options.jwtExpiresIn }
    );

    const refreshToken = this.generateRefreshToken();
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      email: user.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.parseTimeToMs(this.options.refreshTokenExpiresIn)
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.options.jwtExpiresIn
    };
  }

  generateRefreshToken() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  createSession(user, req) {
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'Unknown',
      isActive: true
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  recordFailedLogin(clientIp) {
    const attempts = this.loginAttempts.get(clientIp) || { count: 0, lastAttempt: null };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(clientIp, attempts);
  }

  cleanupUserData(userId) {
    // Remove user sessions
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }

    // Remove user refresh tokens
    for (const [token, tokenData] of this.refreshTokens) {
      const user = this.users.get(tokenData.email);
      if (user && user.id === userId) {
        this.refreshTokens.delete(token);
      }
    }
  }

  parseTimeToMs(timeString) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid time format');
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🔐 Auth Service running on port ${this.options.port}`);
          this.emit('started', { port: this.options.port });
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🔐 Auth Service stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStats() {
    return {
      users: this.users.size,
      activeSessions: this.sessions.size,
      refreshTokens: this.refreshTokens.size,
      loginAttempts: this.loginAttempts.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default AuthService;