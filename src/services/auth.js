import { supabase } from '../lib/supabase';
import { toErrorMessage } from './errors';

export async function signUp({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { data: null, error: toErrorMessage(error, 'Sign up failed') };

    const userId = data?.user?.id;
    if (userId) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({ id: userId, email }, { onConflict: 'id' });
      if (profileError) {
        return { data, error: toErrorMessage(profileError, 'Profile setup failed') };
      }
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Sign up failed') };
  }
}

export async function signIn({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: toErrorMessage(error, 'Login failed') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Login failed') };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: toErrorMessage(error, 'Logout failed') };
    return { error: null };
  } catch (err) {
    return { error: toErrorMessage(err, 'Logout failed') };
  }
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load session') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load session') };
  }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
