"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProgressNote, Subject } from "@/lib/types";
import { fmtDate } from "@/lib/format";

// Lista de notas de progreso de un estudiante. La usa el propio estudiante (pestaña "Mi progreso")
// y los tutores/administradores desde la pestaña Estudiantes.
export function ProgressNotes({ studentId, refreshKey = 0 }: { studentId: string; refreshKey?: number }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [subjects, setSubjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api("feedback", `/progress/student/${studentId}`, { token }),
      api("catalog", "/subjects", { auth: false }).catch(() => []),
    ])
      .then(([list, subs]) => {
        if (cancelled) return;
        setNotes(list);
        const names: Record<string, string> = {};
        for (const s of subs as Subject[]) names[s.id] = s.name;
        setSubjects(names);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, token, refreshKey]);

  if (loading) return <p className="empty-note">Cargando…</p>;
  if (error) return <p className="empty-note">{error}</p>;
  if (notes.length === 0) return <p className="empty-note">Sin notas de progreso todavía.</p>;
  return (
    <div className="progress-list">
      {notes.map((n) => (
        <div className="progress-note" key={n.id}>
          <div className="progress-note-head">
            <b>{subjects[n.subject_id] || "Materia"}</b>
            <span>{fmtDate(n.created_at)}</span>
          </div>
          <p>{n.note}</p>
        </div>
      ))}
    </div>
  );
}

// Botón "Ver progreso" para las tarjetas de estudiantes (tutor / administrador).
export function StudentProgressToggle({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="secondary small" onClick={() => setOpen((v) => !v)}>
        {open ? "Ocultar progreso" : "Ver progreso"}
      </button>
      {open && <ProgressNotes studentId={studentId} />}
    </>
  );
}

// Pestaña del estudiante: registra cómo va en cada materia.
export default function ProgresoTab() {
  const { user, token } = useAuth();
  const showToast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [note, setNote] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api("catalog", "/subjects", { auth: false })
      .then(setSubjects)
      .catch(() => {});
  }, []);

  async function save() {
    if (!subjectId) {
      showToast("Elige una materia", true);
      return;
    }
    if (!note.trim()) {
      showToast("Escribe una nota sobre tu progreso", true);
      return;
    }
    try {
      await api("feedback", "/progress", { method: "POST", token, body: { subjectId, note: note.trim() } });
      showToast("Nota de progreso guardada");
      setNote("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="section-title">
        <h2>Mi progreso</h2>
        <span className="sub">Cuéntale a tus tutores cómo vas en cada materia</span>
      </div>
      <div className="profile-card" style={{ maxWidth: 620 }}>
        <label style={{ marginTop: 0 }}>Materia</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">Elegir…</option>
          {subjects.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label>Nota</label>
        <textarea
          rows={3}
          placeholder="Ej.: ya entiendo límites, me cuestan las derivadas por regla de la cadena."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button style={{ marginTop: 14 }} onClick={save}>
          Guardar nota
        </button>
      </div>
      <div className="section-title" style={{ marginTop: 26 }}>
        <h2>Mis notas</h2>
      </div>
      <ProgressNotes studentId={user.id} refreshKey={refreshKey} />
    </>
  );
}
