import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://hash-wagner-gba-reviews.trycloudflare.com');
pb.autoCancellation(false);

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const body = options?.body ? JSON.parse(options.body as string) : {};

  // Register
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
      return new Response(JSON.stringify({ access_token: auth.token }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ detail: err?.message || 'Registration failed' }), { status: 400 });
    }
  }

  // Login
  if (path === '/auth/login' && options?.method === 'POST') {
    try {
      const auth = await pb.collection('users').authWithPassword(body.email, body.password);
      setAuthToken(auth.token);
      return new Response(JSON.stringify({ access_token: auth.token }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({ detail: 'Invalid email or password' }), { status: 401 });
    }
  }

  // Get current user
  if (path === '/auth/me') {
    if (pb.authStore.isValid && pb.authStore.model) {
      const model = pb.authStore.model;
      return new Response(JSON.stringify({
        id: model.id,
        email: model.email,
        full_name: model.name || '',
        role: 'admin'
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
  }

  return new Response(JSON.stringify({ detail: 'Not implemented' }), { status: 404 });
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
