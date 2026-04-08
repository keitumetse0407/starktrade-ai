import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://113.30.188.215:8090');
pb.autoCancellation(false);

// Register
export async function apiFetch(path: string, options?: RequestInit) {
  const body = options?.body ? JSON.parse(options.body as string) : {};

  if (path === '/auth/register' && options?.method === 'POST') {
    try {
      await pb.collection('users').create({
        email: body.email,
        password: body.password,
        passwordConfirm: body.password,
        name: body.full_name || '',
        emailVisibility: true
      });
      const auth = await pb.collection('users').authWithPassword(body.email, body.password);
      setAuthToken(auth.token);
      return { ok: true, json: () => Promise.resolve({ access_token: auth.token }) };
    } catch (err: any) {
      return { ok: false, json: () => Promise.resolve({ detail: err?.message || 'Registration failed' }) };
    }
  }

  // Login
  if (path === '/auth/login' && options?.method === 'POST') {
    try {
      const auth = await pb.collection('users').authWithPassword(body.email, body.password);
      setAuthToken(auth.token);
      return { ok: true, json: () => Promise.resolve({ access_token: auth.token }) };
    } catch (err: any) {
      return { ok: false, json: () => Promise.resolve({ detail: 'Invalid email or password' }) };
    }
  }

  // Get current user
  if (path === '/auth/me') {
    if (pb.authStore.isValid && pb.authStore.model) {
      return { ok: true, json: () => Promise.resolve({
        id: pb.authStore.model.id,
        email: pb.authStore.model.email,
        full_name: pb.authStore.model.name,
        role: 'admin'
      }) };
    }
    return { ok: false, json: () => Promise.resolve({ detail: 'Not authenticated' }) };
  }

  return { ok: false, json: () => Promise.resolve({ detail: 'Not implemented' }) };
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return pb.authStore.token || localStorage.getItem('token');
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  pb.authStore.clear();
  localStorage.removeItem('token');
}

export { pb };
