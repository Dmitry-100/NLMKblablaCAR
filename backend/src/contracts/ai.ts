import { z } from 'zod';

export const assistantSchema = z.object({
  prompt: z.string().min(1, 'Промпт обязателен').max(1000, 'Промпт слишком длинный'),
});

export const assistantResponseSchema = z.object({
  response: z.string(),
});

export const assistantErrorResponseSchema = z.object({
  error: z.string(),
  response: z.string().optional(),
});

export type AssistantInput = z.infer<typeof assistantSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
export type AssistantErrorResponse = z.infer<typeof assistantErrorResponseSchema>;
