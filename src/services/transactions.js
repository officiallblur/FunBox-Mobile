import { supabase } from '../lib/supabase';
import { toErrorMessage } from './errors';

export async function createTransaction({ amount, type }) {
  try {
    const { data, error } = await supabase.functions.invoke('process-transaction', {
      body: { amount, type },
    });
    if (error) return { data: null, error: toErrorMessage(error, 'Transaction failed') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Transaction failed') };
  }
}

export async function getTransactions({ limit = 50 } = {}) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { data: null, error: toErrorMessage(error, 'Failed to load transactions') };
    return { data, error: null };
  } catch (err) {
    return { data: null, error: toErrorMessage(err, 'Failed to load transactions') };
  }
}
