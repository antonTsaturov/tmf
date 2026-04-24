/**
 * File Security Tests
 * 
 * Tests for:
 * - MIME type validation
 * - Magic number detection
 * - Extension blocking
 * - File size limits
 * - Path traversal prevention
 */

import {
  validateFileUpload,
  FILE_SECURITY_CONFIG,
  getAllowedFileTypes,
} from '../lib/security/file-security';

describe('File Security - Configuration', () => {
  describe('FILE_SECURITY_CONFIG', () => {
    it('should have max file size of 100MB by default', () => {
      expect(FILE_SECURITY_CONFIG.MAX_FILE_SIZE).toBe(104857600); // 100MB
    });

    it('should have max filename length of 255', () => {
      expect(FILE_SECURITY_CONFIG.MAX_FILENAME_LENGTH).toBe(255);
    });

    it('should enable magic number check by default', () => {
      expect(FILE_SECURITY_CONFIG.ENABLE_MAGIC_NUMBER_CHECK).toBe(true);
    });
  });

  describe('getAllowedFileTypes', () => {
    it('should return extensions array', () => {
      const types = getAllowedFileTypes();
      
      expect(types.extensions).toBeInstanceOf(Array);
      expect(types.extensions.length).toBeGreaterThan(0);
    });

    it('should include PDF extension', () => {
      const types = getAllowedFileTypes();
      
      expect(types.extensions).toContain('PDF');
    });

    it('should include common document extensions', () => {
      const types = getAllowedFileTypes();
      
      expect(types.extensions).toContain('DOC');
      expect(types.extensions).toContain('DOCX');
      expect(types.extensions).toContain('XLS');
      expect(types.extensions).toContain('XLSX');
    });

    it('should return mimeTypes array', () => {
      const types = getAllowedFileTypes();
      
      expect(types.mimeTypes).toBeInstanceOf(Array);
      expect(types.mimeTypes).toContain('application/pdf');
    });

    it('should return maxSizeMB', () => {
      const types = getAllowedFileTypes();
      
      expect(types.maxSizeMB).toBe(100);
    });
  });
});

describe('validateFileUpload - MIME Type Validation', () => {
  const createMockFile = (overrides?: Partial<File>) => ({
    name: 'test-document.pdf',
    type: 'application/pdf',
    size: 1024,
    ...overrides,
  });

  const createMockBuffer = (size: number) => Buffer.alloc(size, 'test content');

  it('should allow application/pdf', () => {
    const file = createMockFile({ type: 'application/pdf' });
    const buffer = createMockBuffer(100);
    
    const result = validateFileUpload(file, buffer);
    
    expect(result.valid).toBe(true);
  });

  it('should allow text/plain', () => {
    const file = createMockFile({ name: 'document.txt', type: 'text/plain' });
    const buffer = createMockBuffer(100);
    
    const result = validateFileUpload(file, buffer);
    
    expect(result.valid).toBe(true);
  });

  it('should block invalid MIME types', () => {
    const file = createMockFile({ type: 'application/x-executable' });
    const buffer = createMockBuffer(100);
    
    const result = validateFileUpload(file, buffer);
    
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_MIME_TYPE');
  });
});

