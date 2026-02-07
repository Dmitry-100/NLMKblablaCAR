import React, { useState } from 'react';
import { Car } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { APP_NAME } from '../../constants';

interface AuthProps {
  onLogin: (email: string) => void;
  loading: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, loading }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
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
        <p className="text-slate-500 mb-8">Поездки между Москвой и Липецком.</p>

        <Card className="text-left">
          <form onSubmit={handleSubmit}>
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
            <Button className="w-full" loading={loading}>
              Войти
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
