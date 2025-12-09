
import { Trip, User } from '../types';
import { MOCK_TRIPS, MOCK_USER } from '../constants';

const STORAGE_KEYS = {
  TRIPS: 'nlmk_trips_v1',
  USERS: 'nlmk_users_v1',
};

// Simulate network delay for realistic feel
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
  // --- TRIPS ---

  async getTrips(): Promise<Trip[]> {
    await delay(400); // Fake latency
    const stored = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (!stored) {
      // Seed with mock data if empty
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(MOCK_TRIPS));
      return MOCK_TRIPS;
    }
    return JSON.parse(stored);
  },

  async createTrip(trip: Trip): Promise<void> {
    await delay(400);
    const trips = await this.getTrips();
    trips.push(trip);
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  },

  async updateTrip(updatedTrip: Trip): Promise<void> {
    await delay(300);
    const trips = await this.getTrips();
    const index = trips.findIndex(t => t.id === updatedTrip.id);
    if (index !== -1) {
      trips[index] = updatedTrip;
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
    }
  },

  // --- USERS ---

  async getUser(email: string): Promise<User> {
    await delay(500);
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    let users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
    
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Register new user based on Mock template
      const nameFromEmail = email.split('@')[0];
      user = { 
        ...MOCK_USER, 
        id: email, 
        email, 
        name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
        // Randomize avatar slightly
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
      };
      users.push(user);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return user;
  },

  async updateUser(updatedUser: User): Promise<void> {
     await delay(300);
     const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
     let users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
     const index = users.findIndex(u => u.id === updatedUser.id);
     if (index !== -1) {
       users[index] = updatedUser;
       localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
     }
  }
};
