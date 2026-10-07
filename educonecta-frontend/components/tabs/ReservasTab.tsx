"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Booking } from "@/lib/types";
import { fmtDate, money, statusLabel } from "@/lib/format";
import SessionActions from "@/components/SessionActions";

interface BookingWithTutorName extends Booking {
  tutorName: string;
}

export default function ReservasTab() {
  const { user, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCount, setAllCount] = useState(0);
  const [bookings, setBookings] = useState<BookingWithTutorName[]>([]);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const allBookings: Booking[] = await api("booking", `/bookings?studentId=${user.id}`, { auth: false });
      setAllCount(allBookings.length);
      const active = allBookings.filter((b) => b.status !== "completed");
      const withNames = await Promise.all(
        active.map(async (b) => {
          let tutorName = b.tutor_id.slice(0, 8);
          try {
            const profile = await api("catalog", `/tutors/${b.tutor_id}/profile`, { auth: false });
            tutorName = profile.user?.fullName || tutorName;
          } catch (_) {
            /* ignorar */
          }
          return { ...b, tutorName };
        }),
      );
      setBookings(withNames);
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

  async function cancelBooking(id: string) {
    try {
      await api("booking", `/bookings/${id}/cancel`, { method: "PATCH", token });
      showToast("Reserva cancelada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <>
      <div className="section-title">
        <h2>Mis reservas</h2>
        <span className="sub">{loading ? "Cargando…" : `${bookings.length} reserva(s)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p className="empty-note">
          {allCount
            ? "No tienes reservas activas — las tutorías finalizadas ya no se muestran aquí."
            : 'Todavía no has reservado ninguna tutoría. Ve a la pestaña "Tutores" para reservar.'}
        </p>
      )}

      {!loading &&
        bookings.map((b) => (
          <div className="booking-row" key={b.id}>
            <div className="info">
              <div>
                <b>{b.tutorName}</b> — ${money(b.price_snapshot)}
              </div>
              <div className="when">{fmtDate(b.scheduled_at)}</div>
            </div>
            <span className={`status-pill status-${b.status}`}>{statusLabel(b.status)}</span>
            <div className="actions">
              {b.status === "pending" && (
                <button className="small danger" onClick={() => cancelBooking(b.id)}>
                  Retirar solicitud
                </button>
              )}
              {b.status === "confirmed" && <SessionActions bookingId={b.id} onEnded={load} />}
            </div>
          </div>
        ))}
    </>
  );
}
