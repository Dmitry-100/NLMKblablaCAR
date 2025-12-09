
import React, { useState, useEffect, useMemo } from 'react';
import { 
  HashRouter, Routes, Route, Link, useNavigate, useLocation 
} from 'react-router-dom';
import { 
  Car, Sun, Moon, MapPin, Calendar, Clock, User as UserIcon, 
  PlusCircle, Search, LogOut, ArrowRight, CheckCircle, Sparkles, AlertCircle,
  Edit2, Save, X, Loader2
} from 'lucide-react';
import { City, Role, User, Trip, Preferences, MusicPref, BaggageSize, ConversationPref } from './types';
import { DEFAULT_PREFERENCES, APP_NAME } from './constants';
import { PreferenceRow } from './components/Icons';
import { generateAssistantResponse } from './services/geminiService';
import { api } from './services/api';

// --- Shared Helpers ---

const getCityName = (city: City) => city === City.Moscow ? 'Москва' : 'Липецк';

// --- Shared Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }: any) => {
  const baseStyle = "px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-lg shadow-sky-200 hover:shadow-sky-300",
    secondary: "bg-white text-gray-700 border border-gray-100 shadow-sm hover:bg-gray-50",
    ghost: "text-gray-500 hover:bg-gray-100/50 hover:text-gray-700",
    danger: "bg-red-50 text-red-500 hover:bg-red-100",
    success: "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
  };
  
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} disabled={disabled || loading}>
      {loading ? <Loader2 size={20} className="animate-spin" /> : children}
    </button>
  );
};

