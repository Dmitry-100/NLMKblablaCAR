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
      <Card className="relative mb-6 flex flex-col items-center pt-10 pb-10 text-center">
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
              className="rounded-md border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-2 text-[color:var(--app-text-muted)] transition-colors hover:text-[color:var(--steel-blue)]"
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
            className="border-4 border-[color:var(--app-surface-soft)] shadow-sm"
          />
          {isEditing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-md bg-[color:var(--steel-blue)] p-2 shadow-lg transition-colors hover:bg-[color:var(--steel-blue-dark)]"
            >
              <Camera size={16} className="text-white" />
            </button>
          )}
          {!isEditing && (
            <div className="absolute bottom-0 right-0 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-1 shadow-sm">
              <CheckCircle
                size={20}
                className="fill-[color:var(--app-chip)] text-[color:var(--steel-blue)]"
              />
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
              className="w-full border-b border-[color:var(--app-border)] bg-transparent text-center text-xl font-bold text-[color:var(--app-text)] focus:outline-none"
              placeholder="Имя"
            />
            <div className="flex items-center gap-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-2">
              <Briefcase size={16} className="text-[color:var(--app-text-muted)]" />
              <input
                type="text"
                value={editData.position || ''}
                onChange={e => setEditData({ ...editData, position: e.target.value })}
                className="flex-1 bg-transparent text-sm text-[color:var(--app-text)] focus:outline-none"
                placeholder="Должность"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-2">
              <Phone size={16} className="text-[color:var(--app-text-muted)]" />
              <input
                type="tel"
                value={editData.phone || ''}
                onChange={e => setEditData({ ...editData, phone: e.target.value })}
                className="flex-1 bg-transparent text-sm text-[color:var(--app-text)] focus:outline-none"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-2">
              <FileText size={16} className="mt-1 text-[color:var(--app-text-muted)]" />
              <textarea
                value={editData.bio || ''}
                onChange={e => setEditData({ ...editData, bio: e.target.value })}
                className="flex-1 resize-none bg-transparent text-sm text-[color:var(--app-text)] focus:outline-none"
                placeholder="О себе и интересах..."
                rows={3}
                maxLength={500}
              />
            </div>
            <select
              value={editData.homeCity}
              onChange={e => setEditData({ ...editData, homeCity: e.target.value as City })}
              className="industrial-input p-2 text-center"
            >
              <option value={City.Moscow}>Москва</option>
              <option value={City.Lipetsk}>Липецк</option>
            </select>
            <select
              value={editData.role}
              onChange={e => setEditData({ ...editData, role: e.target.value as Role })}
              className="industrial-input p-2 text-center"
            >
              <option value={Role.Passenger}>Пассажир</option>
              <option value={Role.Driver}>Водитель</option>
              <option value={Role.Both}>Водитель и Пассажир</option>
            </select>

            <div className="space-y-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] p-3">
              <p className="text-xs uppercase tracking-wide text-[color:var(--app-text-muted)]">
                Аватар-эмодзи
              </p>
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
                          ? 'border-[color:var(--steel-blue)] bg-[color:var(--app-chip)]'
                          : 'border-transparent hover:border-[color:var(--app-border)]'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[color:var(--app-text-muted)]">
                Можно выбрать emoji вместо фотографии.
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">{user.name}</h2>
            {user.position && (
              <p className="mb-1 flex items-center gap-1 text-sm text-[color:var(--steel-blue)]">
                <Briefcase size={14} /> {user.position}
              </p>
            )}
            <p className="mb-2 text-[color:var(--app-text-muted)]">{getCityName(user.homeCity)}</p>
            <p className="mb-2 flex items-center gap-1 text-sm text-[color:var(--app-text-muted)]">
              <Mail size={14} /> {user.email}
            </p>
            {user.phone && (
              <p className="mb-1 flex items-center gap-1 text-sm text-[color:var(--app-text-muted)]">
                <Phone size={14} /> {user.phone}
              </p>
            )}
            {user.bio && (
              <p className="mb-2 max-w-xs text-sm italic text-[color:var(--app-text-muted)]">
                "{user.bio}"
              </p>
            )}
          </>
        )}

        {!isEditing && (
          <div className="mb-4 flex gap-1 text-sm text-[color:var(--warning)]">
            {'★'.repeat(Math.round(user.rating))}
            <span className="text-[color:var(--app-text-muted)]">({user.rating})</span>
          </div>
        )}

        {!isEditing && (
          <div className="w-full flex justify-center gap-2 mb-4">
            <Badge color="gray">{user.role}</Badge>
            <Badge color="blue">Сотрудник</Badge>
          </div>
        )}

        <div
          className={`w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4 transition-all ${isEditing ? 'border-[color:var(--steel-blue)]' : ''}`}
        >
          <h3 className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--app-text-muted)]">
            {isEditing && <Edit2 size={10} />}
            Предпочтения {isEditing && '(Нажми для изменения)'}
          </h3>

          {isEditing ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() =>
                  cycleEnum('music', Object.values(MusicPref) as readonly Preferences['music'][])
                }
                className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-3 py-1 text-xs"
              >
                {editData.defaultPreferences.music}
              </button>
              <button
                onClick={() => togglePreference('smoking')}
                className={`rounded-full border px-3 py-1 text-xs ${editData.defaultPreferences.smoking ? 'border-[color:var(--success)] text-[color:var(--success)]' : 'border-[color:var(--danger)] text-[color:var(--danger)]'}`}
              >
                Курение {editData.defaultPreferences.smoking ? 'Да' : 'Нет'}
              </button>
              <button
                onClick={() => togglePreference('pets')}
                className={`rounded-full border px-3 py-1 text-xs ${editData.defaultPreferences.pets ? 'border-[color:var(--success)] text-[color:var(--success)]' : 'border-[color:var(--danger)] text-[color:var(--danger)]'}`}
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
                className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-strong)] px-3 py-1 text-xs"
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
          <h3 className="flex items-center gap-2 text-base font-semibold text-[color:var(--app-text)]">
            <Trophy size={18} className="text-amber-500" /> Прогресс и достижения
          </h3>
          <span className="rounded-sm bg-[color:var(--app-surface-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--app-text-muted)]">
            {progress.unlockedCount}/{progress.achievements.length}
          </span>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="metric-tile p-3">
            <p className="text-xs uppercase text-[color:var(--app-text-muted)]">Уровень</p>
            <p className="text-lg font-semibold text-[color:var(--app-text)]">{progress.level}</p>
            <p className="text-xs text-[color:var(--app-text-muted)]">{progress.points} XP</p>
          </div>
          <div className="metric-tile p-3">
            <p className="text-xs uppercase text-[color:var(--app-text-muted)]">Текущая серия</p>
            <p className="text-lg font-semibold text-[color:var(--app-text)]">
              {progress.currentStreak} дн.
            </p>
            <p className="text-xs text-[color:var(--app-text-muted)]">
              Лучший streak: {progress.bestStreak}
            </p>
          </div>
          <div className="metric-tile p-3">
            <p className="text-xs uppercase text-[color:var(--app-text-muted)]">
              Следующий уровень
            </p>
            <p className="text-lg font-semibold text-[color:var(--app-text)]">
              {progress.nextLevelAt ? `${progress.nextLevelAt} XP` : 'Максимум'}
            </p>
            <p className="text-xs text-[color:var(--app-text-muted)]">
              {progress.nextLevelAt
                ? `Осталось ${Math.max(0, progress.nextLevelAt - progress.points)} XP`
                : 'Вы на высшем уровне'}
            </p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium text-[color:var(--app-text)]">Каталог бейджей</h4>
          <span className="text-xs text-[color:var(--app-text-muted)]">
            {progress.achievements.length} вариантов
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {progress.achievements.map(item => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.unlocked
                  ? 'border-[color:var(--warning)] bg-[color:var(--app-surface-strong)]'
                  : 'border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] opacity-70'
              }`}
            >
              <p
                className={`text-sm font-medium ${item.unlocked ? 'text-[color:var(--app-text)]' : 'text-[color:var(--app-text-muted)]'}`}
              >
                {item.icon} {item.title}
              </p>
              <p className="mt-1 text-xs text-[color:var(--app-text-muted)]">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <h3 className="mb-4 ml-2 text-lg font-semibold text-[color:var(--app-text)]">
        Мои активные поездки
      </h3>
      <div className="space-y-4">
        {myActiveTrips.length === 0 ? (
          <div className="app-surface flex items-center justify-between rounded-xl border p-4 italic text-[color:var(--app-text-muted)]">
            <span>Нет активных поездок.</span>
          </div>
        ) : (
          myActiveTrips.map(trip => {
            const isDriver = trip.driverId === user.id;
            return (
              <Link to="/" key={trip.id} className="block">
                <Card className="route-card cursor-pointer">
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
                      <div className="text-lg font-semibold text-[color:var(--app-text)]">
                        {formatTime(trip.time)}
                      </div>
                      <div className="text-xs text-[color:var(--app-text-muted)]">
                        {formatDate(trip.date)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[color:var(--app-text-muted)]">
                    <MapPin size={14} className="text-[color:var(--steel-blue)]" />
                    <span>{trip.pickupLocation}</span>
                    <ArrowRight size={12} />
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
          <h3 className="mb-4 ml-2 mt-8 flex items-center gap-2 text-lg font-semibold text-[color:var(--app-text)]">
            <Star size={18} className="text-[color:var(--warning)]" />
            Оцените поездки
            <span className="rounded-sm bg-[color:var(--warning)] px-2 py-0.5 text-xs text-black">
              {pendingReviews.reduce((sum, pr) => sum + pr.pendingFor.length, 0)}
            </span>
          </h3>
          <div className="space-y-4">
            {pendingReviews.map(({ trip, pendingFor }) => (
              <Card key={trip.id} className="border-l-4 border-l-[color:var(--warning)]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Badge color={trip.from === 'Moscow' ? 'blue' : 'pink'}>
                      {trip.from === 'Moscow' ? 'Москва' : 'Липецк'} →{' '}
                      {trip.to === 'Moscow' ? 'Москва' : 'Липецк'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[color:var(--app-text)]">
                      {trip.time}
                    </div>
                    <div className="text-xs text-[color:var(--app-text-muted)]">
                      {formatDate(trip.date)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingFor.map(targetUser => (
                    <button
                      key={targetUser.id}
                      onClick={() => handleOpenReviewModal(trip, targetUser)}
                      className="flex items-center gap-2 rounded-lg border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-2 transition-colors hover:border-[color:var(--warning)]"
                    >
                      <Avatar src={targetUser.avatarUrl} alt={targetUser.name} size={32} />
                      <span className="text-sm text-[color:var(--app-text)]">
                        {targetUser.name}
                      </span>
                      <Star size={14} className="text-[color:var(--warning)]" />
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <h3 className="mb-4 ml-2 mt-8 flex items-center gap-2 text-lg font-semibold text-[color:var(--app-text)]">
        <MessageSquare size={18} className="text-[color:var(--steel-blue)]" />
        Отзывы обо мне
        {userReviews.length > 0 && (
          <span className="text-sm font-normal text-[color:var(--app-text-muted)]">
            ({userReviews.length})
          </span>
        )}
      </h3>
      <div className="space-y-4">
        {userReviews.length === 0 ? (
          <div className="app-surface rounded-xl border p-4 text-center italic text-[color:var(--app-text-muted)]">
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
                      className="font-medium text-[color:var(--app-text)] hover:text-[color:var(--steel-blue)]"
                    >
                      {review.author?.name}
                    </Link>
                    <Stars rating={review.rating} size={14} />
                  </div>
                  {review.comment && (
                    <p className="mt-1 text-sm text-[color:var(--app-text-muted)]">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[color:var(--app-text-muted)]">
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
          <h3 className="mb-4 ml-2 mt-8 flex items-center gap-2 text-lg font-semibold text-[color:var(--app-text)]">
            <ClipboardList size={18} className="text-[color:var(--success)]" />
            Мои заявки
            <span className="text-sm font-normal text-[color:var(--app-text-muted)]">
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

      <div className="mt-8 text-center text-xs text-[color:var(--app-text-muted)]">
        Версия {APP_VERSION}
      </div>

      <button
        onClick={onLogout}
        className="mt-4 w-full py-3 text-sm text-[color:var(--danger)] hover:underline"
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
