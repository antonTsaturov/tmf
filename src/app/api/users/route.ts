// app/api/users/route.ts
import { StudyApiHandler } from '@/app/api/base';
import { NextRequest, NextResponse } from 'next/server';
import { Tables } from '@/lib/db/schema';
import { getPool } from '@/lib/db';
import { NotificationService } from '@/services/notification.service';
import { AuthService } from '@/lib/auth/auth.service';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';

// Создаем экземпляр класса
const studyApiHandler = new StudyApiHandler();

export async function GET(_request?: NextRequest) {
  return studyApiHandler.getTable(Tables.USERS);
}

export async function POST(request: NextRequest) {
  try {
    // Read the request body once
    const data = await request.json();

    if (!data.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );

    const userExists = rows.length > 0;

    // If creating a new user (user doesn't exist)
    if (!userExists) {
      // Generate a temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await AuthService.hashPassword(tempPassword);

      // Create user data with hashed password
      const createData = {
        ...data,
        password_hash: hashedPassword,
      };

      // Create a new Request object with the updated body
      const newRequest = new NextRequest(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(createData),
      });

      // Call the base handler to create the user
      const response = await studyApiHandler.createOrUpdateTable(Tables.USERS, newRequest);

      // Send welcome email with login instructions
      const emailSent = await NotificationService.sendWelcomeEmail(
        data.email,
        data.name || data.email,
        tempPassword
      );

      if (emailSent) {
        logger.info(`Welcome email sent to ${data.email}`);
      } else {
        logger.warn(`Failed to send welcome email to ${data.email}`);
      }

      return response;
    }

    // Updating existing user — create a new request since the body was already consumed
    const updateRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(data),
    });
    return await studyApiHandler.createOrUpdateTable(Tables.USERS, updateRequest);
  } catch (error) {
    logger.error('Error in users POST handler:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  return studyApiHandler.deleteRecord(Tables.USERS, request);
}
