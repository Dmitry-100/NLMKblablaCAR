import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle, Clock, Star, Users, X } from 'lucide-react';
import { Avatar, Badge, Button, Card } from '../../components/ui';
import { PreferenceRow } from '../../components/Icons';
import { City, PassengerRequest, User } from '../../types';
import { formatDate, getCityName } from '../../utils/helpers';

interface RequestCardProps {
  request: PassengerRequest;
  currentUser: User;
  onCancel?: (id: string) => Promise<void>;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request, currentUser, onCancel }) => {
  const isOwner = request.requesterId === currentUser.id;
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!onCancel || !confirm('Отменить заявку?')) return;
    setIsCancelling(true);
    try {
      await onCancel(request.id);
    } finally {
      setIsCancelling(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    fulfilled: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
    expired: 'bg-gray-100 text-gray-500',
  };

  const statusLabels = {
    pending: 'Активна',
    fulfilled: 'Выполнена',
    cancelled: 'Отменена',
    expired: 'Истекла',
  };

  return (
    <Card className="mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar src={request.requester.avatarUrl} alt={request.requester.name} size={40} />
          <div>
            <Link
              to={`/user/${request.requesterId}`}
              className="font-medium text-gray-800 hover:text-sky-600"
            >
              {request.requester.name}
            </Link>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span>{request.requester.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}
        >
          {statusLabels[request.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant={request.from === City.Moscow ? 'blue' : 'pink'}>
          {getCityName(request.from)}
        </Badge>
        <ArrowRight size={16} className="text-gray-400" />
        <Badge variant={request.to === City.Moscow ? 'blue' : 'pink'}>
          {getCityName(request.to)}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <Calendar size={16} className="text-gray-400" />
          <span>
            {formatDate(request.dateFrom)} — {formatDate(request.dateTo)}
          </span>
        </div>
        {request.timePreferred && (
          <div className="flex items-center gap-1">
            <Clock size={16} className="text-gray-400" />
            <span>{request.timePreferred}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Users size={16} className="text-gray-400" />
        <span>
          {request.passengersCount} {request.passengersCount === 1 ? 'пассажир' : 'пассажира'}
        </span>
      </div>

      {request.comment && (
        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl mb-3">{request.comment}</p>
      )}

      <PreferenceRow prefs={request.preferences} />

      {isOwner && request.status === 'pending' && onCancel && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button variant="danger" onClick={handleCancel} loading={isCancelling} className="w-full">
            <X size={18} />
            Отменить заявку
          </Button>
        </div>
      )}

      {request.linkedTrip && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle size={16} />
            <span>
              Связана с поездкой {formatDate(request.linkedTrip.date)} в {request.linkedTrip.time}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};
