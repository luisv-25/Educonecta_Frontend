"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Subject, TutorProfile } from "@/lib/types";
import { stars, shortId } from "@/lib/format";

interface SubjectWithTutors extends Subject {
  tutors: TutorProfile[];
}

export default function MateriasTab() {
  const { isAdmin, isStudent, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithTutors[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<Record<string, string>>({});

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
        subjects.map((s) => {
          // Mismo criterio que en la pestaña "Tutores": un estudiante solo
          // ve tutores con credenciales ya aprobadas.
          const visibleTutors = isStudent
            ? s.tutors.filter((t) => verification[t.user_id] === "approved")
            : s.tutors;
          return (
            <div className="subject-block" key={s.id}>
              <div className="head">
                <div>
                  <h3>{s.name}</h3>
                  <div className="meta">
                    {s.area} · nivel {s.level}
                  </div>
                </div>
              </div>
              {visibleTutors.length ? (
                <div className="tutor-chip-row">
                  {visibleTutors.map((t) => (
                    <span className="tutor-chip" key={t.id}>
                      {stars(t.avg_rating)} {t.full_name || "Tutor " + shortId(t.id)} · ${t.hourly_rate}/h
                    </span>
                  ))}
                </div>
              ) : (
                <p className="empty-note" style={{ marginTop: 10 }}>
                  {isStudent && s.tutors.length > 0
                    ? "Hay tutores para esta materia, pero aún no tienen credenciales verificadas."
                    : "Todavía ningún tutor ofrece esta materia."}
                </p>
              )}
            </div>
          );
        })}
    </>
  );
}
