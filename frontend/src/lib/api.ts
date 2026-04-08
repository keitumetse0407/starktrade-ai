import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://113.30.188.215:8090');
pb.autoCancellation(false);

// Keep the old function names so nothing breaks
export async function apiFetch(path: string, options?: RequestInit) {
  const body = options?.body ? JSON.parse(options.body as string) : {};

  // Register
  if (path === '/api/v1/auth/register' && options?.method === 'POST') {
    try {
      // Create user in PocketBase
      await pb.collection('users').create({
        email: body.email,
        password: body.password,
        passwordConfirm: body.password,
        name: body.full_name || '',
        emailVisibility: true
      });

      // Login after register
      const auth = await pb.collection('users').authWithPassword(body.email, body.password);

      return new Response(JSON.stringify({
        access_token: auth.token,
        token_type: 'bearer'
      }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({
        detail: err?.message || 'Registration failed'
      }), { status: 400 });
    }
  }

  // Login
  if (path === '/api/v1/auth/login' && options?.method === 'POST') {
    try {
      const auth = await pb.collection('users').authWithPassword(body.email, body.password);

      return new Response(JSON.stringify({
        access_token: auth.token,
        token_type: 'bearer'
      }), { status: 200 });
    } catch (err: any) {
      return new Response(JSON.stringify({
        detail: 'Invalid email or password'
      }), { status: 401 });
    }
  }

  // Get current user
  if (path === '/api/v1/auth/me') {
    if (pb.authStore.isValid && pb.authStore.model) {
      return new Response(JSON.stringify({
        id: pb.authStore.model.id,
        email: pb.authStore.model.email,
        full_name: pb.authStore.model.name,
        role: 'admin'
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 });
  }

  // Fallback for any other API calls
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

// Export pb for direct use
export { pb };
