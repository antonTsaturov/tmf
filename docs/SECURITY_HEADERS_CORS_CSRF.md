# 🔐 Security Headers, CORS & CSRF Documentation

## Overview

This document covers the complete security implementation for API requests:
- **Security Headers**: HTTP headers preventing XSS, clickjacking, MIME sniffing
- **CORS**: Cross-Origin Resource Sharing with origin validation
- **CSRF**: Cross-Site Request Forgery protection via token validation

## Architecture

```
Request Flow:
  1. Client → Browser
  2. Browser → Middleware (src/proxy.ts)
     - Security headers applied
     - CORS validation
     - Authentication checked
  3. Middleware → API Route
     - CSRF validation (for POST/PUT/DELETE)
     - Rate limiting checked
     - Request processed
  4. API Route → Database/External Services
  5. Response → Browser → Client
```

---

## 1. Security Headers (Helmet Configuration)

### What They Do

Security headers protect against common web vulnerabilities:

| Header | Purpose | Protection |
|--------|---------|-----------|
| **Content-Security-Policy** | Script/style/resource loading | XSS attacks |
| **X-Frame-Options** | Where page can be framed | Clickjacking |
| **X-Content-Type-Options** | Disable MIME sniffing | MIME type confusion |
| **X-XSS-Protection** | Browser XSS filter | XSS (older browsers) |
| **Referrer-Policy** | What referrer info to send | Privacy leak prevention |
| **Permissions-Policy** | Feature access | Geolocation/mic/camera abuse |
| **Strict-Transport-Security** | Enforce HTTPS | Man-in-the-middle attacks |

### Configuration Location

**src/lib/security/security-headers.ts**

```typescript
export const securityHeaders = {
  'Content-Security-Policy': "...",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  // ... etc
};

export function getSecurityHeaders(): Record<string, string> {
  const headers = { ...securityHeaders };
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = '...'; // HSTS
  }
  return headers;
}
```

### Current CSP Policy

```
default-src 'self'              # Only same-origin by default
script-src 'self' 'unsafe-*'    # Allow scripts from self
style-src 'self' 'unsafe-inline' # Allow inline styles
img-src 'self' data: https:     # Own images + data URLs + HTTPS
font-src 'self' data:            # Own fonts + data URLs
connect-src 'self'              # API calls to same origin only
```

### HSTS Configuration

**Production only:**
```
max-age=31536000    # 1 year
includeSubDomains   # All subdomains
preload             # Include in browser preload list
```

### Testing Headers

Check headers in browser:

```bash
# View security headers
curl -i https://yourapp.com/api/ping

# Check specific header
curl -s https://yourapp.com/api/ping | grep "Content-Security-Policy"
```

---

## 2. CORS (Cross-Origin Resource Sharing)

### What It Does

Allows browser to make requests to API from different origins safely.

### Configuration Location

**src/lib/security/cors.ts**

### Allowed Origins

**Development (automatic):**
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`

**Production (configured via environment):**

**.env.local** or **.env**:
```bash
CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
```

### Allowed Methods & Headers

**Methods:**
```
GET, POST, PUT, DELETE, PATCH, OPTIONS
```

**Request Headers Client Can Send:**
```
Content-Type
Authorization
X-CSRF-Token
X-Requested-With
X-API-Key
```

**Response Headers Client Can Access:**
```
X-RateLimit-Limit
X-RateLimit-Window-Ms
Retry-After
X-Total-Count
```

### How to Add New Origins

1. Production (add to .env):
```bash
CORS_ORIGINS=https://newapp.com,https://old.myapp.com
```

2. Development (already automatic, but can customize in cors.ts):
```typescript
export function getAllowedOrigins(): string[] {
  if (nodeEnv === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',  // Add new origin
    ];
  }
  // ...
}
```

### CORS Preflight (OPTIONS)

Browser automatically sends OPTIONS request before POST/PUT/DELETE from cross-origin.

**Architecture handles this:**
```typescript
// In proxy.ts middleware
if (request.method === 'OPTIONS') {
  return handleCorsPreflight(request);  // Return 204 with headers
}
```

### Testing CORS

```bash
# Test from different origin
curl -X OPTIONS https://api.myapp.com/api/documents \
  -H "Origin: https://app.myapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should see:
