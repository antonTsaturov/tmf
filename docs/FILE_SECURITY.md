# 📁 File Security

Comprehensive file upload security implementation protecting against malicious files, executable injection, oversized uploads, and invalid file types.

## Overview

The file security system provides multi-layered validation for all file uploads:

1. **MIME Type Validation** - Whitelist-based validation
2. **File Size Limits** - Configurable maximum file size
3. **Executable Detection** - Magic number/signature analysis
4. **Extension Validation** - Blocks dangerous extensions
5. **Path Traversal Prevention** - Sanitizes filenames

## Features

### ✅ MIME Type Validation (Whitelist)

Only document, image, and archive formats are allowed:

**Documents:**
- PDF (`application/pdf`)
- Microsoft Word: `.doc`, `.docx`
- Microsoft Excel: `.xls`, `.xlsx`
- Microsoft PowerPoint: `.ppt`, `.pptx`
- OpenDocument: `.odt`, `.ods`, `.odp`
- Text: `.txt`, `.rtf`, `.csv`

**Images:**
- JPEG, PNG, GIF, WebP, TIFF

**Archives (for import/export):**
- ZIP, GZIP, RAR, 7Z

### 🚫 Blocked File Types

Executable and script files are **unconditionally blocked**:

- **Windows Executables:** `.exe`, `.msi`, `.scr`, `.bat`, `.cmd`, `.com`, `.pif`
- **Scripts:** `.js`, `.ts`, `.py`, `.sh`, `.vbs`, `.pl`, `.rb`, `.php`, etc.
- **Macro-enabled Office:** `.docm`, `.xlsm`, `.pptm` (disabled by default)
- **System Files:** `.dll`, `.so`, `.sys`, `.obj`, `.lib`
- **Installers:** `.app`, `.deb`, `.rpm`, `.apk`, `.dmg`, `.pkg`

### 📏 File Size Limits

**Default:** 100 MB (configurable via environment)

Configure in `.env.local`:
```bash
# Maximum file size in bytes (optional, default 100MB)
MAX_FILE_SIZE=104857600
```

Examples:
- 50 MB: `52428800`
- 100 MB: `104857600`
- 200 MB: `209715200`
- 500 MB: `524288000`

### 🔍 Executable Detection

Files are scanned for common executable signatures (magic numbers):

- **Windows Executables** - `MZ` header (DOS/PE)
- **ELF Binaries** - Linux executables
- **Mach-O** - macOS executables
- **ZIP/RAR/7Z** - Archive signatures

Detection is enabled by default and can be controlled programmatically.

## API Endpoints

### Upload Endpoint
```
POST /api/documents/upload
```

Returns validation errors with detailed information:

```json
{
  "error": "File type not allowed: .exe. Executable and script files are not permitted",
  "errorCode": "BLOCKED_FILE_TYPE",
  "details": {
    "extension": "exe"
  }
}
```

**Error Codes:**
- `MISSING_FILENAME` - Filename is required
- `FILENAME_TOO_LONG` - Exceeds 255 characters
- `INVALID_FILENAME` - Path traversal detected
- `MISSING_EXTENSION` - File must have extension
- `BLOCKED_FILE_TYPE` - Extension on blocklist
- `INVALID_MIME_TYPE` - MIME type not whitelisted
- `FILE_TOO_LARGE` - Exceeds MAX_FILE_SIZE
- `EMPTY_FILE` - File is 0 bytes
- `EXECUTABLE_FILE_DETECTED` - Magic number indicates executable

### Get Allowed Types
```
GET /api/documents/upload/allowed-types
```

Returns allowed file types and size limits:

```json
{
  "success": true,
  "data": {
    "allowedExtensions": ["PDF", "DOCX", "XLSX", "..."],
    "allowedMimeTypes": ["application/pdf", "..."],
    "maxFileSize": 104857600,
    "maxFileSizeMB": 100,
    "message": "Allowed file types: PDF, DOCX, ..."
  }
}
```

## Usage

### Server-Side Validation

