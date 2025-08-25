import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { body, query, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import sharp from 'sharp';
import EventEmitter from 'events';

class FileService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3008,
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key-change-in-production',
      rateLimitWindow: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: options.rateLimitMax || 100,
      uploadPath: options.uploadPath || './uploads',
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: options.allowedMimeTypes || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'text/markdown',
        'application/json',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ],
      imageOptimization: options.imageOptimization !== false,
      thumbnailSizes: options.thumbnailSizes || [150, 300, 600],
      ...options
    };

    this.app = express();
    this.server = null;
    
    // In-memory storage (in production, use a proper database)
    this.files = new Map();
    this.userFiles = new Map(); // userId -> [fileIds]
    this.fileShares = new Map(); // fileId -> shareConfig
    this.uploadSessions = new Map(); // sessionId -> uploadData
    this.processingQueue = [];
    this.downloadStats = new Map(); // fileId -> downloadCount
    
    // Initialize upload directory
    this.initializeUploadDirectory();
    
    // Setup multer for file uploads
    this.setupMulter();
    
    this.setupMiddleware();
    this.setupRoutes();
    
    // Start background processors
    this.startBackgroundProcessors();
  }

  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.options.uploadPath, { recursive: true });
      await fs.mkdir(path.join(this.options.uploadPath, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.options.uploadPath, 'temp'), { recursive: true });
      console.log('✅ Upload directories initialized');
    } catch (error) {
      console.error('Failed to initialize upload directories:', error);
    }
  }

  setupMulter() {
    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.options.maxFileSize,
        files: 10 // Maximum 10 files per request
      },
      fileFilter: (req, file, cb) => {
        if (this.options.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} is not allowed`), false);
        }
      }
    });
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
    const uploadLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: 20, // More restrictive for uploads
      message: {
        error: 'Too many upload requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    const generalLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/files/upload', uploadLimiter);
    this.app.use('/files', generalLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📁 File Service: ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'file-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats: {
          totalFiles: this.files.size,
          processingQueue: this.processingQueue.length,
          uploadSessions: this.uploadSessions.size,
          sharedFiles: this.fileShares.size
        }
      });
    });

    // File upload (single file)
    this.app.post('/files/upload', [
      this.authenticateToken.bind(this),
      this.upload.single('file')
    ], this.uploadFile.bind(this));

    // Multiple file upload
    this.app.post('/files/upload/multiple', [
      this.authenticateToken.bind(this),
      this.upload.array('files', 10)
    ], this.uploadMultipleFiles.bind(this));

    // Chunked upload (for large files)
    this.app.post('/files/upload/chunked/start', [
      this.authenticateToken.bind(this),
      body('fileName').isString(),
      body('fileSize').isInt({ min: 1 }),
      body('mimeType').isString(),
      body('chunkSize').optional().isInt({ min: 1024 })
    ], this.startChunkedUpload.bind(this));

    this.app.post('/files/upload/chunked/:sessionId', [
      this.authenticateToken.bind(this),
      param('sessionId').isString(),
      this.upload.single('chunk')
    ], this.uploadChunk.bind(this));

    this.app.post('/files/upload/chunked/:sessionId/complete', [
      this.authenticateToken.bind(this),
      param('sessionId').isString()
    ], this.completeChunkedUpload.bind(this));

    // Get user files
    this.app.get('/files/user/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString(),
      query('type').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().isString(),
      query('sortBy').optional().isIn(['name', 'size', 'createdAt', 'downloads']),
      query('sortOrder').optional().isIn(['asc', 'desc'])
    ], this.getUserFiles.bind(this));

    // Get file info
    this.app.get('/files/:fileId/info', [
      this.authenticateToken.bind(this),
      param('fileId').isString()
    ], this.getFileInfo.bind(this));

    // Download file
    this.app.get('/files/:fileId/download', [
      param('fileId').isString(),
      query('token').optional().isString() // For shared files
    ], this.downloadFile.bind(this));

    // Get file thumbnail
    this.app.get('/files/:fileId/thumbnail', [
      param('fileId').isString(),
      query('size').optional().isIn(['150', '300', '600']),
      query('token').optional().isString()
    ], this.getFileThumbnail.bind(this));

    // Update file info
    this.app.put('/files/:fileId', [
      this.authenticateToken.bind(this),
      param('fileId').isString(),
      body('name').optional().isString(),
      body('description').optional().isString(),
      body('tags').optional().isArray()
    ], this.updateFileInfo.bind(this));

    // Delete file
    this.app.delete('/files/:fileId', [
      this.authenticateToken.bind(this),
      param('fileId').isString()
    ], this.deleteFile.bind(this));

    // Share file
    this.app.post('/files/:fileId/share', [
      this.authenticateToken.bind(this),
      param('fileId').isString(),
      body('expiresAt').optional().isISO8601(),
      body('password').optional().isString(),
      body('downloadLimit').optional().isInt({ min: 1 }),
      body('allowPreview').optional().isBoolean()
    ], this.shareFile.bind(this));

    // Get shared file info
    this.app.get('/files/shared/:shareToken', [
      param('shareToken').isString()
    ], this.getSharedFileInfo.bind(this));

    // Unshare file
    this.app.delete('/files/:fileId/share', [
      this.authenticateToken.bind(this),
      param('fileId').isString()
    ], this.unshareFile.bind(this));

    // File processing status
    this.app.get('/files/:fileId/processing', [
      this.authenticateToken.bind(this),
      param('fileId').isString()
    ], this.getProcessingStatus.bind(this));

    // Search files
    this.app.get('/files/search', [
      this.authenticateToken.bind(this),
      query('q').isString(),
      query('type').optional().isString(),
      query('userId').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ], this.searchFiles.bind(this));

    // File analytics
    this.app.get('/files/analytics', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']).bind(this),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('userId').optional().isString()
    ], this.getFileAnalytics.bind(this));

    // Bulk operations
    this.app.post('/files/bulk/delete', [
      this.authenticateToken.bind(this),
      body('fileIds').isArray()
    ], this.bulkDeleteFiles.bind(this));

    this.app.post('/files/bulk/move', [
      this.authenticateToken.bind(this),
      body('fileIds').isArray(),
      body('targetFolder').optional().isString()
    ], this.bulkMoveFiles.bind(this));
  }

  startBackgroundProcessors() {
    // File processing queue
    setInterval(() => {
      this.processFileQueue();
    }, 5000); // Process every 5 seconds
    
    // Cleanup expired shares
    setInterval(() => {
      this.cleanupExpiredShares();
    }, 60 * 60 * 1000); // Cleanup every hour
    
    // Cleanup temp files
    setInterval(() => {
      this.cleanupTempFiles();
    }, 30 * 60 * 1000); // Cleanup every 30 minutes
  }

  async processFileQueue() {
    if (this.processingQueue.length === 0) {
      return;
    }
    
    const batch = this.processingQueue.splice(0, 5); // Process 5 files at a time
    
    for (const fileData of batch) {
      try {
        await this.processFile(fileData);
      } catch (error) {
        console.error('File processing error:', error);
        
        // Update file status
        const file = this.files.get(fileData.fileId);
        if (file) {
          file.processingStatus = 'failed';
          file.processingError = error.message;
          this.files.set(fileData.fileId, file);
        }
      }
    }
  }

  async processFile(fileData) {
    const file = this.files.get(fileData.fileId);
    if (!file) {
      return;
    }
    
    console.log(`🔄 Processing file: ${file.name}`);
    
    // Update status
    file.processingStatus = 'processing';
    this.files.set(fileData.fileId, file);
    
    // Generate thumbnails for images
    if (file.mimeType.startsWith('image/') && this.options.imageOptimization) {
      await this.generateThumbnails(file);
    }
    
    // Extract metadata
    await this.extractMetadata(file);
    
    // Update status
    file.processingStatus = 'completed';
    file.processedAt = new Date().toISOString();
    this.files.set(fileData.fileId, file);
    
    console.log(`✅ File processed: ${file.name}`);
  }

  async generateThumbnails(file) {
    const filePath = path.join(this.options.uploadPath, file.path);
    const thumbnailDir = path.join(this.options.uploadPath, 'thumbnails', file.id);
    
    try {
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      const thumbnails = {};
      
      for (const size of this.options.thumbnailSizes) {
        const thumbnailPath = path.join(thumbnailDir, `${size}.webp`);
        
        await sharp(filePath)
          .resize(size, size, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);
        
        thumbnails[size] = path.relative(this.options.uploadPath, thumbnailPath);
      }
      
      file.thumbnails = thumbnails;
      
    } catch (error) {
      console.error('Thumbnail generation error:', error);
    }
  }

  async extractMetadata(file) {
    const filePath = path.join(this.options.uploadPath, file.path);
    
    try {
      const stats = await fs.stat(filePath);
      
      file.metadata = {
        ...file.metadata,
        actualSize: stats.size,
        lastModified: stats.mtime.toISOString()
      };
      
      // Extract image metadata
      if (file.mimeType.startsWith('image/')) {
        const imageMetadata = await sharp(filePath).metadata();
        file.metadata.image = {
          width: imageMetadata.width,
          height: imageMetadata.height,
          format: imageMetadata.format,
          colorSpace: imageMetadata.space,
          hasAlpha: imageMetadata.hasAlpha,
          density: imageMetadata.density
        };
      }
      
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }
  }

  cleanupExpiredShares() {
    const now = new Date();
    
    for (const [fileId, shareConfig] of this.fileShares.entries()) {
      if (shareConfig.expiresAt && new Date(shareConfig.expiresAt) < now) {
        this.fileShares.delete(fileId);
        console.log(`🧹 Expired share removed for file ${fileId}`);
      }
    }
  }

  async cleanupTempFiles() {
    const tempDir = path.join(this.options.uploadPath, 'temp');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < oneDayAgo) {
          await fs.unlink(filePath);
          console.log(`🧹 Temp file cleaned up: ${file}`);
        }
      }
    } catch (error) {
      console.error('Temp file cleanup error:', error);
    }
  }

  // Route handlers
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided'
        });
      }

      const file = await this.saveFile(req.file, req.user.id, req.body);
      
      res.json({
        message: 'File uploaded successfully',
        file: this.sanitizeFileData(file)
      });

    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({
        error: 'File upload failed',
        details: error.message
      });
    }
  }

  async uploadMultipleFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files provided'
        });
      }

      const uploadedFiles = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const savedFile = await this.saveFile(file, req.user.id, req.body);
          uploadedFiles.push(this.sanitizeFileData(savedFile));
        } catch (error) {
          errors.push({
            fileName: file.originalname,
            error: error.message
          });
        }
      }

      res.json({
        message: 'Files upload completed',
        uploadedFiles,
        errors,
        stats: {
          total: req.files.length,
          successful: uploadedFiles.length,
          failed: errors.length
        }
      });

    } catch (error) {
      console.error('Upload multiple files error:', error);
      res.status(500).json({
        error: 'Multiple file upload failed'
      });
    }
  }

  async saveFile(fileBuffer, userId, metadata = {}) {
    const fileId = this.generateId();
    const fileName = metadata.name || fileBuffer.originalname;
    const fileExtension = path.extname(fileName);
    const sanitizedName = this.sanitizeFileName(fileName);
    const relativePath = path.join(userId, `${fileId}${fileExtension}`);
    const fullPath = path.join(this.options.uploadPath, relativePath);
    
    // Create user directory
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Save file
    await fs.writeFile(fullPath, fileBuffer.buffer);
    
    // Create file record
    const file = {
      id: fileId,
      name: sanitizedName,
      originalName: fileName,
      path: relativePath,
      size: fileBuffer.size,
      mimeType: fileBuffer.mimetype,
      userId,
      description: metadata.description || '',
      tags: metadata.tags || [],
      metadata: {
        uploadedFrom: metadata.uploadedFrom || 'web',
        userAgent: metadata.userAgent || '',
        ...metadata.customMetadata
      },
      processingStatus: 'pending',
      processingError: null,
      processedAt: null,
      thumbnails: {},
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Store file record
    this.files.set(fileId, file);
    
    // Add to user files
    const userFiles = this.userFiles.get(userId) || [];
    userFiles.push(fileId);
    this.userFiles.set(userId, userFiles);
    
    // Queue for processing
    this.processingQueue.push({ fileId, userId });
    
    return file;
  }

  async startChunkedUpload(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fileName, fileSize, mimeType, chunkSize = 1024 * 1024 } = req.body;
      
      if (!this.options.allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({
          error: `File type ${mimeType} is not allowed`
        });
      }
      
      if (fileSize > this.options.maxFileSize) {
        return res.status(400).json({
          error: 'File size exceeds maximum allowed size'
        });
      }
      
      const sessionId = this.generateId();
      const tempPath = path.join(this.options.uploadPath, 'temp', sessionId);
      
      const uploadSession = {
        id: sessionId,
        fileName,
        fileSize,
        mimeType,
        chunkSize,
        userId: req.user.id,
        tempPath,
        uploadedChunks: [],
        totalChunks: Math.ceil(fileSize / chunkSize),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      this.uploadSessions.set(sessionId, uploadSession);
      
      res.json({
        sessionId,
        chunkSize,
        totalChunks: uploadSession.totalChunks
      });

    } catch (error) {
      console.error('Start chunked upload error:', error);
      res.status(500).json({
        error: 'Failed to start chunked upload'
      });
    }
  }

  async uploadChunk(req, res) {
    try {
      const { sessionId } = req.params;
      const chunkIndex = parseInt(req.body.chunkIndex);
      
      if (!req.file) {
        return res.status(400).json({
          error: 'No chunk data provided'
        });
      }
      
      const session = this.uploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Upload session not found'
        });
      }
      
      if (session.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      // Save chunk
      const chunkPath = `${session.tempPath}.chunk.${chunkIndex}`;
      await fs.writeFile(chunkPath, req.file.buffer);
      
      // Update session
      session.uploadedChunks.push(chunkIndex);
      session.uploadedChunks.sort((a, b) => a - b);
      this.uploadSessions.set(sessionId, session);
      
      res.json({
        chunkIndex,
        uploadedChunks: session.uploadedChunks.length,
        totalChunks: session.totalChunks,
        progress: (session.uploadedChunks.length / session.totalChunks) * 100
      });

    } catch (error) {
      console.error('Upload chunk error:', error);
      res.status(500).json({
        error: 'Failed to upload chunk'
      });
    }
  }

  async completeChunkedUpload(req, res) {
    try {
      const { sessionId } = req.params;
      
      const session = this.uploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          error: 'Upload session not found'
        });
      }
      
      if (session.userId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      if (session.uploadedChunks.length !== session.totalChunks) {
        return res.status(400).json({
          error: 'Not all chunks uploaded',
          uploaded: session.uploadedChunks.length,
          total: session.totalChunks
        });
      }
      
      // Combine chunks
      const fileId = this.generateId();
      const fileExtension = path.extname(session.fileName);
      const relativePath = path.join(session.userId, `${fileId}${fileExtension}`);
      const fullPath = path.join(this.options.uploadPath, relativePath);
      
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      const writeStream = await fs.open(fullPath, 'w');
      
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkPath = `${session.tempPath}.chunk.${i}`;
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.write(chunkData);
        await fs.unlink(chunkPath); // Clean up chunk
      }
      
      await writeStream.close();
      
      // Create file record
      const file = {
        id: fileId,
        name: this.sanitizeFileName(session.fileName),
        originalName: session.fileName,
        path: relativePath,
        size: session.fileSize,
        mimeType: session.mimeType,
        userId: session.userId,
        description: '',
        tags: [],
        metadata: {
          uploadMethod: 'chunked',
          sessionId
        },
        processingStatus: 'pending',
        processingError: null,
        processedAt: null,
        thumbnails: {},
        downloadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Store file record
      this.files.set(fileId, file);
      
      // Add to user files
      const userFiles = this.userFiles.get(session.userId) || [];
      userFiles.push(fileId);
      this.userFiles.set(session.userId, userFiles);
      
      // Queue for processing
      this.processingQueue.push({ fileId, userId: session.userId });
      
      // Clean up session
      this.uploadSessions.delete(sessionId);
      
      res.json({
        message: 'File uploaded successfully',
        file: this.sanitizeFileData(file)
      });

    } catch (error) {
      console.error('Complete chunked upload error:', error);
      res.status(500).json({
        error: 'Failed to complete chunked upload'
      });
    }
  }

  async getUserFiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const {
        type,
        page = 1,
        limit = 20,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Check permission
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      const userFileIds = this.userFiles.get(userId) || [];
      let files = userFileIds.map(id => this.files.get(id)).filter(Boolean);

      // Apply filters
      if (type) {
        files = files.filter(file => file.mimeType.startsWith(type));
      }

      if (search) {
        const searchLower = search.toLowerCase();
        files = files.filter(file => 
          file.name.toLowerCase().includes(searchLower) ||
          file.description.toLowerCase().includes(searchLower) ||
          file.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Sort files
      files.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (sortBy === 'size' || sortBy === 'downloadCount') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        }
        
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });

      // Paginate
      const total = files.length;
      const startIndex = (page - 1) * limit;
      const paginatedFiles = files.slice(startIndex, startIndex + limit);

      res.json({
        files: paginatedFiles.map(file => this.sanitizeFileData(file)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({
        error: 'Failed to get user files'
      });
    }
  }

  async getFileInfo(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fileId } = req.params;
      const file = this.files.get(fileId);
      
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      res.json({
        file: this.sanitizeFileData(file)
      });

    } catch (error) {
      console.error('Get file info error:', error);
      res.status(500).json({
        error: 'Failed to get file info'
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const { token } = req.query;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }
      
      // Check access permissions
      let hasAccess = false;
      
      if (token) {
        // Check shared access
        const shareConfig = this.fileShares.get(fileId);
        if (shareConfig && shareConfig.token === token) {
          // Check expiration
          if (!shareConfig.expiresAt || new Date(shareConfig.expiresAt) > new Date()) {
            // Check download limit
            if (!shareConfig.downloadLimit || shareConfig.downloadCount < shareConfig.downloadLimit) {
              hasAccess = true;
              
              // Increment download count
              shareConfig.downloadCount = (shareConfig.downloadCount || 0) + 1;
              this.fileShares.set(fileId, shareConfig);
            }
          }
        }
      } else {
        // Check authentication
        const authHeader = req.headers['authorization'];
        const authToken = authHeader && authHeader.split(' ')[1];
        
        if (authToken) {
          try {
            const decoded = jwt.verify(authToken, this.options.jwtSecret);
            if (decoded.userId === file.userId || ['admin', 'super_admin'].includes(decoded.role)) {
              hasAccess = true;
            }
          } catch (error) {
            // Invalid token, but continue to check other access methods
          }
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const filePath = path.join(this.options.uploadPath, file.path);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          error: 'File not found on disk'
        });
      }
      
      // Update download count
      file.downloadCount = (file.downloadCount || 0) + 1;
      this.files.set(fileId, file);
      
      // Set headers
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', file.size);
      
      // Stream file
      const fileStream = await fs.open(filePath, 'r');
      const readStream = fileStream.createReadStream();
      
      readStream.pipe(res);
      
      readStream.on('end', () => {
        fileStream.close();
      });
      
      readStream.on('error', (error) => {
        console.error('File stream error:', error);
        fileStream.close();
        if (!res.headersSent) {
          res.status(500).json({ error: 'File download failed' });
        }
      });

    } catch (error) {
      console.error('Download file error:', error);
      res.status(500).json({
        error: 'File download failed'
      });
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
      req.user = decoded;
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

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  sanitizeFileName(fileName) {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }

  async getFileThumbnail(req, res) {
    try {
      const { fileId } = req.params;
      const { size = '300', token } = req.query;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check if thumbnail exists
      if (!file.thumbnails || !file.thumbnails[size]) {
        return res.status(404).json({
          error: 'Thumbnail not found'
        });
      }

      const thumbnailPath = path.join(this.options.uploadPath, file.thumbnails[size]);
      
      try {
        await fs.access(thumbnailPath);
        res.sendFile(path.resolve(thumbnailPath));
      } catch (error) {
        res.status(404).json({
          error: 'Thumbnail file not found'
        });
      }

    } catch (error) {
      console.error('Get file thumbnail error:', error);
      res.status(500).json({
        error: 'Failed to get thumbnail'
      });
    }
  }

  async updateFileInfo(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fileId } = req.params;
      const { name, description, tags } = req.body;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Update file info
      if (name) file.name = this.sanitizeFileName(name);
      if (description !== undefined) file.description = description;
      if (tags) file.tags = Array.isArray(tags) ? tags : [];
      file.updatedAt = new Date().toISOString();

      this.files.set(fileId, file);

      res.json({
        message: 'File info updated successfully',
        file: this.sanitizeFileData(file)
      });

    } catch (error) {
      console.error('Update file info error:', error);
      res.status(500).json({
        error: 'Failed to update file info'
      });
    }
  }

  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Delete physical file
      const filePath = path.join(this.options.uploadPath, file.path);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Physical file not found:', filePath);
      }

      // Delete thumbnails
      if (file.thumbnails) {
        for (const thumbnailPath of Object.values(file.thumbnails)) {
          try {
            await fs.unlink(path.join(this.options.uploadPath, thumbnailPath));
          } catch (error) {
            console.warn('Thumbnail not found:', thumbnailPath);
          }
        }
      }

      // Remove from data structures
      this.files.delete(fileId);
      
      const userFiles = this.userFiles.get(file.userId) || [];
      const updatedUserFiles = userFiles.filter(id => id !== fileId);
      this.userFiles.set(file.userId, updatedUserFiles);

      // Remove any shares
      for (const [shareToken, shareData] of this.fileShares.entries()) {
        if (shareData.fileId === fileId) {
          this.fileShares.delete(shareToken);
        }
      }

      res.json({
        message: 'File deleted successfully'
      });

    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        error: 'Failed to delete file'
      });
    }
  }

  async shareFile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fileId } = req.params;
      const { expiresAt, password, downloadLimit, allowPreview = true } = req.body;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }

      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      const shareToken = this.generateId();
      const shareData = {
        token: shareToken,
        fileId,
        userId: req.user.id,
        expiresAt: expiresAt || null,
        password: password || null,
        downloadLimit: downloadLimit || null,
        downloadCount: 0,
        allowPreview,
        createdAt: new Date().toISOString()
      };

      this.fileShares.set(shareToken, shareData);

      res.json({
        message: 'File shared successfully',
        shareToken,
        shareUrl: `${req.protocol}://${req.get('host')}/api/files/shared/${shareToken}`
      });

    } catch (error) {
      console.error('Share file error:', error);
      res.status(500).json({
        error: 'Failed to share file'
      });
    }
  }

  async unshareFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }
      
      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      // Remove share
      this.fileShares.delete(fileId);
      
      res.json({
        message: 'File unshared successfully'
      });
      
    } catch (error) {
      console.error('Unshare file error:', error);
      res.status(500).json({
        error: 'Failed to unshare file'
      });
    }
  }

  async getProcessingStatus(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = this.files.get(fileId);
      if (!file) {
        return res.status(404).json({
          error: 'File not found'
        });
      }
      
      // Check permission
      if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      res.json({
        fileId,
        status: file.processingStatus,
        error: file.processingError,
        processedAt: file.processedAt,
        queuePosition: this.processingQueue.findIndex(item => item.fileId === fileId) + 1
      });
      
    } catch (error) {
      console.error('Get processing status error:', error);
      res.status(500).json({
        error: 'Failed to get processing status'
      });
    }
  }

  async searchFiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const {
        q: query,
        type,
        userId,
        page = 1,
        limit = 20
      } = req.query;
      
      let files = Array.from(this.files.values());
      
      // Filter by user access
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        files = files.filter(file => file.userId === req.user.id);
      } else if (userId) {
        files = files.filter(file => file.userId === userId);
      }
      
      // Search by query
      if (query) {
        const searchTerm = query.toLowerCase();
        files = files.filter(file => 
          file.name.toLowerCase().includes(searchTerm) ||
          file.originalName.toLowerCase().includes(searchTerm) ||
          file.description.toLowerCase().includes(searchTerm) ||
          file.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }
      
      // Filter by type
      if (type) {
        files = files.filter(file => file.mimeType.startsWith(type));
      }
      
      // Sort by relevance (simple scoring)
      if (query) {
        const searchTerm = query.toLowerCase();
        files.sort((a, b) => {
          const scoreA = this.calculateSearchScore(a, searchTerm);
          const scoreB = this.calculateSearchScore(b, searchTerm);
          return scoreB - scoreA;
        });
      } else {
        files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = files.slice(startIndex, endIndex);
      
      res.json({
        files: paginatedFiles.map(file => this.sanitizeFileData(file)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: files.length,
          pages: Math.ceil(files.length / limit)
        }
      });
      
    } catch (error) {
      console.error('Search files error:', error);
      res.status(500).json({
        error: 'Failed to search files'
      });
    }
  }

  calculateSearchScore(file, searchTerm) {
    let score = 0;
    
    // Exact name match gets highest score
    if (file.name.toLowerCase() === searchTerm) score += 100;
    else if (file.name.toLowerCase().includes(searchTerm)) score += 50;
    
    // Original name match
    if (file.originalName.toLowerCase().includes(searchTerm)) score += 30;
    
    // Description match
    if (file.description.toLowerCase().includes(searchTerm)) score += 20;
    
    // Tag matches
    file.tags.forEach(tag => {
      if (tag.toLowerCase().includes(searchTerm)) score += 10;
    });
    
    // Recent files get slight boost
    const daysSinceCreated = (Date.now() - new Date(file.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) score += 5;
    
    return score;
  }

  async getFileAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        userId
      } = req.query;
      
      let files = Array.from(this.files.values());
      
      // Filter by user if specified
      if (userId) {
        files = files.filter(file => file.userId === userId);
      }
      
      // Filter by date range
      if (startDate || endDate) {
        files = files.filter(file => {
          const fileDate = new Date(file.createdAt);
          if (startDate && fileDate < new Date(startDate)) return false;
          if (endDate && fileDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      // Calculate analytics
      const analytics = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        totalDownloads: files.reduce((sum, file) => sum + file.downloadCount, 0),
        fileTypes: {},
        uploadTrend: {},
        topFiles: files
          .sort((a, b) => b.downloadCount - a.downloadCount)
          .slice(0, 10)
          .map(file => ({
            id: file.id,
            name: file.name,
            downloads: file.downloadCount,
            size: file.size
          })),
        processingStats: {
          completed: files.filter(f => f.processingStatus === 'completed').length,
          processing: files.filter(f => f.processingStatus === 'processing').length,
          failed: files.filter(f => f.processingStatus === 'failed').length,
          pending: files.filter(f => f.processingStatus === 'pending').length
        }
      };
      
      // File types distribution
      files.forEach(file => {
        const type = file.mimeType.split('/')[0];
        analytics.fileTypes[type] = (analytics.fileTypes[type] || 0) + 1;
      });
      
      // Upload trend (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        analytics.uploadTrend[dateStr] = files.filter(file => 
          file.createdAt.startsWith(dateStr)
        ).length;
      }
      
      res.json(analytics);
      
    } catch (error) {
      console.error('Get file analytics error:', error);
      res.status(500).json({
        error: 'Failed to get file analytics'
      });
    }
  }

  async bulkDeleteFiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const { fileIds } = req.body;
      
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          error: 'File IDs array is required'
        });
      }
      
      const results = {
        deleted: [],
        failed: [],
        notFound: [],
        accessDenied: []
      };
      
      for (const fileId of fileIds) {
        try {
          const file = this.files.get(fileId);
          
          if (!file) {
            results.notFound.push(fileId);
            continue;
          }
          
          // Check permission
          if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            results.accessDenied.push(fileId);
            continue;
          }
          
          // Delete physical file
          const filePath = path.join(this.options.uploadPath, file.path);
          try {
            await fs.unlink(filePath);
          } catch (error) {
            console.warn('Physical file not found:', filePath);
          }
          
          // Delete thumbnails
          if (file.thumbnails) {
            for (const thumbnailPath of Object.values(file.thumbnails)) {
              try {
                await fs.unlink(path.join(this.options.uploadPath, thumbnailPath));
              } catch (error) {
                console.warn('Thumbnail not found:', thumbnailPath);
              }
            }
          }
          
          // Remove from data structures
          this.files.delete(fileId);
          
          const userFiles = this.userFiles.get(file.userId) || [];
          const updatedUserFiles = userFiles.filter(id => id !== fileId);
          this.userFiles.set(file.userId, updatedUserFiles);
          
          // Remove any shares
          this.fileShares.delete(fileId);
          
          results.deleted.push(fileId);
          
        } catch (error) {
          console.error(`Error deleting file ${fileId}:`, error);
          results.failed.push({ fileId, error: error.message });
        }
      }
      
      res.json({
        message: 'Bulk delete completed',
        results
      });
      
    } catch (error) {
      console.error('Bulk delete files error:', error);
      res.status(500).json({
        error: 'Failed to delete files'
      });
    }
  }

  async bulkMoveFiles(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const { fileIds, targetFolder } = req.body;
      
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          error: 'File IDs array is required'
        });
      }
      
      const results = {
        moved: [],
        failed: [],
        notFound: [],
        accessDenied: []
      };
      
      for (const fileId of fileIds) {
        try {
          const file = this.files.get(fileId);
          
          if (!file) {
            results.notFound.push(fileId);
            continue;
          }
          
          // Check permission
          if (file.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
            results.accessDenied.push(fileId);
            continue;
          }
          
          // Create new path
          const fileExtension = path.extname(file.originalName);
          const newRelativePath = targetFolder 
            ? path.join(file.userId, targetFolder, `${fileId}${fileExtension}`)
            : path.join(file.userId, `${fileId}${fileExtension}`);
          
          const oldFullPath = path.join(this.options.uploadPath, file.path);
          const newFullPath = path.join(this.options.uploadPath, newRelativePath);
          
          // Create target directory
          await fs.mkdir(path.dirname(newFullPath), { recursive: true });
          
          // Move physical file
          await fs.rename(oldFullPath, newFullPath);
          
          // Update file record
          file.path = newRelativePath;
          file.updatedAt = new Date().toISOString();
          this.files.set(fileId, file);
          
          results.moved.push(fileId);
          
        } catch (error) {
          console.error(`Error moving file ${fileId}:`, error);
          results.failed.push({ fileId, error: error.message });
        }
      }
      
      res.json({
        message: 'Bulk move completed',
        results
      });
      
    } catch (error) {
      console.error('Bulk move files error:', error);
      res.status(500).json({
        error: 'Failed to move files'
      });
    }
  }

  async getSharedFileInfo(req, res) {
    try {
      const { shareToken } = req.params;
      
      const shareData = this.fileShares.get(shareToken);
      if (!shareData) {
        return res.status(404).json({
          error: 'Shared file not found'
        });
      }

      // Check if share has expired
      if (shareData.expiresAt && new Date() > new Date(shareData.expiresAt)) {
        this.fileShares.delete(shareToken);
        return res.status(410).json({
          error: 'Share has expired'
        });
      }

      // Check download limit
      if (shareData.downloadLimit && shareData.downloadCount >= shareData.downloadLimit) {
        return res.status(410).json({
          error: 'Download limit exceeded'
        });
      }

      const file = this.files.get(shareData.fileId);
      if (!file) {
        this.fileShares.delete(shareToken);
        return res.status(404).json({
          error: 'File not found'
        });
      }

      res.json({
        file: {
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          createdAt: file.createdAt
        },
        share: {
          allowPreview: shareData.allowPreview,
          hasPassword: !!shareData.password,
          downloadCount: shareData.downloadCount,
          downloadLimit: shareData.downloadLimit
        }
      });

    } catch (error) {
      console.error('Get shared file info error:', error);
      res.status(500).json({
        error: 'Failed to get shared file info'
      });
    }
  }

  sanitizeFileData(file) {
    const { path, ...sanitized } = file;
    return sanitized;
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
          console.log(`📁 File Service running on port ${this.options.port}`);
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
          console.log('📁 File Service stopped');
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
      files: this.files.size,
      processingQueue: this.processingQueue.length,
      uploadSessions: this.uploadSessions.size,
      sharedFiles: this.fileShares.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default FileService;