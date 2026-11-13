"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { JOIN_EARLY_MINUTES, SESSION_MINUTES } from "@/lib/config";
import { fmtDate } from "@/lib/format";

type JoinState = "early" | "open" | "late";

// Estado de la ventana de entrada según la hora actual y la hora de la tutoría.
function joinState(scheduledAt: string, now: number): JoinState {
  const start = new Date(scheduledAt).getTime();
  if (now < start - JOIN_EARLY_MINUTES * 60_000) return "early";
  if (now > start + SESSION_MINUTES * 60_000) return "late";
  return "open";
}

// Solo se puede entrar a la videollamada si (1) el tutor aceptó la solicitud (la reserva está
// confirmada; este componente solo se muestra en ese caso y además se vuelve a verificar contra
// el servidor al pulsar) y (2) es la hora de la tutoría que el estudiante escogió dentro del
// horario disponible del tutor.
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

  // Reevalúa la ventana cada 30 s para que el botón se habilite solo cuando llega la hora.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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
    if (joinState(scheduledAt, Date.now()) !== "open") {
      setNow(Date.now());
      showToast("Todavía no es la hora de la tutoría.", true);
      return;
    }
    try {
      // El tutor tiene que haber aceptado: se confirma con el servidor, no solo con lo que
      // hay en pantalla (la reserva pudo cancelarse desde otro lado).
      const booking = await api("booking", `/bookings/${bookingId}`, { auth: false });
      if (booking.status !== "confirmed") {
        showToast("La tutoría no está confirmada por el tutor.", true);
        onEnded();
        return;
      }
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

  const state = joinState(scheduledAt, now);
  const opensAt = new Date(new Date(scheduledAt).getTime() - JOIN_EARLY_MINUTES * 60_000).toISOString();

  return (
    <>
      <button
        className="small gold"
        onClick={joinSession}
        disabled={state !== "open"}
        title={
          state === "early"
            ? `Disponible desde ${fmtDate(opensAt)}`
            : state === "late"
              ? "El horario de esta tutoría ya terminó"
              : undefined
        }
      >
        Entrar a la sesión
      </button>
      {state === "early" && <span className="empty-note">Se habilita {JOIN_EARLY_MINUTES} min antes: {fmtDate(opensAt)}</span>}
      {state === "late" && <span className="empty-note">El horario de la tutoría ya pasó</span>}
      <button className="small secondary" onClick={endSession}>
        Finalizar
      </button>
    </>
  );
}

