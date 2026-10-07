"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { PendingCredential } from "@/lib/types";
import { fmtDate, credentialTypeLabel } from "@/lib/format";

export default function VerificacionesTab() {
  const { token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCredential[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await api("user", "/credentials/pending", { token });
      setPending(list);
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

  async function review(credentialId: string, status: "approved" | "rejected") {
    try {
      await api("user", `/credentials/${credentialId}/verify`, {
        method: "PATCH",
        token,
        body: { status },
      });
      showToast(status === "approved" ? "Credencial aprobada" : "Credencial rechazada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <>
      <div className="section-title">
        <h2>Verificaciones</h2>
        <span className="sub">{loading ? "Cargando…" : `${pending.length} credencial(es) pendiente(s)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}
      {!loading && !error && pending.length === 0 && (
        <p className="empty-note">No hay credenciales pendientes de revisión.</p>
      )}

      {!loading &&
        pending.map((c) => (
          <div className="booking-row" key={c.id}>
            <div className="info">
              <div>
                <b>{c.user.full_name || c.user.email}</b> — {credentialTypeLabel(c.document_type)}
              </div>
              <div className="when">
                <a href={c.document_url} target="_blank" rel="noreferrer">
                  Ver documento
                </a>{" "}
                · subida {fmtDate(c.created_at)}
              </div>
            </div>
            <div className="actions">
              <button className="small" onClick={() => review(c.id, "approved")}>
                Aprobar
              </button>
              <button className="small danger" onClick={() => review(c.id, "rejected")}>
                Rechazar
              </button>
            </div>
          </div>
        ))}
    </>
  );
}
