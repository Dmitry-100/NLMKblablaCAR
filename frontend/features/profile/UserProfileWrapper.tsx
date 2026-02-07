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
          <Avatar
            src={profileUser.avatarUrl}
            alt={profileUser.name}
            size={96}
            className="border-4 border-sky-50 shadow-lg"
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
    </div>
  );
}

export function UserProfileWrapper() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;
  return <UserProfileView userId={userId} />;
}
