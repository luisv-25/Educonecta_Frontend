"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

export default function RatingModal({
  tutorId,
  tutorName,
  onClose,
  onDone,
}: {
  tutorId: string;
  tutorName?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { token } = useAuth();
  const showToast = useToast();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  async function submit() {
    try {
      await api("catalog", `/tutors/${tutorId}/ratings`, {
        method: "POST",
        token,
        body: { score, comment: comment.trim() || undefined },
      });
      showToast("¡Gracias por tu calificación!");
      onDone();
      onClose();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h3>Calificar a {tutorName || "este tutor"}</h3>
        <p className="empty-note" style={{ margin: "4px 0 0" }}>
          Tu calificación actualiza el promedio del tutor de inmediato.
        </p>
        <div className="star-pick">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= score ? "on" : ""} onClick={() => setScore(n)}>
              ★
            </span>
          ))}
        </div>
        <textarea rows={3} placeholder="Comentario (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="close-row">
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button onClick={submit}>Enviar</button>
        </div>
      </div>
    </div>
  );
}
