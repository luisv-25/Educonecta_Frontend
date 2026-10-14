"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import { AppUser, TutorProfile } from "./types";

interface AuthContextValue {
  token: string | null;
  user: AppUser | null;
  myTutorProfile: TutorProfile | null;
  isAdmin: boolean;
  isTutor: boolean;
  isStudent: boolean;
  login: (token: string, user: AppUser) => Promise<void>;
  logout: () => void;
  refreshTutorProfile: (retry?: number) => Promise<void>;
  ready: boolean; // ya se leyó localStorage (evita parpadeo en el primer render)
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [myTutorProfile, setMyTutorProfile] = useState<TutorProfile | null>(null);
  const [ready, setReady] = useState(false);

  // La sesión (token/usuario) sigue en localStorage — es lo normal para
  // no perder la sesión al recargar. Lo que se eliminó es la
  // configuración de URLs de los servicios, no esto.
  useEffect(() => {
    const storedToken = localStorage.getItem("educonecta_token");
    const storedUser = localStorage.getItem("educonecta_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setReady(true);
  }, []);

  const refreshTutorProfile = useCallback(
    async (retry = 0): Promise<void> => {
      if (!user) return;
      try {
        const list = await api("catalog", `/tutors?userId=${user.id}`, { auth: false });
        if (list && list.length) {
          setMyTutorProfile(list[0]);
        } else if (retry < 4) {
          // El tutor_profile se crea de forma asíncrona (evento user.created);
          // reintenta un par de veces por si aún no ha llegado el evento.
          await new Promise((r) => setTimeout(r, 700));
          return refreshTutorProfile(retry + 1);
        }
      } catch (e) {
        console.warn(e);
      }
    },
    [user],
  );

  const login = useCallback(async (newToken: string, newUser: AppUser) => {
    localStorage.setItem("educonecta_token", newToken);
    localStorage.setItem("educonecta_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("educonecta_token");
    localStorage.removeItem("educonecta_user");
    setToken(null);
    setUser(null);
    setMyTutorProfile(null);
  }, []);

  useEffect(() => {
    if (user?.role === "tutor") {
      refreshTutorProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value: AuthContextValue = {
    token,
    user,
    myTutorProfile,
    isAdmin: user?.role === "admin",
    isTutor: user?.role === "tutor",
    isStudent: user?.role === "student",
    login,
    logout,
    refreshTutorProfile,
    ready,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
