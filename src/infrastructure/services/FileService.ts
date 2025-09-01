// File Service Implementation
import { IFileService } from '../../application/interfaces/IGroqService';

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  path: string;
  checksum: string;
  userId?: string;
}

interface UploadProgress {
  fileId: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
}

export class FileService implements IFileService {
  private files: Map<string, FileMetadata> = new Map();
  private fileContents: Map<string, ArrayBuffer> = new Map();
  private uploadProgress: Map<string, UploadProgress> = new Map();
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  async uploadFile(
    file: File,
    options?: {
      userId?: string;
      path?: string;
      onProgress?: (progress: UploadProgress) => void;
    }
  ): Promise<string> {
    // Validate file
    this.validateFile(file);

    const fileId = this.generateFileId();
    const checksum = await this.calculateChecksum(file);
    
    // Check for duplicates
    const existingFile = this.findFileByChecksum(checksum);
    if (existingFile) {
      return existingFile.id;
    }

    // Create metadata
    const metadata: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      path: options?.path || `/uploads/${fileId}`,
      checksum,
      userId: options?.userId
    };

    // Initialize progress
    const progress: UploadProgress = {
      fileId,
      loaded: 0,
      total: file.size,
      percentage: 0,
      status: 'uploading'
    };
    
    this.uploadProgress.set(fileId, progress);
    options?.onProgress?.(progress);

    try {
      // Simulate upload with progress
      const arrayBuffer = await this.readFileWithProgress(file, (loaded) => {
        progress.loaded = loaded;
        progress.percentage = Math.round((loaded / file.size) * 100);
        this.uploadProgress.set(fileId, { ...progress });
        options?.onProgress?.(progress);
      });

      // Store file
      this.files.set(fileId, metadata);
      this.fileContents.set(fileId, arrayBuffer);

      // Complete progress
      progress.status = 'completed';
      progress.percentage = 100;
      this.uploadProgress.set(fileId, progress);
      options?.onProgress?.(progress);

      console.log(`📁 File uploaded: ${file.name} (${fileId})`);
      return fileId;

    } catch (error) {
      progress.status = 'error';
      this.uploadProgress.set(fileId, progress);
      options?.onProgress?.(progress);
      throw new Error(`Upload failed: ${error}`);
    }
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const metadata = this.files.get(fileId);
    if (!metadata) {
      throw new Error('File not found');
    }

    const content = this.fileContents.get(fileId);
    if (!content) {
      throw new Error('File content not found');
    }

    return new Blob([content], { type: metadata.type });
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const metadata = this.files.get(fileId);
    if (!metadata) {
      return false;
    }

    this.files.delete(fileId);
    this.fileContents.delete(fileId);
    this.uploadProgress.delete(fileId);

    console.log(`🗑️ File deleted: ${metadata.name} (${fileId})`);
    return true;
  }

  async getFileInfo(fileId: string): Promise<FileMetadata | null> {
    return this.files.get(fileId) || null;
  }

  async listFiles(options?: {
    userId?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<FileMetadata[]> {
    let files = Array.from(this.files.values());

    // Filter by user
    if (options?.userId) {
      files = files.filter(f => f.userId === options.userId);
    }

    // Filter by type
    if (options?.type) {
      files = files.filter(f => f.type.startsWith(options.type!));
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return files.slice(offset, offset + limit);
  }

  async getUploadProgress(fileId: string): Promise<UploadProgress | null> {
    return this.uploadProgress.get(fileId) || null;
  }

  async cancelUpload(fileId: string): Promise<boolean> {
    const progress = this.uploadProgress.get(fileId);
    if (!progress || progress.status !== 'uploading') {
      return false;
    }

    progress.status = 'cancelled';
    this.uploadProgress.set(fileId, progress);
    
    // Clean up
    this.files.delete(fileId);
    this.fileContents.delete(fileId);

    return true;
  }

  async generateThumbnail(
    fileId: string,
    options?: { width?: number; height?: number; quality?: number }
  ): Promise<string | null> {
    const metadata = this.files.get(fileId);
    if (!metadata || !metadata.type.startsWith('image/')) {
      return null;
    }

    const content = this.fileContents.get(fileId);
    if (!content) {
      return null;
    }

    try {
      const blob = new Blob([content], { type: metadata.type });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = () => {
          const { width = 150, height = 150, quality = 0.8 } = options || {};
          
          canvas.width = width;
          canvas.height = height;
          
          // Calculate aspect ratio
          const aspectRatio = img.width / img.height;
          let drawWidth = width;
          let drawHeight = height;
          
          if (aspectRatio > 1) {
            drawHeight = width / aspectRatio;
          } else {
            drawWidth = height * aspectRatio;
          }
          
          const x = (width - drawWidth) / 2;
          const y = (height - drawHeight) / 2;
          
          ctx?.drawImage(img, x, y, drawWidth, drawHeight);
          
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(thumbnailDataUrl);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return null;
    }
  }

  async validateFile(file: File): Promise<boolean> {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Check file name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      throw new Error('File name contains invalid characters');
    }

    return true;
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    byUser: Record<string, { count: number; size: number }>;
  }> {
    const files = Array.from(this.files.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const byType: Record<string, { count: number; size: number }> = {};
    const byUser: Record<string, { count: number; size: number }> = {};

    files.forEach(file => {
      // Group by type
      const typeCategory = file.type.split('/')[0] || 'unknown';
      if (!byType[typeCategory]) {
        byType[typeCategory] = { count: 0, size: 0 };
      }
      byType[typeCategory].count++;
      byType[typeCategory].size += file.size;

      // Group by user
      const userId = file.userId || 'anonymous';
      if (!byUser[userId]) {
        byUser[userId] = { count: 0, size: 0 };
      }
      byUser[userId].count++;
      byUser[userId].size += file.size;
    });

    return {
      totalFiles,
      totalSize,
      byType,
      byUser
    };
  }

  // Utility methods
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateChecksum(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private findFileByChecksum(checksum: string): FileMetadata | null {
    for (const file of this.files.values()) {
      if (file.checksum === checksum) {
        return file;
      }
    }
    return null;
  }

  private async readFileWithProgress(
    file: File,
    onProgress: (loaded: number) => void
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded);
        }
      };
      
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Configuration methods
  setMaxFileSize(size: number): void {
    this.maxFileSize = size;
  }

  addAllowedType(type: string): void {
    if (!this.allowedTypes.includes(type)) {
      this.allowedTypes.push(type);
    }
  }

  removeAllowedType(type: string): void {
    const index = this.allowedTypes.indexOf(type);
    if (index > -1) {
      this.allowedTypes.splice(index, 1);
    }
  }

  getAllowedTypes(): string[] {
    return [...this.allowedTypes];
  }
}