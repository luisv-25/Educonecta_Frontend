"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { FeedbackRating, Subject } from "@/lib/types";
import {
  emptyWeeklyAvailability,
  loadWeeklyAvailability,
  saveWeeklyAvailability,
  WEEK_DAYS,
  WeeklyAvailability,
} from "@/lib/availability";
import { fmtDate, stars, verificationLabel } from "@/lib/format";
import CredentialsPanel from "@/components/CredentialsPanel";

export default function PerfilTab() {
  const { user, myTutorProfile, token, refreshTutorProfile } = useAuth();
  const showToast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bio, setBio] = useState(myTutorProfile?.bio || "");
  const [rate, setRate] = useState(myTutorProfile?.hourly_rate ?? 0);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addYears, setAddYears] = useState(1);
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability>(emptyWeeklyAvailability);
  const [verificationStatus, setVerificationStatus] = useState(
    user?.tutorVerificationStatus || myTutorProfile?.user?.tutorVerificationStatus || "",
  );
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [receivedRatings, setReceivedRatings] = useState<FeedbackRating[]>([]);

  useEffect(() => {
    api("catalog", "/subjects", { auth: false })
      .then(setSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadVerificationStatus() {
      const knownStatus = user?.tutorVerificationStatus || myTutorProfile?.user?.tutorVerificationStatus;
      if (knownStatus) {
        setVerificationStatus(knownStatus);
        setVerificationLoading(false);
        return;
      }
      try {
        const tutors = await api("user", "/users?role=tutor", { auth: false });
        const currentTutor = tutors.find((tutor: { id: string }) => tutor.id === user?.id);
        if (!cancelled) setVerificationStatus(currentTutor?.tutorVerificationStatus || "not_submitted");
      } catch (e) {
        if (!cancelled) setVerificationError(e instanceof Error ? e.message : "No se pudo consultar la aprobación.");
      } finally {
        if (!cancelled) setVerificationLoading(false);
      }
    }
    loadVerificationStatus();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.tutorVerificationStatus, myTutorProfile?.user?.tutorVerificationStatus]);

  useEffect(() => {
    setBio(myTutorProfile?.bio || "");
    setRate(myTutorProfile?.hourly_rate ?? 0);
  }, [myTutorProfile?.id, myTutorProfile?.bio, myTutorProfile?.hourly_rate]);

  // Los horarios se guardan en el servidor, ligados a la cuenta del tutor.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadWeeklyAvailability(user.id)
      .then((saved) => {
        if (cancelled) return;
        setWeeklyAvailability(saved || emptyWeeklyAvailability());
        setAvailabilityError("");
      })
      .catch((e) => {
        if (!cancelled) setAvailabilityError(e instanceof Error ? e.message : "No se pudieron leer los horarios guardados.");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Calificaciones que le han dejado los estudiantes (servicio de feedback).
  useEffect(() => {
    if (!myTutorProfile) return;
    api("feedback", `/feedback/tutor/${myTutorProfile.id}`, { auth: false })
      .then((list) => setReceivedRatings(Array.isArray(list) ? list : []))
      .catch(() => setReceivedRatings([]));
  }, [myTutorProfile?.id]);

  function updateAvailabilityDay(day: number, changes: Partial<WeeklyAvailability["days"][number]>) {
    setWeeklyAvailability((current) => ({
      ...current,
      days: current.days.map((entry) => (entry.day === day ? { ...entry, ...changes } : entry)),
    }));
  }

  async function saveProfile() {
    if (!myTutorProfile) return;
    try {
      await api("catalog", `/tutors/${myTutorProfile.id}/profile`, {
        method: "PATCH",
        token,
        body: { bio, hourlyRate: Number(rate) },
      });
      showToast("Perfil actualizado");
      await refreshTutorProfile();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function addSubjectToProfile() {
    if (!myTutorProfile) return;
    if (!addSubjectId) {
      showToast("Registra primero una materia en el catálogo", true);
      return;
    }
    try {
      await api("catalog", `/tutors/${myTutorProfile.id}/subjects`, {
        method: "POST",
        token,
        body: { subjectId: addSubjectId, yearsExperience: Number(addYears || 0) },
      });
      showToast("Materia añadida a tu perfil");
      await refreshTutorProfile();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function saveAvailability() {
    if (!user) return;
    if (!Number.isInteger(weeklyAvailability.durationMinutes) || weeklyAvailability.durationMinutes < 15) {
      showToast("La duración de cada tutoría debe ser de al menos 15 minutos", true);
      return;
    }
    const enabledDays = weeklyAvailability.days.filter((day) => day.enabled);
    if (!enabledDays.length) {
      showToast("Activa al menos un día para publicar disponibilidad", true);
      return;
    }
    if (enabledDays.some((day) => day.start >= day.end)) {
      showToast("En cada día, la hora de fin debe ser posterior a la hora de inicio", true);
      return;
    }
    setSavingAvailability(true);
    try {
      await saveWeeklyAvailability(user.id, weeklyAvailability, token);
      setAvailabilityError("");
      showToast("Horario semanal guardado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar el horario", true);
    } finally {
      setSavingAvailability(false);
    }
  }

  if (!myTutorProfile) {
    return (
      <>
        <div className="section-title">
          <h2>Mi perfil</h2>
        </div>
        <p className="empty-note">
          Tu perfil de tutor todavía se está creando (esto ocurre de forma automática al registrarte). Espera un
          momento y recarga.
        </p>
        <button className="secondary" onClick={() => refreshTutorProfile()}>
          Reintentar
        </button>
      </>
    );
  }

  return (
    <>
      <div className="section-title">
        <h2>Mi perfil de tutor</h2>
        <span className="sub">Visible para los estudiantes en las materias que enseñas</span>
      </div>
      <div className="profile-card">
        <label>Biografía</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="row2">
          <div>
            <label>Tarifa por hora (COP)</label>
            <input type="number" min={0} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
        </div>
        <button style={{ marginTop: 14 }} onClick={saveProfile}>
          Guardar cambios
        </button>

        <div className="add-subject-row">
          <div>
            <label style={{ marginTop: 0 }}>Materia a la que dictas</label>
            <select value={addSubjectId} onChange={(e) => setAddSubjectId(e.target.value)}>
              <option value="" disabled>
                Elegir…
              </option>
              {subjects.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ marginTop: 0 }}>Años de experiencia</label>
            <input type="number" min={0} value={addYears} onChange={(e) => setAddYears(Number(e.target.value))} />
          </div>
          <button className="secondary" onClick={addSubjectToProfile}>
            Añadir
          </button>
        </div>
        <div className="subj-tags" style={{ marginTop: 12 }}>
          {(myTutorProfile.tutorSubjects || []).length ? (
            myTutorProfile.tutorSubjects!.map((ts, i) => (
              <span className="subj-tag" key={i}>
                {ts.subject?.name || ""}
              </span>
            ))
          ) : (
            <span className="empty-note">Aún no tienes materias asociadas.</span>
          )}
        </div>
      </div>

      <section className="availability-card">
        <div className="section-title">
          <h2>Disponibilidad semanal</h2>
          <span className="sub">
            {verificationLoading ? "Consultando aprobación…" : verificationLabel(verificationStatus)}
          </span>
        </div>
        {verificationError && <p className="empty-note">{verificationError}</p>}
        {availabilityError && <p className="empty-note">{availabilityError}</p>}
        {verificationStatus === "approved" ? (
          <>
            <p className="availability-notice">
              Configura los días y horas en que puedes atender. Los estudiantes solo podrán reservar dentro de estos
              horarios.
            </p>
            <div className="availability-duration">
              <div>
                <label htmlFor="session-duration">Duración por tutoría (minutos)</label>
                <input
                  id="session-duration"
                  type="number"
                  min={15}
                  step={15}
                  value={weeklyAvailability.durationMinutes}
                  onChange={(e) =>
                    setWeeklyAvailability((current) => ({
                      ...current,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="weekly-schedule">
              {WEEK_DAYS.map(({ day, label }) => {
                const entry = weeklyAvailability.days.find((item) => item.day === day);
                if (!entry) return null;
                return (
                  <div className="weekly-day" key={day}>
                    <label className="weekly-day-toggle">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(e) => updateAvailabilityDay(day, { enabled: e.target.checked })}
                      />
                      {label}
                    </label>
                    <input
                      aria-label={`Hora de inicio ${label}`}
                      type="time"
                      value={entry.start}
                      disabled={!entry.enabled}
                      onChange={(e) => updateAvailabilityDay(day, { start: e.target.value })}
                    />
                    <span>a</span>
                    <input
                      aria-label={`Hora de fin ${label}`}
                      type="time"
                      value={entry.end}
                      disabled={!entry.enabled}
                      onChange={(e) => updateAvailabilityDay(day, { end: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
            <button style={{ marginTop: 14 }} onClick={saveAvailability} disabled={savingAvailability}>
              {savingAvailability ? "Guardando…" : "Guardar disponibilidad"}
            </button>
          </>
        ) : (
          <p className="empty-note">
            {verificationStatus === "rejected"
              ? "Tu perfil debe ser aprobado nuevamente antes de publicar horarios."
              : "La configuración de horarios estará disponible cuando el administrador apruebe tu perfil."}
          </p>
        )}
      </section>

      <section className="availability-card">
        <div className="section-title">
          <h2>Calificaciones recibidas</h2>
          <span className="sub">{receivedRatings.length} calificación(es)</span>
        </div>
        {receivedRatings.length === 0 && (
          <p className="empty-note">Todavía no tienes calificaciones. Aparecen cuando un estudiante califica una tutoría finalizada.</p>
        )}
        {receivedRatings.map((r) => (
          <div className="booking-row" key={r.id}>
            <div className="info">
              <div className="stars">{stars(r.score ?? 0)}</div>
              <div className="when">{r.comment || "Sin comentario"}</div>
            </div>
            <span className="empty-note">{fmtDate(r.rated_at || undefined)}</span>
          </div>
        ))}
      </section>

      <CredentialsPanel />
    </>
  );
}
