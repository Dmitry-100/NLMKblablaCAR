import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Car, MapPin } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { PreferenceRow } from '../../components/Icons';
import { LocationInput } from '../../components/LocationInput';
import { MapPicker } from '../../components/MapPicker';
import { LocationData } from '../../services/yandexMapsService';
import { City, Trip, User } from '../../types';
import { getCityName } from '../../utils/helpers';

interface CreateTripProps {
  user: User;
  addTrip: (t: Trip[]) => Promise<void>;
}

export function CreateTrip({ user, addTrip }: CreateTripProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mapPickerOpen, setMapPickerOpen] = useState<{
    type: 'outbound-pickup' | 'outbound-dropoff' | 'return-pickup' | 'return-dropoff';
    city: City;
    initialLocation?: LocationData;
  } | null>(null);

  const [outbound, setOutbound] = useState<Partial<Trip>>({
    from: City.Moscow,
    to: City.Lipetsk,
    date: '',
    time: '',
    seatsTotal: 4,
    pickupLocation: '',
    dropoffLocation: '',
    comment: '',
    preferences: user.defaultPreferences,
  });

  const [returnTrip, setReturnTrip] = useState<Partial<Trip>>({
    from: City.Lipetsk,
    to: City.Moscow,
    date: '',
    time: '',
    seatsTotal: 4,
    pickupLocation: '',
    dropoffLocation: '',
    comment: '',
    preferences: user.defaultPreferences,
    isReturn: true,
  });

  const [hasReturn, setHasReturn] = useState(true);
  const outboundPassengerSeats = Math.min(3, Math.max(1, (outbound.seatsTotal ?? 4) - 1));
  const returnPassengerSeats = Math.min(3, Math.max(1, (returnTrip.seatsTotal ?? 4) - 1));

  const handleSubmit = async () => {
    const groupId = `g-${Date.now()}`;

    if (!outbound.date || !outbound.time || !outbound.pickupLocation || !outbound.dropoffLocation) {
      alert(
        'Пожалуйста, заполните все обязательные поля первой поездки (дата, время, точки посадки и высадки)'
      );
      return;
    }

    if (
      hasReturn &&
      returnTrip.date &&
      (!returnTrip.time || !returnTrip.pickupLocation || !returnTrip.dropoffLocation)
    ) {
      alert(
        'Пожалуйста, заполните все обязательные поля обратной поездки (время, точки посадки и высадки)'
      );
      return;
    }

    setIsSubmitting(true);
    const tripsToAdd: Trip[] = [];

    const trip1: Trip = {
      ...outbound,
      id: `t-${Date.now()}-1`,
      driverId: user.id,
      driver: user,
      seatsBooked: 0,
      tripGroupId: hasReturn ? groupId : undefined,
      isReturn: false,
    } as Trip;

    tripsToAdd.push(trip1);

    if (hasReturn && returnTrip.date) {
      const trip2: Trip = {
        ...returnTrip,
        id: `t-${Date.now()}-2`,
        driverId: user.id,
        driver: user,
        seatsBooked: 0,
        tripGroupId: groupId,
        isReturn: true,
      } as Trip;
      tripsToAdd.push(trip2);
    }

    await addTrip(tripsToAdd);
    setIsSubmitting(false);
    navigate('/');
  };

  const toggleCities = (isOutbound: boolean) => {
    if (isOutbound) {
      setOutbound(prev => ({ ...prev, from: prev.to, to: prev.from }));
      if (hasReturn) {
        setReturnTrip(prev => ({ ...prev, from: outbound.to, to: outbound.from }));
      }
    } else {
      setReturnTrip(prev => ({ ...prev, from: prev.to, to: prev.from }));
    }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24 animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
          <Car className="text-[color:var(--steel-blue)]" size={28} />
        </div>
        <div>
          <p className="industrial-kicker mb-1">Новый рейс</p>
          <h2 className="industrial-page-title">Создать поездку</h2>
        </div>
      </div>

      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-1 bg-[color:var(--steel-blue)]"></div>
        <h3 className="mb-4 flex items-center justify-between text-lg font-semibold text-[color:var(--app-text)]">
          <span>Часть 1: Туда</span>
          <button
            onClick={() => toggleCities(true)}
            className="flex items-center gap-1 text-sm text-[color:var(--steel-blue)] hover:underline"
          >
            Поменять направление <ArrowRight size={14} />
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
            <MapPin size={20} className="text-[color:var(--steel-blue)]" />
            <div className="flex-1">
              <p className="text-xs text-[color:var(--app-text-muted)]">Маршрут</p>
              <p className="font-medium text-[color:var(--app-text)]">
                {getCityName(outbound.from!)} → {getCityName(outbound.to!)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">Дата</label>
              <input
                type="date"
                className="industrial-input p-2 text-sm"
                onChange={e => setOutbound({ ...outbound, date: e.target.value })}
              />
            </div>
            <div className="w-1/3">
              <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">Время</label>
              <input
                type="time"
                className="industrial-input p-2 text-sm"
                onChange={e => setOutbound({ ...outbound, time: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">
            Свободных мест
          </label>
          <select
            value={outboundPassengerSeats}
            className="industrial-input p-2 text-sm"
            onChange={e => setOutbound({ ...outbound, seatsTotal: Number(e.target.value) + 1 })}
          >
            <option value={1}>1 место</option>
            <option value={2}>2 места</option>
            <option value={3}>3 места</option>
          </select>
          <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
            Укажите число пассажирских мест (без водителя).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <LocationInput
            value={outbound.pickupLocation || ''}
            onChange={loc =>
              setOutbound({
                ...outbound,
                pickupLocation: loc.address,
                pickupLat: loc.lat,
                pickupLng: loc.lng,
              })
            }
            city={outbound.from!}
            placeholder="Откуда (напр. Метро Аннино)"
            label="Место посадки"
            onOpenMap={() =>
              setMapPickerOpen({
                type: 'outbound-pickup',
                city: outbound.from!,
                initialLocation: outbound.pickupLocation
                  ? {
                      address: outbound.pickupLocation,
                      lat: outbound.pickupLat,
                      lng: outbound.pickupLng,
                    }
                  : undefined,
              })
            }
          />
          <LocationInput
            value={outbound.dropoffLocation || ''}
            onChange={loc =>
              setOutbound({
                ...outbound,
                dropoffLocation: loc.address,
                dropoffLat: loc.lat,
                dropoffLng: loc.lng,
              })
            }
            city={outbound.to!}
            placeholder="Куда (напр. Центр)"
            label="Место высадки"
            onOpenMap={() =>
              setMapPickerOpen({
                type: 'outbound-dropoff',
                city: outbound.to!,
                initialLocation: outbound.dropoffLocation
                  ? {
                      address: outbound.dropoffLocation,
                      lat: outbound.dropoffLat,
                      lng: outbound.dropoffLng,
                    }
                  : undefined,
              })
            }
          />
        </div>

        <textarea
          placeholder="Комментарий (напр., 'Выезжаю рано, тихая поездка')"
          className="industrial-input mb-4 h-20 p-3 text-sm"
          onChange={e => setOutbound({ ...outbound, comment: e.target.value })}
        ></textarea>

        <div className="mb-2 text-xs text-[color:var(--app-text-muted)]">
          Предпочтения (из профиля)
        </div>
        <PreferenceRow prefs={outbound.preferences!} />
      </Card>

      {hasReturn ? (
        <Card className="mb-6 relative overflow-hidden border-l-4 border-l-[color:var(--app-border-strong)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--app-text)]">Часть 2: Обратно</h3>
            <button
              onClick={() => setHasReturn(false)}
              className="text-xs text-[color:var(--danger)] hover:underline"
            >
              Удалить обратный путь
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-3">
              <MapPin size={20} className="text-[color:var(--app-text-muted)]" />
              <div className="flex-1">
                <p className="text-xs text-[color:var(--app-text-muted)]">Маршрут</p>
                <p className="font-medium text-[color:var(--app-text)]">
                  {getCityName(returnTrip.from!)} → {getCityName(returnTrip.to!)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">
                  Дата
                </label>
                <input
                  type="date"
                  className="industrial-input p-2 text-sm"
                  onChange={e => setReturnTrip({ ...returnTrip, date: e.target.value })}
                />
              </div>
              <div className="w-1/3">
                <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">
                  Время
                </label>
                <input
                  type="time"
                  className="industrial-input p-2 text-sm"
                  onChange={e => setReturnTrip({ ...returnTrip, time: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs text-[color:var(--app-text-muted)]">
              Свободных мест
            </label>
            <select
              value={returnPassengerSeats}
              className="industrial-input p-2 text-sm"
              onChange={e =>
                setReturnTrip({ ...returnTrip, seatsTotal: Number(e.target.value) + 1 })
              }
            >
              <option value={1}>1 место</option>
              <option value={2}>2 места</option>
              <option value={3}>3 места</option>
            </select>
            <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">
              Укажите число пассажирских мест (без водителя).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <LocationInput
              value={returnTrip.pickupLocation || ''}
              onChange={loc =>
                setReturnTrip({
                  ...returnTrip,
                  pickupLocation: loc.address,
                  pickupLat: loc.lat,
                  pickupLng: loc.lng,
                })
              }
              city={returnTrip.from!}
              placeholder="Откуда (напр. Метро)"
              label="Место посадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'return-pickup',
                  city: returnTrip.from!,
                  initialLocation: returnTrip.pickupLocation
                    ? {
                        address: returnTrip.pickupLocation,
                        lat: returnTrip.pickupLat,
                        lng: returnTrip.pickupLng,
                      }
                    : undefined,
                })
              }
            />
            <LocationInput
              value={returnTrip.dropoffLocation || ''}
              onChange={loc =>
                setReturnTrip({
                  ...returnTrip,
                  dropoffLocation: loc.address,
                  dropoffLat: loc.lat,
                  dropoffLng: loc.lng,
                })
              }
              city={returnTrip.to!}
              placeholder="Куда (напр. Центр)"
              label="Место высадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'return-dropoff',
                  city: returnTrip.to!,
                  initialLocation: returnTrip.dropoffLocation
                    ? {
                        address: returnTrip.dropoffLocation,
                        lat: returnTrip.dropoffLat,
                        lng: returnTrip.dropoffLng,
                      }
                    : undefined,
                })
              }
            />
          </div>

          <textarea
            placeholder="Комментарий (опционально)"
            className="industrial-input mb-4 h-20 p-3 text-sm"
            onChange={e => setReturnTrip({ ...returnTrip, comment: e.target.value })}
          ></textarea>

          <div className="mb-2 text-xs text-[color:var(--app-text-muted)]">
            Предпочтения (из профиля)
          </div>
          <PreferenceRow prefs={returnTrip.preferences!} />
        </Card>
      ) : (
        <div className="flex justify-center mb-8">
          <Button variant="secondary" onClick={() => setHasReturn(true)}>
            + Добавить обратный путь
          </Button>
        </div>
      )}

      <div className="app-surface fixed bottom-0 left-0 z-[60] flex w-full justify-center border-t p-4 pb-20 md:pb-4">
        <Button onClick={handleSubmit} className="w-full max-w-md" loading={isSubmitting}>
          Опубликовать
        </Button>
      </div>

      {mapPickerOpen && (
        <MapPicker
          isOpen={true}
          onClose={() => setMapPickerOpen(null)}
          city={mapPickerOpen.city}
          initialLocation={mapPickerOpen.initialLocation}
          onSelect={location => {
            if (mapPickerOpen.type === 'outbound-pickup') {
              setOutbound({
                ...outbound,
                pickupLocation: location.address,
                pickupLat: location.lat,
                pickupLng: location.lng,
              });
            } else if (mapPickerOpen.type === 'outbound-dropoff') {
              setOutbound({
                ...outbound,
                dropoffLocation: location.address,
                dropoffLat: location.lat,
                dropoffLng: location.lng,
              });
            } else if (mapPickerOpen.type === 'return-pickup') {
              setReturnTrip({
                ...returnTrip,
                pickupLocation: location.address,
                pickupLat: location.lat,
                pickupLng: location.lng,
              });
            } else if (mapPickerOpen.type === 'return-dropoff') {
              setReturnTrip({
                ...returnTrip,
                dropoffLocation: location.address,
                dropoffLat: location.lat,
                dropoffLng: location.lng,
              });
            }
            setMapPickerOpen(null);
          }}
        />
      )}
    </div>
  );
}
