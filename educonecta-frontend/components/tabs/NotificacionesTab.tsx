"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { NotificationLogEntry, NotificationPreference } from "@/lib/types";
import { fmtDate, notificationChannelLabel, notificationStatusLabel, notificationTemplateLabel } from "@/lib/format";

// Sección 5.8 (Notification Service). Las preferencias son "opt-out": si
// el usuario nunca las toca, el servicio asume habilitado (ver el
// comentario en notifications.service.ts del backend) -- GET /preferences
// ya devuelve los 2 canales con ese default relleno, así que esta
// pantalla siempre tiene algo que mostrar aunque el usuario no haya
// configurado nada todavía.
export default function NotificacionesTab() {
  const { user, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [prefs, entries] = await Promise.all([
        api("notification", `/preferences/${user.id}`, { token }),
        api("notification", `/notifications?userId=${user.id}`, { token }),
      ]);
      setPreferences(prefs);
      setLog(entries);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function togglePreference(pref: NotificationPreference) {
    if (!user) return;
    setSavingChannel(pref.channel);
    try {
      await api("notification", `/preferences/${user.id}`, {
        method: "PUT",
        token,
        body: { channel: pref.channel, enabled: !pref.enabled },
      });
      setPreferences((prev) => prev.map((p) => (p.channel === pref.channel ? { ...p, enabled: !p.enabled } : p)));
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setSavingChannel(null);
    }
  }

  if (!user) return null;

  // "En la app" es la bandeja real (el propio registro ES la entrega);
  // "Correo" solo deja un historial de lo que se envió por fuera de aquí,
  // así que se muestra aparte como referencia, no mezclado en la bandeja.
  const inApp = log.filter((n) => n.channel === "in_app");

  return (
    <>
      <div className="section-title">
        <h2>Notificaciones</h2>
        <span className="sub">Recordatorios de clase, confirmaciones de reserva y alertas de tu paquete de horas</span>
      </div>

      {error && <p className="empty-note">{error}</p>}

      <section className="availability-card" style={{ marginTop: 0 }}>
        <div className="section-title">
          <h2>Preferencias</h2>
        </div>
        <p className="availability-notice">
          Por defecto recibes avisos por ambos canales. Desactiva el que no quieras — nunca se desactivan solos.
        </p>
        {loading && <p className="empty-note">Cargando…</p>}
        {!loading &&
          preferences.map((p) => (
            <label className="weekly-day-toggle" key={p.channel} style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                checked={p.enabled}
                disabled={savingChannel === p.channel}
                onChange={() => togglePreference(p)}
              />
              {notificationChannelLabel(p.channel)}
            </label>
          ))}
      </section>

      <div className="section-title" style={{ marginTop: 26 }}>
        <h2>Mi bandeja</h2>
        <span className="sub">{loading ? "Cargando…" : `${inApp.length} aviso(s)`}</span>
      </div>

      {!loading && inApp.length === 0 && <p className="empty-note">Todavía no tienes notificaciones.</p>}

      {!loading &&
        inApp.map((n) => (
          <div className="booking-row" key={n.id}>
            <div className="info">
              <div>
                <b>{notificationTemplateLabel(n.template)}</b>
              </div>
              <div className="when">{n.sent_at ? fmtDate(n.sent_at) : fmtDate(n.created_at)}</div>
            </div>
            <span className={`status-pill status-${n.status === "sent" ? "approved" : n.status === "failed" ? "rejected" : "pending"}`}>
              {notificationStatusLabel(n.status)}
            </span>
          </div>
        ))}
    </>
  );
}
