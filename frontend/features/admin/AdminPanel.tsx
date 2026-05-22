import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Car, ClipboardList, Shield, Users } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components/ui';
import { api } from '../../services/api';
import { User } from '../../types';

interface AdminPanelProps {
  currentUser: User;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.getAdminStats(),
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.getAdminUsers(),
  });

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['adminTrips'],
    queryFn: () => api.getAdminTrips(),
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: () => api.getAdminRequests(),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: () => api.getAdminLogs(50),
  });

  const refreshAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['adminStats'] }),
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
      queryClient.invalidateQueries({ queryKey: ['adminTrips'] }),
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] }),
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] }),
    ]);
  };

  const handleToggleBlock = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('Нельзя менять блокировку для собственного аккаунта');
      return;
    }

    if (user.isBlocked) {
      await api.unblockUser(user.id);
    } else {
      await api.blockUser(user.id);
    }
    await refreshAdminData();
  };

  const handleToggleAdmin = async (user: User) => {
    if (user.id === currentUser.id && user.accountRole === 'admin') {
      alert('Нельзя снять права администратора у самого себя');
      return;
    }

    const nextRole = user.accountRole === 'admin' ? 'user' : 'admin';
    await api.updateAdminUser(user.id, { accountRole: nextRole });
    await refreshAdminData();
  };

  const metricCards = [
    {
      label: 'Пользователи',
      value: stats?.usersTotal ?? 0,
      detail: `Заблокировано: ${stats?.usersBlocked ?? 0}`,
      icon: Users,
    },
    {
      label: 'Поездки',
      value: stats?.tripsTotal ?? 0,
      detail: `Активные: ${stats?.tripsActive ?? 0}`,
      icon: Car,
    },
    {
      label: 'Заявки',
      value: stats?.requestsTotal ?? 0,
      detail: `Ожидают: ${stats?.requestsPending ?? 0}`,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <Card className="admin-control-room overflow-hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-[color:var(--app-text)] p-3 text-[color:var(--app-surface-strong)]">
              <Shield size={24} />
            </div>
            <div>
              <p className="industrial-kicker mb-1">Control room</p>
              <h1 className="industrial-page-title">Панель администратора</h1>
              <p className="industrial-muted mt-1 text-sm">
                Управление пользователями, поездками, заявками и аудитом действий.
              </p>
            </div>
          </div>
          <Button onClick={refreshAdminData}>Обновить данные</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards.map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[color:var(--app-text-muted)] flex items-center gap-2">
                  <Icon size={16} /> {item.label}
                </div>
                <span className="h-2 w-2 rounded-full bg-[color:var(--steel-blue)]" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-3xl font-light text-[color:var(--app-text)]">{item.value}</div>
              )}
              <div className="text-xs text-[color:var(--app-text-muted)]">{item.detail}</div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="industrial-kicker mb-1">Access</p>
            <h2 className="text-lg font-semibold text-[color:var(--app-text)]">Пользователи</h2>
          </div>
          <span className="text-xs text-[color:var(--app-text-muted)]">{users.length} записей</span>
        </div>
        {usersLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[color:var(--app-border)] text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                <tr>
                  <th className="py-2 font-medium">Пользователь</th>
                  <th className="py-2 font-medium">Контакт</th>
                  <th className="py-2 font-medium">Роль</th>
                  <th className="py-2 font-medium">Статус</th>
                  <th className="py-2 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--app-border)]">
                {users.map(user => (
                  <tr key={user.id} className="align-middle">
                    <td className="py-3">
                      <div className="font-medium text-[color:var(--app-text)]">{user.name}</div>
                      <div className="text-xs text-[color:var(--app-text-muted)]">ID {user.id}</div>
                    </td>
                    <td className="py-3 text-[color:var(--app-text-muted)]">
                      {user.email || user.telegramUsername || 'без контакта'}
                    </td>
                    <td className="py-3">
                      <span className="rounded-sm bg-[color:var(--app-surface-soft)] px-2 py-1 text-xs font-semibold uppercase text-[color:var(--app-text)]">
                        {user.accountRole === 'admin' ? 'admin' : 'user'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-sm px-2 py-1 text-xs font-semibold uppercase ${
                          user.isBlocked
                            ? 'bg-[color:var(--danger)] text-white'
                            : 'bg-[color:var(--success)] text-white'
                        }`}
                      >
                        {user.isBlocked ? 'blocked' : 'active'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleToggleAdmin(user)}
                          className="px-3 py-2"
                        >
                          {user.accountRole === 'admin' ? 'Снять admin' : 'Сделать admin'}
                        </Button>
                        <Button
                          variant={user.isBlocked ? 'secondary' : 'danger'}
                          onClick={() => handleToggleBlock(user)}
                          className="px-3 py-2"
                        >
                          {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--app-text)]">Поездки</h2>
            <span className="text-xs text-[color:var(--app-text-muted)]">включая отменённые</span>
          </div>
          {tripsLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="max-h-80 overflow-auto text-sm">
              <div className="divide-y divide-[color:var(--app-border)]">
                {trips.map(trip => (
                  <div key={trip.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                    <div>
                      <div className="font-medium text-[color:var(--app-text)]">
                        {trip.from} → {trip.to}
                      </div>
                      <div className="text-xs text-[color:var(--app-text-muted)]">
                        {trip.date} {trip.time}
                      </div>
                    </div>
                    <span className="rounded-sm bg-[color:var(--app-surface-soft)] px-2 py-1 text-xs uppercase text-[color:var(--app-text-muted)]">
                      {trip.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--app-text)]">Заявки</h2>
            <span className="text-xs text-[color:var(--app-text-muted)]">операционная очередь</span>
          </div>
          {requestsLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="max-h-80 overflow-auto text-sm">
              <div className="divide-y divide-[color:var(--app-border)]">
                {requests.map(request => (
                  <div key={request.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                    <div>
                      <div className="font-medium text-[color:var(--app-text)]">
                        {request.from} → {request.to}
                      </div>
                      <div className="text-xs text-[color:var(--app-text-muted)]">
                        {request.dateFrom}..{request.dateTo}
                      </div>
                    </div>
                    <span className="rounded-sm bg-[color:var(--app-surface-soft)] px-2 py-1 text-xs uppercase text-[color:var(--app-text-muted)]">
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--app-text)]">
            <Activity size={18} /> Логи админ-действий
          </h2>
          <span className="text-xs text-[color:var(--app-text-muted)]">последние 50 событий</span>
        </div>
        {logsLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="max-h-96 overflow-auto text-sm">
            <div className="divide-y divide-[color:var(--app-border)]">
              {logs.map(item => (
                <div
                  key={item.id}
                  className="grid gap-1 py-3 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="font-medium text-[color:var(--app-text)]">
                      {item.action} ({item.entityType}) {item.entityId ? `#${item.entityId}` : ''}
                    </div>
                    <div className="text-xs text-[color:var(--app-text-muted)]">
                      {item.admin.name}
                    </div>
                  </div>
                  <div className="text-xs text-[color:var(--app-text-muted)]">
                    {new Date(item.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
