import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { api } from '../../services/api';
import { City, User } from '../../types';

export type CreateRequestPayload = Parameters<(typeof api)['createRequest']>[0];

interface CreateRequestProps {
  user: User;
  addRequest: (data: CreateRequestPayload) => Promise<void>;
}

export function CreateRequest({ user, addRequest }: CreateRequestProps) {
  const navigate = useNavigate();
  const [from, setFrom] = useState<City>(
    user.homeCity === City.Moscow ? City.Moscow : City.Lipetsk
  );
  const [to, setTo] = useState<City>(user.homeCity === City.Moscow ? City.Lipetsk : City.Moscow);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timePreferred, setTimePreferred] = useState('');
  const [passengersCount, setPassengersCount] = useState(1);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const formatDateInput = (d: Date) => d.toISOString().split('T')[0];
    setDateFrom(formatDateInput(today));
    setDateTo(formatDateInput(nextWeek));
  }, []);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      alert('Укажите даты');
      return;
    }

    if (dateFrom > dateTo) {
      alert('Дата "от" должна быть не позже даты "до"');
      return;
    }

    setIsSubmitting(true);
    try {
      await addRequest({
        from,
        to,
        dateFrom,
        dateTo,
        timePreferred: timePreferred || undefined,
        passengersCount,
        comment,
        preferences: user.defaultPreferences,
      });
      alert('Заявка создана!');
      navigate('/requests');
    } catch {
      // Error handled in addRequest
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <ClipboardList className="text-emerald-600" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Новая заявка</h1>
          <p className="text-gray-500 text-sm">Ищу попутную поездку</p>
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Маршрут</h3>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-2">Откуда</label>
            <select
              value={from}
              onChange={e => {
                setFrom(e.target.value as City);
                setTo(e.target.value === City.Moscow ? City.Lipetsk : City.Moscow);
              }}
              className="w-full p-3 rounded-xl border border-gray-200 bg-white"
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
          <div className="flex items-end pb-3">
            <ArrowRight size={20} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-2">Куда</label>
            <select
              value={to}
              onChange={e => setTo(e.target.value as City)}
              className="w-full p-3 rounded-xl border border-gray-200 bg-white"
              disabled
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Когда нужна поездка</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">С даты</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">По дату</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom || new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Желаемое время (опционально)</label>
          <input
            type="time"
            value={timePreferred}
            onChange={e => setTimePreferred(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200"
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Детали</h3>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-2">Количество пассажиров</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setPassengersCount(n)}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  passengersCount === n
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {n} {n === 1 ? 'пассажир' : n < 5 ? 'пассажира' : 'пассажиров'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Комментарий (опционально)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Например: гибкий по времени, могу подстроиться..."
            className="w-full p-3 rounded-xl border border-gray-200 resize-none h-24"
            maxLength={500}
          />
        </div>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full"
        loading={isSubmitting}
        disabled={!dateFrom || !dateTo}
      >
        <ClipboardList size={20} />
        Создать заявку
      </Button>
    </div>
  );
}
