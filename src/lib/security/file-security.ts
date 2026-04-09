/**
 * File Security Module
 * 
 * Provides comprehensive file security validation including:
 * - MIME type validation (whitelist-based)
 * - File size limits enforcement
 * - Executable file detection and blocking
 * - File extension validation
 * - Magic number (file signature) validation
 */

/**
 * Configuration for file security
 * Can be overridden via environment variables
 */
export const FILE_SECURITY_CONFIG = {
  // Maximum file size in bytes (default 100MB)
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
  
  // Maximum filename length
  MAX_FILENAME_LENGTH: 255,
  
  // Whether to enable magic number validation
  ENABLE_MAGIC_NUMBER_CHECK: true,
};

/**
 * Allowed MIME types for document upload
 * Uses whitelist approach for security
 */
const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain', // .txt
  'text/rtf', // .rtf
  'application/rtf',
  
  // OpenDocument formats
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  
  // Archives (for backup/export, but not for direct execution)
  'application/zip',
  'application/gzip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  
  // CSV for data import
  'text/csv',
]);

/**
 * Dangerous file extensions that should be blocked regardless of MIME type
 * These are commonly used for executable files or scripts
 */
const BLOCKED_EXTENSIONS = new Set([
  // Executables
  'exe', 'msi', 'scr', 'bat', 'cmd', 'com', 'pif', 'app',
  
  // Scripts
  'js', 'ts', 'jsx', 'tsx', 'py', 'pyc', 'pyo', 'php', 'phtml',
  'pl', 'rb', 'sh', 'bash', 'zsh', 'ksh', 'csh', 'fish',
  'r', 'java', 'class', 'jar', 'go', 'rs', 'cpp', 'c', 'h',
  
  // Windows/macOS scripts
  'vbs', 'vbe', 'jse', 'ps1', 'cmd', 'sh', 'bat', 'scr',
  
  // Macro-enabled Office documents (higher risk)
  'docm', 'xlsm', 'pptm', 'xlam', 'xlsb', 'ppam', 'ppsm',
  
  // Archives containing executables (for direct execution, not import)
  'tar', 'gz', 'tgz', 'bz2', 'tbz',
  
  // System files
  'sys', 'dll', 'so', 'dylib', 'o', 'obj', 'lib', 'a', 'swf',
  
  // Shortcuts/Links
  'lnk', 'url', 'desktop', 'webloc',
  
  // Installer scripts
  'ins', 'isu', 'iss',
  
  // Other potentially dangerous
  'app', 'deb', 'rpm', 'apk', 'dmg', 'pkg',
]);

/**
 * File magic numbers (signatures) for common file types
 * Used to detect file type regardless of extension/MIME type
 */
// const _FILE_SIGNATURES: Record<string, Array<{ bytes: number[], offset: number }>> = {
//   'pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }], // %PDF
//   'zip': [{ bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 }], // PK..
//   'rar': [{ bytes: [0x52, 0x61, 0x72, 0x21], offset: 0 }], // Rar!
//   '7z': [{ bytes: [0x37, 0x7A, 0xBC, 0xAF], offset: 0 }], // 7z..
//   'gzip': [{ bytes: [0x1F, 0x8B], offset: 0 }], // ..
//   'doc': [{ bytes: [0xD0, 0xCF, 0x11, 0xE0], offset: 0 }], // Ole2
//   'png': [{ bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 }], // .PNG
//   'jpeg': [{ bytes: [0xFF, 0xD8, 0xFF], offset: 0 }], // ÿØÿ
//   'gif': [{ bytes: [0x47, 0x49, 0x46], offset: 0 }], // GIF
//   'exe': [{ bytes: [0x4D, 0x5A], offset: 0 }], // MZ (DOS/Windows executable)
// };

/**
 * Validates if a file has dangerous magic number
 */
function findDangerousSignature(buffer: Buffer): string | null {
  // Check for executable signatures
  if (buffer.length >= 2) {
    const mzSignature = [0x4D, 0x5A];
    let match = true;
    for (let i = 0; i < mzSignature.length; i++) {
      if (buffer[i] !== mzSignature[i]) {
        match = false;
        break;
      }
    }
    if (match) return 'exe';
  }

  // Check for ELF executable (Linux)
  if (buffer.length >= 4 && 
      buffer[0] === 0x7F && 
      buffer[1] === 0x45 && 
      buffer[2] === 0x4C && 
      buffer[3] === 0x46) {
    return 'elf';
  }

  // Check for Mach-O executable (macOS)
  if (buffer.length >= 4 && 
      (buffer[0] === 0xFE && buffer[1] === 0xED && buffer[2] === 0xFA)) {
    return 'macho';
  }

  return null;
}

