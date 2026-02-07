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
        <div className="mb-4 w-72 bg-white rounded-2xl shadow-2xl p-4 border border-sky-100 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sky-800 flex items-center gap-2">
              <Sparkles size={16} /> Помощник
            </h4>
            <button onClick={() => setIsOpen(false)}>
              <LogOut size={14} className="rotate-45" />
            </button>
          </div>
          <div className="bg-sky-50 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] mb-3">
            {loading ? (
              <span className="animate-pulse">Думаю...</span>
            ) : (
              response || 'Спроси меня о погоде или попроси придумать комментарий к поездке!'
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 text-sm border-gray-200 rounded-lg px-2 py-1 outline-none border focus:border-sky-300"
              placeholder="Напиши сюда..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              className="bg-sky-500 text-white rounded-lg px-2 hover:bg-sky-600"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
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

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 flex justify-around py-3 pb-safe">
        <Link
          to="/"
          className={`flex flex-col items-center ${location.pathname === '/' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <Car size={24} />
          <span className="text-[10px] mt-1">Поездки</span>
        </Link>
        <Link
          to="/requests"
          className={`flex flex-col items-center relative ${location.pathname === '/requests' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <ClipboardList size={24} />
          <span className="text-[10px] mt-1">Заявки</span>
          {totalRequests > 0 && (
            <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {totalRequests > 99 ? '99+' : totalRequests}
            </span>
          )}
        </Link>
        <Link
          to="/calendar"
          className={`flex flex-col items-center ${location.pathname === '/calendar' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <CalendarDays size={24} />
          <span className="text-[10px] mt-1">Календарь</span>
        </Link>
        <Link
          to="/dashboard"
          className={`flex flex-col items-center relative ${location.pathname === '/dashboard' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <BarChart3 size={24} />
          <span className="text-[10px] mt-1">Дашборд</span>
          {myTripsCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-indigo-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {myTripsCount}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex flex-col items-center"
          >
            <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-3 rounded-full -mt-8 shadow-lg shadow-sky-200 border-4 border-white">
              <PlusCircle size={28} className="text-white" />
            </div>
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 w-48">
                <Link
                  to="/create"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <Car size={20} className="text-sky-500" />
                  <span>Создать поездку</span>
                </Link>
                <Link
                  to="/request"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 border-t border-gray-100"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <ClipboardList size={20} className="text-emerald-500" />
                  <span>Создать заявку</span>
                </Link>
              </div>
            </>
          )}
        </div>
        <Link
          to="/profile"
          className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] mt-1">Профиль</span>
        </Link>
      </div>

      <div className="hidden md:flex fixed top-0 w-full bg-white/70 backdrop-blur-md z-50 px-8 py-4 justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-sky-600">
          <Car className="fill-current" /> {APP_NAME}
        </div>
        <div className="flex gap-6 items-center">
          <Link
            to="/"
            className={`${location.pathname === '/' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600`}
          >
            Поездки
          </Link>
          <Link
            to="/requests"
            className={`${location.pathname === '/requests' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600 flex items-center gap-1`}
          >
            Заявки
            {totalRequests > 0 && (
              <span className="bg-sky-500 text-white text-xs rounded-full px-2 py-0.5">
                {totalRequests}
              </span>
            )}
          </Link>
          <Link
            to="/calendar"
            className={`${location.pathname === '/calendar' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600`}
          >
            Календарь
          </Link>
          <Link
            to="/dashboard"
            className={`${location.pathname === '/dashboard' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600 flex items-center gap-1`}
          >
            Дашборд <BarChart3 size={16} />
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-1 text-gray-600 hover:text-sky-600">
              Создать <ChevronDown size={16} />
            </button>
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-48">
              <Link
                to="/create"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700"
              >
                <Car size={20} className="text-sky-500" />
                <span>Создать поездку</span>
              </Link>
              <Link
                to="/request"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 border-t border-gray-100"
              >
                <ClipboardList size={20} className="text-emerald-500" />
                <span>Создать заявку</span>
              </Link>
            </div>
          </div>
          <Link
            to="/profile"
            className={`${location.pathname === '/profile' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600`}
          >
            Профиль
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <main className="px-4 pt-6 md:pt-24 max-w-3xl mx-auto min-h-screen">{children}</main>

      <Assistant />
    </div>
  );
}
