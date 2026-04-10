import { supabase } from '../lib/supabase';
import { toErrorMessage } from './errors';

export async function getUserProfile() {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { data: null, error: toErrorMessage(sessionError, 'Session error') };

    const userId = sessionData?.session?.user?.id;
    if (!userId) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load profile') };

    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load profile') };
  }
}
