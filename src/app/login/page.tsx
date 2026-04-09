// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './LoginPage.module.css';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'v0.0.0-dev';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Перенаправление после успешного входа
      //router.refresh();
      //router.push('/');
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotEmailError('');
    
    if (!EMAIL_REGEX.test(forgotEmail)) {
      setForgotEmailError('Please enter a valid email address');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setForgotSuccess(true);
    } catch (err: any) {
      setForgotEmailError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotEmailError('');
    setForgotSuccess(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Заголовок */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.exploreText}>Explor</span>
            <span className={styles.etmfText}>eTMF</span>
          </h2>
          {/* <p className={styles.subtitle}>
            Sign in
          </p> */}
        </div>

        {/* Форма */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <div className={styles.errorContainer}>
              <div className={styles.errorMessage}>{error}</div>
            </div>
          )}

          <div className={styles.inputGroup}>
            {/* Поле Email */}
            <div className={styles.inputWrapper}>
              <label htmlFor="email" className={styles.srOnly}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${styles.input} ${styles.inputTop}`}
                placeholder="Email"
                disabled={loading}
              />
            </div>

            {/* Поле Password */}
            <div className={styles.inputWrapper}>
              <label htmlFor="password" className={styles.srOnly}>
                Password
              </label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.input} ${styles.inputBottom} ${password.length > 0 && 'withText'}`}
                  placeholder="Password"
                  disabled={loading}
                  style={{letterSpacing: password.length > 0 ? '2px' : 'normal'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.toggleIcon}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.toggleIcon}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Дополнительные опции */}
          <div className={styles.options}>

            <div className={styles.forgotPassword}>
              <button
                type="button"
                className={styles.forgotLink}
                onClick={() => setShowForgotModal(true)}
              >
                Forgot your password?
              </button>
            </div>
          </div>

          {/* Кнопка Submit */}
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
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Ссылка на регистрацию */}
          <div className={styles.registerLinkContainer}>
            <p className={styles.registerText}>
              Trouble with account access?{' '}
              <Link href="#" className={styles.registerLink}>
                Contact administrator
              </Link>
            </p>
          </div>
        </form>

        {/* Информация о системе */}
        <div className={styles.footer}>
          <div className={styles.footerText}>
            <p>© {new Date().getFullYear()} ExploreTMF System</p>
            <p className={styles.footerVersion}>ver. {APP_VERSION} • Secure access required</p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className={styles.modalOverlay} onClick={closeForgotModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Reset Password</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeForgotModal}
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.closeIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!forgotSuccess ? (
              <form className={styles.modalForm} onSubmit={handleForgotPassword}>
                <p className={styles.modalDescription}>
                  Enter your email address and we'll send you instructions to reset your password.
                </p>

                {forgotEmailError && (
                  <div className={styles.modalError}>
                    {forgotEmailError}
                  </div>
                )}

                <div className={styles.modalInputWrapper}>
                  <label htmlFor="forgot-email" className={styles.srOnly}>
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={styles.modalInput}
                    placeholder="Enter your email"
                    disabled={forgotLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={styles.modalSubmitButton}
                >
                  {forgotLoading ? (
                    <span className={styles.buttonContent}>
                      <svg className={styles.spinner} viewBox="0 0 24 24">
                        <circle className={styles.spinnerCircle} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className={styles.spinnerPath} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Remind Password'
                  )}
                </button>
              </form>
            ) : (
              <div className={styles.modalSuccess}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.successIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={styles.successText}>
                  Password reset instructions have been sent to <strong>{forgotEmail}</strong>
                </p>
                <button
                  type="button"
                  className={styles.modalSubmitButton}
                  onClick={closeForgotModal}
                >
                  Back to Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}