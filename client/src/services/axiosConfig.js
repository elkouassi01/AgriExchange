import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // envoie automatiquement le cookie httpOnly
  timeout: 10000,
});

export default api;
