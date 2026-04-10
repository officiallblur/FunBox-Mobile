import { supabase } from '../lib/supabase';
import { toErrorMessage } from './errors';
import { createTransaction } from './transactions';

export async function getWallet() {
  try {
    const { data, error } = await supabase.from('wallets').select('*').single();
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load wallet') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load wallet') };
  }
}

export async function updateWalletBalance({ amount, type }) {
  return createTransaction({ amount, type });
}
