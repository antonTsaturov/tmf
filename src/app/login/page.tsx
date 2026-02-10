// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Перенаправление после успешного входа
      router.push('/dashboard');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Заголовок */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            Sign in to eTMF
          </h2>
          {/* <p className={styles.subtitle}>
            Manpremo eTMF System
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
                placeholder="Email address"
                disabled={loading}
              />
            </div>

            {/* Поле Password */}
            <div className={styles.inputWrapper}>
              <label htmlFor="password" className={styles.srOnly}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${styles.inputBottom} ${password.length > 0 && 'withText'}`}
                placeholder="Password"
                disabled={loading}
                style={{letterSpacing: password.length > 0 ? '2px' : 'normal'}}
              />
            </div>
          </div>

          {/* Дополнительные опции */}
          <div className={styles.options}>
            <div className={styles.rememberMe}>
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkbox}
                disabled={loading}
              />
              <label htmlFor="remember-me" className={styles.checkboxLabel}>
                Remember me
              </label>
            </div>

            <div className={styles.forgotPassword}>
              <Link 
                href="#" 
                className={styles.forgotLink}
              >
                Forgot your password?
              </Link>
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
              Don't have an account?{' '}
              <Link href="#" className={styles.registerLink}>
                Contact administrator
              </Link>
            </p>
          </div>
        </form>

        {/* Информация о системе */}
        <div className={styles.footer}>
          <div className={styles.footerText}>
            <p>© {new Date().getFullYear()} Manpremo eTMF System</p>
            <p className={styles.footerVersion}>ver. beta • Secure access required</p>
          </div>
        </div>
      </div>
    </div>
  );
}