import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// ============ VALIDATION SCHEMAS ============

const loginSchema = z.object({
  email: z.string().email('Некорректный email')
});

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  name: z.string().min(2, 'Имя должно быть минимум 2 символа'),
  homeCity: z.enum(['Moscow', 'Lipetsk']).optional(),
  role: z.enum(['Driver', 'Passenger', 'Both']).optional()
});

// ============ ROUTES ============

/**
 * POST /api/auth/login
 * Авторизация по email (упрощённая - без пароля для демо)
 * В реальном приложении здесь будет отправка кода на почту
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email } = loginSchema.parse(req.body);
    
    // Ищем пользователя
    let user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    // Если пользователя нет - создаём нового (auto-register)
    if (!user) {
      const nameFromEmail = email.split('@')[0];
      const capitalizedName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
      
      user = await req.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name: capitalizedName,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          homeCity: 'Moscow',
          role: 'Passenger'
        }
      });
    }
    
    // Генерируем токен
    const token = generateToken(user.id, user.email);
    
    // Возвращаем пользователя и токен
    res.json({
      token,
      user: formatUserResponse(user)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Проверяем, не занят ли email
    const existing = await req.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Создаём пользователя
    const user = await req.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
        homeCity: data.homeCity || 'Moscow',
        role: data.role || 'Passenger'
      }
    });
    
    const token = generateToken(user.id, user.email);
    
    res.status(201).json({
      token,
      user: formatUserResponse(user)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

/**
 * GET /api/auth/me
 * Получить текущего пользователя по токену
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json({ user: formatUserResponse(user) });
    
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// ============ HELPERS ============

function formatUserResponse(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone || '',
    bio: user.bio || '',
    homeCity: user.homeCity,
    role: user.role,
    rating: user.rating,
    defaultPreferences: {
      music: user.prefMusic,
      smoking: user.prefSmoking,
      pets: user.prefPets,
      baggage: user.prefBaggage,
      conversation: user.prefConversation,
      ac: user.prefAc
    }
  };
}

export default router;
