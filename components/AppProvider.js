'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id); else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (loading) return;
    if (!session) { if (pathname !== '/login' && pathname !== '/') router.replace('/login'); return; }
    if (!profile) return;
    if (!profile.onboarded && pathname !== '/onboarding') router.replace('/onboarding');
    else if (profile.onboarded && (pathname === '/login' || pathname === '/onboarding' || pathname === '/'))
      router.replace('/dashboard');
  }, [loading, session, profile, pathname, router]);

  const refresh = () => session && loadProfile(session.user.id);
  const signOut = async () => { await supabase.auth.signOut(); router.replace('/login'); };

  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  return <Ctx.Provider value={{ session, profile, refresh, signOut }}>{children}</Ctx.Provider>;
}