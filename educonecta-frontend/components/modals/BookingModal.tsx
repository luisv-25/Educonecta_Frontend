"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

function defaultDateTimeLocal() {
  const now = new Date(Date.now() + 24 * 3600 * 1000);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function BookingModal({
  tutorId,
  tutorName,
  onClose,
  onBooked,
}: {
  tutorId: string;
  tutorName?: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { token } = useAuth();
  const showToast = useToast();
  const [dt, setDt] = useState(defaultDateTimeLocal());

  async function submit() {
    if (!dt) {
      showToast("Elige una fecha y hora", true);
      return;
    }
    try {
      await api("booking", "/bookings", {
        method: "POST",
        token,
        body: { tutorId, scheduledAt: new Date(dt).toISOString() },
      });
      showToast("Solicitud enviada. El tutor debe aceptarla.");
      onBooked();
      onClose();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h3>Reservar con {tutorName || "este tutor"}</h3>
        <p className="empty-note" style={{ margin: "4px 0 0" }}>
          Queda como solicitud pendiente hasta que el tutor la acepte.
        </p>
        <label>Fecha y hora</label>
        <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
        <div className="close-row">
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button onClick={submit}>Reservar</button>
        </div>
      </div>
    </div>
  );
}
