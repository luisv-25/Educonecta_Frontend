"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { CredentialType, TutorCredential } from "@/lib/types";
import { fmtDate, credentialTypeLabel, verificationLabel } from "@/lib/format";

export default function CredentialsPanel() {
  const { user, token } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<TutorCredential[]>([]);
  const [status, setStatus] = useState<string>("not_submitted");

  const [docType, setDocType] = useState<CredentialType>("identidad");
  const [docUrl, setDocUrl] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const [creds, profile] = await Promise.all([
        api("user", `/users/${user.id}/credentials`, { token }),
        api("user", `/users/${user.id}`, { auth: false }),
      ]);
      setCredentials(creds);
      setStatus(profile.tutorVerificationStatus || "not_submitted");
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function upload() {
    if (!user) return;
    if (!docUrl.trim()) {
      showToast("Pega el enlace al documento", true);
      return;
    }
    try {
      await api("user", `/users/${user.id}/credentials`, {
        method: "POST",
        token,
        body: { documentType: docType, documentUrl: docUrl.trim() },
      });
      showToast("Credencial enviada para revisión");
      setDocUrl("");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <div className="profile-card" style={{ marginTop: 18 }}>
      <div className="section-title" style={{ marginBottom: 10 }}>
        <h3>Mis credenciales</h3>
        <span className={`status-pill status-${status}`}>{verificationLabel(status)}</span>
      </div>
      <p className="empty-note" style={{ marginTop: 0 }}>
        Sube tu documento de identidad y al menos un título, certificación o referencia académica. Un administrador
        debe aprobar al menos un documento de identidad y al menos uno académico para que tu perfil quede
        verificado.
      </p>

      {loading && <p className="empty-note">Cargando…</p>}

      {!loading && credentials.length === 0 && <p className="empty-note">Aún no has subido ninguna credencial.</p>}

      {!loading &&
        credentials.map((c) => (
          <div className="booking-row" key={c.id}>
            <div className="info">
              <div>
                <b>{credentialTypeLabel(c.document_type)}</b>
              </div>
              <div className="when">
                <a href={c.document_url} target="_blank" rel="noreferrer">
                  Ver documento
                </a>
                {c.verified_at && <> · revisado {fmtDate(c.verified_at)}</>}
              </div>
            </div>
            <span className={`status-pill status-${c.status}`}>{verificationLabel(c.status)}</span>
          </div>
        ))}

      <div className="add-subject-row">
        <div>
          <label style={{ marginTop: 0 }}>Tipo de documento</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value as CredentialType)}>
            <option value="identidad">Identidad (cédula/pasaporte)</option>
            <option value="titulo">Título</option>
            <option value="certificacion">Certificación</option>
            <option value="referencia">Referencia</option>
          </select>
        </div>
        <div>
          <label style={{ marginTop: 0 }}>Enlace al documento</label>
          <input
            type="text"
            placeholder="https://..."
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
          />
        </div>
        <button className="secondary" onClick={upload}>
          Subir
        </button>
      </div>
    </div>
  );
}