```typescript
import { validateFileUpload } from '@/lib/file-security';

// In your upload handler
const file = request.files[0];
const buffer = await file.arrayBuffer();

const result = validateFileUpload(file, buffer);

if (!result.valid) {
  return NextResponse.json(
    { error: result.error, errorCode: result.errorCode },
    { status: 400 }
  );
}

// File is safe to process
```

### Client-Side Display

Fetch allowed types to show users what's permitted:

```typescript
const response = await fetch('/api/documents/upload/allowed-types');
const { data } = await response.json();

console.log('Max file size:', data.maxFileSizeMB, 'MB');
console.log('Allowed types:', data.allowedExtensions.join(', '));
```

## Security Considerations

### Why These Restrictions?

1. **Executables** - Prevent arbitrary code execution, ransomware, trojans
2. **Macros** - Macros in Office documents can execute arbitrary code
3. **Scripts** - JavaScript, Python, Shell scripts can access system resources
4. **Archives** - TAR/GZ can contain executables or use directory traversal
5. **Size Limits** - Prevent denial-of-service (disk exhaustion, memory issues)

### Best Practices

1. **Validate on Both Server and Client** - Server is authoritative
2. **Scan Uploaded Files** - Consider periodic antivirus scanning of stored files
3. **Store Outside Web Root** - Files should not be directly executable
4. **Use Content-Disposition** - Force download, prevent inline execution
5. **Monitor Uploads** - Log all upload attempts and failures (automatic via auth logging)

## Configuration

### Environment Variables

```bash
# Maximum file upload size in bytes (default: 100MB)
MAX_FILE_SIZE=104857600

# All other required env vars (see .env.example)
JWT_SECRET=...
DATABASE_URL=...
YC_IAM_KEY_PATH=...
```

### Programmatic Configuration

In `src/lib/file-security.ts`:

```typescript
export const FILE_SECURITY_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
  MAX_FILENAME_LENGTH: 255,
  ENABLE_MAGIC_NUMBER_CHECK: true,
};
```

## Logging

All upload validation failures are logged with detailed information:

```typescript
logger.authLog('UPLOAD_VALIDATION_FAILED', userId, 'FILE_VALIDATION_ERROR', {
  fileName: 'malware.exe',
  error: 'File type not allowed',
  errorCode: 'BLOCKED_FILE_TYPE',
  details: { extension: 'exe' }
});
```

Log level: `authLog` (authentication/authorization events)

## Testing

### Test Blocked File Types

```bash
# Create a test executable file (harmless)
echo "MZ" | xxd -r -p > test.bin  # DOS executable header
curl -F "file=@test.bin" http://localhost:3000/api/documents/upload
# Expected: 400 - EXECUTABLE_FILE_DETECTED
```

### Test File Size Limit

```bash
# Create a 150MB file
dd if=/dev/zero of=large.bin bs=1M count=150

curl -F "file=@large.bin" http://localhost:3000/api/documents/upload
# Expected: 400 - FILE_TOO_LARGE
```

### Test MIME Type Validation

```bash
# Create a text file with wrong MIME type
echo "<?php echo 'Hello'; ?>" > script.pdf

curl -F "file=@script.pdf" http://localhost:3000/api/documents/upload
# Server validates against MIME type and file contents
```

## Performance Impact

- ✅ **Minimal** - Validation runs in < 10ms for typical files
- ✅ **Memory efficient** - Magic number check scans only first 512 bytes
- ✅ **No additional dependencies** - Uses Node.js built-ins only

## Compliance

This implementation aligns with OWASP security recommendations:
- **A4:2021 Insecure Deserialization** - Prevent code injection
- **A6:2021 Vulnerable and Outdated Components** - Block executables
- **A7:2021 Identification and Authentication Failures** - Audit logging
- **Unrestricted File Upload** - Comprehensive whitelist validation

## Related Documentation

- [Security Headers, CORS & CSRF](./SECURITY_HEADERS_CORS_CSRF.md)
- [Rate Limiting](./RATE_LIMITING.md)
- [Session Management](./SESSION_MANAGEMENT.md)
- [Environment Variables](./.env.example)

## See Also

- [NIST Guidelines on File Uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [CWE-434: Unrestricted Upload](https://cwe.mitre.org/data/definitions/434.html)
- [CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code](https://cwe.mitre.org/data/definitions/95.html)
