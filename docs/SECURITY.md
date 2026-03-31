# 🔐 Security Configuration Guide

## Overview

This application includes environment variable validation to ensure all required secure configuration is properly set before the application starts. This prevents security issues from misconfigurations going unnoticed.

## Environment Variables

### Required for Runtime

The following environment variables **MUST** be set:

#### `JWT_SECRET`
- **Type**: String  
- **Length**: Minimum 32 characters for production
- **Purpose**: Secret key for signing JWT authentication tokens
- **Generate**: `openssl rand -base64 32`
- **Security**: Never use the default value in production
- **Scope**: Server-side only, never expose to client

**Example**:
```bash
JWT_SECRET=8ede27a25aef90cee60a69bc478d4280aa4830302eb7d162cd91ebe3b30ede9e
```

#### `DATABASE_URL`
- **Type**: PostgreSQL connection string
- **Format**: `postgresql://user:password@host:port/database`
- **Purpose**: Connection to PostgreSQL database
- **Security**: Store password securely, never commit to version control
- **Scope**: Server-side only

**Example**:
```bash
DATABASE_URL=postgresql://appuser:secretpassword@db.example.com:5432/myapp
```

#### `YC_IAM_KEY_PATH`
- **Type**: File path (relative to project root)
- **Format**: Path to Yandex Cloud IAM service account JSON key
- **Purpose**: Authenticating with Yandex Cloud Object Storage
- **Security**: Keep key file private, add to .gitignore
- **Scope**: Server-side only

**Example**:
```bash
YC_IAM_KEY_PATH=./ya_cloud-iam_key.json
```

#### `NODE_ENV`
- **Type**: Enum
- **Values**: `development` | `production` | `test`
- **Default**: `production`
- **Purpose**: Sets application runtime mode
- **Security**: Must be `production` in production deployments

**Example**:
```bash
NODE_ENV=production
```

### Optional Client-side

#### `NEXT_PUBLIC_API_BASE_URL`
- **Type**: URL
- **Default**: `http://localhost:3000`
- **Purpose**: Base URL for API calls from client
- **Note**: Visible to client, don't put sensitive data

## Setup Instructions

### 1. Development Environment

Create `.env.local` file in project root:

```bash
# Copy template
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Generate strong JWT_SECRET**:
```bash
openssl rand -base64 32
```

### 2. Production Environment

Use a secure secrets management system:

- **AWS**: AWS Secrets Manager or Parameter Store
- **Google Cloud**: Secret Manager
- **Azure**: Key Vault
- **HashiCorp**: Vault
- **Docker**: Docker Secrets
- **Kubernetes**: Secrets API + sealed-secrets or external-secrets

**Set environment variables before running**:
```bash
# Option 1: Kubernetes secrets
kubectl create secret generic app-secrets \
  --from-literal=JWT_SECRET=... \
  --from-literal=DATABASE_URL=... \
  --from-literal=YC_IAM_KEY_PATH=...

# Option 2: systemd environment file
export $(cat /etc/app/.env.prod | xargs)
npm start

# Option 3: Docker environment file
docker run --env-file /run/secrets/.env.prod ...
```

## Validation Process

### Automatic Validation

Environment variables are validated automatically when:
1. Running `npm run build`
2. Starting `npm run dev`
3. Running `npm start`

The validation:
- ✅ Checks all required variables are set
- ✅ Validates JWT_SECRET minimum length (32 chars)
- ✅ Validates DATABASE_URL format
- ✅ Validates NODE_ENV value
- ❌ Fails fast with clear error messages if validation fails

### Error Messages

The validator provides helpful error messages:

```
═══════════════════════════════════════════════════════════════════════════
🚨 ENVIRONMENT VALIDATION FAILED
═══════════════════════════════════════════════════════════════════════════

❌ JWT_SECRET contains default value. Must set a strong random string
⚠️  DATABASE_URL should use strong passwords

═══════════════════════════════════════════════════════════════════════════
📝 Create .env.local with required variables:
═══════════════════════════════════════════════════════════════════════════
```

## Security Best Practices

### ✅ Do

- [x] Use random, strong secrets (minimum 32 characters)
- [x] Rotate secrets regularly (quarterly recommended)
- [x] Use different secrets for dev/staging/production
- [x] Store secrets in dedicated secret management system
- [x] Log secret names but never their values
- [x] Audit who has access to secrets
- [x] Enable secret rotation in your secret manager

### ❌ Don't

- [x] Never commit `.env.local` to version control
- [x] Never use default values in production
- [x] Never share secrets in chat/email/docs
- [x] Never hardcode secrets in source code
- [x] Never log full secret values (only hashes/checksums)
- [x] Never use weak passwords (<32 characters for JWT)
- [x] Never expose YC_IAM_KEY_PATH file to public

## Files and Imports

### Environment Validation Module

**File**: [src/lib/env.ts](../src/lib/env.ts)

This module:
- Validates all environment variables on import
- Exports `ENV` object with validated configuration
- Exits immediately if validation fails
- Runs at build-time and runtime

**Usage**:
```typescript
import { ENV } from '@/lib/env';

const jwtSecret = ENV.JWT_SECRET;
const dbUrl = ENV.DATABASE_URL;
const iamKeyPath = ENV.YC_IAM_KEY_PATH;
```

### Auth Service

**File**: [src/lib/auth/auth.service.ts](../src/lib/auth/auth.service.ts)

Updated to use validated JWT_SECRET:
```typescript
import { ENV } from '@/lib/env';
const JWT_SECRET = ENV.JWT_SECRET;
```

### Yandex Cloud IAM

**File**: [src/lib/yc-iam.ts](../src/lib/yc-iam.ts)

Updated to use validated IAM key path:
```typescript
import { ENV } from '@/lib/env';
fs.readFileSync(ENV.YC_IAM_KEY_PATH, 'utf8')
```

## Troubleshooting

### "JWT_SECRET is not set"

**Cause**: Missing JWT_SECRET in environment

**Solution**:
```bash
# 1. Generate a new secret
openssl rand -base64 32

# 2. Add to .env.local
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local

# 3. Verify
npm run build
```

### "DATABASE_URL is not set"

**Cause**: Missing DATABASE_URL in environment

**Solution**:
```bash
# Add valid PostgreSQL connection string to .env.local
echo "DATABASE_URL=postgresql://user:pass@host:5432/db" >> .env.local
```

### "JWT_SECRET should be at least 32 characters"

**Cause**: JWT_SECRET is too short

**Solution**:
```bash
# Generate new 32+ character secret
openssl rand -base64 32

# Update .env.local with new value
```

## Related Documentation

- [Environment Setup](./SETUP.md)
- [Logging Guide](./LOGGING.md)
- [Production Checklist](./DONE.txt)
- [Security Audit](./SECURITY_AUDIT.md)