/**
 * Extracts file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Sanitizes filename to prevent directory traversal
 */
function sanitizeFilename(filename: string): boolean {
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  return true;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  details?: Record<string, any>;
}

/**
 * Main validation function for file uploads
 * Performs comprehensive security checks
 */
export function validateFileUpload(
  file: File | { name: string; type: string; size: number },
  buffer: Buffer
): FileValidationResult {
  // Check filename
  const filename = file.name;

  if (!filename) {
    return {
      valid: false,
      error: 'Filename is required',
      errorCode: 'MISSING_FILENAME',
    };
  }

  // Check filename length
  if (filename.length > FILE_SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: `Filename too long. Maximum length is ${FILE_SECURITY_CONFIG.MAX_FILENAME_LENGTH} characters`,
      errorCode: 'FILENAME_TOO_LONG',
      details: { maxLength: FILE_SECURITY_CONFIG.MAX_FILENAME_LENGTH, provided: filename.length },
    };
  }

  // Check for path traversal
  if (!sanitizeFilename(filename)) {
    return {
      valid: false,
      error: 'Invalid filename. Path traversal detected',
      errorCode: 'INVALID_FILENAME',
    };
  }

  // Check file extension
  const extension = getFileExtension(filename);
  if (!extension) {
    return {
      valid: false,
      error: 'File must have an extension',
      errorCode: 'MISSING_EXTENSION',
    };
  }

  // Check if extension is blocked
  if (BLOCKED_EXTENSIONS.has(extension.toLowerCase())) {
    return {
      valid: false,
      error: `File type not allowed: .${extension}. Executable and script files are not permitted`,
      errorCode: 'BLOCKED_FILE_TYPE',
      details: { extension },
    };
  }

  // Check MIME type
  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `MIME type not allowed: ${mimeType}. Only documents, images, and archives are permitted`,
      errorCode: 'INVALID_MIME_TYPE',
      details: { mimeType, allowed: Array.from(ALLOWED_MIME_TYPES) },
    };
  }

  // Check file size
  const fileSize = buffer.length;
  if (fileSize > FILE_SECURITY_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = FILE_SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    const providedSizeMB = fileSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB.toFixed(0)}MB (provided: ${providedSizeMB.toFixed(2)}MB)`,
      errorCode: 'FILE_TOO_LARGE',
      details: {
        maxSize: FILE_SECURITY_CONFIG.MAX_FILE_SIZE,
        provided: fileSize,
        maxSizeMB,
        providedSizeMB: parseFloat(providedSizeMB.toFixed(2)),
      },
    };
  }

  // Check file must not be empty
  if (fileSize === 0) {
    return {
      valid: false,
      error: 'File cannot be empty',
      errorCode: 'EMPTY_FILE',
    };
  }

  // Check for dangerous magic numbers (executables)
  if (FILE_SECURITY_CONFIG.ENABLE_MAGIC_NUMBER_CHECK) {
    const dangerousType = findDangerousSignature(buffer);
    if (dangerousType) {
      return {
        valid: false,
        error: `Executable file detected (${dangerousType}). Executable files are not allowed`,
        errorCode: 'EXECUTABLE_FILE_DETECTED',
        details: { fileType: dangerousType },
      };
    }
  }

  // All checks passed
  return { valid: true };
}

/**
 * Get allowed file types for display purposes
 */
export function getAllowedFileTypes(): {
  extensions: string[];
  mimeTypes: string[];
  maxSizeMB: number;
} {
  // Extract common extensions from allowed MIME types
  const extensionMap: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.ms-powerpoint': ['ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
    'text/plain': ['txt'],
    'text/rtf': ['rtf'],
    'application/rtf': ['rtf'],
    'application/vnd.oasis.opendocument.text': ['odt'],
    'application/vnd.oasis.opendocument.spreadsheet': ['ods'],
    'application/vnd.oasis.opendocument.presentation': ['odp'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/tiff': ['tif', 'tiff'],
    'application/zip': ['zip'],
    'application/gzip': ['gz'],
    'application/x-rar-compressed': ['rar'],
    'application/x-7z-compressed': ['7z'],
    'text/csv': ['csv'],
  };

  const extensions = new Set<string>();
  for (const exts of Object.values(extensionMap)) {
    exts.forEach(ext => extensions.add(ext.toUpperCase()));
  }

  return {
    extensions: Array.from(extensions).sort(),
    mimeTypes: Array.from(ALLOWED_MIME_TYPES).sort(),
    maxSizeMB: FILE_SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024),
  };
}
