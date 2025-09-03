import axios from 'axios';

// This line automatically chooses the correct backend URL.
// It uses an environment variable first, and if that's not available,
// it now falls back to your LIVE backend URL.

// ✅ UPDATED THIS LINE
const API_URL = process.env.REACT_APP_API_URL || 'https://komsyte-backend.onrender.com';

const API = axios.create({
  baseURL: API_URL,
});

// This "interceptor" automatically adds your login token to every request.
// This is more secure and cleaner than adding it manually everywhere.
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
