import React, { useState } from 'react';
import { X, Star, MapPin, Calendar } from 'lucide-react';
import { User, PendingReview } from '../../types';
import { Button } from '../ui/Button';
import { Stars } from '../ui/Stars';
import { formatDate } from '../../utils/helpers';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: PendingReview['trip'];
  targetUser: User;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  trip,
  targetUser,
  onSubmit,
  onSkip,
}) => {
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
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Оставить отзыв</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Trip info */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin size={14} className="text-sky-400" />
            <span>
              {trip.from === 'Moscow' ? 'Москва' : 'Липецк'} →{' '}
              {trip.to === 'Moscow' ? 'Москва' : 'Липецк'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 mt-1">
            <Calendar size={14} />
            <span>
              {formatDate(trip.date)} в {trip.time}
            </span>
          </div>
        </div>

        {/* Target user */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src={targetUser.avatarUrl}
            alt={targetUser.name}
            className="w-16 h-16 rounded-full border-2 border-sky-100 object-cover"
          />
          <div>
            <p className="font-semibold text-gray-800">{targetUser.name}</p>
            <p className="text-sm text-gray-500">
              {trip.driverId === targetUser.id ? 'Водитель' : 'Пассажир'}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Оценка</label>
          <div className="flex justify-center">
            <Stars rating={rating} interactive onChange={setRating} size={32} />
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Комментарий <span className="text-gray-400">(необязательно)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Напишите несколько слов о поездке..."
            className="w-full p-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none resize-none"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Actions */}
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
};
