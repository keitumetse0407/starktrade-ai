import PocketBase from 'pocketbase';
export const pb = new PocketBase('http://113.30.188.215:8090');

export async function login(email, password) {
  return await pb.collection('users').authWithPassword(email, password);
}

export async function getTrades() {
  return await pb.collection('trades').getFullList();
}

export async function createTrade(data) {
  return await pb.collection('trades').create(data);
}
