"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { AppUser } from "@/lib/types";
import { shortId } from "@/lib/format";
import { StudentProgressToggle } from "@/components/tabs/ProgresoTab";

export default function EstudiantesTab() {
  const { isAdmin, isTutor, token, myTutorProfile } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<AppUser[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list: AppUser[] = await api("user", "/users?role=student", { auth: false });
      if (isTutor && !isAdmin) {
        // El tutor solo ve a los estudiantes que le han solicitado tutoría.
        if (!myTutorProfile) {
          setStudents([]);
          return;
        }
        const bookings: Array<{ student_id: string }> = await api("booking", `/bookings?tutorId=${myTutorProfile.id}`, { auth: false });
        const ids = new Set(bookings.map((b) => b.student_id));
        setStudents(list.filter((s) => ids.has(s.id)));
      } else {
        setStudents(list);
      }
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
        <h2>Estudiantes</h2>
        <span className="sub">{loading ? "Cargando…" : `${students.length} estudiante(s)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}
      {!loading && !error && students.length === 0 && <p className="empty-note">{isTutor && !isAdmin ? "Aún no tienes estudiantes que te hayan solicitado tutoría." : "Aún no hay estudiantes registrados."}</p>}

      {!loading && students.length > 0 && (
        <div className="student-grid">
          {students.map((s) => (
            <div className="person-card" key={s.id}>
              <div className="avatar">{(s.fullName || s.email || "?").trim().charAt(0).toUpperCase()}</div>
              <div className="name">{s.fullName || "Sin nombre"}</div>
              <div className="idline">ID {shortId(s.id)}</div>
              <div className="bio">{s.email}</div>
              <StudentProgressToggle studentId={s.id} />
              {isAdmin && (
                <button className="danger small" onClick={() => deleteAccount(s.id, s.fullName)}>
                  Eliminar cuenta
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
