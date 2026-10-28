"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Subject, TutorProfile } from "@/lib/types";
import { stars, shortId } from "@/lib/format";
import BookingModal from "@/components/modals/BookingModal";

interface SubjectWithTutors extends Subject {
  tutors: TutorProfile[];
}

export default function MateriasTab() {
  const { isAdmin, isStudent, isTutor, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithTutors[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<Record<string, string>>({});
  const [bookingTarget, setBookingTarget] = useState<{ tutor: TutorProfile; subject: Subject } | null>(null);

  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newLevel, setNewLevel] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const userTutors = await api("user", "/users?role=tutor", { auth: false }).catch(() => []);
      const vmap: Record<string, string> = {};
      for (const u of userTutors) {
        if (u.tutorVerificationStatus) vmap[u.id] = u.tutorVerificationStatus;
      }
      setVerification(vmap);

      const list: Subject[] = await api("catalog", "/subjects", { auth: false });
      const withTutors = await Promise.all(
        list.map(async (s) => {
          let tutors: TutorProfile[] = [];
          try {
            tutors = await api("catalog", `/tutors?subjectId=${s.id}`, { auth: false });
          } catch (_) {
            /* ignorar */
          }
          return { ...s, tutors };
        }),
      );
      setSubjects(withTutors);
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

  const subjectsByArea = subjects.reduce<Record<string, SubjectWithTutors[]>>((groups, subject) => {
    const area = subject.area.trim() || "Otras áreas";
    const group = groups[area] || [];
    group.push(subject);
    groups[area] = group;
    return groups;
  }, {});

  // CAMBIO MARCADO: materias agrupadas por área; desde cada tutor aprobado se puede reservar esa materia.
  async function createSubject() {
    const name = newName.trim();
    const area = newArea.trim();
    const level = newLevel.trim();
    if (!name || !area || !level) {
      showToast("Completa nombre, área y nivel", true);
      return;
    }
    try {
      await api("catalog", "/subjects", { method: "POST", token, body: { name, area, level } });
      showToast("Materia registrada");
      setNewName("");
      setNewArea("");
      setNewLevel("");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function deleteSubject(s: SubjectWithTutors) {
    const tutorCount = s.tutors.length;
    const warning = tutorCount
      ? ` ${tutorCount} tutor(es) la tienen asignada y perderán esa asignación.`
      : "";
    if (!confirm(`¿Eliminar "${s.name}" del catálogo?${warning}`)) return;
    try {
      await api("catalog", `/subjects/${s.id}`, { method: "DELETE", token });
      showToast("Materia eliminada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <>
      <div className="section-title">
        <h2>Materias</h2>
        <span className="sub">{loading ? "Cargando…" : `${subjects.length} materia(s) registrada(s)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}

      {!loading && isAdmin && (
        <div className="inline-form">
          <strong>
            Registrar materia <span className="admin-tag">Admin</span>
          </strong>
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Nombre</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Cálculo I" />
            </div>
            <div>
              <label>Área</label>
              <input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Matemáticas" />
            </div>
            <div>
              <label>Nivel</label>
              <input value={newLevel} onChange={(e) => setNewLevel(e.target.value)} placeholder="universitario" />
            </div>
            <div style={{ flex: 0 }}>
              <button onClick={createSubject}>Registrar</button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && subjects.length === 0 && <p className="empty-note">Aún no hay materias registradas.</p>}

      {!loading &&
        Object.entries(subjectsByArea).map(([area, areaSubjects]) => (
          <section className="subject-category" key={area}>
            <div className="section-title category-title">
              <h2>{area}</h2>
              <span className="sub">{areaSubjects.length} materia(s)</span>
            </div>
            <div className="subject-grid">
              {areaSubjects.map((s) => {
                // Los estudiantes solo pueden reservar con tutores aprobados; administración conserva la vista completa.
                const visibleTutors = isTutor
                  ? []
                  : isStudent
                    ? s.tutors.filter((t) => verification[t.user_id] === "approved")
                    : s.tutors;
                return (
                  <div className="subject-block" key={s.id}>
                    <div className="head">
                      <div>
                        <h3>{s.name}</h3>
                        <div className="meta">Nivel {s.level}</div>
                      </div>
                      {isAdmin && (
                        <button className="small danger" onClick={() => deleteSubject(s)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    {visibleTutors.length ? (
                      <div className="subject-tutor-list">
                        {visibleTutors.map((t) => (
                          <div className="subject-tutor-row" key={t.id}>
                            <div>
                              <strong>{t.full_name || "Tutor " + shortId(t.id)}</strong>
                              <div className="subject-tutor-meta">
                                <span className="stars">{stars(t.avg_rating)}</span>
                                <span>${t.hourly_rate}/h</span>
                              </div>
                            </div>
                            {isStudent && (
                              <div className="subject-tutor-actions">
                                <button className="small" onClick={() => setBookingTarget({ tutor: t, subject: s })}>
                                  Reservar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isTutor ? null : (
                      <p className="empty-note" style={{ marginTop: 10 }}>
                        {isStudent && s.tutors.length > 0
                          ? "Hay tutores para esta materia, pero aún no tienen credenciales verificadas."
                          : "Todavía ningún tutor ofrece esta materia."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

      {bookingTarget && (
        <BookingModal
          tutorId={bookingTarget.tutor.id}
          tutorUserId={bookingTarget.tutor.user_id}
          tutorName={bookingTarget.tutor.full_name}
          subjectId={bookingTarget.subject.id}
          subjectName={bookingTarget.subject.name}
          onClose={() => setBookingTarget(null)}
          onBooked={() => load()}
        />
      )}
    </>
  );
}