const Card = ({ children, className = "", onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl shadow-sky-100/50 border border-white hover:shadow-2xl transition-all duration-300 ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ children, color = "blue" }: any) => {
  const colors = {
    blue: "bg-sky-100 text-sky-700",
    pink: "bg-pink-100 text-pink-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-600"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[color as keyof typeof colors]}`}>
      {children}
    </span>
  );
};

// --- Features ---

const Assistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAsk = async () => {
        if(!prompt.trim()) return;
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
                        <h4 className="font-bold text-sky-800 flex items-center gap-2"><Sparkles size={16}/> Помощник</h4>
                        <button onClick={() => setIsOpen(false)}><LogOut size={14} className="rotate-45" /></button>
                    </div>
                    <div className="bg-sky-50 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] mb-3">
                        {loading ? <span className="animate-pulse">Думаю...</span> : response || "Спроси меня о погоде или попроси придумать комментарий к поездке!"}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 text-sm border-gray-200 rounded-lg px-2 py-1 outline-none border focus:border-sky-300"
                            placeholder="Напиши сюда..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        />
                        <button onClick={handleAsk} className="bg-sky-500 text-white rounded-lg px-2 hover:bg-sky-600">
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

const CreateTrip = ({ user, addTrip }: { user: User, addTrip: (t: Trip[]) => Promise<void> }) => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
        preferences: user.defaultPreferences
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
        isReturn: true
    });

    const [hasReturn, setHasReturn] = useState(true);

    const handleSubmit = async () => {
        const groupId = `g-${Date.now()}`;
        
        // Validation check (simplified)
        if (!outbound.date || !outbound.time) {
            alert("Пожалуйста, заполните детали первой поездки");
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
        if(isOutbound) {
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
                    <button onClick={() => toggleCities(true)} className="text-sm text-sky-500 hover:underline flex items-center gap-1">Поменять направление <ArrowRight size={14}/></button>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                        <MapPin size={20} className="text-sky-500" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-400">Маршрут</p>
                            <p className="font-medium text-gray-800">{getCityName(outbound.from!)} → {getCityName(outbound.to!)}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                         <div className="flex-1">
                            <label className="text-xs text-gray-400 block mb-1">Дата</label>
                            <input type="date" className="w-full bg-gray-50 p-2 rounded-lg text-sm" 
                                onChange={e => setOutbound({...outbound, date: e.target.value})} />
                         </div>
                         <div className="w-1/3">
                            <label className="text-xs text-gray-400 block mb-1">Время</label>
                            <input type="time" className="w-full bg-gray-50 p-2 rounded-lg text-sm" 
                                onChange={e => setOutbound({...outbound, time: e.target.value})} />
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <input type="text" placeholder="Откуда (напр. Метро Аннино)" className="bg-gray-50 p-3 rounded-lg text-sm"
                        onChange={e => setOutbound({...outbound, pickupLocation: e.target.value})} />
                    <input type="text" placeholder="Куда (напр. Центр)" className="bg-gray-50 p-3 rounded-lg text-sm"
                        onChange={e => setOutbound({...outbound, dropoffLocation: e.target.value})} />
                </div>
                
                <textarea placeholder="Комментарий (напр., 'Выезжаю рано, тихая поездка')" className="w-full bg-gray-50 p-3 rounded-lg text-sm h-20 mb-4"
                     onChange={e => setOutbound({...outbound, comment: e.target.value})}></textarea>
                
                <div className="text-xs text-gray-400 mb-2">Предпочтения (из профиля)</div>
                <PreferenceRow prefs={outbound.preferences!} />
            </Card>

            {/* Step 2: Return */}
            {hasReturn ? (
                <Card className="mb-6 relative overflow-hidden opacity-90 border-l-4 border-l-pink-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Часть 2: Обратно</h3>
                        <button onClick={() => setHasReturn(false)} className="text-xs text-red-400 hover:text-red-500">Удалить обратный путь</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                            <MapPin size={20} className="text-pink-400" />
                            <div className="flex-1">
                                <p className="text-xs text-gray-400">Маршрут</p>
                                <p className="font-medium text-gray-800">{getCityName(returnTrip.from!)} → {getCityName(returnTrip.to!)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 block mb-1">Дата</label>
                                <input type="date" className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                                    onChange={e => setReturnTrip({...returnTrip, date: e.target.value})} />
                            </div>
                             <div className="w-1/3">
                                <label className="text-xs text-gray-400 block mb-1">Время</label>
                                <input type="time" className="w-full bg-gray-50 p-2 rounded-lg text-sm"
                                    onChange={e => setReturnTrip({...returnTrip, time: e.target.value})} />
                             </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <div className="flex justify-center mb-8">
                     <Button variant="secondary" onClick={() => setHasReturn(true)}>+ Добавить обратный путь</Button>
                </div>
            )}

            <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-center z-40">
                <Button onClick={handleSubmit} className="w-full max-w-md shadow-xl shadow-sky-200/50" loading={isSubmitting}>
                    Опубликовать
                </Button>
            </div>
        </div>
    );
};

const TripList = ({ trips, joinTrip, user, loading }: { trips: Trip[], joinTrip: (id: string) => Promise<void>, user: User, loading: boolean }) => {
    const [joiningId, setJoiningId] = useState<string | null>(null);

    const handleJoin = async (id: string) => {
        setJoiningId(id);
        await joinTrip(id);
        setJoiningId(null);
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
                    const availableSeats = Math.max(0, 2 - trip.seatsBooked); // Limit logic: Max 2 pax
                    const isFull = availableSeats === 0;
                    const isMyTrip = trip.driverId === user.id;

                    return (
                        <Card key={trip.id} className="relative group overflow-hidden">
                             {/* Route Line Visualization */}
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Car size={100} />
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={trip.from === City.Moscow ? 'blue' : 'pink'}>{getCityName(trip.from)} → {getCityName(trip.to)}</Badge>
                                        {trip.isReturn && <Badge color="gray">Обратно</Badge>}
                                        {/* Highlight urgent trips */}
                                        { new Date(`${trip.date}T${trip.time}`).getTime() - Date.now() < 7200000 && 
                                          new Date(`${trip.date}T${trip.time}`).getTime() > Date.now() &&
                                          <span className="text-xs text-orange-500 font-bold animate-pulse flex items-center gap-1"><Clock size={12}/> Скоро отправление</span>
                                        }
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">{trip.time} <span className="text-sm font-normal text-gray-500"> {trip.date}</span></h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-light text-sky-600">{availableSeats} <span className="text-xs text-gray-400">мест</span></div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <img src={trip.driver.avatarUrl} alt={trip.driver.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{trip.driver.name}</p>
                                    <p className="text-xs text-gray-400">★ {trip.driver.rating.toFixed(1)} Водитель</p>
                                </div>
                            </div>

                            <div className="flex gap-4 text-sm text-gray-600 mb-4 bg-gray-50/50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                                    {trip.pickupLocation}
                                </div>
                                <ArrowRight size={14} className="text-gray-300" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-pink-400"></div>
                                    {trip.dropoffLocation}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                <PreferenceRow prefs={trip.preferences} />
                                <Button 
                                    onClick={() => handleJoin(trip.id)} 
                                    disabled={isFull || isMyTrip}
                                    variant={isFull ? 'ghost' : 'primary'}
                                    className="px-4 py-2 text-sm"
                                    loading={joiningId === trip.id}
                                >
                                    {isMyTrip ? 'Ваша поездка' : isFull ? 'Занято' : 'Поехать'}
                                </Button>
                            </div>
                        </Card>
                    );
                })
            )}
        </div>
    );
}

const Schedule = ({ trips, joinTrip, user, loading }: { trips: Trip[], joinTrip: (id: string) => Promise<void>, user: User, loading: boolean }) => {
    const [filterDir, setFilterDir] = useState<string>('all'); // all, moscow-lipetsk, lipetsk-moscow
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');

    const filteredTrips = useMemo(() => {
        return trips.filter(t => {
            // Direction filter
            if (filterDir === 'moscow-lipetsk' && t.from !== City.Moscow) return false;
            if (filterDir === 'lipetsk-moscow' && t.from !== City.Lipetsk) return false;
            
            // Date Range Filter
            if (filterDateStart && t.date < filterDateStart) return false;
            if (filterDateEnd && t.date > filterDateEnd) return false;
            
            return true;
        }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    }, [trips, filterDir, filterDateStart, filterDateEnd]);

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
                            onChange={(e) => setFilterDateStart(e.target.value)}
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
                            onChange={(e) => setFilterDateEnd(e.target.value)}
                            className="pl-8 pr-4 py-2 bg-white rounded-xl text-sm text-gray-600 shadow-sm border border-transparent focus:border-sky-300 outline-none w-full"
                            placeholder="Конец"
                        />
                    </div>
                     {(filterDateStart || filterDateEnd) && (
                         <button 
                            onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }}
                            className="px-3 py-2 text-gray-500 bg-white rounded-xl shadow-sm hover:bg-gray-100"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <TripList trips={filteredTrips} joinTrip={joinTrip} user={user} loading={loading} />
        </div>
    );
};

const Profile = ({ user, updateUser, onLogout }: { user: User, updateUser: (u: User) => Promise<void>, onLogout: () => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<User>(user);
    const [isSaving, setIsSaving] = useState(false);

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

    const togglePreference = (key: keyof Preferences) => {
        if (!isEditing) return;
        const current = editData.defaultPreferences;
        
        // Simple boolean toggles for demo (except enums)
        if (key === 'smoking') setEditData({...editData, defaultPreferences: {...current, smoking: !current.smoking}});
        if (key === 'pets') setEditData({...editData, defaultPreferences: {...current, pets: !current.pets}});
        if (key === 'ac') setEditData({...editData, defaultPreferences: {...current, ac: !current.ac}});
    };

    const cycleEnum = (key: keyof Preferences, enumObj: any) => {
         if (!isEditing) return;
         const values = Object.values(enumObj);
         const currentVal = editData.defaultPreferences[key];
         const nextIndex = (values.indexOf(currentVal) + 1) % values.length;
         setEditData({
             ...editData, 
             defaultPreferences: { ...editData.defaultPreferences, [key]: values[nextIndex] }
         });
    }

    return (
        <div className="pb-20 animate-fade-in">
            <Card className="flex flex-col items-center text-center mb-6 pt-10 pb-10 relative">
                 <div className="absolute top-4 right-4">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button onClick={handleCancel} className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100">
                                <X size={20} />
                            </button>
                            <button onClick={handleSave} disabled={isSaving} className="p-2 rounded-full bg-green-50 text-green-500 hover:bg-green-100 flex items-center">
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-2 rounded-full bg-gray-50 text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors">
                            <Edit2 size={20} />
                        </button>
                    )}
                </div>

                <div className="relative mb-4">
                    <img src={user.avatarUrl} alt={user.name} className="w-24 h-24 rounded-full border-4 border-sky-50 shadow-lg" />
                    <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
                        <CheckCircle size={20} className="text-blue-500 fill-blue-100" />
                    </div>
                </div>

                {isEditing ? (
                    <div className="w-full max-w-xs space-y-3 mb-4">
                        <input 
                            type="text" 
                            value={editData.name} 
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            className="w-full text-center text-xl font-bold text-gray-800 border-b border-sky-200 focus:outline-none bg-transparent"
                        />
                        <select 
                            value={editData.homeCity}
                            onChange={(e) => setEditData({...editData, homeCity: e.target.value as City})}
                            className="w-full text-center text-gray-500 bg-white border border-gray-200 rounded-lg p-1"
                        >
                            <option value={City.Moscow}>Москва</option>
                            <option value={City.Lipetsk}>Липецк</option>
                        </select>
                         <select 
                            value={editData.role}
                            onChange={(e) => setEditData({...editData, role: e.target.value as Role})}
                            className="w-full text-center text-gray-500 bg-white border border-gray-200 rounded-lg p-1"
                        >
                            <option value={Role.Passenger}>Пассажир</option>
                            <option value={Role.Driver}>Водитель</option>
                            <option value={Role.Both}>Водитель и Пассажир</option>
                        </select>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
                        <p className="text-gray-500 mb-2">{getCityName(user.homeCity)}</p>
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

                <div className={`w-full bg-gray-50 rounded-xl p-4 transition-all ${isEditing ? 'border-2 border-sky-200 bg-sky-50' : ''}`}>
                    <h3 className="text-xs uppercase text-gray-400 font-bold mb-3 tracking-wider flex items-center justify-center gap-2">
                        {isEditing && <Edit2 size={10} />}
                        Предпочтения {isEditing && "(Нажми для изменения)"}
                    </h3>
                    
                    {isEditing ? (
                        <div className="flex flex-wrap justify-center gap-2">
                            <button onClick={() => cycleEnum('music', MusicPref)} className="px-3 py-1 bg-white rounded-full text-xs shadow-sm border">{editData.defaultPreferences.music}</button>
                            <button onClick={() => togglePreference('smoking')} className={`px-3 py-1 rounded-full text-xs shadow-sm border ${editData.defaultPreferences.smoking ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Курение {editData.defaultPreferences.smoking ? 'Да' : 'Нет'}</button>
                            <button onClick={() => togglePreference('pets')} className={`px-3 py-1 rounded-full text-xs shadow-sm border ${editData.defaultPreferences.pets ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Животные {editData.defaultPreferences.pets ? 'Да' : 'Нет'}</button>
                             <button onClick={() => cycleEnum('conversation', ConversationPref)} className="px-3 py-1 bg-white rounded-full text-xs shadow-sm border">{editData.defaultPreferences.conversation}</button>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <PreferenceRow prefs={user.defaultPreferences} />
                        </div>
                    )}
                </div>
            </Card>

            <h3 className="text-lg font-semibold text-gray-700 mb-4 ml-2">История поездок</h3>
            <div className="space-y-4">
                 <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between text-gray-400 italic">
                    <span>Нет активных поездок.</span>
                 </div>
            </div>
            
            <button onClick={onLogout} className="w-full mt-8 py-3 text-red-400 hover:text-red-500 text-sm">
                Выйти
            </button>
        </div>
    );
};

const Auth = ({ onLogin, loading }: { onLogin: (email: string) => void, loading: boolean }) => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: Code
    const [code, setCode] = useState('');

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(email.includes('@')) setStep(2);
    };

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email);
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
                    {step === 1 ? (
                        <form onSubmit={handleEmailSubmit}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Корпоративная почта</label>
                            <input 
                                type="email" 
                                required
                                placeholder="name@nlmk.com" 
                                className="w-full p-3 bg-gray-50 rounded-xl mb-4 focus:ring-2 focus:ring-sky-200 outline-none"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <Button className="w-full">Получить код</Button>
                        </form>
                    ) : (
                        <form onSubmit={handleCodeSubmit}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Введите код доступа</label>
                            <div className="text-xs text-gray-400 mb-4">Отправлен на {email}</div>
                            <input 
                                type="text" 
                                required
                                placeholder="1234" 
                                className="w-full p-3 bg-gray-50 rounded-xl mb-4 text-center tracking-widest text-xl focus:ring-2 focus:ring-sky-200 outline-none"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                            />
                            <Button className="w-full" loading={loading}>Поехали!</Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

// --- Layout ---

const Layout = ({ children }: any) => {
    const location = useLocation();
    
    return (
        <div className="min-h-screen relative">
             {/* Sticky Nav Mobile */}
             <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 z-50 flex justify-around py-3 pb-safe">
                <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-sky-600' : 'text-gray-400'}`}>
                    <Search size={24} />
                    <span className="text-[10px] mt-1">Расписание</span>
                </Link>
                <Link to="/create" className={`flex flex-col items-center ${location.pathname === '/create' ? 'text-sky-600' : 'text-gray-400'}`}>
                    <div className="bg-gradient-to-r from-sky-400 to-blue-500 p-3 rounded-full -mt-8 shadow-lg shadow-sky-200 border-4 border-white">
                        <PlusCircle size={28} className="text-white" />
                    </div>
                </Link>
                <Link to="/profile" className={`flex flex-col items-center ${location.pathname === '/profile' ? 'text-sky-600' : 'text-gray-400'}`}>
                    <UserIcon size={24} />
                    <span className="text-[10px] mt-1">Профиль</span>
                </Link>
             </div>

             {/* Desktop Nav (Simplified) */}
             <div className="hidden md:flex fixed top-0 w-full bg-white/70 backdrop-blur-md z-50 px-8 py-4 justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 font-bold text-xl text-sky-600">
                    <Car className="fill-current" /> {APP_NAME}
                </div>
                <div className="flex gap-6">
                    <Link to="/" className="text-gray-600 hover:text-sky-600">Расписание</Link>
                    <Link to="/create" className="text-gray-600 hover:text-sky-600">Создать поездку</Link>
                    <Link to="/profile" className="text-gray-600 hover:text-sky-600">Профиль</Link>
                </div>
             </div>

            <main className="px-4 pt-6 md:pt-24 max-w-3xl mx-auto min-h-screen">
                {children}
            </main>

            <Assistant />
        </div>
    );
};

