// Security Service Implementation
import { ISecurityService } from '../../application/interfaces/IGroqService';

interface SecurityAuditLog {
  id: string;
  event: string;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

interface ThreatDetection {
  id: string;
  type: 'brute_force' | 'sql_injection' | 'xss' | 'suspicious_activity';
  source: string;
  timestamp: Date;
  blocked: boolean;
  details: Record<string, any>;
}

export class SecurityService implements ISecurityService {
  private auditLogs: SecurityAuditLog[] = [];
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private threats: ThreatDetection[] = [];
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: RegExp[] = [
    /(<script[^>]*>.*?<\/script>)/gi, // XSS
    /(union|select|insert|update|delete|drop|create|alter)\s+/gi, // SQL Injection
    /(\.\.\/|\.\.\\\/)/g, // Path traversal
    /(eval\(|javascript:|vbscript:|onload=|onerror=)/gi // Code injection
  ];

  async hashPassword(password: string): Promise<string> {
    // Simple hash implementation - in production use bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_secret_key');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  async generateJWT(
    payload: Record<string, any>,
    secret: string,
    expiresIn: string = '1h'
  ): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiresIn(expiresIn);

    const jwtPayload = {
      ...payload,
      iat: now,
      exp: exp
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
    
    const signature = await this.createSignature(
      `${encodedHeader}.${encodedPayload}`,
      secret
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  async verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      if (!encodedHeader || !encodedPayload || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = await this.createSignature(
        `${encodedHeader}.${encodedPayload}`,
        secret
      );

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    
    // Escape special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Remove suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  async checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const entry = this.rateLimits.get(identifier);

    if (!entry) {
      this.rateLimits.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
        blocked: false
      });
      return true;
    }

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
      entry.blocked = false;
      return true;
    }

    // Check if already blocked
    if (entry.blocked) {
      return false;
    }

    // Increment count
    entry.count++;

    // Block if limit exceeded
    if (entry.count > limit) {
      entry.blocked = true;
      await this.logSecurityEvent('rate_limit_exceeded', {
        identifier,
        count: entry.count,
        limit
      }, 'medium');
      return false;
    }

    return true;
  }

  async logSecurityEvent(
    event: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
    userId?: string
  ): Promise<void> {
    const auditLog: SecurityAuditLog = {
      id: this.generateId(),
      event,
      userId,
      ip: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      timestamp: new Date(),
      severity,
      details
    };

    this.auditLogs.push(auditLog);

    // Log to console for development
    console.log(`[SECURITY ${severity.toUpperCase()}] ${event}:`, details);

    // In production, send to security monitoring service
    if (severity === 'critical' || severity === 'high') {
      await this.alertSecurityTeam(auditLog);
    }
  }

  async validateCORS(origin: string, allowedOrigins: string[]): Promise<boolean> {
    if (!origin) return false;
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        return origin.endsWith(domain);
      }
      return origin === allowed;
    });

    if (!isAllowed) {
      await this.logSecurityEvent('cors_violation', {
        origin,
        allowedOrigins
      }, 'medium');
    }

    return isAllowed;
  }

  async detectThreats(input: string, context: string): Promise<ThreatDetection[]> {
    const threats: ThreatDetection[] = [];
    const source = this.getCurrentIP();

    // SQL Injection Detection
    if (/('|(--)|;|(\|\|)|(\*\*))/i.test(input) ||
        /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i.test(input)) {
      threats.push({
        id: this.generateId(),
        type: 'sql_injection',
        source,
        timestamp: new Date(),
        blocked: true,
        details: { input, context, pattern: 'sql_injection' }
      });
    }

    // XSS Detection
    if (/<script[^>]*>.*?<\/script>/gi.test(input) ||
        /(javascript:|vbscript:|onload=|onerror=|onclick=)/gi.test(input)) {
      threats.push({
        id: this.generateId(),
        type: 'xss',
        source,
        timestamp: new Date(),
        blocked: true,
        details: { input, context, pattern: 'xss' }
      });
    }

    // Brute Force Detection (multiple failed attempts)
    const rateLimitKey = `brute_force_${source}`;
    const entry = this.rateLimits.get(rateLimitKey);
    if (entry && entry.count > 10) {
      threats.push({
        id: this.generateId(),
        type: 'brute_force',
        source,
        timestamp: new Date(),
        blocked: true,
        details: { attempts: entry.count, context }
      });
    }

    // Log and store threats
    for (const threat of threats) {
      this.threats.push(threat);
      await this.logSecurityEvent(`threat_detected_${threat.type}`, threat.details, 'high');
      
      if (threat.blocked) {
        this.blockedIPs.add(source);
      }
    }

    return threats;
  }

  async getSecurityLogs(filter?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    event?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<SecurityAuditLog[]> {
    let logs = [...this.auditLogs];

    if (filter) {
      if (filter.severity) {
        logs = logs.filter(log => log.severity === filter.severity);
      }
      if (filter.event) {
        logs = logs.filter(log => log.event.includes(filter.event));
      }
      if (filter.userId) {
        logs = logs.filter(log => log.userId === filter.userId);
      }
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async clearSecurityLogs(olderThan?: Date): Promise<void> {
    if (olderThan) {
      this.auditLogs = this.auditLogs.filter(log => log.timestamp > olderThan);
    } else {
      this.auditLogs = [];
    }

    await this.logSecurityEvent('security_logs_cleared', {
      olderThan: olderThan?.toISOString(),
      remainingLogs: this.auditLogs.length
    }, 'low');
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  async blockIP(ip: string, reason: string): Promise<void> {
    this.blockedIPs.add(ip);
    await this.logSecurityEvent('ip_blocked', { ip, reason }, 'high');
  }

  async unblockIP(ip: string): Promise<void> {
    this.blockedIPs.delete(ip);
    await this.logSecurityEvent('ip_unblocked', { ip }, 'medium');
  }

  // Helper methods
  private async createSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return this.base64UrlEncode(new Uint8Array(signature));
  }

  private base64UrlEncode(data: string | Uint8Array): string {
    const base64 = typeof data === 'string' 
      ? btoa(data)
      : btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private base64UrlDecode(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return atob(padded);
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) return 3600; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getCurrentIP(): string {
    // In browser environment, we can't get real IP
    // This would be handled by the server
    return '127.0.0.1';
  }

  private getCurrentUserAgent(): string {
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private async alertSecurityTeam(auditLog: SecurityAuditLog): Promise<void> {
    // In production, this would send alerts to security team
    console.warn('[SECURITY ALERT]', auditLog);
  }

  private getThreatType(patternIndex: number): ThreatDetection['type'] {
    const types: ThreatDetection['type'][] = ['xss', 'sql_injection', 'suspicious_activity', 'xss'];
    return types[patternIndex] || 'suspicious_activity';
  }

  private async sendSecurityAlert(auditLog: SecurityAuditLog): Promise<void> {
    // In production, send to security monitoring system
    console.warn('🚨 SECURITY ALERT:', auditLog);
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}