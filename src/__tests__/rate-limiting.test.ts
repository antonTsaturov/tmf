/**
 * Rate Limiting Tests
 * 
 * Tests for:
 * - Login rate limiting (5 per 15 min)
 * - Change password rate limiting (10 per hour)
 * - Upload rate limiting (20 per hour)
 * - Document API rate limiting (100 per 15 min)
 * - Global rate limiting (200 per 15 min)
 */

//import { RATE_LIMITS } from '@/lib/rate-limit';
import { RATE_LIMIT_PRESETS as RATE_LIMITS } from '@/lib/rate-limit-wrapper';

describe('Rate Limiting - Configuration', () => {
  describe('RATE_LIMITS', () => {
    it('should have login limit of 5 requests per 15 minutes', () => {
      expect(RATE_LIMITS.login.limit).toBe(5);
      expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMITS.login.window).toBe('15m');
    });

    it('should have change password limit of 10 requests per hour', () => {
      expect(RATE_LIMITS.changePassword.limit).toBe(10);
      expect(RATE_LIMITS.changePassword.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMITS.changePassword.window).toBe('1h');
    });

    it('should have upload limit of 20 requests per hour', () => {
      expect(RATE_LIMITS.upload.limit).toBe(20);
      expect(RATE_LIMITS.upload.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMITS.upload.window).toBe('1h');
    });

    it('should have document API limit of 100 requests per 15 minutes', () => {
      expect(RATE_LIMITS.documentApi.limit).toBe(100);
      expect(RATE_LIMITS.documentApi.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMITS.documentApi.window).toBe('15m');
    });

    it('should have global limit of 200 requests per 15 minutes', () => {
      expect(RATE_LIMITS.global.limit).toBe(200);
      expect(RATE_LIMITS.global.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMITS.global.window).toBe('15m');
    });

    it('should have admin limit of 30 requests per 15 minutes', () => {
      expect(RATE_LIMITS.admin.limit).toBe(30);
      expect(RATE_LIMITS.admin.windowMs).toBe(15 * 60 * 1000);
    });
  });

  describe('Rate Limit Values', () => {
    it('should have login as most restrictive', () => {
      expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.documentApi.limit);
      expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.global.limit);
    });

    it('should have upload and changePassword with longer windows', () => {
      expect(RATE_LIMITS.upload.windowMs).toBe(60 * 60 * 1000);
      expect(RATE_LIMITS.changePassword.windowMs).toBe(60 * 60 * 1000);
    });
  });
});
