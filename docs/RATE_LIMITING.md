# 🚦 Rate Limiting Configuration

## Overview

Rate limiting protects your API from abuse and DoS (Denial of Service) attacks by limiting the number of requests a client can make within a specified time window. This system uses IP-based rate limiting with different limits for different endpoint types.

## Rate Limit Tiers

### 1. **Authentication Endpoints** (Highest Priority)

**Endpoints**: `/api/auth/login`, `/api/auth/change-password`

| Metric | Value |
|--------|-------|
| Limit | 5 requests |
| Window | 15 minutes |
| Purpose | Prevent brute force attacks |
| Status Code | **429 Too Many Requests** |

**Example**:
```bash
# First 5 requests: OK
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

# 6th request within 15 min: 429 error
HTTP/1.1 429 Too Many Requests
Retry-After: 847
```

### 2. **File Upload** (Medium-High Priority)

**Endpoints**: `/api/documents/upload`, `/api/documents/[id]/versions`

| Metric | Value |
|--------|-------|
| Limit | 20 uploads |
| Window | 1 hour |
| Purpose | Prevent bandwidth exhaustion |
| Status Code | **429 Too Many Requests** |

**Reason**: Upload operations consume significant bandwidth and server resources.

### 3. **Admin Operations** (Medium Priority)

**Endpoints**: `/api/study`, `/api/site`, `/api/users` (create/update)

| Metric | Value |
|--------|-------|
| Limit | 30 requests |
| Window | 15 minutes |
| Purpose | Prevent data flooding |
| Status Code | **429 Too Many Requests** |

### 4. **Document API** (Medium Priority)

**Endpoints**: `/api/documents`, `/api/documents/[id]/actions`

| Metric | Value |
|--------|-------|
| Limit | 100 requests |
| Window | 15 minutes |
| Purpose | Normal API usage limits |
| Status Code | **429 Too Many Requests** |

### 5. **Global API** (Low Priority)

**Endpoints**: All other API routes

| Metric | Value |
|--------|-------|
| Limit | 200 requests |
| Window | 15 minutes |
| Purpose | Catch-all for undefined endpoints |
| Status Code | **429 Too Many Requests** |

## How Rate Limiting Works

### Request Processing

```
1. Client sends request
   ↓
2. Rate limiter checks: IP + endpoint type
   ↓
3. Lookup in memory store: { ip → { count, resetTime } }
   ↓
4a. If count < limit: Increment counter, allow request
   ↓
4b. If count ≥ limit: Return 429 with Retry-After header
   ↓
5. Window expires: Cleanup old entries (hourly)
```

### IP Address Detection

Rate limiting uses client IP address to identify unique clients:

1. **X-Forwarded-For** header (proxy/load balancer)
2. **X-Real-IP** header (reverse proxy)
3. **Connection source IP** (direct connection)

### Memory Store

Currently uses **in-memory store** (resets on server restart).

**For production with multiple servers**, switch to **Redis**:
```typescript
// Production: Use Redis-backed store
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const store = new RedisStore({
  client: redisClient,
  prefix: 'rate-limit',
});
```

## Configuration

### Development Mode

Rate limiting is **disabled in `NODE_ENV=development`** to allow easy testing:

```typescript
skip: (req: any) => process.env.NODE_ENV === 'development',
```

Set `NODE_ENV=production` to enable rate limiting locally.

### Custom Rate Limits

To change rate limit values, edit [src/lib/security/rate-limit-wrapper.ts](../src/lib/security/rate-limit-wrapper.ts):

```typescript
// Example: Increase login limit to 10 attempts
export const RATE_LIMIT_PRESETS = {
  login: {
    limit: 10,  // Changed from 5
    windowMs: 15 * 60 * 1000,
    name: 'login',
  },
  // ... other presets
};
```

## Response Format

