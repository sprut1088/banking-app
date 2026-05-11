import axios from 'axios';

let authHeader = null;

export function setAuthCredentials(username, password) {
  if (!username || !password) {
    authHeader = null;
    return;
  }
  authHeader = `Basic ${btoa(`${username}:${password}`)}`;
}

const axiosClient = axios.create({
  baseURL: 'http://10.235.21.132:7080'
});

axiosClient.interceptors.request.use((config) => {
  if (authHeader) {
    config.headers.Authorization = authHeader;
  }
  return config;
});

export default axiosClient;
