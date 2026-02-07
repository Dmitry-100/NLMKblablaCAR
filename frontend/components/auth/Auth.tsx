import React, { useState } from 'react';
import { Car, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { APP_NAME } from '../../constants';
import { TelegramLoginButton, TelegramAuthData } from './TelegramLoginButton';

// Bot username from environment or default
const TELEGRAM_BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SteelBlaBlaCarBot';

interface AuthProps {
  onLogin: (email: string) => void;
  onTelegramLogin: (data: TelegramAuthData) => void;
  loading: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onTelegramLogin, loading }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) {
      onLogin(email);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float delay-1000"></div>

      <div className="z-10 w-full max-w-sm text-center">
        <div className="mb-8 inline-block p-4 bg-white/50 rounded-full backdrop-blur-md shadow-lg">
          <Car size={48} className="text-sky-500" />
        </div>
        <h1 className="text-4xl font-light text-slate-800 mb-2">{APP_NAME}</h1>
        <p className="text-slate-500 mb-8">Поездки между Москвой и Липецком</p>

        <Card className="text-center">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Авторизация...</p>
            </div>
          ) : showEmailForm ? (
            <form onSubmit={handleEmailSubmit} className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Корпоративная почта
              </label>
              <input
                type="email"
                required
                placeholder="name@nlmk.com"
                className="w-full p-3 bg-gray-50 rounded-xl mb-4 focus:ring-2 focus:ring-sky-200 outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Button className="w-full mb-3" type="submit">
                Войти
              </Button>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                ← Назад
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Войдите через Telegram для быстрого доступа и уведомлений
              </p>

              {/* Telegram Login Widget */}
              <TelegramLoginButton
                botName={TELEGRAM_BOT_NAME}
                onAuth={onTelegramLogin}
                buttonSize="large"
                cornerRadius={12}
              />

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-400">или</span>
                </div>
              </div>

              {/* Email login option */}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowEmailForm(true)}
              >
                <Mail size={18} />
                Войти по email
              </Button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-xs text-gray-400">
          Для сотрудников НЛМК
        </p>
      </div>
    </div>
  );
};
