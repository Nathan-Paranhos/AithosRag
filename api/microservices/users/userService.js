import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, query, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import EventEmitter from 'events';
import multer from 'multer';
import path from 'path';

class UserService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3005,
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key-change-in-production',
      jwtExpiresIn: options.jwtExpiresIn || '24h',
      rateLimitWindow: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: options.rateLimitMax || 100,
      bcryptRounds: options.bcryptRounds || 12,
      maxFileSize: options.maxFileSize || 5 * 1024 * 1024, // 5MB
      ...options
    };

    this.app = express();
    this.server = null;
    
    // In-memory storage (in production, use a proper database)
    this.users = new Map();
    this.userProfiles = new Map();
    this.userPreferences = new Map();
    this.userSessions = new Map();
    this.userRoles = new Map();
    this.organizations = new Map();
    this.invitations = new Map();
    this.auditLogs = [];
    
    // Initialize default data
    this.initializeDefaultData();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  initializeDefaultData() {
    // Create default admin user
    const adminId = 'admin-001';
    const adminUser = {
      id: adminId,
      email: 'admin@aithos.com',
      username: 'admin',
      password: bcrypt.hashSync('admin123', this.options.bcryptRounds),
      role: 'super_admin',
      status: 'active',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      loginAttempts: 0,
      lockedUntil: null
    };
    
    this.users.set(adminId, adminUser);
    
    // Create admin profile
    this.userProfiles.set(adminId, {
      userId: adminId,
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'Admin',
      avatar: null,
      bio: 'System Administrator',
      location: null,
      website: null,
      socialLinks: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create admin preferences
    this.userPreferences.set(adminId, {
      userId: adminId,
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        sms: false
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showLastSeen: true
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        screenReader: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Create default organization
    const orgId = 'org-001';
    this.organizations.set(orgId, {
      id: orgId,
      name: 'Aithos Technologies',
      slug: 'aithos-tech',
      description: 'AI-powered solutions for the future',
      website: 'https://aithos.com',
      logo: null,
      settings: {
        allowPublicSignup: false,
        requireEmailVerification: true,
        defaultRole: 'user',
        maxUsers: 1000
      },
      ownerId: adminId,
      members: [adminId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Set admin role in organization
    this.userRoles.set(`${adminId}-${orgId}`, {
      userId: adminId,
      organizationId: orgId,
      role: 'owner',
      permissions: ['*'], // All permissions
      assignedAt: new Date().toISOString(),
      assignedBy: adminId
    });
    
    console.log('✅ Default admin user created: admin@aithos.com / admin123');
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
    const userLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/users', userLimiter);

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many authentication attempts, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/users/auth', authLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`👤 User Service: ${req.method} ${req.path} - ${req.ip}`);
      next();
    });

    // File upload middleware
    const storage = multer.memoryStorage();
    this.upload = multer({
      storage,
      limits: {
        fileSize: this.options.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images are allowed.'));
        }
      }
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats: {
          totalUsers: this.users.size,
          activeUsers: Array.from(this.users.values()).filter(u => u.status === 'active').length,
          organizations: this.organizations.size,
          pendingInvitations: this.invitations.size
        }
      });
    });

    // Authentication routes
    this.app.post('/users/auth/register', [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
      body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_-]+$/),
      body('firstName').optional().isLength({ min: 1, max: 50 }),
      body('lastName').optional().isLength({ min: 1, max: 50 }),
      body('organizationId').optional().isString()
    ], this.register.bind(this));

    this.app.post('/users/auth/login', [
      body('email').isEmail().normalizeEmail(),
      body('password').isLength({ min: 1 })
    ], this.login.bind(this));

    this.app.post('/users/auth/logout', this.authenticateToken.bind(this), this.logout.bind(this));

    this.app.post('/users/auth/refresh', this.refreshToken.bind(this));

    this.app.post('/users/auth/forgot-password', [
      body('email').isEmail().normalizeEmail()
    ], this.forgotPassword.bind(this));

    this.app.post('/users/auth/reset-password', [
      body('token').isString(),
      body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    ], this.resetPassword.bind(this));

    this.app.post('/users/auth/verify-email', [
      body('token').isString()
    ], this.verifyEmail.bind(this));

    // User management routes (require authentication)
    this.app.get('/users/me', this.authenticateToken.bind(this), this.getCurrentUser.bind(this));
    
    this.app.put('/users/me', [
      this.authenticateToken.bind(this),
      body('firstName').optional().isLength({ min: 1, max: 50 }),
      body('lastName').optional().isLength({ min: 1, max: 50 }),
      body('displayName').optional().isLength({ min: 1, max: 100 }),
      body('bio').optional().isLength({ max: 500 }),
      body('location').optional().isLength({ max: 100 }),
      body('website').optional().isURL()
    ], this.updateProfile.bind(this));

    this.app.post('/users/me/avatar', 
      this.authenticateToken.bind(this), 
      this.upload.single('avatar'), 
      this.uploadAvatar.bind(this)
    );

    this.app.delete('/users/me/avatar', this.authenticateToken.bind(this), this.deleteAvatar.bind(this));

    this.app.get('/users/me/preferences', this.authenticateToken.bind(this), this.getPreferences.bind(this));
    
    this.app.put('/users/me/preferences', [
      this.authenticateToken.bind(this),
      body('theme').optional().isIn(['light', 'dark', 'auto']),
      body('language').optional().isLength({ min: 2, max: 5 }),
      body('timezone').optional().isString(),
      body('notifications').optional().isObject(),
      body('privacy').optional().isObject(),
      body('accessibility').optional().isObject()
    ], this.updatePreferences.bind(this));

    this.app.put('/users/me/password', [
      this.authenticateToken.bind(this),
      body('currentPassword').isLength({ min: 1 }),
      body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    ], this.changePassword.bind(this));

    this.app.delete('/users/me', this.authenticateToken.bind(this), this.deleteAccount.bind(this));

    // User search and listing (require authentication)
    this.app.get('/users', [
      this.authenticateToken.bind(this),
      query('search').optional().isString(),
      query('role').optional().isString(),
      query('status').optional().isIn(['active', 'inactive', 'suspended']),
      query('organizationId').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ], this.getUsers.bind(this));

    this.app.get('/users/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString()
    ], this.getUserById.bind(this));

    // Admin routes (require admin role)
    this.app.put('/users/:userId/status', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']).bind(this),
      param('userId').isString(),
      body('status').isIn(['active', 'inactive', 'suspended'])
    ], this.updateUserStatus.bind(this));

    this.app.put('/users/:userId/role', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']).bind(this),
      param('userId').isString(),
      body('role').isIn(['user', 'moderator', 'admin']),
      body('organizationId').isString()
    ], this.updateUserRole.bind(this));

    this.app.delete('/users/:userId', [
      this.authenticateToken.bind(this),
      this.requireRole(['super_admin']).bind(this),
      param('userId').isString()
    ], this.deleteUser.bind(this));

    // Organization management
    this.app.get('/users/organizations', this.authenticateToken.bind(this), this.getUserOrganizations.bind(this));
    
    this.app.post('/users/organizations', [
      this.authenticateToken.bind(this),
      body('name').isLength({ min: 1, max: 100 }),
      body('slug').isLength({ min: 1, max: 50 }).matches(/^[a-z0-9-]+$/),
      body('description').optional().isLength({ max: 500 }),
      body('website').optional().isURL()
    ], this.createOrganization.bind(this));

    this.app.get('/users/organizations/:orgId', [
      this.authenticateToken.bind(this),
      param('orgId').isString()
    ], this.getOrganization.bind(this));

    this.app.put('/users/organizations/:orgId', [
      this.authenticateToken.bind(this),
      param('orgId').isString(),
      body('name').optional().isLength({ min: 1, max: 100 }),
      body('description').optional().isLength({ max: 500 }),
      body('website').optional().isURL(),
      body('settings').optional().isObject()
    ], this.updateOrganization.bind(this));

    this.app.delete('/users/organizations/:orgId', [
      this.authenticateToken.bind(this),
      param('orgId').isString()
    ], this.deleteOrganization.bind(this));

    // Organization member management
    this.app.get('/users/organizations/:orgId/members', [
      this.authenticateToken.bind(this),
      param('orgId').isString()
    ], this.getOrganizationMembers.bind(this));

    this.app.post('/users/organizations/:orgId/invitations', [
      this.authenticateToken.bind(this),
      param('orgId').isString(),
      body('email').isEmail().normalizeEmail(),
      body('role').optional().isIn(['user', 'moderator', 'admin'])
    ], this.inviteUser.bind(this));

    this.app.post('/users/invitations/:invitationId/accept', [
      this.authenticateToken.bind(this),
      param('invitationId').isString()
    ], this.acceptInvitation.bind(this));

    this.app.delete('/users/invitations/:invitationId', [
      this.authenticateToken.bind(this),
      param('invitationId').isString()
    ], this.declineInvitation.bind(this));

    this.app.delete('/users/organizations/:orgId/members/:userId', [
      this.authenticateToken.bind(this),
      param('orgId').isString(),
      param('userId').isString()
    ], this.removeOrganizationMember.bind(this));

    // Audit logs
    this.app.get('/users/audit', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']).bind(this),
      query('userId').optional().isString(),
      query('action').optional().isString(),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ], this.getAuditLogs.bind(this));

    // User sessions
    this.app.get('/users/me/sessions', this.authenticateToken.bind(this), this.getUserSessions.bind(this));
    
    this.app.delete('/users/me/sessions/:sessionId', [
      this.authenticateToken.bind(this),
      param('sessionId').isString()
    ], this.revokeSession.bind(this));

    this.app.delete('/users/me/sessions', this.authenticateToken.bind(this), this.revokeAllSessions.bind(this));
  }

  // Authentication methods
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, username, firstName, lastName, organizationId } = req.body;

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => 
        u.email === email || u.username === username
      );
      
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists with this email or username'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.options.bcryptRounds);

      // Create user
      const userId = this.generateId();
      const user = {
        id: userId,
        email,
        username,
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null
      };

      this.users.set(userId, user);

      // Create user profile
      const profile = {
        userId,
        firstName: firstName || '',
        lastName: lastName || '',
        displayName: `${firstName || ''} ${lastName || ''}`.trim() || username,
        avatar: null,
        bio: '',
        location: null,
        website: null,
        socialLinks: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.userProfiles.set(userId, profile);

      // Create user preferences
      const preferences = {
        userId,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          showLastSeen: true
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.userPreferences.set(userId, preferences);

      // Add to organization if specified
      if (organizationId && this.organizations.has(organizationId)) {
        const org = this.organizations.get(organizationId);
        org.members.push(userId);
        
        this.userRoles.set(`${userId}-${organizationId}`, {
          userId,
          organizationId,
          role: org.settings.defaultRole || 'user',
          permissions: [],
          assignedAt: new Date().toISOString(),
          assignedBy: 'system'
        });
      }

      // Log audit event
      this.logAuditEvent({
        userId,
        action: 'user_registered',
        details: { email, username },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create session
      const sessionId = this.generateId();
      this.userSessions.set(sessionId, {
        id: sessionId,
        userId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        active: true
      });

      this.emit('userRegistered', { user: this.sanitizeUser(user), profile });

      res.status(201).json({
        message: 'User registered successfully',
        user: this.sanitizeUser(user),
        profile,
        tokens,
        sessionId
      });

    } catch (error) {
      console.error('Register error:', error);
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

      // Find user
      const user = Array.from(this.users.values()).find(u => u.email === email);
      
      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.status(423).json({
          error: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Check if account is active
      if (user.status !== 'active') {
        return res.status(403).json({
          error: 'Account is not active'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        // Increment login attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
        }
        
        user.updatedAt = new Date().toISOString();
        this.users.set(user.id, user);
        
        this.logAuditEvent({
          userId: user.id,
          action: 'login_failed',
          details: { email, attempts: user.loginAttempts },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
      this.users.set(user.id, user);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Create session
      const sessionId = this.generateId();
      this.userSessions.set(sessionId, {
        id: sessionId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        active: true
      });

      // Get user profile and preferences
      const profile = this.userProfiles.get(user.id);
      const preferences = this.userPreferences.get(user.id);

      this.logAuditEvent({
        userId: user.id,
        action: 'user_login',
        details: { email },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      this.emit('userLoggedIn', { user: this.sanitizeUser(user), sessionId });

      res.json({
        message: 'Login successful',
        user: this.sanitizeUser(user),
        profile,
        preferences,
        tokens,
        sessionId
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async logout(req, res) {
    try {
      const sessionId = req.headers['x-session-id'];
      
      if (sessionId && this.userSessions.has(sessionId)) {
        const session = this.userSessions.get(sessionId);
        session.active = false;
        session.endedAt = new Date().toISOString();
      }

      this.logAuditEvent({
        userId: req.user.id,
        action: 'user_logout',
        details: {},
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      this.emit('userLoggedOut', { userId: req.user.id, sessionId });

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

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token is required'
        });
      }

      try {
        const decoded = jwt.verify(refreshToken, this.options.jwtSecret);
        const user = this.users.get(decoded.userId);
        
        if (!user || user.status !== 'active') {
          return res.status(401).json({
            error: 'Invalid refresh token'
          });
        }

        const tokens = this.generateTokens(user);
        
        res.json({
          message: 'Token refreshed successfully',
          tokens
        });

      } catch (jwtError) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;
      
      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });

      // Find user (but don't reveal if they exist)
      const user = Array.from(this.users.values()).find(u => u.email === email);
      
      if (user) {
        // In a real implementation, send email with reset token
        const resetToken = this.generateId();
        
        this.logAuditEvent({
          userId: user.id,
          action: 'password_reset_requested',
          details: { email },
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        
        console.log(`Password reset token for ${email}: ${resetToken}`);
      }

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, password } = req.body;
      
      // In a real implementation, verify the reset token
      // For demo purposes, we'll just return success
      
      res.json({
        message: 'Password reset successful'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token } = req.body;
      
      // In a real implementation, verify the email verification token
      // For demo purposes, we'll just return success
      
      res.json({
        message: 'Email verified successfully'
      });

    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // User management methods
  async getCurrentUser(req, res) {
    try {
      const user = this.users.get(req.user.id);
      const profile = this.userProfiles.get(req.user.id);
      const preferences = this.userPreferences.get(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        user: this.sanitizeUser(user),
        profile,
        preferences
      });

    } catch (error) {
      console.error('Get current user error:', error);
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

      const { firstName, lastName, displayName, bio, location, website, socialLinks } = req.body;
      
      const profile = this.userProfiles.get(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found'
        });
      }

      // Update profile
      const updatedProfile = {
        ...profile,
        firstName: firstName !== undefined ? firstName : profile.firstName,
        lastName: lastName !== undefined ? lastName : profile.lastName,
        displayName: displayName !== undefined ? displayName : profile.displayName,
        bio: bio !== undefined ? bio : profile.bio,
        location: location !== undefined ? location : profile.location,
        website: website !== undefined ? website : profile.website,
        socialLinks: socialLinks !== undefined ? socialLinks : profile.socialLinks,
        updatedAt: new Date().toISOString()
      };

      this.userProfiles.set(req.user.id, updatedProfile);

      this.logAuditEvent({
        userId: req.user.id,
        action: 'profile_updated',
        details: { changes: Object.keys(req.body) },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      this.emit('profileUpdated', { userId: req.user.id, profile: updatedProfile });

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      const profile = this.userProfiles.get(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found'
        });
      }

      // In a real implementation, save the file to storage (S3, etc.)
      // For demo purposes, we'll just store a placeholder URL
      const avatarUrl = `https://api.aithos.com/avatars/${req.user.id}.${req.file.mimetype.split('/')[1]}`;
      
      profile.avatar = avatarUrl;
      profile.updatedAt = new Date().toISOString();
      
      this.userProfiles.set(req.user.id, profile);

      this.logAuditEvent({
        userId: req.user.id,
        action: 'avatar_uploaded',
        details: { fileSize: req.file.size, mimeType: req.file.mimetype },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        message: 'Avatar uploaded successfully',
        avatarUrl
      });

    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteAvatar(req, res) {
    try {
      const profile = this.userProfiles.get(req.user.id);
      
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found'
        });
      }

      profile.avatar = null;
      profile.updatedAt = new Date().toISOString();
      
      this.userProfiles.set(req.user.id, profile);

      this.logAuditEvent({
        userId: req.user.id,
        action: 'avatar_deleted',
        details: {},
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        message: 'Avatar deleted successfully'
      });

    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getPreferences(req, res) {
    try {
      const preferences = this.userPreferences.get(req.user.id);
      
      if (!preferences) {
        return res.status(404).json({
          error: 'Preferences not found'
        });
      }

      res.json({ preferences });

    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updatePreferences(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { theme, language, timezone, notifications, privacy, accessibility } = req.body;
      
      const preferences = this.userPreferences.get(req.user.id);
      
      if (!preferences) {
        return res.status(404).json({
          error: 'Preferences not found'
        });
      }

      // Update preferences
      const updatedPreferences = {
        ...preferences,
        theme: theme !== undefined ? theme : preferences.theme,
        language: language !== undefined ? language : preferences.language,
        timezone: timezone !== undefined ? timezone : preferences.timezone,
        notifications: notifications !== undefined ? { ...preferences.notifications, ...notifications } : preferences.notifications,
        privacy: privacy !== undefined ? { ...preferences.privacy, ...privacy } : preferences.privacy,
        accessibility: accessibility !== undefined ? { ...preferences.accessibility, ...accessibility } : preferences.accessibility,
        updatedAt: new Date().toISOString()
      };

      this.userPreferences.set(req.user.id, updatedPreferences);

      this.logAuditEvent({
        userId: req.user.id,
        action: 'preferences_updated',
        details: { changes: Object.keys(req.body) },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        message: 'Preferences updated successfully',
        preferences: updatedPreferences
      });

    } catch (error) {
      console.error('Update preferences error:', error);
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
      
      const user = this.users.get(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.options.bcryptRounds);
      
      user.password = hashedPassword;
      user.updatedAt = new Date().toISOString();
      
      this.users.set(req.user.id, user);

      this.logAuditEvent({
        userId: req.user.id,
        action: 'password_changed',
        details: {},
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

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

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      
      // Remove user data
      this.users.delete(userId);
      this.userProfiles.delete(userId);
      this.userPreferences.delete(userId);
      
      // Remove from organizations
      for (const [key, role] of this.userRoles.entries()) {
        if (role.userId === userId) {
          this.userRoles.delete(key);
        }
      }
      
      // Update organizations
      for (const org of this.organizations.values()) {
        const memberIndex = org.members.indexOf(userId);
        if (memberIndex > -1) {
          org.members.splice(memberIndex, 1);
        }
      }
      
      // Deactivate sessions
      for (const session of this.userSessions.values()) {
        if (session.userId === userId) {
          session.active = false;
          session.endedAt = new Date().toISOString();
        }
      }

      this.logAuditEvent({
        userId,
        action: 'account_deleted',
        details: {},
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      this.emit('accountDeleted', { userId });

      res.json({
        message: 'Account deleted successfully'
      });

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // User management methods
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, status, role } = req.query;
      const offset = (page - 1) * limit;
      
      let users = Array.from(this.users.values());
      
      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(user => 
          user.email.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower)
        );
      }
      
      if (status) {
        users = users.filter(user => user.status === status);
      }
      
      if (role) {
        users = users.filter(user => user.role === role);
      }
      
      const total = users.length;
      const paginatedUsers = users.slice(offset, offset + parseInt(limit));
      
      res.json({
        users: paginatedUsers.map(user => this.sanitizeUser(user)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const user = this.users.get(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const profile = this.userProfiles.get(userId);
      const preferences = this.userPreferences.get(userId);
      
      res.json({
        user: this.sanitizeUser(user),
        profile,
        preferences
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      
      const user = this.users.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      user.status = status;
      user.updatedAt = new Date().toISOString();
      this.users.set(userId, user);
      
      this.logAuditEvent({
        userId: req.user.id,
        action: 'user_status_updated',
        details: { targetUserId: userId, newStatus: status },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ message: 'User status updated successfully', user: this.sanitizeUser(user) });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role, organizationId } = req.body;
      
      const user = this.users.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      user.role = role;
      user.updatedAt = new Date().toISOString();
      this.users.set(userId, user);
      
      this.logAuditEvent({
        userId: req.user.id,
        action: 'user_role_updated',
        details: { targetUserId: userId, newRole: role, organizationId },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ message: 'User role updated successfully', user: this.sanitizeUser(user) });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      
      const user = this.users.get(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove user data
      this.users.delete(userId);
      this.userProfiles.delete(userId);
      this.userPreferences.delete(userId);
      
      this.logAuditEvent({
        userId: req.user.id,
        action: 'user_deleted',
        details: { targetUserId: userId },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getUserSessions(req, res) {
    try {
      const userId = req.user.id;
      const userSessions = this.userSessions.get(userId) || [];
      
      // Sort sessions by last activity (most recent first)
      const sortedSessions = userSessions.sort((a, b) => 
        new Date(b.lastActivity) - new Date(a.lastActivity)
      );
      
      res.json({ sessions: sortedSessions });
    } catch (error) {
      console.error('Get user sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Organization management methods
  async getUserOrganizations(req, res) {
    try {
      const userId = req.user.id;
      const userOrgs = Array.from(this.organizations.values())
        .filter(org => org.members.includes(userId));
      
      res.json({ organizations: userOrgs });
    } catch (error) {
      console.error('Get user organizations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createOrganization(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { name, slug, description, website } = req.body;
      const userId = req.user.id;
      
      // Check if slug already exists
      const existingOrg = Array.from(this.organizations.values())
        .find(org => org.slug === slug);
      
      if (existingOrg) {
        return res.status(409).json({ error: 'Organization slug already exists' });
      }

      const orgId = this.generateId();
      const organization = {
        id: orgId,
        name,
        slug,
        description: description || '',
        website: website || null,
        ownerId: userId,
        members: [userId],
        settings: {
          defaultRole: 'user',
          allowPublicJoin: false,
          requireInvitation: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.organizations.set(orgId, organization);
      
      // Set user as admin of the organization
      this.userRoles.set(`${userId}-${orgId}`, {
        userId,
        organizationId: orgId,
        role: 'admin',
        permissions: ['*'],
        assignedAt: new Date().toISOString(),
        assignedBy: userId
      });

      this.logAuditEvent({
        userId,
        action: 'organization_created',
        details: { organizationId: orgId, name, slug },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({ organization });
    } catch (error) {
      console.error('Create organization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOrganization(req, res) {
    try {
      const { orgId } = req.params;
      const organization = this.organizations.get(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Check if user has access to this organization
      if (!organization.members.includes(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json({ organization });
    } catch (error) {
      console.error('Get organization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateOrganization(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { orgId } = req.params;
      const { name, description, website, settings } = req.body;
      const organization = this.organizations.get(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Check if user is admin
      const userRole = this.userRoles.get(`${req.user.id}-${orgId}`);
      if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      if (name) organization.name = name;
      if (description !== undefined) organization.description = description;
      if (website !== undefined) organization.website = website;
      if (settings) organization.settings = { ...organization.settings, ...settings };
      organization.updatedAt = new Date().toISOString();
      
      this.organizations.set(orgId, organization);
      
      this.logAuditEvent({
        userId: req.user.id,
        action: 'organization_updated',
        details: { organizationId: orgId, changes: { name, description, website, settings } },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ organization });
    } catch (error) {
      console.error('Update organization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteOrganization(req, res) {
    try {
      const { orgId } = req.params;
      const organization = this.organizations.get(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Only owner can delete organization
      if (organization.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Only organization owner can delete it' });
      }
      
      // Remove all user roles for this organization
      for (const [key, role] of this.userRoles.entries()) {
        if (role.organizationId === orgId) {
          this.userRoles.delete(key);
        }
      }
      
      this.organizations.delete(orgId);
      
      this.logAuditEvent({
        userId: req.user.id,
        action: 'organization_deleted',
        details: { organizationId: orgId },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      console.error('Delete organization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getOrganizationMembers(req, res) {
    try {
      const { orgId } = req.params;
      const organization = this.organizations.get(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (!organization.members.includes(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const members = organization.members.map(memberId => {
        const user = this.users.get(memberId);
        const role = this.userRoles.get(`${memberId}-${orgId}`);
        return {
          user: user ? this.sanitizeUser(user) : null,
          role: role ? role.role : 'user'
        };
      }).filter(member => member.user);
      
      res.json({ members });
    } catch (error) {
      console.error('Get organization members error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async inviteUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { orgId } = req.params;
      const { email, role = 'user' } = req.body;
      
      const organization = this.organizations.get(orgId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Check if user has permission to invite
      const userRole = this.userRoles.get(`${req.user.id}-${orgId}`);
      if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      const invitationId = this.generateId();
      const invitation = {
        id: invitationId,
        organizationId: orgId,
        email,
        role,
        invitedBy: req.user.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      this.invitations.set(invitationId, invitation);
      
      res.status(201).json({ invitation });
    } catch (error) {
      console.error('Invite user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async acceptInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const invitation = this.invitations.get(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }
      
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Invitation already processed' });
      }
      
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: 'Invitation expired' });
      }
      
      const organization = this.organizations.get(invitation.organizationId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      const userId = req.user.id;
      
      // Add user to organization
      if (!organization.members.includes(userId)) {
        organization.members.push(userId);
        this.organizations.set(invitation.organizationId, organization);
      }
      
      // Set user role
      this.userRoles.set(`${userId}-${invitation.organizationId}`, {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        permissions: [],
        assignedAt: new Date().toISOString(),
        assignedBy: invitation.invitedBy
      });
      
      // Update invitation status
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date().toISOString();
      this.invitations.set(invitationId, invitation);
      
      res.json({ message: 'Invitation accepted successfully' });
    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async declineInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const invitation = this.invitations.get(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }
      
      invitation.status = 'declined';
      invitation.declinedAt = new Date().toISOString();
      this.invitations.set(invitationId, invitation);
      
      res.json({ message: 'Invitation declined successfully' });
    } catch (error) {
      console.error('Decline invitation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async removeOrganizationMember(req, res) {
    try {
      const { orgId, userId } = req.params;
      const organization = this.organizations.get(orgId);
      
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      // Check permissions
      const userRole = this.userRoles.get(`${req.user.id}-${orgId}`);
      if (!userRole || !['admin', 'owner'].includes(userRole.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Cannot remove owner
      if (organization.ownerId === userId) {
        return res.status(400).json({ error: 'Cannot remove organization owner' });
      }
      
      // Remove from organization
      organization.members = organization.members.filter(id => id !== userId);
      this.organizations.set(orgId, organization);
      
      // Remove user role
      this.userRoles.delete(`${userId}-${orgId}`);
      
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove organization member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAuditLogs(req, res) {
    try {
      const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      let logs = Array.from(this.auditLogs.values());
      
      // Apply filters
      if (userId) {
        logs = logs.filter(log => log.userId === userId);
      }
      
      if (action) {
        logs = logs.filter(log => log.action === action);
      }
      
      if (startDate) {
        logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
      }
      
      if (endDate) {
        logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
      }
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const total = logs.length;
      const paginatedLogs = logs.slice(offset, offset + parseInt(limit));
      
      res.json({
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      
      const userSessions = this.userSessions.get(userId) || [];
      const sessionIndex = userSessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      userSessions.splice(sessionIndex, 1);
      this.userSessions.set(userId, userSessions);
      
      res.json({ message: 'Session revoked successfully' });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeAllSessions(req, res) {
    try {
      const userId = req.user.id;
      this.userSessions.set(userId, []);
      
      res.json({ message: 'All sessions revoked successfully' });
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required'
      });
    }

    try {
      const decoded = jwt.verify(token, this.options.jwtSecret);
      const user = this.users.get(decoded.userId);
      
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }

      req.user = this.sanitizeUser(user);
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
  }

  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const user = this.users.get(req.user.id);
      
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.options.jwtSecret, {
      expiresIn: this.options.jwtExpiresIn
    });

    const refreshToken = jwt.sign(payload, this.options.jwtSecret, {
      expiresIn: '7d'
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.options.jwtExpiresIn
    };
  }

  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  logAuditEvent(event) {
    const auditEvent = {
      id: this.generateId(),
      ...event,
      timestamp: new Date().toISOString()
    };
    
    this.auditLogs.push(auditEvent);
    
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`👤 User Service running on port ${this.options.port}`);
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
          console.log('👤 User Service stopped');
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
      activeUsers: Array.from(this.users.values()).filter(u => u.status === 'active').length,
      organizations: this.organizations.size,
      sessions: Array.from(this.userSessions.values()).filter(s => s.active).length,
      auditLogs: this.auditLogs.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default UserService;