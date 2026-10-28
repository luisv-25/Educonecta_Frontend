"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Booking, FeedbackRating } from "@/lib/types";
import { fmtDate, money, stars, statusLabel } from "@/lib/format";
import SessionActions from "@/components/SessionActions";
import RatingModal from "@/components/modals/RatingModal";
import MaterialsPanel from "@/components/MaterialsPanel";

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
  const [ratedScores, setRatedScores] = useState<Record<string, number>>({});
  const [ratingTarget, setRatingTarget] = useState<BookingWithTutorName | null>(null);
  const [openMaterials, setOpenMaterials] = useState<Record<string, boolean>>({});

  function toggleMaterials(bookingId: string) {
    setOpenMaterials((prev) => ({ ...prev, [bookingId]: !prev[bookingId] }));
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const allBookings: Booking[] = await api("booking", `/bookings?studentId=${user.id}`, { auth: false });
      setAllCount(allBookings.length);
      const shown = allBookings;
      const withNames = await Promise.all(
        shown.map(async (b) => {
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

      // Qué tutorías finalizadas ya fueron calificadas (servicio de feedback).
      const completedTutors = Array.from(new Set(withNames.filter((b) => b.status === "completed").map((b) => b.tutor_id)));
      const scores: Record<string, number> = {};
      await Promise.all(
        completedTutors.map(async (tutorId) => {
          try {
            const ratings: FeedbackRating[] = await api("feedback", `/feedback/tutor/${tutorId}`, { auth: false });
            for (const r of ratings) {
              if (r.student_id === user.id && r.score) scores[r.booking_id] = r.score;
            }
          } catch (_) {
            /* sin calificaciones disponibles */
          }
        }),
      );
      setRatedScores(scores);
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
            ? "No tienes reservas."
            : 'Todavía no has reservado ninguna tutoría. Ve a "Materias" para elegir una clase y un tutor.'}
        </p>
      )}

      {!loading &&
        bookings
          .filter((b) => b.status !== "completed")
          .map((b) => (
            <div key={b.id}>
              <div className="booking-row">
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
                  {b.status === "confirmed" && (
                    <>
                      <SessionActions bookingId={b.id} onEnded={load} />
                      <button className="small secondary" onClick={() => toggleMaterials(b.id)}>
                        {openMaterials[b.id] ? "Ocultar material" : "Material"}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {b.status === "confirmed" && openMaterials[b.id] && (
                <MaterialsPanel bookingId={b.id} canUpload={false} />
              )}
            </div>
          ))}

      {!loading && bookings.some((b) => b.status === "completed") && (
        <>
          <div className="section-title" style={{ marginTop: 26 }}>
            <h2>Tutorías finalizadas</h2>
            <span className="sub">Califica a tu tutor una vez por tutoría</span>
          </div>
          {bookings
            .filter((b) => b.status === "completed")
            .map((b) => (
              <div key={b.id}>
                <div className="booking-row">
                  <div className="info">
                    <div>
                      <b>{b.tutorName}</b> — ${money(b.price_snapshot)}
                    </div>
                    <div className="when">{fmtDate(b.scheduled_at)}</div>
                  </div>
                  <span className={`status-pill status-${b.status}`}>{statusLabel(b.status)}</span>
                  <div className="actions">
                    <button className="small secondary" onClick={() => toggleMaterials(b.id)}>
                      {openMaterials[b.id] ? "Ocultar material" : "Material"}
                    </button>
                    {ratedScores[b.id] ? (
                      <span className="stars" title="Tu calificación">
                        {stars(ratedScores[b.id])}
                      </span>
                    ) : (
                      <button className="small" onClick={() => setRatingTarget(b)}>
                        Calificar
                      </button>
                    )}
                  </div>
                </div>
                {openMaterials[b.id] && <MaterialsPanel bookingId={b.id} canUpload={false} />}
              </div>
            ))}
        </>
      )}

      {ratingTarget && (
        <RatingModal
          bookingId={ratingTarget.id}
          tutorName={ratingTarget.tutorName}
          onClose={() => setRatingTarget(null)}
          onDone={() => load()}
        />
      )}
    </>
  );
}
