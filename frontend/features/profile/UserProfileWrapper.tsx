import React, { useEffect, useState } from 'react';
import { ArrowRight, Briefcase, Loader2, Mail, MessageSquare, Phone } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Badge, Card, Stars } from '../../components/ui';
import { PreferenceRow } from '../../components/Icons';
import { api } from '../../services/api';
import { Review, User } from '../../types';
import { getCityName } from '../../utils/helpers';

function UserProfileView({ userId }: { userId: string }) {
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
        <Loader2 size={40} className="animate-spin text-[color:var(--steel-blue)]" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="py-20 text-center text-[color:var(--app-text-muted)]">
        Пользователь не найден
      </div>
    );
  }

  return (
    <div className="pb-20 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-[color:var(--steel-blue)] hover:underline"
      >
        <ArrowRight size={16} className="rotate-180" /> Назад
      </button>
      <Card className="flex flex-col items-center text-center pt-10 pb-10">
        <div className="relative mb-4">
          <Avatar
            src={profileUser.avatarUrl}
            alt={profileUser.name}
            size={96}
            className="border-4 border-[color:var(--app-surface-soft)] shadow-sm"
          />
        </div>

        <h2 className="text-2xl font-semibold text-[color:var(--app-text)]">{profileUser.name}</h2>
        {profileUser.position && (
          <p className="mb-1 flex items-center gap-1 text-sm text-[color:var(--steel-blue)]">
            <Briefcase size={14} /> {profileUser.position}
          </p>
        )}
        <p className="mb-2 text-[color:var(--app-text-muted)]">
          {getCityName(profileUser.homeCity)}
        </p>
        <p className="mb-2 flex items-center gap-1 text-sm text-[color:var(--app-text-muted)]">
          <Mail size={14} /> {profileUser.email}
        </p>
        {profileUser.phone && (
          <p className="mb-1 flex items-center gap-1 text-sm text-[color:var(--app-text-muted)]">
            <Phone size={14} /> {profileUser.phone}
          </p>
        )}
        {profileUser.bio && (
          <p className="mb-2 max-w-xs text-sm italic text-[color:var(--app-text-muted)]">
            "{profileUser.bio}"
          </p>
        )}

        <div className="mb-4 flex gap-1 text-sm text-[color:var(--warning)]">
          {'★'.repeat(Math.round(profileUser.rating))}
          <span className="text-[color:var(--app-text-muted)]">
            ({profileUser.rating.toFixed(1)})
          </span>
        </div>

        <div className="w-full flex justify-center gap-2 mb-4">
          <Badge color="gray">{profileUser.role}</Badge>
          <Badge color="blue">Сотрудник</Badge>
        </div>

        <div className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[color:var(--app-text-muted)]">
            Предпочтения
          </h3>
          <div className="flex justify-center">
            <PreferenceRow prefs={profileUser.defaultPreferences} />
          </div>
        </div>
      </Card>

      <h3 className="mb-4 ml-2 mt-6 flex items-center gap-2 text-lg font-semibold text-[color:var(--app-text)]">
        <MessageSquare size={18} className="text-[color:var(--steel-blue)]" />
        Отзывы
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
    </div>
  );
}

export function UserProfileWrapper() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;
  return <UserProfileView userId={userId} />;
}
