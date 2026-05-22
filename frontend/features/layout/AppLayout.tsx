import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Car,
  ClipboardList,
  PlusCircle,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  LogOut,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { APP_NAME } from '../../constants';
import { RequestStats, Trip, User } from '../../types';
import { generateAssistantResponse } from '../../services/geminiService';
import { ThemeToggle } from './ThemeToggle';

const Assistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await generateAssistantResponse(prompt);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {isOpen && (
        <div className="app-surface mb-4 w-80 rounded-xl border p-4 shadow-xl animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-[color:var(--app-text)] flex items-center gap-2">
              <Sparkles size={16} /> Помощник
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
            >
              <LogOut size={14} className="rotate-45" />
            </button>
          </div>
          <div className="rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3 text-sm text-[color:var(--app-text)] min-h-[60px] mb-3">
            {loading ? (
              <span className="animate-pulse">Думаю...</span>
            ) : (
              response || 'Спроси меня о погоде или попроси придумать комментарий к поездке!'
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="industrial-input flex-1 px-2 py-1 text-sm"
              placeholder="Напиши сюда..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              className="rounded-md bg-[color:var(--steel-blue)] px-2 text-white hover:bg-[color:var(--steel-blue-dark)]"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-md bg-[color:var(--app-text)] text-[color:var(--app-surface-strong)] shadow-lg transition-colors hover:bg-[color:var(--steel-blue)] hover:text-white"
      >
        <Sparkles size={24} />
      </button>
    </div>
  );
};

interface AppLayoutProps {
  children: React.ReactNode;
  requestStats?: RequestStats;
  user: User;
  trips: Trip[];
}

export function AppLayout({ children, requestStats, user, trips }: AppLayoutProps) {
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const totalRequests = requestStats?.total || 0;
  const myTripsCount = trips.filter(
    trip =>
      trip.driverId === user.id || trip.passengers?.some(passenger => passenger.id === user.id)
  ).length;

  return (
    <div className="min-h-screen relative">
      <div className="md:hidden fixed right-3 top-3 z-[60]">
        <ThemeToggle />
      </div>

      <div className="app-surface md:hidden fixed bottom-0 left-0 z-50 flex w-full justify-around border-t px-2 py-3 pb-safe">
        <Link
          to="/"
          className={`flex flex-col items-center ${location.pathname === '/' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
        >
          <Car size={24} />
          <span className="text-[10px] mt-1">Поездки</span>
        </Link>
        <Link
          to="/requests"
          className={`flex flex-col items-center relative ${location.pathname === '/requests' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
        >
          <ClipboardList size={24} />
          <span className="text-[10px] mt-1">Заявки</span>
          {totalRequests > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-sm bg-[color:var(--steel-blue)] text-[10px] text-white">
              {totalRequests > 99 ? '99+' : totalRequests}
            </span>
          )}
        </Link>
        <Link
          to="/calendar"
          className={`flex flex-col items-center ${location.pathname === '/calendar' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
        >
          <CalendarDays size={24} />
          <span className="text-[10px] mt-1">Календарь</span>
        </Link>
        <Link
          to="/dashboard"
          className={`flex flex-col items-center relative ${location.pathname === '/dashboard' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
        >
          <BarChart3 size={24} />
          <span className="text-[10px] mt-1">Дашборд</span>
          {myTripsCount > 0 && (
            <span className="absolute -top-1 -right-2 rounded-sm bg-[color:var(--app-text)] px-1.5 py-0.5 text-[10px] text-[color:var(--app-surface-strong)]">
              {myTripsCount}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex flex-col items-center"
          >
            <div className="-mt-8 rounded-md border-4 border-[color:var(--app-surface-strong)] bg-[color:var(--steel-blue)] p-3 shadow-lg">
              <PlusCircle size={28} className="text-white" />
            </div>
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="app-surface absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-xl border shadow-xl">
                <Link
                  to="/create"
                  className="flex items-center gap-3 px-4 py-3 text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <Car size={20} className="text-[color:var(--steel-blue)]" />
                  <span>Создать поездку</span>
                </Link>
                <Link
                  to="/request"
                  className="flex items-center gap-3 border-t border-[color:var(--app-border)] px-4 py-3 text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <ClipboardList size={20} className="text-[color:var(--success)]" />
                  <span>Создать заявку</span>
                </Link>
              </div>
            </>
          )}
        </div>
        <Link
          to="/profile"
          className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] mt-1">Профиль</span>
        </Link>
        {user.accountRole === 'admin' && (
          <Link
            to="/admin"
            className={`flex flex-col items-center ${location.pathname === '/admin' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'}`}
          >
            <Shield size={24} />
            <span className="text-[10px] mt-1">Admin</span>
          </Link>
        )}
      </div>

      <div className="app-surface hidden md:flex fixed top-0 z-50 w-full items-center justify-between border-b px-8 py-4">
        <div className="flex items-center gap-3 text-xl font-semibold tracking-tight text-[color:var(--app-text)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[color:var(--app-text)] text-[color:var(--app-surface-strong)]">
            <Car size={20} />
          </span>
          {APP_NAME}
        </div>
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link
            to="/"
            className={`${location.pathname === '/' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} hover:text-[color:var(--steel-blue)]`}
          >
            Поездки
          </Link>
          <Link
            to="/requests"
            className={`${location.pathname === '/requests' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} flex items-center gap-1 hover:text-[color:var(--steel-blue)]`}
          >
            Заявки
            {totalRequests > 0 && (
              <span className="rounded-sm bg-[color:var(--steel-blue)] px-2 py-0.5 text-xs text-white">
                {totalRequests}
              </span>
            )}
          </Link>
          <Link
            to="/calendar"
            className={`${location.pathname === '/calendar' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} hover:text-[color:var(--steel-blue)]`}
          >
            Календарь
          </Link>
          <Link
            to="/dashboard"
            className={`${location.pathname === '/dashboard' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} flex items-center gap-1 hover:text-[color:var(--steel-blue)]`}
          >
            Дашборд <BarChart3 size={16} />
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-1 text-[color:var(--app-text-muted)] hover:text-[color:var(--steel-blue)]">
              Создать <ChevronDown size={16} />
            </button>
            <div className="app-surface invisible absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
              <Link
                to="/create"
                className="flex items-center gap-3 px-4 py-3 text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
              >
                <Car size={20} className="text-[color:var(--steel-blue)]" />
                <span>Создать поездку</span>
              </Link>
              <Link
                to="/request"
                className="flex items-center gap-3 border-t border-[color:var(--app-border)] px-4 py-3 text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-soft)]"
              >
                <ClipboardList size={20} className="text-[color:var(--success)]" />
                <span>Создать заявку</span>
              </Link>
            </div>
          </div>
          <Link
            to="/profile"
            className={`${location.pathname === '/profile' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} hover:text-[color:var(--steel-blue)]`}
          >
            Профиль
          </Link>
          {user.accountRole === 'admin' && (
            <Link
              to="/admin"
              className={`${location.pathname === '/admin' ? 'text-[color:var(--steel-blue)]' : 'text-[color:var(--app-text-muted)]'} flex items-center gap-1 hover:text-[color:var(--steel-blue)]`}
            >
              Admin <Shield size={16} />
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto min-h-screen max-w-6xl px-4 pt-6 md:px-6 md:pt-28">{children}</main>

      <Assistant />
    </div>
  );
}
