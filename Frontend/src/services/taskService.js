import api from '../api/client';

const taskService = {
  // Start the test hello task
  startTestTask: async (name) => {
    try {
      const response = await api.post('/tasks/test-hello', { name });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload products CSV and trigger import background task
  importProductsCsv: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Check the status of any task
  checkStatus: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Retrieve the result of a completed task
  getResult: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/result`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel/Revoke a running task
  cancelTask: async (taskId) => {
    try {
      const response = await api.post(`/tasks/${taskId}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default taskService;
