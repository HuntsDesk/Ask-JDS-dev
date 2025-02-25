export const COOKIE_OPTIONS = {
  name: 'supabase-auth',
  lifetime: 60 * 60 * 8,
  domain: window.location.hostname,
  path: '/',
  sameSite: 'lax' as const
};

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid login credentials',
  EMAIL_IN_USE: 'Email already registered',
  WEAK_PASSWORD: 'Password is too weak',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN: 'An unknown error occurred'
}; 