import { City, ConversationPref, MusicPref, BaggageSize, Preferences, User, Role, Trip } from './types';

export const APP_NAME = "NLMKblablaCAR";

export const DEFAULT_PREFERENCES: Preferences = {
  music: MusicPref.Normal,
  smoking: false,
  pets: false,
  baggage: BaggageSize.Medium,
  conversation: ConversationPref.Chatty,
  ac: true,
};

export const MOCK_USER: User = {
  id: 'u1',
  email: 'employee@nlmk.com',
  name: 'Алексей Волков',
  avatarUrl: 'https://picsum.photos/200/200',
  phone: '+7 (999) 123-45-67',
  bio: 'Работаю в НЛМК, часто езжу между Москвой и Липецком',
  position: 'Инженер',
  homeCity: City.Moscow,
  role: Role.Both,
  defaultPreferences: DEFAULT_PREFERENCES,
  rating: 4.8,
};

// Initial Mock Trips
export const MOCK_TRIPS: Trip[] = [
  {
    id: 't1',
    driverId: 'u2',
    driver: { ...MOCK_USER, id: 'u2', name: 'Мария Иванова', avatarUrl: 'https://picsum.photos/201/201', rating: 5.0 },
    from: City.Moscow,
    to: City.Lipetsk,
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    pickupLocation: 'Метро Аннино',
    dropoffLocation: 'ул. Заводская',
    seatsTotal: 3, // Logic handles max 2 passengers
    seatsBooked: 1,
    preferences: { ...DEFAULT_PREFERENCES, smoking: false, music: MusicPref.Quiet },
    comment: 'Утренний выезд, кофе включен.',
    tripGroupId: 'g1',
    isReturn: false,
  },
  {
    id: 't2',
    driverId: 'u2',
    driver: { ...MOCK_USER, id: 'u2', name: 'Мария Иванова', avatarUrl: 'https://picsum.photos/201/201', rating: 5.0 },
    from: City.Lipetsk,
    to: City.Moscow,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '18:00',
    pickupLocation: 'Центр',
    dropoffLocation: 'Домодедовская',
    seatsTotal: 3,
    seatsBooked: 0,
    preferences: { ...DEFAULT_PREFERENCES, smoking: false, music: MusicPref.Quiet },
    comment: 'Возвращаюсь после встреч.',
    tripGroupId: 'g1',
    isReturn: true,
  }
];