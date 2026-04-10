-- Ovomonie (Fintech/POS) core schema + RLS

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets (user_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own profile row
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Wallets: users can read their own wallet (writes handled by Edge Functions via service role)
DROP POLICY IF EXISTS wallets_select_own ON public.wallets;
CREATE POLICY wallets_select_own ON public.wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Transactions: users can read their own transactions (writes handled by Edge Functions via service role)
DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic transaction processor used by Edge Function
CREATE OR REPLACE FUNCTION public.process_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_type text
)
RETURNS TABLE (transaction_id bigint, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
  balance_after numeric;
  tx_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  SELECT balance INTO current_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING balance INTO current_balance;
  END IF;

  IF p_type = 'debit' AND current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  balance_after := current_balance + CASE WHEN p_type = 'credit' THEN p_amount ELSE -p_amount END;

  UPDATE public.wallets
  SET balance = balance_after
  WHERE user_id = p_user_id;

  INSERT INTO public.transactions (user_id, amount, type, status)
  VALUES (p_user_id, p_amount, p_type, 'completed')
  RETURNING id INTO tx_id;

  RETURN QUERY SELECT tx_id, balance_after;
END;
$$;

REVOKE ALL ON FUNCTION public.process_transaction(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_transaction(uuid, numeric, text) TO service_role;
