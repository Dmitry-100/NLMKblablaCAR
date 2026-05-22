import React, { useState } from 'react';
import { Calendar, MapPin, Star, X } from 'lucide-react';
import { Avatar, Button, Stars } from '../../components/ui';
import { PendingReview, User } from '../../types';
import { formatDate } from '../../utils/helpers';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: PendingReview['trip'];
  targetUser: User;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function ReviewModal({
  isOpen,
  onClose,
  trip,
  targetUser,
  onSubmit,
  onSkip,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Пожалуйста, выберите рейтинг');
      return;
    }
    setIsSubmitting(true);
    await onSubmit(rating, comment);
    setIsSubmitting(false);
    setRating(0);
    setComment('');
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    await onSkip();
    setIsSkipping(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="app-surface w-full max-w-md rounded-xl border p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[color:var(--app-text)]">Оставить отзыв</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[color:var(--app-text-muted)] hover:bg-[color:var(--app-surface-soft)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3 text-sm">
          <div className="flex items-center gap-2 text-[color:var(--app-text)]">
            <MapPin size={14} className="text-[color:var(--steel-blue)]" />
            <span>
              {trip.from === 'Moscow' ? 'Москва' : 'Липецк'} →{' '}
              {trip.to === 'Moscow' ? 'Москва' : 'Липецк'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[color:var(--app-text-muted)]">
            <Calendar size={14} />
            <span>
              {formatDate(trip.date)} в {trip.time}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Avatar
            src={targetUser.avatarUrl}
            alt={targetUser.name}
            size={64}
            className="border-2 border-[color:var(--app-border)]"
          />
          <div>
            <p className="font-semibold text-[color:var(--app-text)]">{targetUser.name}</p>
            <p className="text-sm text-[color:var(--app-text-muted)]">
              {trip.driverId === targetUser.id ? 'Водитель' : 'Пассажир'}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[color:var(--app-text)]">
            Оценка
          </label>
          <div className="flex justify-center">
            <Stars rating={rating} interactive onChange={setRating} size={32} />
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-[color:var(--app-text)]">
            Комментарий <span className="text-[color:var(--app-text-muted)]">(необязательно)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Напишите несколько слов о поездке..."
            className="industrial-input resize-none p-3"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleSkip} loading={isSkipping} className="flex-1">
            Пропустить
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting} className="flex-1">
            <Star size={18} /> Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
