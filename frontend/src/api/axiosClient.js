import axios from 'axios';

const AUTH_STORAGE_KEY = 'bankingAuthHeader';

let authHeader = sessionStorage.getItem(AUTH_STORAGE_KEY);

export function setAuthCredentials(username, password) {
  if (!username || !password) {
    authHeader = null;
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  authHeader = `Basic ${btoa(`${username}:${password}`)}`;
  sessionStorage.setItem(AUTH_STORAGE_KEY, authHeader);
}

export function clearAuthCredentials() {
  authHeader = null;
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

const axiosClient = axios.create({
  baseURL: 'http://10.235.21.132:7080',
  headers: {
    Accept: 'application/json'
  }
});

axiosClient.interceptors.request.use((config) => {
  const storedHeader = authHeader || sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (storedHeader) {
    config.headers.Authorization = storedHeader;
  }

  return config;
});

export default axiosClient;