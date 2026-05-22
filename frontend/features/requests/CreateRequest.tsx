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
    <div className="mx-auto max-w-3xl pb-32">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
          <ClipboardList className="text-[color:var(--success)]" size={28} />
        </div>
        <div>
          <p className="industrial-kicker mb-1">Запрос пассажира</p>
          <h1 className="industrial-page-title">Новая заявка</h1>
          <p className="industrial-muted mt-1 text-sm">Ищу попутную поездку</p>
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="mb-4 font-semibold text-[color:var(--app-text)]">Маршрут</h3>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">Откуда</label>
            <select
              value={from}
              onChange={e => {
                setFrom(e.target.value as City);
                setTo(e.target.value === City.Moscow ? City.Lipetsk : City.Moscow);
              }}
              className="industrial-input p-3"
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
          <div className="flex items-end pb-3">
            <ArrowRight size={20} className="text-[color:var(--app-text-muted)]" />
          </div>
          <div className="flex-1">
            <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">Куда</label>
            <select
              value={to}
              onChange={e => setTo(e.target.value as City)}
              className="industrial-input p-3"
              disabled
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="mb-4 font-semibold text-[color:var(--app-text)]">Когда нужна поездка</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">С даты</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="industrial-input p-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">По дату</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom || new Date().toISOString().split('T')[0]}
              className="industrial-input p-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">
            Желаемое время (опционально)
          </label>
          <input
            type="time"
            value={timePreferred}
            onChange={e => setTimePreferred(e.target.value)}
            className="industrial-input p-3"
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="mb-4 font-semibold text-[color:var(--app-text)]">Детали</h3>

        <div className="mb-4">
          <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">
            Количество пассажиров
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setPassengersCount(n)}
                className={`flex-1 rounded-md border p-3 transition-colors ${
                  passengersCount === n
                    ? 'border-[color:var(--success)] bg-[color:var(--app-surface-soft)] text-[color:var(--success)]'
                    : 'border-[color:var(--app-border)] text-[color:var(--app-text-muted)] hover:border-[color:var(--app-border-strong)]'
                }`}
              >
                {n} {n === 1 ? 'пассажир' : n < 5 ? 'пассажира' : 'пассажиров'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-[color:var(--app-text-muted)]">
            Комментарий (опционально)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Например: гибкий по времени, могу подстроиться..."
            className="industrial-input h-24 resize-none p-3"
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
