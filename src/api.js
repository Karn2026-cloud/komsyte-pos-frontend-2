// src/api.js
import axios from 'axios'; // ✅ Import axios only once

const API_URL = process.env.REACT_APP_API_URL || 'https://komsyte-backend.onrender.com';

const API = axios.create({
  baseURL: API_URL,
});

// Add your token interceptor here if you have one
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});


export default API;
