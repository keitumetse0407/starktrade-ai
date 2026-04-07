import PocketBase from 'pocketbase';

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://113.30.188.215:8090';
export const pb = new PocketBase(url);

// Keep auth state in sync
pb.autoCancellation(false);

// Types
export interface Trade {
  id?: string;
  symbol: string;
  type: 'long' | 'short';
  entry: number;
  exit?: number;
  profit?: number;
  status: 'open' | 'closed';
  created?: string;
}

// Auth functions
export async function login(email: string, password: string) {
  return await pb.collection('users').authWithPassword(email, password);
}

export async function signup(email: string, password: string, name: string) {
  const user = await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true
  });
  await login(email, password);
  return user;
}

export function logout() {
  pb.authStore.clear();
}

export function isLoggedIn() {
  return pb.authStore.isValid;
}

export function getUser() {
  return pb.authStore.model;
}

// Trade functions
export async function getTrades() {
  return await pb.collection('trades').getFullList<Trade>({
    sort: '-created'
  });
}

export async function createTrade(data: Omit<Trade, 'id' | 'created'>) {
  return await pb.collection('trades').create<Trade>(data);
}

export async function updateTrade(id: string, data: Partial<Trade>) {
  return await pb.collection('trades').update<Trade>(id, data);
}

export async function deleteTrade(id: string) {
  return await pb.collection('trades').delete(id);
}

// Realtime
export function subscribeToTrades(callback: (data: any) => void) {
  return pb.collection('trades').subscribe('*', callback);
}

export function unsubscribeAll() {
  pb.collection('trades').unsubscribe('*');
}
