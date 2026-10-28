"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CFG } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { FileMetadata } from "@/lib/types";
import { fmtDate, fileSizeLabel } from "@/lib/format";

// Material de apoyo de una sesión (sección 5.7, Content Service). El
// servicio identifica la sesión por el id de la SALA de video
// (session_db.rooms.id), no por el id de la reserva -- por eso primero
// hay que resolver booking -> room, igual que hace SessionActions.tsx.
export default function MaterialsPanel({ bookingId, canUpload }: { bookingId: string; canUpload: boolean }) {
  const { token } = useAuth();
  const showToast = useToast();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLike, setPdfLike] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      let room = roomId;
      if (!room) {
        const r = await api("session", `/sessions/booking/${bookingId}`, { auth: false });
        room = r.id;
        setRoomId(room);
      }
      const list = await api("content", `/files?sessionId=${room}`, { token });
      setFiles(list);
    } catch (e: any) {
      // Si todavía no existe la sala (reserva recién confirmada) no es un
      // error real -- simplemente no hay nada que mostrar todavía.
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  async function upload() {
    if (!roomId) return;
    if (!pdfLike) {
      showToast("Elige un archivo", true);
      return;
    }
    if (pdfLike.size > 25 * 1024 * 1024) {
      showToast("El archivo no puede pesar más de 25 MB", true);
      return;
    }
    setUploading(true);
    try {
      // El archivo viaja como multipart/form-data (campo "file"), no como
      // JSON -- distinto del resto de llamadas de la app, por eso usa su
      // propio fetch en vez de la función api() (que siempre manda JSON).
      const form = new FormData();
      form.append("file", pdfLike);
      form.append("sessionId", roomId);
      const res = await fetch(`${CFG.content}/files`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: form,
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch (_) {}
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || `Error ${res.status}`;
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
      }
      showToast("Material subido");
      setPdfLike(null);
      setFileInputKey((k) => k + 1);
      load();
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setUploading(false);
    }
  }

  async function download(file: FileMetadata) {
    try {
      const result = await api("content", `/files/${file.id}/download`, { token });
      if (!result.available) {
        showToast(result.message || "El almacenamiento no está configurado (modo simulado).", true);
        return;
      }
      window.open(result.url, "_blank");
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function remove(file: FileMetadata) {
    if (!confirm(`¿Eliminar "${file.file_name}"?`)) return;
    try {
      await api("content", `/files/${file.id}`, { method: "DELETE", token });
      showToast("Material eliminado");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  if (loading) return <p className="empty-note">Cargando material…</p>;

  return (
    <div className="materials-panel">
      {error && <p className="empty-note">No se pudo cargar el material todavía ({error}).</p>}

      {!error && files.length === 0 && <p className="empty-note">Aún no hay material de apoyo para esta sesión.</p>}

      {!error &&
        files.map((f) => (
          <div className="booking-row" key={f.id}>
            <div className="info">
              <div>
                <b>{f.file_name}</b>
              </div>
              <div className="when">
                {fileSizeLabel(f.size_bytes)} · subido {fmtDate(f.created_at)}
              </div>
            </div>
            <div className="actions">
              <button className="small" onClick={() => download(f)}>
                Descargar
              </button>
              {canUpload && (
                <button className="small danger" onClick={() => remove(f)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}

      {canUpload && roomId && (
        <div className="add-subject-row" style={{ marginTop: 10 }}>
          <div>
            <label style={{ marginTop: 0 }}>Material nuevo (máx. 25 MB)</label>
            <input key={fileInputKey} type="file" onChange={(e) => setPdfLike(e.target.files?.[0] ?? null)} />
          </div>
          <button className="secondary" onClick={upload} disabled={uploading}>
            {uploading ? "Subiendo…" : "Subir"}
          </button>
        </div>
      )}
    </div>
  );
}