// --- Main App Logic ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Initial load
  useEffect(() => {
    // Check if user is logged in (persisted session could be added here, 
    // but for now we rely on explicit login form for demo purposes)
  }, []);

  // Fetch trips when user is logged in
  useEffect(() => {
      if (user) {
          loadTrips();
      }
  }, [user]);

  const loadTrips = async () => {
      setTripsLoading(true);
      const data = await api.getTrips();
      setTrips(data);
      setTripsLoading(false);
  }

  const handleLogin = async (email: string) => {
    setLoading(true);
    const u = await api.getUser(email);
    setUser(u);
    setLoading(false);
  };

  const handleLogout = () => {
      setUser(null);
  }

  const addTrip = async (newTrips: Trip[]) => {
    for (const trip of newTrips) {
        await api.createTrip(trip);
    }
    await loadTrips();
  };

  const updateUser = async (updatedUser: User) => {
      await api.updateUser(updatedUser);
      setUser(updatedUser);
  };

  const joinTrip = async (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    // Optimistic update
    const updatedTrip = { ...trip, seatsBooked: trip.seatsBooked + 1 };
    await api.updateTrip(updatedTrip);
    await loadTrips();
    alert("Вы присоединились к поездке!");
  };

  if (!user) {
    return <Auth onLogin={handleLogin} loading={loading} />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Schedule trips={trips} joinTrip={joinTrip} user={user} loading={tripsLoading} />} />
          <Route path="/create" element={<CreateTrip user={user} addTrip={addTrip} />} />
          <Route path="/profile" element={<Profile user={user} updateUser={updateUser} onLogout={handleLogout} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
