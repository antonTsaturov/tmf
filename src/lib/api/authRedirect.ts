/**
 * Кулдаун для редиректов при 401.
 * Предотвращает бесконечный цикл редиректов между /home и /login.
 */

let lastRedirectTime = 0;
const REDIRECT_COOLDOWN = 5000; // 5 секунд

export function canRedirectToLogin(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/login')) return false;

  const now = Date.now();
  if (now - lastRedirectTime > REDIRECT_COOLDOWN) {
    lastRedirectTime = now;
    return true;
  }
  return false;
}

export function redirectToLogin() {
  const currentPath = window.location.pathname + window.location.search;
  window.location.href = `/login?from=${encodeURIComponent(currentPath)}`;
}
