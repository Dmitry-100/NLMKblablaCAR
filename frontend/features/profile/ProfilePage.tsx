import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Camera,
  CheckCircle,
  ClipboardList,
  Edit2,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '../../constants';
import { PreferenceRow } from '../../components/Icons';
import { Avatar, Badge, Card, Stars } from '../../components/ui';
import {
  City,
  ConversationPref,
  MusicPref,
  PassengerRequest,
  PendingReview,
  Preferences,
  Review,
  Role,
  Trip,
  User,
} from '../../types';
import { formatDate, formatTime, getCityName } from '../../utils/helpers';
import { getUserProgress } from '../../utils/gamification';
import { RequestCard } from '../requests';
import { ReviewModal } from './ReviewModal';

interface ProfileProps {
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
}

const EMOJI_AVATARS = [
  '🚗',
  '🚙',
  '🛻',
  '🚌',
  '😎',
  '🙂',
  '🤝',
  '🌿',
  '⚡',
  '🧭',
  '🎯',
  '🦊',
  '🐼',
  '🐯',
  '🧠',
  '🔥',
];

export function Profile({
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
}: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [reviewModalData, setReviewModalData] = useState<{
    trip: PendingReview['trip'];
    targetUser: User;
  } | null>(null);

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

  const progress = useMemo(
    () =>
      getUserProgress({
        user,
        trips,
        reviews: userReviews,
        requests: myRequests,
      }),
    [myRequests, trips, user, userReviews]
  );

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

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 5 МБ');
      return;
    }

    try {
      const compressedDataUrl = await compressImage(file, 800, 0.8);
      setEditData({ ...editData, avatarUrl: compressedDataUrl });
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Ошибка при обработке изображения. Попробуйте другой файл.');
    }
  };

  const compressImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

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

  const cycleEnum = <K extends keyof Preferences>(key: K, values: readonly Preferences[K][]) => {
    if (!isEditing) return;
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
          <Avatar
            src={isEditing ? editData.avatarUrl : user.avatarUrl}
            alt={user.name}
            size={96}
            className="border-4 border-sky-50 shadow-lg"
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

            <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Аватар-эмодзи</p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_AVATARS.map(emoji => {
                  const selected = editData.avatarUrl === `emoji:${emoji}`;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditData({ ...editData, avatarUrl: `emoji:${emoji}` })}
                      className={`rounded-lg border p-1 text-xl transition ${
                        selected
                          ? 'border-sky-400 bg-sky-50'
                          : 'border-transparent hover:border-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">Можно выбрать emoji вместо фотографии.</p>
            </div>
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
                onClick={() =>
                  cycleEnum('music', Object.values(MusicPref) as readonly Preferences['music'][])
                }
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
                onClick={() =>
                  cycleEnum(
                    'conversation',
                    Object.values(ConversationPref) as readonly Preferences['conversation'][]
                  )
                }
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

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Trophy size={18} className="text-amber-500" /> Прогресс и достижения
          </h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {progress.unlockedCount}/{progress.achievements.length}
          </span>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Уровень</p>
            <p className="text-lg font-semibold text-slate-800">{progress.level}</p>
            <p className="text-xs text-slate-500">{progress.points} XP</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Текущая серия</p>
            <p className="text-lg font-semibold text-slate-800">{progress.currentStreak} дн.</p>
            <p className="text-xs text-slate-500">Лучший streak: {progress.bestStreak}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-400">Следующий уровень</p>
            <p className="text-lg font-semibold text-slate-800">
              {progress.nextLevelAt ? `${progress.nextLevelAt} XP` : 'Максимум'}
            </p>
            <p className="text-xs text-slate-500">
              {progress.nextLevelAt
                ? `Осталось ${Math.max(0, progress.nextLevelAt - progress.points)} XP`
                : 'Вы на высшем уровне'}
            </p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Каталог бейджей</h4>
          <span className="text-xs text-slate-400">{progress.achievements.length} вариантов</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {progress.achievements.map(item => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.unlocked
                  ? 'border-amber-100 bg-amber-50'
                  : 'border-slate-200 bg-slate-50 opacity-70'
              }`}
            >
              <p
                className={`text-sm font-medium ${item.unlocked ? 'text-amber-800' : 'text-slate-600'}`}
              >
                {item.icon} {item.title}
              </p>
              <p className={`mt-1 text-xs ${item.unlocked ? 'text-amber-700' : 'text-slate-500'}`}>
                {item.description}
              </p>
            </div>
          ))}
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
                      <Avatar src={targetUser.avatarUrl} alt={targetUser.name} size={32} />
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
                  <Avatar
                    src={review.author?.avatarUrl}
                    alt={review.author?.name || 'User'}
                    size={40}
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

      <div className="mt-8 text-center text-gray-500 text-xs">Версия {APP_VERSION}</div>

      <button
        onClick={onLogout}
        className="w-full mt-4 py-3 text-red-400 hover:text-red-500 text-sm"
      >
        Выйти
      </button>

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
}
