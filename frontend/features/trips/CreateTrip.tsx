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
    seatsTotal: 3,
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
    seatsTotal: 3,
    pickupLocation: '',
    dropoffLocation: '',
    comment: '',
    preferences: user.defaultPreferences,
    isReturn: true,
  });

  const [hasReturn, setHasReturn] = useState(true);

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
    <div className="max-w-2xl mx-auto pb-24 animate-fade-in">
      <h2 className="text-3xl font-light text-slate-800 mb-6 flex items-center gap-2">
        <Car className="text-sky-400" /> Создать поездку
      </h2>

      <Card className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 bg-sky-400 h-full"></div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-between">
          <span>Часть 1: Туда</span>
          <button
            onClick={() => toggleCities(true)}
            className="text-sm text-sky-500 hover:underline flex items-center gap-1"
          >
            Поменять направление <ArrowRight size={14} />
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <MapPin size={20} className="text-sky-500" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">Маршрут</p>
              <p className="font-medium text-gray-800">
                {getCityName(outbound.from!)} → {getCityName(outbound.to!)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 block mb-1">Дата</label>
              <input
                type="date"
                className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                onChange={e => setOutbound({ ...outbound, date: e.target.value })}
              />
            </div>
            <div className="w-1/3">
              <label className="text-xs text-gray-400 block mb-1">Время</label>
              <input
                type="time"
                className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                onChange={e => setOutbound({ ...outbound, time: e.target.value })}
              />
            </div>
          </div>
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
          className="w-full bg-gray-50 p-3 rounded-lg text-sm h-20 mb-4"
          onChange={e => setOutbound({ ...outbound, comment: e.target.value })}
        ></textarea>

        <div className="text-xs text-gray-400 mb-2">Предпочтения (из профиля)</div>
        <PreferenceRow prefs={outbound.preferences!} />
      </Card>

      {hasReturn ? (
        <Card className="mb-6 relative overflow-hidden opacity-90 border-l-4 border-l-pink-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Часть 2: Обратно</h3>
            <button
              onClick={() => setHasReturn(false)}
              className="text-xs text-red-400 hover:text-red-500"
            >
              Удалить обратный путь
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
              <MapPin size={20} className="text-pink-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">Маршрут</p>
                <p className="font-medium text-gray-800">
                  {getCityName(returnTrip.from!)} → {getCityName(returnTrip.to!)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Дата</label>
                <input
                  type="date"
                  className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                  onChange={e => setReturnTrip({ ...returnTrip, date: e.target.value })}
                />
              </div>
              <div className="w-1/3">
                <label className="text-xs text-gray-400 block mb-1">Время</label>
                <input
                  type="time"
                  className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                  onChange={e => setReturnTrip({ ...returnTrip, time: e.target.value })}
                />
              </div>
            </div>
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
            className="w-full bg-gray-50 p-3 rounded-lg text-sm h-20 mb-4"
            onChange={e => setReturnTrip({ ...returnTrip, comment: e.target.value })}
          ></textarea>

          <div className="text-xs text-gray-400 mb-2">Предпочтения (из профиля)</div>
          <PreferenceRow prefs={returnTrip.preferences!} />
        </Card>
      ) : (
        <div className="flex justify-center mb-8">
          <Button variant="secondary" onClick={() => setHasReturn(true)}>
            + Добавить обратный путь
          </Button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 w-full p-4 md:pb-4 pb-20 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-center z-[60]">
        <Button
          onClick={handleSubmit}
          className="w-full max-w-md shadow-xl shadow-sky-200/50"
          loading={isSubmitting}
        >
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
