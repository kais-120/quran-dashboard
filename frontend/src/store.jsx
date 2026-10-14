import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSetting, login, profile } from './services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AUTH_KEY = 'qa-auth';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const queryClient = useQueryClient();
  const [isAuth, setAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem(AUTH_KEY));

  const userId = user?.user?.id ?? 'guest';

  // Key includes the user id, so a different account never reuses the previous cache entry.
  // Wait for the token check to finish so we don't fetch as "guest" first on reload.
  const { data } = useQuery({
    queryKey: ['setting', userId],
    queryFn: async () => (await getSetting()).data,
    enabled: !authLoading,
  });

  // Verify the stored token with the backend on app load
  useEffect(() => {
    const token = localStorage.getItem(AUTH_KEY);
    if (!token) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    profile()
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        setIsAdmin(res.data?.user?.role === 'admin');
        setAuth(true);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(AUTH_KEY);
        setUser(null);
        setIsAdmin(false);
        setAuth(false);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const auth = useCallback(
    async (username, pass) => {
      try {
        const res = await login(username, pass);

        if (res?.data?.token) {
          // Drop everything cached from the previous account
          queryClient.clear();

          localStorage.setItem(AUTH_KEY, res.data.token);

          // Load the profile before marking as authenticated so the role is known
          const p = await profile();
          setUser(p.data);
          setIsAdmin(p.data?.user?.role === 'admin');
          setAuth(true);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Login failed:', error);
        localStorage.removeItem(AUTH_KEY);
        return false;
      }
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setIsAdmin(false);
    setAuth(false);
    queryClient.clear();
  }, [queryClient]);

  return (
    <Ctx.Provider value={{ data, isAuth, isAdmin, authLoading, user, auth, logout }}>
      {children}
    </Ctx.Provider>
  );
}