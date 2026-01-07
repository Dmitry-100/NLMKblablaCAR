import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: In a real app, strict error handling for missing key. 
// For this demo, we assume the environment is set up correctly as per prompt instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'mock-key' });

export const generateAssistantResponse = async (userPrompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: `Ты помощник для приложения NLMKblablaCAR (корпоративный карпулинг НЛМК). 
        Приложение соединяет Москву и Липецк. 
        Твой тон — дружелюбный, полезный и четкий. Отвечай на русском языке.
        Ответы должны быть краткими (до 50 слов). 
        Если спрашивают о погоде, давай типичный прогноз для региона.
        Если просят комментарий к поездке, предлагай дружелюбные, профессиональные варианты.`
      }
    });
    
    return response.text || "Извини, не расслышал. Попробуй еще раз?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Связь нестабильна. Попробуйте позже.";
  }
};