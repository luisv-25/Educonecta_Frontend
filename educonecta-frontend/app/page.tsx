"use client";

import { useAuth } from "@/lib/auth-context";
import AuthScreen from "@/components/AuthScreen";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { user, ready } = useAuth();

  if (!ready) return null; // evita parpadeo mientras se lee localStorage

  return user ? <AppShell /> : <AuthScreen />;
}
