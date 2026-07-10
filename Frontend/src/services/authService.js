const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authService = {
  register: async (username, email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      throw error?.detail || error?.message || 'Registration failed';
    }
  },

  login: async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw data;
      }

      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        
        try {
          const payloadBase64 = data.access_token.split('.')[1];
          const decodedPayload = JSON.parse(atob(payloadBase64));
          const userEmail = decodedPayload.sub;
          const userRole = decodedPayload.role;
          const userId = decodedPayload.id;
          const userName = decodedPayload.username;
          if (userEmail) {
            const userObj = { 
              email: userEmail, 
              role: userRole, 
              id: userId, 
              username: userName 
            };
            localStorage.setItem('user', JSON.stringify(userObj));
            data.user = userObj;
          }
        } catch (jwtError) {
          console.error('Failed to decode JWT token:', jwtError);
        }
      }

      return data;
    } catch (error) {
      throw error?.detail || error?.message || 'Login failed';
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  },

  getUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
      localStorage.removeItem('user');
      return null;
    }
  },
};

export default authService;