When rate limit is exceeded, API returns:

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 847
X-RateLimit-Limit: 5
X-RateLimit-Window-Ms: 900000

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 15 minute(s).",
  "retryAfter": 847
}
```

### Response Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Retry-After` | `847` | Seconds until next request allowed |
| `X-RateLimit-Limit` | `5` | Maximum requests per window |
| `X-RateLimit-Window-Ms` | `900000` | Window size in milliseconds |

## Monitoring & Logging

All rate limit violations are logged:

```
[2026-03-31T10:30:15.123Z] [WARN] LOGIN_RATE_LIMIT_EXCEEDED | {
  "ip": "192.168.1.100",
  "email": "user@example.com",
  "timestamp": "2026-03-31T10:30:15.123Z"
}
```

### View Rate Limit Logs

```bash
# Production
tail -f logs/app.log | grep "RATE_LIMIT"

# Filter by endpoint
grep "LOGIN_RATE_LIMIT_EXCEEDED" logs/app.log

# Count violations per IP
grep "RATE_LIMIT_EXCEEDED" logs/app.log | grep -o '"ip":"[^"]*"' | sort | uniq -c
```

## Best Practices

### ✅ Do

- [x] Set appropriate limits based on endpoint criticality
- [x] Use stricter limits for auth endpoints
- [x] Monitor rate limit violations for attacks
- [x] Provide clear error messages to users
- [x] Use Redis in production for distributed systems
- [x] Include `Retry-After` header in responses
- [x] Log all rate limit violations for security

### ❌ Don't

- [x] Use same limit for all endpoint types
- [x] Disable rate limiting in production
- [x] Store rates in memory for multi-server deployments
- [x] Fail silently on rate limit violations
- [x] Return unhelpful error messages

## Troubleshooting

### "Too many requests" error during testing

**Cause**: Rate limit active in production mode

**Solution**: 
```bash
# Set to development (rate limiting disabled)
export NODE_ENV=development
npm run dev

# OR manually test with delays
curl http://localhost:3000/api/documents...
# Wait > 15 seconds before next request in production mode
```

### Rate limits not working

**Possible causes**:
1. `NODE_ENV` is set to `development`
2. In-memory store lost after restart
3. Client IP detection issues

**Check**:
```bash
# Verify NODE_ENV
echo $NODE_ENV  # Should be 'production'

# Check logs for rate limit entries
grep "RATE_LIMIT" logs/app.log
```

### High false positives (legitimate users being blocked)

**Solution**: Increase limits or use user-based rate limiting (vs IP-based):

```typescript
// Instead of IP-based, use authenticated user ID
function getKey(req: NextRequest): string {
  const auth = await checkAuth(req);
  if (auth.authenticated) {
    return auth.payload?.id || getClientIp(req);
  }
  return getClientIp(req);
}
```

## Examples

### Login with Rate Limiting

```bash
# Attempt 1-5: Success
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@mail.com","password":"pass"}'

# Attempt 6-15 (within 15 min): 429 Too Many Requests
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 15 minute(s).",
  "retryAfter": 823
}
```

### File Upload with Rate Limiting

```bash
# Uploads 1-20: Success
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/documents/upload \
    -F "file=@document$i.pdf" \
    -F "documentName=Doc $i" \
    -F "folderId=folder123" \
    -F "studyId=1"
done

# Upload 21 (within 1 hour): 429 Too Many Requests
# Retry-After: 3542 (seconds remaining in 1-hour window)
```

## Future Enhancements

- [ ] Redis-backed store for distributed systems
- [ ] User-based rate limiting (per authenticated user ID)
- [ ] Dynamic rate limits based on server load
- [ ] Whitelist/blacklist of IP addresses
- [ ] Rate limit status endpoint (`GET /api/status/rate-limits`)
- [ ] Metrics dashboard for rate limit violations

## Related Documentation

- [Security Configuration](./SECURITY.md)
- [Logging Guide](./LOGGING.md)
- [Production Checklist](./DONE.txt)
- [API Documentation](./API.md)
