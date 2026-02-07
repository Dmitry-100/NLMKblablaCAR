import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User as UserIcon, PlusCircle, ClipboardList, ChevronDown } from 'lucide-react';
import { RequestStats } from '../../types';
import { APP_NAME } from '../../constants';
import { Assistant } from '../assistant/Assistant';

interface LayoutProps {
  children: React.ReactNode;
  requestStats?: RequestStats;
}

export const Layout: React.FC<LayoutProps> = ({ children, requestStats }) => {
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const totalRequests = requestStats?.total || 0;

  return (
    <div className="min-h-screen relative">
      {/* Sticky Nav Mobile */}
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

      {/* Desktop Nav */}
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
        </div>
      </div>

      <main className="px-4 pt-6 md:pt-24 max-w-3xl mx-auto min-h-screen">{children}</main>

      <Assistant />
    </div>
  );
};
