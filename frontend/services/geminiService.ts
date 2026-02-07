/**
 * AI Assistant Service
 * Calls backend API which securely handles Gemini API key
 */
import type { AssistantError, AssistantResult } from '../contracts/ai';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const generateAssistantResponse = async (userPrompt: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: userPrompt }),
    });

    const data = (await response.json()) as AssistantResult | AssistantError;

    if (!response.ok) {
      return 'response' in data && data.response
        ? data.response
        : 'Связь нестабильна. Попробуйте позже.';
    }

    return 'response' in data ? data.response : 'Извини, не расслышал. Попробуй еще раз?';
  } catch (error) {
    console.error('AI Assistant Error:', error);
    return 'Связь нестабильна. Попробуйте позже.';
  }
};
