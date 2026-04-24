import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [state, setState] = React.useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  React.useEffect(() => {
    // CRITICAL: subscribe FIRST, then read existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}