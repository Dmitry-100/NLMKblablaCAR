import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, ClipboardList, Loader2 } from 'lucide-react';
import { Button, Card, EmptyState, Skeleton } from '../../components/ui';
import { City, PassengerRequest, User } from '../../types';
import { RequestCard } from './RequestCard';

interface RequestsListProps {
  requests: PassengerRequest[];
  user: User;
  loading: boolean;
  onCancelRequest?: (id: string) => Promise<void>;
}

export function RequestsList({ requests, user, loading, onCancelRequest }: RequestsListProps) {
  const [filter, setFilter] = useState<'all' | 'moscow-lipetsk' | 'lipetsk-moscow'>('all');

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (r.status !== 'pending') return false;
      if (filter === 'moscow-lipetsk') return r.from === City.Moscow && r.to === City.Lipetsk;
      if (filter === 'lipetsk-moscow') return r.from === City.Lipetsk && r.to === City.Moscow;
      return true;
    });
  }, [requests, filter]);

  const moscowToLipetsk = requests.filter(
    r => r.status === 'pending' && r.from === City.Moscow
  ).length;
  const lipetskToMoscow = requests.filter(
    r => r.status === 'pending' && r.from === City.Lipetsk
  ).length;

  const RequestSkeleton = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-10 w-full" />
    </Card>
  );

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <ClipboardList className="text-emerald-600" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Заявки</h1>
          <p className="text-gray-500 text-sm">Пассажиры ищут попутчиков</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-sky-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Все ({moscowToLipetsk + lipetskToMoscow})
        </button>
        <button
          onClick={() => setFilter('moscow-lipetsk')}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            filter === 'moscow-lipetsk'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Москва → Липецк ({moscowToLipetsk})
        </button>
        <button
          onClick={() => setFilter('lipetsk-moscow')}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            filter === 'lipetsk-moscow'
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Липецк → Москва ({lipetskToMoscow})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 py-2">
          <div className="flex justify-center text-gray-400">
            <Loader2 size={20} className="animate-spin text-sky-500" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <RequestSkeleton key={`request-skeleton-${index}`} />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          title="Нет активных заявок"
          description="Когда пассажиры оставят запросы, они появятся здесь. Можно пока создать поездку заранее."
          icon={ClipboardList}
          action={
            <Link to="/create">
              <Button>Создать поездку</Button>
            </Link>
          }
        />
      ) : (
        <div>
          {filteredRequests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              currentUser={user}
              onCancel={onCancelRequest}
            />
          ))}
        </div>
      )}

      {filteredRequests.length > 0 && (
        <Card className="mt-6 bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Car className="text-sky-500" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800">Готовы взять попутчиков?</h3>
              <p className="text-sm text-gray-600">Создайте поездку и пассажиры увидят её</p>
            </div>
            <Link to="/create">
              <Button>Создать</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
