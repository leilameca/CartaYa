export const SESSION_MODE_COOKIE = "cartaya-session-mode";
export const REMEMBER_ME_MAX_AGE = 400 * 24 * 60 * 60;

export function withoutPersistence<T extends { maxAge?: number; expires?: Date }>(options: T) {
  const sessionOptions = { ...options };
  delete sessionOptions.maxAge;
  delete sessionOptions.expires;
  return sessionOptions;
}
