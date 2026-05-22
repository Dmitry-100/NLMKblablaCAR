import React from 'react';
import { Car, KeyRound } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { APP_NAME } from '../../constants';
import { TelegramLoginButton, TelegramAuthData } from './TelegramLoginButton';

// Bot username from environment or default
const TELEGRAM_BOT_NAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SteelBlaBlaCarBot';
const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

interface AuthProps {
  onTelegramLogin: (data: TelegramAuthData) => void;
  onDevLogin?: () => void | Promise<void>;
  loading: boolean;
}

const isDevLoginAvailable = () => {
  if (!import.meta.env.DEV) return false;
  if (import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true') return true;
  if (typeof window === 'undefined') return false;
  return LOCAL_DEV_HOSTS.has(window.location.hostname);
};

export const Auth: React.FC<AuthProps> = ({ onTelegramLogin, onDevLogin, loading }) => {
  const showDevLogin = isDevLoginAvailable() && Boolean(onDevLogin);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-[color:var(--steel-blue)]" />

      <div className="z-10 w-full max-w-sm text-center">
        <div className="mb-8 inline-flex rounded-md bg-[color:var(--app-text)] p-4 text-[color:var(--app-surface-strong)] shadow-lg">
          <Car size={48} />
        </div>
        <p className="industrial-kicker mb-2">Корпоративная мобильность</p>
        <h1 className="mb-2 text-4xl font-light text-[color:var(--app-text)]">{APP_NAME}</h1>
        <p className="mb-8 text-[color:var(--app-text-muted)]">Поездки между Москвой и Липецком</p>

        <Card className="auth-panel text-center">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--steel-blue)] border-t-transparent" />
              <p className="text-[color:var(--app-text-muted)]">Авторизация...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="mb-4 text-sm">
                Войдите через Telegram для быстрого доступа и уведомлений
              </p>

              {/* Telegram Login Widget */}
              <TelegramLoginButton
                botName={TELEGRAM_BOT_NAME}
                onAuth={onTelegramLogin}
                buttonSize="large"
                cornerRadius={12}
              />

              {import.meta.env.DEV && showDevLogin && (
                <div className="mt-5 border-t border-[color:var(--app-border)] pt-5">
                  <p className="mb-3 text-xs uppercase tracking-[0.22em] text-[color:var(--app-text-muted)]">
                    Локальная разработка
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={onDevLogin}
                    disabled={loading}
                  >
                    <KeyRound size={18} />
                    Войти локально
                  </Button>
                  <p className="mt-3 text-xs text-[color:var(--app-text-muted)]">
                    Только для dev-режима на localhost. Production-авторизация не меняется.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        <p className="mt-6 text-xs text-[color:var(--app-text-muted)]">Для сотрудников НЛМК</p>
      </div>
    </div>
  );
};
