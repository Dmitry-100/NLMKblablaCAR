import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Car, ClipboardList, Activity } from 'lucide-react';
import { Card, Button, Skeleton } from '../../components/ui';
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

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <Shield className="text-sky-500" size={24} />
          Панель администратора
        </h1>
        <Button onClick={refreshAdminData}>Обновить</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Users size={16} /> Пользователи
          </div>
          {statsLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold">{stats?.usersTotal ?? 0}</div>
          )}
          <div className="text-xs text-gray-400">Заблокировано: {stats?.usersBlocked ?? 0}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Car size={16} /> Поездки
          </div>
          {statsLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold">{stats?.tripsTotal ?? 0}</div>
          )}
          <div className="text-xs text-gray-400">Активные: {stats?.tripsActive ?? 0}</div>
        </Card>
        <Card className="space-y-1">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <ClipboardList size={16} /> Заявки
          </div>
          {statsLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold">{stats?.requestsTotal ?? 0}</div>
          )}
          <div className="text-xs text-gray-400">Ожидают: {stats?.requestsPending ?? 0}</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-3">Пользователи</h2>
        {usersLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
              >
                <div>
                  <div className="font-medium text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500">
                    {user.email || 'без email'} | {user.accountRole === 'admin' ? 'admin' : 'user'}
                    {user.isBlocked ? ' | blocked' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => handleToggleAdmin(user)}>
                    {user.accountRole === 'admin' ? 'Снять admin' : 'Сделать admin'}
                  </Button>
                  <Button
                    variant={user.isBlocked ? 'secondary' : 'danger'}
                    onClick={() => handleToggleBlock(user)}
                  >
                    {user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Поездки</h2>
          {tripsLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="text-sm text-slate-600 space-y-2 max-h-72 overflow-auto">
              {trips.map(trip => (
                <div key={trip.id} className="rounded-lg border border-slate-100 p-2">
                  {trip.date} {trip.time} | {trip.from} → {trip.to} | {trip.status}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-3">Заявки</h2>
          {requestsLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <div className="text-sm text-slate-600 space-y-2 max-h-72 overflow-auto">
              {requests.map(request => (
                <div key={request.id} className="rounded-lg border border-slate-100 p-2">
                  {request.dateFrom}..{request.dateTo} | {request.from} → {request.to} |{' '}
                  {request.status}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity size={18} />
          Логи админ-действий
        </h2>
        {logsLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto text-sm">
            {logs.map(item => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-2">
                <div className="font-medium text-slate-800">
                  {item.action} ({item.entityType}) {item.entityId ? `#${item.entityId}` : ''}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString('ru-RU')} | {item.admin.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
