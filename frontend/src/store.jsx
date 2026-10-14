import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSetting, login, profile } from './services/api';
import { useQuery } from '@tanstack/react-query';

const AUTH_KEY = 'qa-auth';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [isAuth, setAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem(AUTH_KEY));

  const { data } = useQuery({
    queryKey: ['setting'],
    queryFn: async () => (await getSetting()).data,
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
        setAuth(true);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(AUTH_KEY);
        setUser(null);
        setAuth(false);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const auth = useCallback(async (username, pass) => {
    try {
      const res = await login(username, pass);

      if (res?.data?.token) {
        localStorage.setItem(AUTH_KEY, res.data.token);
        setAuth(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setAuth(false);
  }, []);

  return (
    <Ctx.Provider value={{ data, isAuth, authLoading, user, auth, logout }}>
      {children}
    </Ctx.Provider>
  );
}