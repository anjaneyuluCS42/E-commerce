import apiClient from '../api/client';

export interface ChatResponse {
  text: string;
  suggestions?: string[];
}

/**
 * Fetches the chatbot response from the FastAPI backend.
 */
export const fetchMockChatResponse = async (message: string): Promise<ChatResponse> => {
  try {
    const response = await apiClient.post<ChatResponse>('/ai/chat', { message });
    return response.data;
  } catch (error) {
    console.error('Error fetching chat response from backend:', error);
    throw error;
  }
};
