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
    pending: 'bg-[color:var(--warning)] text-black',
    fulfilled: 'bg-[color:var(--success)] text-white',
    cancelled: 'bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]',
    expired: 'bg-[color:var(--app-surface-soft)] text-[color:var(--app-text-muted)]',
  };

  const statusLabels = {
    pending: 'Активна',
    fulfilled: 'Выполнена',
    cancelled: 'Отменена',
    expired: 'Истекла',
  };

  return (
    <Card className="mb-4 route-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar src={request.requester.avatarUrl} alt={request.requester.name} size={40} />
          <div>
            <Link
              to={`/user/${request.requesterId}`}
              className="font-medium text-[color:var(--app-text)] hover:text-[color:var(--steel-blue)]"
            >
              {request.requester.name}
            </Link>
            <div className="flex items-center gap-1 text-sm text-[color:var(--app-text-muted)]">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <span>{request.requester.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <span
          className={`rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusColors[request.status]}`}
        >
          {statusLabels[request.status]}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge variant={request.from === City.Moscow ? 'blue' : 'pink'}>
          {getCityName(request.from)}
        </Badge>
        <ArrowRight size={16} className="text-[color:var(--app-text-muted)]" />
        <Badge variant={request.to === City.Moscow ? 'blue' : 'pink'}>
          {getCityName(request.to)}
        </Badge>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-[color:var(--app-text-muted)]">
        <div className="flex items-center gap-1">
          <Calendar size={16} />
          <span>
            {formatDate(request.dateFrom)} — {formatDate(request.dateTo)}
          </span>
        </div>
        {request.timePreferred && (
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{request.timePreferred}</span>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-[color:var(--app-text-muted)]">
        <Users size={16} />
        <span>
          {request.passengersCount} {request.passengersCount === 1 ? 'пассажир' : 'пассажира'}
        </span>
      </div>

      {request.comment && (
        <p className="mb-3 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3 text-sm text-[color:var(--app-text-muted)]">
          {request.comment}
        </p>
      )}

      <PreferenceRow prefs={request.preferences} />

      {isOwner && request.status === 'pending' && onCancel && (
        <div className="mt-4 border-t border-[color:var(--app-border)] pt-4">
          <Button variant="danger" onClick={handleCancel} loading={isCancelling} className="w-full">
            <X size={18} />
            Отменить заявку
          </Button>
        </div>
      )}

      {request.linkedTrip && (
        <div className="mt-4 border-t border-[color:var(--app-border)] pt-4">
          <div className="flex items-center gap-2 text-sm text-[color:var(--success)]">
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
