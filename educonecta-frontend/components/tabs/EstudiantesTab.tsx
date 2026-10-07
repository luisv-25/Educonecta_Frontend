"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { AppUser } from "@/lib/types";
import { shortId } from "@/lib/format";

export default function EstudiantesTab() {
  const { isAdmin, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<AppUser[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api("user", "/users?role=student", { auth: false });
      setStudents(list);
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
      {!loading && !error && students.length === 0 && <p className="empty-note">Aún no hay estudiantes registrados.</p>}

      {!loading && students.length > 0 && (
        <div className="grid-cards">
          {students.map((s) => (
            <div className="person-card" key={s.id}>
              <div className="name">{s.fullName || "Sin nombre"}</div>
              <div className="idline">ID {shortId(s.id)}</div>
              <div className="bio">{s.email}</div>
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
