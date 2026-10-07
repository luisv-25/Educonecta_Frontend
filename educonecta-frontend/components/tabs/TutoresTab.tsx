"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Subject, TutorProfile } from "@/lib/types";
import { stars, shortId, money, verificationLabel } from "@/lib/format";
import RatingModal from "@/components/modals/RatingModal";
import BookingModal from "@/components/modals/BookingModal";

type TabId = "materias" | "tutores" | "estudiantes" | "reservas" | "solicitudes" | "perfil";

export default function TutoresTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { isStudent, isAdmin, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [verification, setVerification] = useState<Record<string, string>>({});
  const [reassignChoice, setReassignChoice] = useState<Record<string, string>>({});

  const [ratingTarget, setRatingTarget] = useState<TutorProfile | null>(null);
  const [bookingTarget, setBookingTarget] = useState<TutorProfile | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tutorsList, subjectsList, userTutors] = await Promise.all([
        api("catalog", "/tutors", { auth: false }),
        api("catalog", "/subjects", { auth: false }),
        api("user", "/users?role=tutor", { auth: false }).catch(() => []),
      ]);
      setTutors(tutorsList);
      setSubjects(subjectsList);
      const map: Record<string, string> = {};
      for (const u of userTutors) {
        if (u.tutorVerificationStatus) map[u.id] = u.tutorVerificationStatus;
      }
      setVerification(map);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reassignTutor(tutorId: string) {
    const subjectId = reassignChoice[tutorId];
    if (!subjectId) {
      showToast("No hay materias para reasignar", true);
      return;
    }
    try {
      const tutor = tutors.find((t) => t.id === tutorId);
      const current = (tutor?.tutorSubjects || []).map((ts) => ts.subject?.id).filter(Boolean) as string[];
      for (const sid of current) {
        if (sid !== subjectId) {
          await api("catalog", `/tutors/${tutorId}/subjects/${sid}`, { method: "DELETE", token });
        }
      }
      if (!current.includes(subjectId)) {
        await api("catalog", `/tutors/${tutorId}/subjects`, {
          method: "POST",
          token,
          body: { subjectId, yearsExperience: 0 },
        });
      }
      showToast("Tutor reasignado");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function deleteAccount(userId: string, name?: string) {
    if (!confirm(`¿Eliminar la cuenta de ${name || "este usuario"}? Esta acción no se puede deshacer.`)) return;
    try {
      await api("user", `/users/${userId}`, { method: "DELETE", token });
      showToast("Cuenta eliminada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <>
      <div className="section-title">
        <h2>Tutores</h2>
        <span className="sub">{loading ? "Cargando…" : `${tutors.length} tutor(es)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}
      {!loading && !error && tutors.length === 0 && <p className="empty-note">Aún no hay tutores registrados.</p>}

      {!loading && tutors.length > 0 && (
        <div className="grid-cards">
          {tutors.map((t) => (
            <div className="tutor-card" key={t.id}>
              <div>
                <div className="name">{t.full_name || "Tutor sin nombre"}</div>
                <div className="idline">
                  ID {shortId(t.id)} · user {shortId(t.user_id)}
                </div>
              </div>
              <span className={`status-pill status-${verification[t.user_id] || "not_submitted"}`} style={{ alignSelf: "flex-start" }}>
                {verificationLabel(verification[t.user_id])}
              </span>
              <div className="bio">{t.bio ? t.bio : "Este tutor aún no ha escrito una biografía."}</div>
              <div className="subj-tags">
                {(t.tutorSubjects || []).length ? (
                  t.tutorSubjects!.map((ts, i) => (
                    <span className="subj-tag" key={i}>
                      {ts.subject?.name || ""}
                    </span>
                  ))
                ) : (
                  <span className="empty-note">Sin materias asociadas</span>
                )}
              </div>
              <div className="rate-row">
                <span className="price">${money(t.hourly_rate)}/hora</span>
                <span className="stars" title={`${t.avg_rating}/5`}>
                  {stars(t.avg_rating)}
                </span>
              </div>

              {isStudent && (
                <div className="card-actions">
                  <button className="secondary small" onClick={() => setRatingTarget(t)}>
                    Calificar
                  </button>
                  <button className="gold small" onClick={() => setBookingTarget(t)}>
                    Reservar
                  </button>
                </div>
              )}

              {isAdmin && (
                <div className="admin-strip">
                  <select
                    value={reassignChoice[t.id] || ""}
                    onChange={(e) => setReassignChoice((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  >
                    <option value="" disabled>
                      Elegir materia…
                    </option>
                    {subjects.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button className="purple small" onClick={() => reassignTutor(t.id)}>
                    Reasignar
                  </button>
                  <button className="danger small" onClick={() => deleteAccount(t.user_id, t.full_name)}>
                    Eliminar cuenta
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {ratingTarget && (
        <RatingModal
          tutorId={ratingTarget.id}
          tutorName={ratingTarget.full_name}
          onClose={() => setRatingTarget(null)}
          onDone={load}
        />
      )}
      {bookingTarget && (
        <BookingModal
          tutorId={bookingTarget.id}
          tutorName={bookingTarget.full_name}
          onClose={() => setBookingTarget(null)}
          onBooked={() => onNavigate("reservas")}
        />
      )}
    </>
  );
}