# Access-Control-Allow-Origin: https://app.myapp.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

---

## 3. CSRF (Cross-Site Request Forgery) Protection

### What It Does

Prevents malicious sites from making requests on your behalf.

**Attack example (without CSRF protection):**
```
1. You visit malicious-site.com while logged into my-app.com
2. malicious-site.com contains: <img src="https://my-app.com/api/delete-account">
3. Your browser automatically sends auth cookies with the request
4. Request succeeds because you're authenticated
5. Your account is deleted by attacker!
```

**With CSRF protection:**
```
1. Malicious site can't get CSRF token (it's httpOnly cookie)
2. Request without valid CSRF token is rejected
3. Attack fails!
```

### Implementation

**Location:** `src/lib/security/csrf.ts` and `src/app/api/csrf/route.ts`

### Token Generation

```typescript
GET /api/csrf

Response:
{
  "token": "a1b2c3d4e5f6...",
  "expiresAt": 1700000000000,
  "expiresIn": 86400
}

Sets cookie: session_id (httpOnly, secure, sameSite=lax)
```

### Token Storage

**In-memory store** (per request worker):
```typescript
const csrfTokenStore = new Map<string, { 
  token: string; 
  expiresAt: number 
}>();
```

**For production with multiple servers, use Redis:**

```typescript
// Future: Redis integration
const redis = await Redis.connect();
await redis.set(`csrf:${sessionId}`, token, 'EX', 86400);
```

### Token Usage

**Client-side (React):**

```typescript
import { useEffect, useState } from 'react';

export function useCSRFToken() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/csrf')
      .then(r => r.json())
      .then(data => setToken(data.token))
      .finally(() => setLoading(false));
  }, []);

  return { token, loading };
}

// In a form component
export function DocumentDeleteForm() {
  const { token: csrfToken } = useCSRFToken();

  const handleDelete = async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,  // ← Include token
      },
      credentials: 'include',  // ← Important: send cookies
    });
    
    if (response.ok) {
      // Success
    }
  };

  return <button onClick={() => handleDelete('123')}>Delete</button>;
}
```

**Server-side (API routes):**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireCsrfToken } from '@/lib/security/csrf';

