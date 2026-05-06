// app/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './ResetPasswordPage.module.css';
import { logger } from '@/lib/utils/logger';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(10);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  //const [tokenTimeLeft, setTokenTimeLeft] = useState('');

  // Validate token on page load
  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
          method: 'GET',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          logger.warn('Invalid reset token', { token: token.substring(0, 20) + '...', status: response.status, error: data.error });
          setInvalidToken(true);
        } else {
          const data = await response.json();
          if (data.expiresAt) {
            setTokenExpiresAt(data.expiresAt);
          }
        }
      } catch (err) {
        logger.error('Failed to validate reset token', err);
        setInvalidToken(true);
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  // Token expiry countdown
  useEffect(() => {
    if (!tokenExpiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = tokenExpiresAt - now;

      if (diff <= 0) {
        //setTokenTimeLeft('Expired');
        setInvalidToken(true);
        return;
      }

      // const minutes = Math.floor(diff / 60000);
      // const seconds = Math.floor((diff % 60000) / 1000);
      //setTokenTimeLeft(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [tokenExpiresAt]);

  // Countdown timer for invalid token redirect
  useEffect(() => {
    if (!invalidToken || validatingToken) return;

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [invalidToken, validatingToken]);

  // Redirect when countdown reaches 0
  useEffect(() => {
    if (redirectCountdown <= 0 && invalidToken && !validatingToken) {
      router.push('/login');
    }
  }, [redirectCountdown, invalidToken, validatingToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      logger.error('Failed to reset password', err, { email: 'unknown' });
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <span className={styles.exploreText}>Explor</span>
              <span className={styles.etmfText}>eTMF</span>
            </h2>
            <p className={styles.subtitle}>Reset Password</p>
          </div>
          <div className={styles.loadingState}>
            <svg className={styles.spinner} viewBox="0 0 24 24">
              <circle className={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className={styles.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className={styles.loadingText}>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <span className={styles.exploreText}>Explor</span>
              <span className={styles.etmfText}>eTMF</span>
            </h2>
            <p className={styles.subtitle}>Reset Password</p>
          </div>

          <div className={styles.errorState}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.errorIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className={styles.errorText}>
              This password reset link has expired or is invalid.
            </p>
            <p className={styles.redirectCountdown}>
              You will be redirected to the login page in <strong>{redirectCountdown}</strong> {redirectCountdown === 1 ? 'second' : 'seconds'}.
            </p>
            <Link href="/login" className={styles.backLink}>
              Go to Sign in now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <span className={styles.exploreText}>Explor</span>
              <span className={styles.etmfText}>eTMF</span>
            </h2>
            <p className={styles.subtitle}>Reset Password</p>
          </div>

          <div className={styles.successState}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.successIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={styles.successText}>
              Your password has been reset successfully!
            </p>
            <p className={styles.redirectText}>
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <p className={styles.subtitle}>
            Reset Password Form
          </p>
          {/* {tokenTimeLeft && !validatingToken && (
            <p className={styles.tokenExpiry}>
              Token expires in <strong>{tokenTimeLeft}</strong>
            </p>
          )} */}
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>{error}</div>
            </div>
          )}

          <div className={styles.inputGroup}>
            {/* New Password */}
            <div className={styles.inputWrapper}>
              <label htmlFor="new-password" className={styles.srOnly}>
                New Password
              </label>
              <input
                id="new-password"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${styles.input} ${styles.inputTop}`}
                placeholder="New Password"
                disabled={loading}
                minLength={8}
              />
            </div>

            {/* Confirm Password */}
            <div className={styles.inputWrapper}>
              <label htmlFor="confirm-password" className={styles.srOnly}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${styles.input} ${styles.inputBottom}`}
                placeholder="Confirm Password"
                disabled={loading}
                minLength={8}
              />
            </div>
          </div>

          {/* Show Password Toggle */}
          <div className={styles.showPasswordToggle}>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.showPasswordButton}
              disabled={loading}
            >
              {showPassword ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.toggleIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  <span>Hide passwords</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.toggleIcon}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Show passwords</span>
                </>
              )}
            </button>
          </div>

          {/* Submit Button */}
          <div className={styles.submitContainer}>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <span className={styles.buttonContent}>
                  <svg className={styles.spinner} viewBox="0 0 24 24">
                    <circle className={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className={styles.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>

          {/* Back to Login */}
          <div className={styles.backLinkContainer}>
            <p className={styles.backText}>
              Remember your password?{' '}
              <Link href="/login" className={styles.backLink}>
                Back to Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
