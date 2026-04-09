// src/app/api/documents/upload/allowed-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllowedFileTypes } from '@/lib/security/file-security';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/documents/upload/allowed-types
 * Returns information about allowed file types and size limits
 * Useful for frontend to show users what can be uploaded
 */
export async function GET(_request: NextRequest) {
  try {
    const allowedTypes = getAllowedFileTypes();
    
    logger.apiLog('GET', '/api/documents/upload/allowed-types', 200, {
      extensions: allowedTypes.extensions.length,
      mimeTypes: allowedTypes.mimeTypes.length,
      maxSizeMB: allowedTypes.maxSizeMB,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          allowedExtensions: allowedTypes.extensions,
          allowedMimeTypes: allowedTypes.mimeTypes,
          maxFileSize: allowedTypes.maxSizeMB * 1024 * 1024,
          maxFileSizeMB: allowedTypes.maxSizeMB,
          message: `Allowed file types: ${allowedTypes.extensions.join(', ')}. Maximum file size: ${allowedTypes.maxSizeMB}MB`,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } } // Cache for 1 hour
    );
  } catch (error) {
    logger.error('Error getting allowed file types', error instanceof Error ? error : null);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve allowed file types',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  });
}
