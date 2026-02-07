import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HashRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  Car,
  Sun,
  Moon,
  MapPin,
  Calendar,
  Clock,
  User as UserIcon,
  PlusCircle,
  Search,
  LogOut,
  ArrowRight,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Edit2,
  Save,
  X,
  Loader2,
  Trash2,
  Users,
  Phone,
  Camera,
  FileText,
  Briefcase,
  Mail,
  Upload,
  Star,
  MessageSquare,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';
import {
  City,
  Role,
  User,
  Trip,
  Preferences,
  MusicPref,
  BaggageSize,
  ConversationPref,
  Review,
  PendingReview,
  PassengerRequest,
  RequestStats,
} from './types';
import { DEFAULT_PREFERENCES, APP_NAME, APP_VERSION } from './constants';
import { PreferenceRow } from './components/Icons';
import { generateAssistantResponse } from './services/geminiService';
import { api } from './services/api';
import { YandexMapsProvider } from './services/YandexMapsProvider';
import { LocationInput } from './components/LocationInput';
import { MapPicker } from './components/MapPicker';
import { LocationData } from './services/yandexMapsService';
import { Button, Card, Badge, Stars } from './components/ui';
import { getCityName, formatDate, formatTime } from './utils/helpers';

// --- Review Modal ---

const ReviewModal = ({
  isOpen,
  onClose,
  trip,
  targetUser,
  onSubmit,
  onSkip,
}: {
  isOpen: boolean;
  onClose: () => void;
  trip: PendingReview['trip'];
  targetUser: User;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => Promise<void>;
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

// --- Features ---

const Assistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await generateAssistantResponse(prompt);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-72 bg-white rounded-2xl shadow-2xl p-4 border border-sky-100 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sky-800 flex items-center gap-2">
              <Sparkles size={16} /> Помощник
            </h4>
            <button onClick={() => setIsOpen(false)}>
              <LogOut size={14} className="rotate-45" />
            </button>
          </div>
          <div className="bg-sky-50 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] mb-3">
            {loading ? (
              <span className="animate-pulse">Думаю...</span>
            ) : (
              response || 'Спроси меня о погоде или попроси придумать комментарий к поездке!'
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 text-sm border-gray-200 rounded-lg px-2 py-1 outline-none border focus:border-sky-300"
              placeholder="Напиши сюда..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              className="bg-sky-500 text-white rounded-lg px-2 hover:bg-sky-600"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Sparkles size={24} />
      </button>
    </div>
  );
};

const CreateTrip = ({ user, addTrip }: { user: User; addTrip: (t: Trip[]) => Promise<void> }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MapPicker state
  const [mapPickerOpen, setMapPickerOpen] = useState<{
    type: 'outbound-pickup' | 'outbound-dropoff' | 'return-pickup' | 'return-dropoff';
    city: City;
    initialLocation?: LocationData;
  } | null>(null);

  // Form State
  const [outbound, setOutbound] = useState<Partial<Trip>>({
    from: City.Moscow,
    to: City.Lipetsk,
    date: '',
    time: '',
    seatsTotal: 3, // Logic cap 2 passengers + driver
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

    // Validation check
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

  // Toggle Cities logic
  const toggleCities = (isOutbound: boolean) => {
    if (isOutbound) {
      setOutbound(prev => ({ ...prev, from: prev.to, to: prev.from }));
      // Auto update return leg to match
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

      {/* Step 1: Outbound */}
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

      {/* Step 2: Return */}
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

      {/* MapPicker Modal */}
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
};

const TripList = ({
  trips,
  joinTrip,
  cancelBooking,
  deleteTrip,
  onEdit,
  user,
  loading,
}: {
  trips: Trip[];
  joinTrip: (id: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  onEdit: (trip: Trip) => void;
  user: User;
  loading: boolean;
}) => {
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    await joinTrip(id);
    setJoiningId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите отменить эту поездку?')) return;
    setDeletingId(id);
    await deleteTrip(id);
    setDeletingId(null);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Отменить ваше бронирование?')) return;
    setCancelingId(bookingId);
    await cancelBooking(bookingId);
    setCancelingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
        <Loader2 size={40} className="animate-spin text-sky-400" />
        <p>Загрузка расписания...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 animate-fade-in">
      {trips.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <Car size={64} className="mx-auto mb-4 text-sky-200" />
          <p>Поездок пока нет.</p>
        </div>
      ) : (
        trips.map(trip => {
          const maxPassengers = Math.max(0, trip.seatsTotal - 1);
          const availableSeats = Math.max(0, maxPassengers - trip.seatsBooked);
          const isFull = availableSeats === 0;
          const isMyTrip = trip.driverId === user.id;
          const passengers = trip.passengers || [];
          const isPassenger = passengers.some(p => p.id === user.id);
          const myBookingId = trip.myBookingId;
          const isBooked = isPassenger || !!myBookingId;

          return (
            <Card key={trip.id} className="relative group overflow-hidden">
              {/* Route Line Visualization */}
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Car size={100} />
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={trip.from === City.Moscow ? 'blue' : 'pink'}>
                      {getCityName(trip.from)} → {getCityName(trip.to)}
                    </Badge>
                    {trip.isReturn && <Badge color="gray">Обратно</Badge>}
                    {isMyTrip && <Badge color="green">Ваша поездка</Badge>}
                    {/* Highlight urgent trips */}
                    {new Date(`${trip.date}T${trip.time}`).getTime() - Date.now() < 7200000 &&
                      new Date(`${trip.date}T${trip.time}`).getTime() > Date.now() && (
                        <span className="text-xs text-orange-500 font-bold animate-pulse flex items-center gap-1">
                          <Clock size={12} /> Скоро отправление
                        </span>
                      )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {formatTime(trip.time)}{' '}
                    <span className="text-sm font-normal text-gray-500">
                      {' '}
                      {formatDate(trip.date)}
                    </span>
                  </h3>
                </div>
                <div className="text-right flex items-center gap-2 relative z-10">
                  <div className="text-2xl font-light text-sky-600">
                    {availableSeats} <span className="text-xs text-gray-400">мест</span>
                  </div>
                  {isMyTrip && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onEdit(trip);
                        }}
                        className="p-2 text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors z-20"
                        title="Редактировать"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(trip.id);
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-20"
                        disabled={deletingId === trip.id}
                        title="Удалить"
                      >
                        {deletingId === trip.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <Link
                to={`/user/${trip.driver.id}`}
                className="flex items-center gap-4 mb-4 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <img
                  src={trip.driver.avatarUrl}
                  alt={trip.driver.name}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 hover:text-sky-600">
                    {trip.driver.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    ★ {trip.driver.rating.toFixed(1)} Водитель
                  </p>
                </div>
              </Link>

              {/* Passengers section */}
              {passengers.length > 0 && (
                <div className="mb-4 p-3 bg-green-50/50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                    <Users size={14} />
                    <span className="font-medium">Пассажиры ({passengers.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {passengers.map(p => (
                      <Link
                        key={p.id}
                        to={`/user/${p.id}`}
                        className="flex items-center gap-2 bg-white px-2 py-1 rounded-full shadow-sm hover:bg-sky-50 transition-colors"
                      >
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs text-gray-700 hover:text-sky-600">{p.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Pickup/Dropoff Locations */}
              <div className="bg-gradient-to-r from-sky-50 to-pink-50 rounded-xl p-4 mb-4">
                <div className="space-y-3">
                  {/* Откуда */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-sky-400 border-2 border-white shadow"></div>
                      <div className="w-0.5 h-6 bg-gradient-to-b from-sky-300 to-pink-300"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">Откуда</p>
                      <p className="text-sm text-gray-700 leading-tight">{trip.pickupLocation}</p>
                    </div>
                  </div>
                  {/* Куда */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-pink-400 border-2 border-white shadow"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">Куда</p>
                      <p className="text-sm text-gray-700 leading-tight">{trip.dropoffLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {trip.comment && (
                <div className="mb-4 text-sm text-gray-500 italic">"{trip.comment}"</div>
              )}

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <PreferenceRow prefs={trip.preferences} />
                {!isMyTrip && myBookingId && (
                  <Button
                    onClick={() => handleCancelBooking(myBookingId)}
                    variant="danger"
                    className="px-4 py-2 text-sm"
                    loading={cancelingId === myBookingId}
                  >
                    Отменить
                  </Button>
                )}
                {!isMyTrip && !myBookingId && (
                  <Button
                    onClick={() => handleJoin(trip.id)}
                    disabled={isFull || isBooked}
                    variant={isFull ? 'ghost' : 'primary'}
                    className="px-4 py-2 text-sm"
                    loading={joiningId === trip.id}
                  >
                    {isBooked ? 'Вы записаны' : isFull ? 'Занято' : 'Поехать'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
};

// --- Create Request ---

const CreateRequest = ({
  user,
  addRequest,
}: {
  user: User;
  addRequest: (data: any) => Promise<void>;
}) => {
  const navigate = useNavigate();
  const [from, setFrom] = useState<City>(
    user.homeCity === City.Moscow ? City.Moscow : City.Lipetsk
  );
  const [to, setTo] = useState<City>(user.homeCity === City.Moscow ? City.Lipetsk : City.Moscow);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timePreferred, setTimePreferred] = useState('');
  const [passengersCount, setPassengersCount] = useState(1);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default dates (today + 7 days)
  useEffect(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const formatDateInput = (d: Date) => d.toISOString().split('T')[0];
    setDateFrom(formatDateInput(today));
    setDateTo(formatDateInput(nextWeek));
  }, []);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      alert('Укажите даты');
      return;
    }

    if (dateFrom > dateTo) {
      alert('Дата "от" должна быть не позже даты "до"');
      return;
    }

    setIsSubmitting(true);
    try {
      await addRequest({
        from,
        to,
        dateFrom,
        dateTo,
        timePreferred: timePreferred || undefined,
        passengersCount,
        comment,
        preferences: user.defaultPreferences,
      });
      alert('Заявка создана!');
      navigate('/requests');
    } catch (error) {
      // Error handled in addRequest
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <ClipboardList className="text-emerald-600" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Новая заявка</h1>
          <p className="text-gray-500 text-sm">Ищу попутную поездку</p>
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Маршрут</h3>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-2">Откуда</label>
            <select
              value={from}
              onChange={e => {
                setFrom(e.target.value as City);
                setTo(e.target.value === City.Moscow ? City.Lipetsk : City.Moscow);
              }}
              className="w-full p-3 rounded-xl border border-gray-200 bg-white"
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
          <div className="flex items-end pb-3">
            <ArrowRight size={20} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-500 mb-2">Куда</label>
            <select
              value={to}
              onChange={e => setTo(e.target.value as City)}
              className="w-full p-3 rounded-xl border border-gray-200 bg-white"
              disabled
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Когда нужна поездка</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">С даты</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border border-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">По дату</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom || new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border border-gray-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Желаемое время (опционально)</label>
          <input
            type="time"
            value={timePreferred}
            onChange={e => setTimePreferred(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200"
          />
        </div>
      </Card>

      <Card className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Детали</h3>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-2">Количество пассажиров</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setPassengersCount(n)}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  passengersCount === n
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {n} {n === 1 ? 'пассажир' : n < 5 ? 'пассажира' : 'пассажиров'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-2">Комментарий (опционально)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Например: гибкий по времени, могу подстроиться..."
            className="w-full p-3 rounded-xl border border-gray-200 resize-none h-24"
            maxLength={500}
          />
        </div>
      </Card>

      <Button
        onClick={handleSubmit}
        className="w-full"
        loading={isSubmitting}
        disabled={!dateFrom || !dateTo}
      >
        <ClipboardList size={20} />
        Создать заявку
      </Button>
    </div>
  );
};

// --- Requests List ---

interface RequestCardProps {
  request: PassengerRequest;
  currentUser: User;
  onCancel?: (id: string) => Promise<void>;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, currentUser, onCancel }) => {
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
          <img
            src={request.requester.avatarUrl}
            alt={request.requester.name}
            className="w-10 h-10 rounded-full"
          />
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

const RequestsList = ({
  requests,
  user,
  loading,
  onCancelRequest,
}: {
  requests: PassengerRequest[];
  user: User;
  loading: boolean;
  onCancelRequest?: (id: string) => Promise<void>;
}) => {
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

      {/* Filter tabs */}
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
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-sky-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card className="text-center py-12">
          <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Нет активных заявок</h3>
          <p className="text-gray-500 text-sm">Пассажиры пока не оставили заявок на этот маршрут</p>
        </Card>
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

      {/* CTA for drivers */}
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
};

const Schedule = ({
  trips,
  joinTrip,
  cancelBooking,
  deleteTrip,
  onEdit,
  user,
  loading,
}: {
  trips: Trip[];
  joinTrip: (id: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  onEdit: (trip: Trip) => void;
  user: User;
  loading: boolean;
}) => {
  const [filterDir, setFilterDir] = useState<string>('all'); // all, moscow-lipetsk, lipetsk-moscow, my-trips
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');

  const filteredTrips = useMemo(() => {
    return trips
      .filter(t => {
        // My trips filter - where I'm driver or passenger
        if (filterDir === 'my-trips') {
          const isDriver = t.driverId === user.id;
          const isPassenger = t.passengers?.some(p => p.id === user.id);
          if (!isDriver && !isPassenger) return false;
        }

        // Direction filter
        if (filterDir === 'moscow-lipetsk' && t.from !== City.Moscow) return false;
        if (filterDir === 'lipetsk-moscow' && t.from !== City.Lipetsk) return false;

        // Date Range Filter
        if (filterDateStart && t.date < filterDateStart) return false;
        if (filterDateEnd && t.date > filterDateEnd) return false;

        return true;
      })
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
  }, [trips, filterDir, filterDateStart, filterDateEnd, user.id]);

  return (
    <div className="pb-20">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-light text-slate-800">Расписание</h1>
          <p className="text-sm text-gray-400">Корпоративный карпулинг</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterDir('all')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-gray-600'}`}
          >
            Все поездки
          </button>
          <button
            onClick={() => setFilterDir('my-trips')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'my-trips' ? 'bg-green-500 text-white' : 'bg-white text-gray-600'}`}
          >
            Мои поездки
          </button>
          <button
            onClick={() => setFilterDir('moscow-lipetsk')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'moscow-lipetsk' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'}`}
          >
            Москва → Липецк
          </button>
          <button
            onClick={() => setFilterDir('lipetsk-moscow')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${filterDir === 'lipetsk-moscow' ? 'bg-pink-500 text-white' : 'bg-white text-gray-600'}`}
          >
            Липецк → Москва
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400">C</span>
            </div>
            <input
              type="date"
              value={filterDateStart}
              onChange={e => setFilterDateStart(e.target.value)}
              className="pl-8 pr-4 py-2 bg-white rounded-xl text-sm text-gray-600 shadow-sm border border-transparent focus:border-sky-300 outline-none w-full"
              placeholder="Начало"
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400">По</span>
            </div>
            <input
              type="date"
              value={filterDateEnd}
              onChange={e => setFilterDateEnd(e.target.value)}
              className="pl-8 pr-4 py-2 bg-white rounded-xl text-sm text-gray-600 shadow-sm border border-transparent focus:border-sky-300 outline-none w-full"
              placeholder="Конец"
            />
          </div>
          {(filterDateStart || filterDateEnd) && (
            <button
              onClick={() => {
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
              className="px-3 py-2 text-gray-500 bg-white rounded-xl shadow-sm hover:bg-gray-100"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <TripList
        trips={filteredTrips}
        joinTrip={joinTrip}
        cancelBooking={cancelBooking}
        deleteTrip={deleteTrip}
        onEdit={onEdit}
        user={user}
        loading={loading}
      />
    </div>
  );
};

const Profile = ({
  user,
  updateUser,
  onLogout,
  trips,
  pendingReviews,
  userReviews,
  onSubmitReview,
  onSkipReview,
  refreshReviews,
  myRequests = [],
  onCancelRequest,
}: {
  user: User;
  updateUser: (u: User) => Promise<void>;
  onLogout: () => void;
  trips: Trip[];
  pendingReviews: PendingReview[];
  userReviews: Review[];
  onSubmitReview: (
    tripId: string,
    targetUserId: string,
    rating: number,
    comment: string
  ) => Promise<void>;
  onSkipReview: (tripId: string, targetUserId: string) => Promise<void>;
  refreshReviews: () => void;
  myRequests?: PassengerRequest[];
  onCancelRequest?: (requestId: string) => Promise<void>;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Review modal state
  const [reviewModalData, setReviewModalData] = useState<{
    trip: PendingReview['trip'];
    targetUser: User;
  } | null>(null);

  // Get user's active trips
  const myActiveTrips = useMemo(() => {
    const now = new Date();
    return trips
      .filter(t => {
        const isDriver = t.driverId === user.id;
        const isPassenger = t.passengers?.some(p => p.id === user.id);
        const tripDate = new Date(`${t.date}T${t.time}`);
        const isActive = tripDate >= now;
        return (isDriver || isPassenger) && isActive;
      })
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
      );
  }, [trips, user.id]);

  const handleOpenReviewModal = (trip: PendingReview['trip'], targetUser: User) => {
    setReviewModalData({ trip, targetUser });
  };

  const handleCloseReviewModal = () => {
    setReviewModalData(null);
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!reviewModalData) return;
    await onSubmitReview(reviewModalData.trip.id, reviewModalData.targetUser.id, rating, comment);
    setReviewModalData(null);
    await refreshReviews();
  };

  const handleSkipReview = async () => {
    if (!reviewModalData) return;
    await onSkipReview(reviewModalData.trip.id, reviewModalData.targetUser.id);
    setReviewModalData(null);
    await refreshReviews();
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateUser(editData);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(user);
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение (JPG, PNG, etc.)');
      return;
    }

    // Max 5 MB for original file
    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 5 МБ');
      return;
    }

    try {
      // Compress image using canvas
      const compressedDataUrl = await compressImage(file, 800, 0.8);
      setEditData({ ...editData, avatarUrl: compressedDataUrl });
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Ошибка при обработке изображения. Попробуйте другой файл.');
    }
  };

  // Compress image to max dimension and quality
  const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if larger than maxSize
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const togglePreference = (key: keyof Preferences) => {
    if (!isEditing) return;
    const current = editData.defaultPreferences;
    if (key === 'smoking')
      setEditData({ ...editData, defaultPreferences: { ...current, smoking: !current.smoking } });
    if (key === 'pets')
      setEditData({ ...editData, defaultPreferences: { ...current, pets: !current.pets } });
    if (key === 'ac')
      setEditData({ ...editData, defaultPreferences: { ...current, ac: !current.ac } });
  };

  const cycleEnum = (key: keyof Preferences, enumObj: any) => {
    if (!isEditing) return;
    const values = Object.values(enumObj);
    const currentVal = editData.defaultPreferences[key];
    const nextIndex = (values.indexOf(currentVal) + 1) % values.length;
    setEditData({
      ...editData,
      defaultPreferences: { ...editData.defaultPreferences, [key]: values[nextIndex] },
    });
  };

  return (
    <div className="pb-20 animate-fade-in">
      <Card className="flex flex-col items-center text-center mb-6 pt-10 pb-10 relative">
        <div className="absolute top-4 right-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100"
              >
                <X size={20} />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-full bg-gray-50 text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
            >
              <Edit2 size={20} />
            </button>
          )}
        </div>

        <div className="relative mb-4">
          <img
            src={isEditing ? editData.avatarUrl : user.avatarUrl}
            alt={user.name}
            className="w-24 h-24 rounded-full border-4 border-sky-50 shadow-lg object-cover"
          />
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full shadow-lg hover:bg-sky-600 transition-colors"
            >
              <Camera size={16} className="text-white" />
            </button>
          )}
          {!isEditing && (
            <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
              <CheckCircle size={20} className="text-blue-500 fill-blue-100" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-3 mb-4">
            <input
              type="text"
              value={editData.name}
              onChange={e => setEditData({ ...editData, name: e.target.value })}
              className="w-full text-center text-xl font-bold text-gray-800 border-b border-sky-200 focus:outline-none bg-transparent"
              placeholder="Имя"
            />
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <Briefcase size={16} className="text-gray-400" />
              <input
                type="text"
                value={editData.position || ''}
                onChange={e => setEditData({ ...editData, position: e.target.value })}
                className="flex-1 text-sm text-gray-600 bg-transparent focus:outline-none"
                placeholder="Должность"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <Phone size={16} className="text-gray-400" />
              <input
                type="tel"
                value={editData.phone || ''}
                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                className="flex-1 text-sm text-gray-600 bg-transparent focus:outline-none"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
              <FileText size={16} className="text-gray-400 mt-1" />
              <textarea
                value={editData.bio || ''}
                onChange={e => setEditData({ ...editData, bio: e.target.value })}
                className="flex-1 text-sm text-gray-600 bg-transparent focus:outline-none resize-none"
                placeholder="О себе и интересах..."
                rows={3}
                maxLength={500}
              />
            </div>
            <select
              value={editData.homeCity}
              onChange={e => setEditData({ ...editData, homeCity: e.target.value as City })}
              className="w-full text-center text-gray-500 bg-white border border-gray-200 rounded-lg p-2"
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
            <select
              value={editData.role}
              onChange={e => setEditData({ ...editData, role: e.target.value as Role })}
              className="w-full text-center text-gray-500 bg-white border border-gray-200 rounded-lg p-2"
            >
              <option value={Role.Passenger}>Пассажир</option>
              <option value={Role.Driver}>Водитель</option>
              <option value={Role.Both}>Водитель и Пассажир</option>
            </select>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
            {user.position && (
              <p className="text-sm text-sky-600 flex items-center gap-1 mb-1">
                <Briefcase size={14} /> {user.position}
              </p>
            )}
            <p className="text-gray-500 mb-2">{getCityName(user.homeCity)}</p>
            <p className="text-sm text-gray-400 flex items-center gap-1 mb-2">
              <Mail size={14} /> {user.email}
            </p>
            {user.phone && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                <Phone size={14} /> {user.phone}
              </p>
            )}
            {user.bio && <p className="text-sm text-gray-500 italic max-w-xs mb-2">"{user.bio}"</p>}
          </>
        )}

        {!isEditing && (
          <div className="flex gap-1 text-yellow-400 text-sm mb-4">
            {'★'.repeat(Math.round(user.rating))}
            <span className="text-gray-300">({user.rating})</span>
          </div>
        )}

        {!isEditing && (
          <div className="w-full flex justify-center gap-2 mb-4">
            <Badge color="gray">{user.role}</Badge>
            <Badge color="blue">Сотрудник</Badge>
          </div>
        )}

        <div
          className={`w-full bg-gray-50 rounded-xl p-4 transition-all ${isEditing ? 'border-2 border-sky-200 bg-sky-50' : ''}`}
        >
          <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-wider flex items-center justify-center gap-2">
            {isEditing && <Edit2 size={10} />}
            Предпочтения {isEditing && '(Нажми для изменения)'}
          </h3>

          {isEditing ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => cycleEnum('music', MusicPref)}
                className="px-3 py-1 bg-white rounded-full text-xs shadow-sm border"
              >
                {editData.defaultPreferences.music}
              </button>
              <button
                onClick={() => togglePreference('smoking')}
                className={`px-3 py-1 rounded-full text-xs shadow-sm border ${editData.defaultPreferences.smoking ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                Курение {editData.defaultPreferences.smoking ? 'Да' : 'Нет'}
              </button>
              <button
                onClick={() => togglePreference('pets')}
                className={`px-3 py-1 rounded-full text-xs shadow-sm border ${editData.defaultPreferences.pets ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                Животные {editData.defaultPreferences.pets ? 'Да' : 'Нет'}
              </button>
              <button
                onClick={() => cycleEnum('conversation', ConversationPref)}
                className="px-3 py-1 bg-white rounded-full text-xs shadow-sm border"
              >
                {editData.defaultPreferences.conversation}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <PreferenceRow prefs={user.defaultPreferences} />
            </div>
          )}
        </div>
      </Card>

      <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2">Мои активные поездки</h3>
      <div className="space-y-4">
        {myActiveTrips.length === 0 ? (
          <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between text-gray-400 italic">
            <span>Нет активных поездок.</span>
          </div>
        ) : (
          myActiveTrips.map(trip => {
            const isDriver = trip.driverId === user.id;
            return (
              <Link to="/" key={trip.id} className="block">
                <Card className="hover:shadow-2xl cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Badge color={trip.from === City.Moscow ? 'blue' : 'pink'}>
                        {getCityName(trip.from)} → {getCityName(trip.to)}
                      </Badge>
                      {isDriver ? (
                        <Badge color="green">Вы водитель</Badge>
                      ) : (
                        <Badge color="gray">Вы пассажир</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{formatTime(trip.time)}</div>
                      <div className="text-xs text-gray-500">{formatDate(trip.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-sky-400" />
                    <span>{trip.pickupLocation}</span>
                    <ArrowRight size={12} className="text-gray-300" />
                    <span>{trip.dropoffLocation}</span>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* Pending Reviews Section */}
      {pendingReviews.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2 mt-8 flex items-center gap-2">
            <Star size={18} className="text-yellow-400" />
            Оцените поездки
            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
              {pendingReviews.reduce((sum, pr) => sum + pr.pendingFor.length, 0)}
            </span>
          </h3>
          <div className="space-y-4">
            {pendingReviews.map(({ trip, pendingFor }) => (
              <Card key={trip.id} className="border-l-4 border-l-yellow-400">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Badge color={trip.from === 'Moscow' ? 'blue' : 'pink'}>
                      {trip.from === 'Moscow' ? 'Москва' : 'Липецк'} →{' '}
                      {trip.to === 'Moscow' ? 'Москва' : 'Липецк'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-800">{trip.time}</div>
                    <div className="text-xs text-gray-500">{formatDate(trip.date)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingFor.map(targetUser => (
                    <button
                      key={targetUser.id}
                      onClick={() => handleOpenReviewModal(trip, targetUser)}
                      className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 px-3 py-2 rounded-xl transition-colors"
                    >
                      <img
                        src={targetUser.avatarUrl}
                        alt={targetUser.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-sm text-gray-700">{targetUser.name}</span>
                      <Star size={14} className="text-yellow-500" />
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* User Reviews Section */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2 mt-8 flex items-center gap-2">
        <MessageSquare size={18} className="text-sky-400" />
        Отзывы обо мне
        {userReviews.length > 0 && (
          <span className="text-sm text-gray-400 font-normal">({userReviews.length})</span>
        )}
      </h3>
      <div className="space-y-4">
        {userReviews.length === 0 ? (
          <div className="bg-white/60 p-4 rounded-xl text-gray-400 italic text-center">
            Пока нет отзывов
          </div>
        ) : (
          userReviews.map(review => (
            <Card key={review.id}>
              <div className="flex items-start gap-3">
                <Link to={`/user/${review.author?.id}`}>
                  <img
                    src={review.author?.avatarUrl}
                    alt={review.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Link>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <Link
                      to={`/user/${review.author?.id}`}
                      className="font-medium text-gray-800 hover:text-sky-600"
                    >
                      {review.author?.name}
                    </Link>
                    <Stars rating={review.rating} size={14} />
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 mt-1">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* My Requests Section */}
      {myRequests.length > 0 && (
        <>
          <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2 mt-8 flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-500" />
            Мои заявки
            <span className="text-sm text-gray-400 font-normal">
              ({myRequests.filter(r => r.status === 'pending').length} активных)
            </span>
          </h3>
          <div className="space-y-4">
            {myRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                currentUser={user}
                onCancel={onCancelRequest}
              />
            ))}
          </div>
        </>
      )}

      {/* Version */}
      <div className="mt-8 text-center text-gray-500 text-xs">Версия {APP_VERSION}</div>

      <button
        onClick={onLogout}
        className="w-full mt-4 py-3 text-red-400 hover:text-red-500 text-sm"
      >
        Выйти
      </button>

      {/* Review Modal */}
      {reviewModalData && (
        <ReviewModal
          isOpen={!!reviewModalData}
          onClose={handleCloseReviewModal}
          trip={reviewModalData.trip}
          targetUser={reviewModalData.targetUser}
          onSubmit={handleSubmitReview}
          onSkip={handleSkipReview}
        />
      )}
    </div>
  );
};

// Public profile view (read-only)
const UserProfileView = ({ userId, currentUser }: { userId: string; currentUser: User }) => {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [user, reviews] = await Promise.all([
          api.getUserById(userId),
          api.getUserReviews(userId),
        ]);
        setProfileUser(user);
        setUserReviews(reviews);
      } catch (error) {
        console.error('Error loading user:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={40} className="animate-spin text-sky-400" />
      </div>
    );
  }

  if (!profileUser) {
    return <div className="text-center py-20 text-gray-500">Пользователь не найден</div>;
  }

  return (
    <div className="pb-20 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sky-500 flex items-center gap-1 hover:text-sky-600"
      >
        <ArrowRight size={16} className="rotate-180" /> Назад
      </button>
      <Card className="flex flex-col items-center text-center pt-10 pb-10">
        <div className="relative mb-4">
          <img
            src={profileUser.avatarUrl}
            alt={profileUser.name}
            className="w-24 h-24 rounded-full border-4 border-sky-50 shadow-lg object-cover"
          />
        </div>

        <h2 className="text-2xl font-bold text-gray-800">{profileUser.name}</h2>
        {profileUser.position && (
          <p className="text-sm text-sky-600 flex items-center gap-1 mb-1">
            <Briefcase size={14} /> {profileUser.position}
          </p>
        )}
        <p className="text-gray-500 mb-2">{getCityName(profileUser.homeCity)}</p>
        <p className="text-sm text-gray-400 flex items-center gap-1 mb-2">
          <Mail size={14} /> {profileUser.email}
        </p>
        {profileUser.phone && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
            <Phone size={14} /> {profileUser.phone}
          </p>
        )}
        {profileUser.bio && (
          <p className="text-sm text-gray-500 italic max-w-xs mb-2">"{profileUser.bio}"</p>
        )}

        <div className="flex gap-1 text-yellow-400 text-sm mb-4">
          {'★'.repeat(Math.round(profileUser.rating))}
          <span className="text-gray-300">({profileUser.rating.toFixed(1)})</span>
        </div>

        <div className="w-full flex justify-center gap-2 mb-4">
          <Badge color="gray">{profileUser.role}</Badge>
          <Badge color="blue">Сотрудник</Badge>
        </div>

        <div className="w-full bg-gray-50 rounded-xl p-4">
          <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-wider">
            Предпочтения
          </h3>
          <div className="flex justify-center">
            <PreferenceRow prefs={profileUser.defaultPreferences} />
          </div>
        </div>
      </Card>

      {/* User Reviews Section */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2 mt-6 flex items-center gap-2">
        <MessageSquare size={18} className="text-sky-400" />
        Отзывы
        {userReviews.length > 0 && (
          <span className="text-sm text-gray-400 font-normal">({userReviews.length})</span>
        )}
      </h3>
      <div className="space-y-4">
        {userReviews.length === 0 ? (
          <div className="bg-white/60 p-4 rounded-xl text-gray-400 italic text-center">
            Пока нет отзывов
          </div>
        ) : (
          userReviews.map(review => (
            <Card key={review.id}>
              <div className="flex items-start gap-3">
                <Link to={`/user/${review.author?.id}`}>
                  <img
                    src={review.author?.avatarUrl}
                    alt={review.author?.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </Link>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <Link
                      to={`/user/${review.author?.id}`}
                      className="font-medium text-gray-800 hover:text-sky-600"
                    >
                      {review.author?.name}
                    </Link>
                    <Stars rating={review.rating} size={14} />
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 mt-1">{review.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const Auth = ({ onLogin, loading }: { onLogin: (email: string) => void; loading: boolean }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@')) {
      onLogin(email);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float delay-1000"></div>

      <div className="z-10 w-full max-w-sm text-center">
        <div className="mb-8 inline-block p-4 bg-white/50 rounded-full backdrop-blur-md shadow-lg">
          <Car size={48} className="text-sky-500" />
        </div>
        <h1 className="text-4xl font-light text-slate-800 mb-2">{APP_NAME}</h1>
        <p className="text-slate-500 mb-8">Поездки между Москвой и Липецком.</p>

        <Card className="text-left">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Корпоративная почта
            </label>
            <input
              type="email"
              required
              placeholder="name@nlmk.com"
              className="w-full p-3 bg-gray-50 rounded-xl mb-4 focus:ring-2 focus:ring-sky-200 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Button className="w-full" loading={loading}>
              Войти
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

// --- Layout ---

const Layout = ({
  children,
  requestStats,
}: {
  children: React.ReactNode;
  requestStats?: RequestStats;
}) => {
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const totalRequests = requestStats?.total || 0;

  return (
    <div className="min-h-screen relative">
      {/* Sticky Nav Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 flex justify-around py-3 pb-safe">
        <Link
          to="/"
          className={`flex flex-col items-center ${location.pathname === '/' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <Car size={24} />
          <span className="text-[10px] mt-1">Поездки</span>
        </Link>
        <Link
          to="/requests"
          className={`flex flex-col items-center relative ${location.pathname === '/requests' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <ClipboardList size={24} />
          <span className="text-[10px] mt-1">Заявки</span>
          {totalRequests > 0 && (
            <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {totalRequests > 99 ? '99+' : totalRequests}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex flex-col items-center"
          >
            <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-3 rounded-full -mt-8 shadow-lg shadow-sky-200 border-4 border-white">
              <PlusCircle size={28} className="text-white" />
            </div>
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 w-48">
                <Link
                  to="/create"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <Car size={20} className="text-sky-500" />
                  <span>Создать поездку</span>
                </Link>
                <Link
                  to="/request"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 border-t border-gray-100"
                  onClick={() => setShowCreateMenu(false)}
                >
                  <ClipboardList size={20} className="text-emerald-500" />
                  <span>Создать заявку</span>
                </Link>
              </div>
            </>
          )}
        </div>
        <Link
          to="/profile"
          className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-sky-600' : 'text-gray-400'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] mt-1">Профиль</span>
        </Link>
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:flex fixed top-0 w-full bg-white/70 backdrop-blur-md z-50 px-8 py-4 justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-sky-600">
          <Car className="fill-current" /> {APP_NAME}
        </div>
        <div className="flex gap-6 items-center">
          <Link
            to="/"
            className={`${location.pathname === '/' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600`}
          >
            Поездки
          </Link>
          <Link
            to="/requests"
            className={`${location.pathname === '/requests' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600 flex items-center gap-1`}
          >
            Заявки
            {totalRequests > 0 && (
              <span className="bg-sky-500 text-white text-xs rounded-full px-2 py-0.5">
                {totalRequests}
              </span>
            )}
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-1 text-gray-600 hover:text-sky-600">
              Создать <ChevronDown size={16} />
            </button>
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all w-48">
              <Link
                to="/create"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700"
              >
                <Car size={20} className="text-sky-500" />
                <span>Создать поездку</span>
              </Link>
              <Link
                to="/request"
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 border-t border-gray-100"
              >
                <ClipboardList size={20} className="text-emerald-500" />
                <span>Создать заявку</span>
              </Link>
            </div>
          </div>
          <Link
            to="/profile"
            className={`${location.pathname === '/profile' ? 'text-sky-600' : 'text-gray-600'} hover:text-sky-600`}
          >
            Профиль
          </Link>
        </div>
      </div>

      <main className="px-4 pt-6 md:pt-24 max-w-3xl mx-auto min-h-screen">{children}</main>

      <Assistant />
    </div>
  );
};

// --- Edit Trip Modal ---

const EditTripModal = ({
  trip,
  onSave,
  onClose,
}: {
  trip: Trip;
  onSave: (trip: Trip) => Promise<void>;
  onClose: () => void;
}) => {
  const [editData, setEditData] = useState<Trip>(trip);
  const [isSaving, setIsSaving] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState<{
    type: 'pickup' | 'dropoff';
    city: City;
    initialLocation?: LocationData;
  } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(editData);
    setIsSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Редактировать поездку</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
              <input
                type="date"
                value={editData.date}
                onChange={e => setEditData({ ...editData, date: e.target.value })}
                className="w-full p-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
              <input
                type="time"
                value={editData.time}
                onChange={e => setEditData({ ...editData, time: e.target.value })}
                className="w-full p-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none"
              />
            </div>

            <LocationInput
              value={editData.pickupLocation}
              onChange={loc =>
                setEditData({
                  ...editData,
                  pickupLocation: loc.address,
                  pickupLat: loc.lat,
                  pickupLng: loc.lng,
                })
              }
              city={editData.from}
              placeholder="Место посадки"
              label="Место посадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'pickup',
                  city: editData.from,
                  initialLocation: editData.pickupLocation
                    ? {
                        address: editData.pickupLocation,
                        lat: editData.pickupLat,
                        lng: editData.pickupLng,
                      }
                    : undefined,
                })
              }
            />

            <LocationInput
              value={editData.dropoffLocation}
              onChange={loc =>
                setEditData({
                  ...editData,
                  dropoffLocation: loc.address,
                  dropoffLat: loc.lat,
                  dropoffLng: loc.lng,
                })
              }
              city={editData.to}
              placeholder="Место высадки"
              label="Место высадки"
              onOpenMap={() =>
                setMapPickerOpen({
                  type: 'dropoff',
                  city: editData.to,
                  initialLocation: editData.dropoffLocation
                    ? {
                        address: editData.dropoffLocation,
                        lat: editData.dropoffLat,
                        lng: editData.dropoffLng,
                      }
                    : undefined,
                })
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
              <textarea
                value={editData.comment}
                onChange={e => setEditData({ ...editData, comment: e.target.value })}
                className="w-full p-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-sky-200 outline-none resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button onClick={handleSave} loading={isSaving} className="flex-1">
              <Save size={18} /> Сохранить
            </Button>
          </div>
        </div>
      </div>

      {/* MapPicker for EditTripModal */}
      {mapPickerOpen && (
        <MapPicker
          isOpen={true}
          onClose={() => setMapPickerOpen(null)}
          city={mapPickerOpen.city}
          initialLocation={mapPickerOpen.initialLocation}
          onSelect={location => {
            if (mapPickerOpen.type === 'pickup') {
              setEditData({
                ...editData,
                pickupLocation: location.address,
                pickupLat: location.lat,
                pickupLng: location.lng,
              });
            } else {
              setEditData({
                ...editData,
                dropoffLocation: location.address,
                dropoffLat: location.lat,
                dropoffLng: location.lng,
              });
            }
            setMapPickerOpen(null);
          }}
        />
      )}
    </>
  );
};

// Wrapper for user profile route
const UserProfileWrapper = ({ currentUser }: { currentUser: User }) => {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;
  return <UserProfileView userId={userId} currentUser={currentUser} />;
};

// --- Main App Logic ---

export default function App() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Fetch trips with React Query (cached, auto-refreshed)
  const {
    data: trips = [],
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips(),
    enabled: !!user, // Only fetch when logged in
  });

  // Fetch pending reviews with React Query
  const { data: pendingReviews = [], refetch: refetchPendingReviews } = useQuery({
    queryKey: ['pendingReviews'],
    queryFn: () => api.getPendingReviews(),
    enabled: !!user,
  });

  // Fetch user reviews with React Query
  const { data: userReviews = [], refetch: refetchUserReviews } = useQuery({
    queryKey: ['userReviews', user?.id],
    queryFn: () => api.getUserReviews(user!.id),
    enabled: !!user,
  });

  // Fetch request stats with React Query
  const { data: requestStats, refetch: refetchRequestStats } = useQuery({
    queryKey: ['requestStats'],
    queryFn: () => api.getRequestStats(),
    enabled: !!user,
  });

  // Fetch all requests with React Query
  const {
    data: requests = [],
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.getRequests(),
    enabled: !!user,
  });

  // Fetch my requests with React Query
  const { data: myRequests = [], refetch: refetchMyRequests } = useQuery({
    queryKey: ['myRequests'],
    queryFn: () => api.getMyRequests(),
    enabled: !!user,
  });

  // Initial session restore
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      setLoading(true);
      const currentUser = await api.getCurrentUser();
      if (isMounted && currentUser) {
        setUser(currentUser);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper to refresh all data
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
    queryClient.invalidateQueries({ queryKey: ['userReviews'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['myRequests'] });
    queryClient.invalidateQueries({ queryKey: ['requestStats'] });
  };

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const handleLogin = async (email: string) => {
    setLoading(true);
    try {
      const u = await api.login(email);
      setUser(u);
    } catch (error) {
      alert(`Ошибка входа: ${getErrorMessage(error, 'не удалось войти')}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    queryClient.clear(); // Clear all cached data on logout
  };

  const addTrip = async (newTrips: Trip[]) => {
    try {
      for (const trip of newTrips) {
        await api.createTrip(trip);
      }
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (error) {
      console.error('Error creating trip:', error);
      alert(`Ошибка создания поездки: ${getErrorMessage(error, 'не удалось создать поездку')}`);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const savedUser = await api.updateUser(updatedUser);
      setUser(savedUser);
    } catch (error) {
      alert(`Ошибка обновления профиля: ${getErrorMessage(error, 'не удалось сохранить профиль')}`);
    }
  };

  const joinTrip = async (tripId: string) => {
    try {
      await api.bookTrip(tripId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      alert('Вы присоединились к поездке!');
    } catch (error) {
      console.error('Error joining trip:', error);
      alert(`Ошибка бронирования: ${getErrorMessage(error, 'не удалось забронировать поездку')}`);
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      await api.cancelTrip(tripId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      alert('Поездка отменена');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert(`Ошибка отмены: ${getErrorMessage(error, 'не удалось отменить поездку')}`);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await api.cancelBooking(bookingId);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      alert('Бронирование отменено');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(
        `Ошибка отмены бронирования: ${getErrorMessage(error, 'не удалось отменить бронирование')}`
      );
    }
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
  };

  const handleSaveTrip = async (updatedTrip: Trip) => {
    try {
      await api.updateTrip(updatedTrip);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setEditingTrip(null);
      alert('Поездка обновлена');
    } catch (error) {
      console.error('Error updating trip:', error);
      alert(`Ошибка обновления: ${getErrorMessage(error, 'не удалось обновить поездку')}`);
    }
  };

  // --- Passenger Requests handlers ---

  const addRequest = async (requestData: any) => {
    try {
      await api.createRequest(requestData);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['requestStats'] });
    } catch (error) {
      console.error('Error creating request:', error);
      alert(`Ошибка создания заявки: ${getErrorMessage(error, 'не удалось создать заявку')}`);
      throw error;
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      await api.cancelRequest(requestId);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['myRequests'] });
      queryClient.invalidateQueries({ queryKey: ['requestStats'] });
      alert('Заявка отменена');
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert(`Ошибка отмены заявки: ${getErrorMessage(error, 'не удалось отменить заявку')}`);
    }
  };

  const handleSubmitReview = async (
    tripId: string,
    targetUserId: string,
    rating: number,
    comment: string
  ) => {
    try {
      await api.submitReview(tripId, targetUserId, rating, comment);
      // Reload user to get updated rating
      const updatedUser = await api.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(`Ошибка отправки отзыва: ${getErrorMessage(error, 'не удалось отправить отзыв')}`);
    }
  };

  const handleSkipReview = async (tripId: string, targetUserId: string) => {
    try {
      await api.skipReview(tripId, targetUserId);
    } catch (error) {
      console.error('Error skipping review:', error);
      alert(`Ошибка: ${getErrorMessage(error, 'не удалось пропустить отзыв')}`);
    }
  };

  if (!user) {
    return <Auth onLogin={handleLogin} loading={loading} />;
  }

  return (
    <YandexMapsProvider apiKey={import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''}>
      <HashRouter>
        <Layout requestStats={requestStats}>
          <Routes>
            <Route
              path="/"
              element={
                <Schedule
                  trips={trips}
                  joinTrip={joinTrip}
                  cancelBooking={cancelBooking}
                  deleteTrip={deleteTrip}
                  onEdit={handleEditTrip}
                  user={user}
                  loading={tripsLoading}
                />
              }
            />
            <Route path="/create" element={<CreateTrip user={user} addTrip={addTrip} />} />
            <Route
              path="/requests"
              element={
                <RequestsList
                  requests={requests}
                  user={user}
                  loading={requestsLoading}
                  onCancelRequest={cancelRequest}
                />
              }
            />
            <Route
              path="/request"
              element={<CreateRequest user={user} addRequest={addRequest} />}
            />
            <Route
              path="/profile"
              element={
                <Profile
                  user={user}
                  updateUser={updateUser}
                  onLogout={handleLogout}
                  trips={trips}
                  pendingReviews={pendingReviews}
                  userReviews={userReviews}
                  onSubmitReview={handleSubmitReview}
                  onSkipReview={handleSkipReview}
                  refreshReviews={refreshAllData}
                  myRequests={myRequests}
                  onCancelRequest={cancelRequest}
                />
              }
            />
            <Route path="/user/:userId" element={<UserProfileWrapper currentUser={user} />} />
          </Routes>
        </Layout>

        {/* Edit Trip Modal */}
        {editingTrip && (
          <EditTripModal
            trip={editingTrip}
            onSave={handleSaveTrip}
            onClose={() => setEditingTrip(null)}
          />
        )}
      </HashRouter>
    </YandexMapsProvider>
  );
}
