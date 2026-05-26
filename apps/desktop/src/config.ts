// Render cloud server URL - no local setup needed!
const RENDER_URL = 'https://codebuddy-overlay-1.onrender.com';
const LOCAL_URL = 'http://localhost:8000';

// Use Render in production, local in dev
export const API_URL = window.location.protocol === 'file:' 
  ? RENDER_URL  // packaged .exe uses Render
  : (import.meta.env.DEV ? LOCAL_URL : RENDER_URL);

export default API_URL;