describe('validateFileUpload - Extension Blocking', () => {
  const createMockFile = (overrides?: Partial<File>) => ({
    name: 'test-document.pdf',
    type: 'application/pdf',
    size: 1024,
    ...overrides,
  });

  const createMockBuffer = (size: number) => Buffer.alloc(size, 'test content');

  describe('Executable Files', () => {
    it('should block .exe', () => {
      const file = createMockFile({ name: 'malware.exe', type: 'application/x-msdownload' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should block .bat', () => {
      const file = createMockFile({ name: 'script.bat' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Script Files', () => {
    it('should block .js', () => {
      const file = createMockFile({ name: 'script.js', type: 'application/javascript' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
    });

    it('should block .py', () => {
      const file = createMockFile({ name: 'script.py' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
    });

    it('should block .ps1 (PowerShell)', () => {
      const file = createMockFile({ name: 'script.ps1' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Allowed Extensions', () => {
    it('should allow .pdf', () => {
      const file = createMockFile({ name: 'document.pdf' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });

    it('should allow .docx', () => {
      const file = createMockFile({ name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });

    it('should allow .txt', () => {
      const file = createMockFile({ name: 'document.txt', type: 'text/plain' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });
  });
});

describe('validateFileUpload - Main Validation', () => {
  const createMockFile = (overrides?: Partial<File>) => ({
    name: 'test-document.pdf',
    type: 'application/pdf',
    size: 1024,
    ...overrides,
  });

  const createMockBuffer = (size: number) => Buffer.alloc(size, 'test content');

  describe('Filename Validation', () => {
    it('should reject file without filename', () => {
      const file = createMockFile({ name: '' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_FILENAME');
    });

    it('should reject filename longer than 255 characters', () => {
      const longName = 'a'.repeat(256) + '.pdf';
      const file = createMockFile({ name: longName });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FILENAME_TOO_LONG');
    });

    it('should reject path traversal attempts', () => {
      const file = createMockFile({ name: '../../../etc/passwd' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_FILENAME');
    });

    it('should reject filename with backslash', () => {
      const file = createMockFile({ name: 'folder\\file.pdf' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Extension Validation', () => {
    it('should reject file without extension', () => {
      const file = createMockFile({ name: 'noextension' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_EXTENSION');
    });

    it('should reject blocked extension (.exe)', () => {
      const file = createMockFile({ name: 'malware.exe', type: 'application/x-msdownload' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should reject blocked extension (.js)', () => {
      const file = createMockFile({ name: 'script.js', type: 'application/javascript' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('BLOCKED_FILE_TYPE');
    });

    it('should allow .pdf', () => {
      const file = createMockFile({ name: 'document.pdf', type: 'application/pdf' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('MIME Type Validation', () => {
    it('should reject invalid MIME type', () => {
      const file = createMockFile({ 
        name: 'document.pdf', 
        type: 'application/x-executable' 
      });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_MIME_TYPE');
    });

    it('should allow application/pdf', () => {
      const file = createMockFile({ type: 'application/pdf' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });

    it('should allow text/plain', () => {
      const file = createMockFile({ 
        name: 'document.txt',
        type: 'text/plain' 
      });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    it('should reject empty file', () => {
      const file = createMockFile();
      const buffer = createMockBuffer(0);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EMPTY_FILE');
    });

    it('should reject file larger than 100MB', () => {
      const file = createMockFile();
      const bufferSize = 105 * 1024 * 1024; // 105MB
      const buffer = createMockBuffer(bufferSize);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
      expect(result.details?.maxSizeMB).toBe(100);
    });

    it('should allow file exactly at 100MB limit', () => {
      const file = createMockFile();
      const bufferSize = 100 * 1024 * 1024; // Exactly 100MB
      const buffer = createMockBuffer(bufferSize);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });

    it('should allow small files', () => {
      const file = createMockFile();
      const buffer = createMockBuffer(1024); // 1KB
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Magic Number Detection', () => {
    it('should detect MZ executable signature', () => {
      const file = createMockFile({ name: 'fake.pdf', type: 'application/pdf' });
      // MZ signature (Windows executable)
      const buffer = Buffer.from([0x4D, 0x5A, ...Array(100).fill(0)]);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EXECUTABLE_FILE_DETECTED');
      expect(result.details?.fileType).toBe('exe');
    });

    it('should detect ELF executable (Linux)', () => {
      const file = createMockFile({ name: 'fake.pdf', type: 'application/pdf' });
      // ELF signature
      const buffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, ...Array(100).fill(0)]);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EXECUTABLE_FILE_DETECTED');
    });

    it('should detect Mach-O executable (macOS)', () => {
      const file = createMockFile({ name: 'fake.pdf', type: 'application/pdf' });
      // Mach-O signature
      const buffer = Buffer.from([0xFE, 0xED, 0xFA, ...Array(100).fill(0)]);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EXECUTABLE_FILE_DETECTED');
    });

    it('should allow valid PDF (no dangerous signature)', () => {
      const file = createMockFile({ type: 'application/pdf' });
      // PDF signature: %PDF
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, ...Array(100).fill(0)]);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Successful Validation', () => {
    it('should pass all checks for valid PDF', () => {
      const file = createMockFile({
        name: 'valid-document.pdf',
        type: 'application/pdf',
        size: 1024,
      });
      const buffer = createMockBuffer(1024);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass all checks for valid TXT', () => {
      const file = createMockFile({
        name: 'document.txt',
        type: 'text/plain',
        size: 512,
      });
      const buffer = createMockBuffer(512);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(true);
    });

    it('should include details in error response', () => {
      const file = createMockFile({ name: 'malware.exe' });
      const buffer = createMockBuffer(100);
      
      const result = validateFileUpload(file, buffer);
      
      expect(result.valid).toBe(false);
      expect(result.details).toBeDefined();
      expect(result.details?.extension).toBe('exe');
    });
  });
});

describe('File Security - Edge Cases', () => {
  const createMockFile = (overrides?: Partial<File>) => ({
    name: 'test.pdf',
    type: 'application/pdf',
    size: 1024,
    ...overrides,
  });

  it('should handle file with double extension (.pdf.exe)', () => {
    const file = createMockFile({ name: 'document.pdf.exe' });
    const buffer = Buffer.alloc(100);
    
    const result = validateFileUpload(file, buffer);
    
    // Should block based on final extension
    expect(result.valid).toBe(false);
  });

  it('should handle uppercase extension (.PDF)', () => {
    const file = createMockFile({ name: 'document.PDF', type: 'application/pdf' });
    const buffer = Buffer.alloc(100);
    
    const result = validateFileUpload(file, buffer);
    
    // Should allow (case-insensitive check)
    expect(result.valid).toBe(true);
  });

  it('should handle file with spaces in name', () => {
    const file = createMockFile({ name: 'my document.pdf' });
    const buffer = Buffer.alloc(100);
    
    const result = validateFileUpload(file, buffer);
    
    expect(result.valid).toBe(true);
  });

  it('should handle file with unicode characters', () => {
    const file = createMockFile({ name: 'документ.pdf' });
    const buffer = Buffer.alloc(100);
    
    const result = validateFileUpload(file, buffer);
    
    expect(result.valid).toBe(true);
  });
});
