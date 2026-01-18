import { GoogleGenAI } from "@google/genai";

// Initialize Gemini with Vite environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAssistantResponse = async (userPrompt: string): Promise<string> => {
  if (!ai) {
    return "ИИ-помощник не настроен. Добавьте VITE_GEMINI_API_KEY в переменные окружения.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userPrompt,
      config: {
        systemInstruction: `Ты помощник для приложения NLMKblablaCAR (корпоративный карпулинг НЛМК).
Приложение соединяет Москву и Липецк.
Твой тон — дружелюбный, полезный и четкий. Отвечай на русском языке.
Ответы должны быть краткими (до 50 слов).
Если спрашивают о погоде, давай типичный прогноз для региона.
Если просят комментарий к поездке, предлагай дружелюбные, профессиональные варианты.
Если спрашивают о приложении, объясни что это сервис для совместных поездок сотрудников НЛМК между Москвой и Липецком.`
      }
    });

    return response.text || "Извини, не расслышал. Попробуй еще раз?";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Связь нестабильна. Попробуйте позже.";
  }
};
