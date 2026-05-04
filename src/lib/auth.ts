export const AUTH_TOKEN_KEY = 'brazukaflow.auth.token';
export const AUTH_USER_KEY = 'brazukaflow.auth.user';

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
