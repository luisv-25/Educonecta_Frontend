"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Booking } from "@/lib/types";
import { fmtDate, money, shortId, statusLabel } from "@/lib/format";
import SessionActions from "@/components/SessionActions";

export default function SolicitudesTab() {
  const { myTutorProfile, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCount, setAllCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);

  async function load() {
    if (!myTutorProfile) return;
    setLoading(true);
    setError(null);
    try {
      const allBookings: Booking[] = await api("booking", `/bookings?tutorId=${myTutorProfile.id}`, { auth: false });
      setAllCount(allBookings.length);
      setBookings(allBookings.filter((b) => b.status !== "completed"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTutorProfile?.id]);

  async function acceptBooking(id: string) {
    try {
      await api("booking", `/bookings/${id}/accept`, { method: "PATCH", token });
      showToast("Reserva aceptada. Se está creando la sala de video.");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function cancelBooking(id: string) {
    try {
      await api("booking", `/bookings/${id}/cancel`, { method: "PATCH", token });
      showToast("Reserva cancelada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  if (!myTutorProfile) {
    return (
      <>
        <div className="section-title">
          <h2>Solicitudes</h2>
        </div>
        <p className="empty-note">Tu perfil de tutor aún se está creando. Espera un momento y recarga.</p>
      </>
    );
  }

  return (
    <>
      <div className="section-title">
        <h2>Solicitudes de tutoría</h2>
        <span className="sub">{loading ? "Cargando…" : `${bookings.length} solicitud(es)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="empty-note">
          {allCount
            ? "No tienes solicitudes activas — las tutorías finalizadas ya no se muestran aquí."
            : "Todavía no te han solicitado ninguna tutoría."}
        </p>
      )}

      {!loading &&
        bookings.map((b) => (
          <div className="booking-row" key={b.id}>
            <div className="info">
              <div>
                <b>Estudiante {shortId(b.student_id)}</b> — ${money(b.price_snapshot)}
              </div>
              <div className="when">{fmtDate(b.scheduled_at)}</div>
            </div>
            <span className={`status-pill status-${b.status}`}>{statusLabel(b.status)}</span>
            <div className="actions">
              {b.status === "pending" && (
                <>
                  <button className="small" onClick={() => acceptBooking(b.id)}>
                    Aceptar
                  </button>
                  <button className="small danger" onClick={() => cancelBooking(b.id)}>
                    Rechazar
                  </button>
                </>
              )}
              {b.status === "confirmed" && <SessionActions bookingId={b.id} onEnded={load} />}
            </div>
          </div>
        ))}
    </>
  );
}
