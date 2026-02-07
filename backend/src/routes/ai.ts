import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const log = createLogger('ai');

// Initialize Gemini AI (only if API key is available)
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// System prompt for the assistant
const SYSTEM_PROMPT = `Ты помощник для приложения NLMKblablaCAR (корпоративный карпулинг НЛМК).
Приложение соединяет Москву и Липецк.
Твой тон — дружелюбный, полезный и четкий. Отвечай на русском языке.
Ответы должны быть краткими (до 50 слов).
Если спрашивают о погоде, давай типичный прогноз для региона.
Если просят комментарий к поездке, предлагай дружелюбные, профессиональные варианты.
Если спрашивают о приложении, объясни что это сервис для совместных поездок сотрудников НЛМК между Москвой и Липецком.`;

// Validation schema
const assistantSchema = z.object({
  prompt: z.string().min(1, 'Промпт обязателен').max(1000, 'Промпт слишком длинный'),
});

/**
 * POST /api/ai/assistant
 * Get AI assistant response
 */
router.post('/assistant', optionalAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const { prompt } = assistantSchema.parse(req.body);

    // Check if AI is configured
    if (!ai) {
      return res.status(503).json({
        error: 'ИИ-помощник не настроен',
        response: 'ИИ-помощник временно недоступен. Попробуйте позже.',
      });
    }

    // Generate response
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const text = response.text || 'Извини, не расслышал. Попробуй еще раз?';

    res.json({ response: text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }

    log.error({ err: error }, 'AI Assistant error');
    res.status(500).json({
      error: 'Ошибка генерации ответа',
      response: 'Связь нестабильна. Попробуйте позже.',
    });
  }
});

export default router;
