import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + '-refresh';

// Token expiration times
const ACCESS_TOKEN_EXPIRES = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES = '30d'; // 30 days

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface RefreshPayload {
  userId: string;
  type: 'refresh';
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.userId = decoded.userId;

    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isBlocked: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// Generate short-lived access token (15 min)
export const generateAccessToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email } as JwtPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
};

// Generate long-lived refresh token (30 days)
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'refresh' } as RefreshPayload, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  });
};

// Verify refresh token and return userId
export const verifyRefreshToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded.userId;
  } catch {
    return null;
  }
};

// Legacy function for backwards compatibility
export const generateToken = (userId: string, email: string): string => {
  return generateAccessToken(userId, email);
};

// Опциональная авторизация (не возвращает ошибку, если токена нет)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.userId = decoded.userId;
    }

    next();
  } catch {
    // Игнорируем ошибки токена, просто не устанавливаем userId
    next();
  }
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: { accountRole: true, isBlocked: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    if (user.accountRole !== 'admin') {
      return res.status(403).json({ error: 'Требуются права администратора' });
    }

    next();
  } catch {
    return res.status(500).json({ error: 'Ошибка проверки прав доступа' });
  }
};
