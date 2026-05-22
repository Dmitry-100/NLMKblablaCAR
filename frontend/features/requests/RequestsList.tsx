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
      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
            <ClipboardList className="text-[color:var(--success)]" size={28} />
          </div>
          <div>
            <p className="industrial-kicker mb-1">Пассажирский спрос</p>
            <h1 className="industrial-page-title">Заявки</h1>
            <p className="industrial-muted mt-1 text-sm">Пассажиры ищут попутчиков</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="metric-tile px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Москва
            </p>
            <p className="text-xl font-semibold text-[color:var(--app-text)]">{moscowToLipetsk}</p>
          </div>
          <div className="metric-tile px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--app-text-muted)]">
              Липецк
            </p>
            <p className="text-xl font-semibold text-[color:var(--app-text)]">{lipetskToMoscow}</p>
          </div>
        </div>
      </div>

      <div className="app-surface mb-6 flex gap-2 overflow-x-auto rounded-xl border p-3">
        <button
          onClick={() => setFilter('all')}
          className={`industrial-chip px-4 py-2 whitespace-nowrap text-sm transition-colors ${
            filter === 'all'
              ? 'industrial-chip-active'
              : 'hover:border-[color:var(--app-border-strong)]'
          }`}
        >
          Все ({moscowToLipetsk + lipetskToMoscow})
        </button>
        <button
          onClick={() => setFilter('moscow-lipetsk')}
          className={`industrial-chip px-4 py-2 whitespace-nowrap text-sm transition-colors ${
            filter === 'moscow-lipetsk'
              ? 'industrial-chip-active'
              : 'hover:border-[color:var(--app-border-strong)]'
          }`}
        >
          Москва → Липецк ({moscowToLipetsk})
        </button>
        <button
          onClick={() => setFilter('lipetsk-moscow')}
          className={`industrial-chip px-4 py-2 whitespace-nowrap text-sm transition-colors ${
            filter === 'lipetsk-moscow'
              ? 'industrial-chip-active'
              : 'hover:border-[color:var(--app-border-strong)]'
          }`}
        >
          Липецк → Москва ({lipetskToMoscow})
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 py-2">
          <div className="flex justify-center text-[color:var(--app-text-muted)]">
            <Loader2 size={20} className="animate-spin text-[color:var(--steel-blue)]" />
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
        <Card className="mt-6 border-[color:var(--steel-blue)] bg-[color:var(--app-surface-soft)]">
          <div className="flex items-center gap-4">
            <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-3">
              <Car className="text-[color:var(--steel-blue)]" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[color:var(--app-text)]">Готовы взять попутчиков?</h3>
              <p className="text-sm text-[color:var(--app-text-muted)]">
                Создайте поездку и пассажиры увидят её
              </p>
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