export async function DELETE(request: NextRequest) {
  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Validate CSRF token
    const csrf = await requireCsrfToken(request, sessionId);
    if (!csrf.valid) {
      return new NextResponse(csrf.message, { 
        status: csrf.statusCode 
      });
    }

    // Token is valid, process request
    const documentId = request.nextUrl.pathname.split('/')[3];
    // ... delete document ...

    return new NextResponse(JSON.stringify({ success: true }));
  } catch (error) {
    logger.error('DELETE_FAILED', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
```

### Token Lifecycle

1. **Generation** (GET /api/csrf):
   - Token created: 32 bytes of random data
   - Expires in: 24 hours
   - Stored server-side with session ID

2. **Transmission**:
   - Client sends in: `X-CSRF-Token` header
   - Or in form body: `_csrf_token` field

3. **Validation**:
   - Server checks token exists
   - Server checks not expired
   - Server does timing-safe comparison
   - **One-time use**: Token consumed after validation

4. **Cleanup**:
   - Expired tokens cleaned hourly
   - Manual cleanup: `cleanupExpiredTokens()`

### Form-based Implementation

For traditional form submissions:

```html
<!-- HTML form -->
<form method="POST" action="/api/action">
  <input type="hidden" name="_csrf_token" id="csrf" />
  <input type="text" name="email" />
  <button type="submit">Submit</button>
</form>

<script>
  // Fetch and set CSRF token
  fetch('/api/csrf')
    .then(r => r.json())
    .then(data => {
      document.getElementById('csrf').value = data.token;
    });
</script>
```

**Server endpoint:**

```typescript
export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  
  // Extract token from form body
  let token = request.headers.get('X-CSRF-Token');
  if (!token) {
    token = await extractCsrfTokenFromBody(request);
  }
  
  if (!token) {
    return new NextResponse('CSRF token missing', { status: 403 });
  }
  
  const csrf = await requireCsrfToken(request, sessionId);
  if (!csrf.valid) {
    return new NextResponse(csrf.message, { status: csrf.statusCode });
  }
  
  // Process form...
}
```

### Configuration

**.env.local** (optional):

```bash
# CSRF cookie SameSite policy
CSRF_SAME_SITE=Strict    # Strict, Lax, or None

# Only send cookie over HTTPS
CSRF_SECURE_ONLY=true    # true (production) or false (dev)
```

### Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 403 | `CSRF token missing` | No X-CSRF-Token header or _csrf_token field |
| 403 | `CSRF token invalid` | Token doesn't match stored token |
| 401 | `CSRF token expired` | Token expired after 24 hours |
| 401 | `Unauthorized` | No session_id cookie found |

### Monitoring & Debugging

```bash
# Watch CSRF token generation
grep "CSRF" logs/app.log

# Count validation failures
grep "CSRF.*invalid" logs/app.log | wc -l

# Find problematic client
grep "CSRF.*Token mismatch" logs/app.log | grep "192.168.1.1"
```

---

## Integration Summary

All three security features work together:

```
1. MIDDLEWARE (src/proxy.ts)
   ↓
   ├─ Apply Security Headers (CSP, X-Frame-Options, etc)
   ├─ Check CORS (validate origin, set headers)
   └─ Skip on static assets
   ↓

2. API ROUTES
   ↓
   ├─ Check CSRF token (for POST/PUT/DELETE)
   ├─ Apply Rate Limiting
   ├─ Check Authentication
   └─ Process request
   ↓

3. RESPONSE
   ↓
   ├─ Security headers already set by middleware
   └─ CORS headers already set by middleware
```

---

## Production Checklist

- [ ] Set `NODE_ENV=production` in deployment
- [ ] Set `CORS_ORIGINS` to actual domain(s)
- [ ] Verify HSTS header is present (`curl -i https://api.prod.com`)
- [ ] SSL/TLS certificate configured
- [ ] Database backups enabled
- [ ] Rate limiting thresholds reviewed
- [ ] Logging configured and monitored
- [ ] CSRF tokens generating without errors
- [ ] Test CORS from frontend domain
- [ ] Test CSRF protection on forms
- [ ] Review CSP policy (may need adjustments for CDNs/analytics)

---

## Common Issues & Solutions

### "CORS origin not allowed"

**Problem**: Browser blocks request from frontend

**Solution**:
```bash
# 1. Check allowed origins
grep -r "CORS_ORIGINS" .env*

# 2. Add origin to .env
CORS_ORIGINS=https://new-origin.com,https://existing.com

# 3. Verify in development (automatic)
curl -H "Origin: http://localhost:3001" http://localhost:3000/api/ping
```

### "CSRF token invalid"

**Problem**: Token doesn't match on validation

**Causes**:
- Token expired (>24 hours)
- Wrong session ID
- Token sent from different browser/device
- Multiple API workers (in-memory store issue)

**Solutions**:
```typescript
// 1. Ensure token is fresh (regenerate every page load)
useEffect(() => {
  fetch('/api/csrf').then(r => r.json()).then(data => setToken(data.token));
}, []);

// 2. Check session ID is persistent
// Cookie must have sameSite=lax to work across origins

// 3. For distributed deployments, switch to Redis
// See implementation notes in csrf.ts
```

### CSP blocks scripts/styles

**Problem**: Content Security Policy blocks legitimate resources

**Solution**: Adjust CSP in security-headers.ts

```typescript
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.example.com",
  // Add your CDN domains
].join('; '),
```

---

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Helmet.js Documentation](https://helmet.js.org/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
