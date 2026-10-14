"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

export default function SessionActions({
  bookingId,
  scheduledAt,
  onEnded,
}: {
  bookingId: string;
  scheduledAt: string;
  onEnded: () => void;
}) {
  const { token } = useAuth();
  const showToast = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // La entrada solo se habilita cuando llega la fecha/hora de la reserva.
  const startsAt = new Date(scheduledAt).getTime();
  const canJoin = now >= startsAt;

  useEffect(() => {
    if (canJoin) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [canJoin]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    async function loadRoom() {
      try {
        const room = await api("session", `/sessions/booking/${bookingId}`, { auth: false });
        if (!cancelled) {
          setRoomId(room.id);
          setLoading(false);
        }
      } catch (_) {
        if (!cancelled) {
          // La sala se crea de forma asíncrona al confirmar la reserva
          // (evento booking.confirmed); reintenta en 1.5s.
          retryTimer = setTimeout(loadRoom, 1500);
        }
      }
    }
    loadRoom();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [bookingId]);

  async function joinSession() {
    if (!roomId) return;
    if (Date.now() < startsAt) {
      showToast("La sesión se habilitará en la fecha y hora reservadas.", true);
      return;
    }
    try {
      const data = await api("session", `/sessions/${roomId}/token`, { auth: false });
      window.open(data.joinUrl, "_blank");

      // Muestra de calidad de red del propio navegador al entrar (Network
      // Information API). No es telemetría real de la llamada Daily.co —
      // solo está disponible en Chrome/Edge — así que se envía "al mejor
      // esfuerzo" y se ignora en silencio si el navegador no la soporta.
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn && conn.rtt !== undefined) {
        api("session", `/sessions/${roomId}/qos-samples`, {
          method: "POST",
          auth: false,
          body: { jitterMs: conn.rtt },
        }).catch(() => {});
      }
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function endSession() {
    if (!roomId) return;
    try {
      await api("session", `/sessions/${roomId}/end`, { method: "PATCH", token });
      showToast("Sesión finalizada.");
      onEnded();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  if (loading || !roomId) {
    return <span className="empty-note">Creando la sala de video…</span>;
  }

  return (
    <>
      <button
        className="small gold"
        onClick={joinSession}
        disabled={!canJoin}
        title={canJoin ? "" : `Disponible el ${new Date(scheduledAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`}
      >
        {canJoin ? "Entrar a la sesión" : "Disponible a la hora reservada"}
      </button>
      <button className="small secondary" onClick={endSession}>
        Finalizar
      </button>
    </>
  );
}
