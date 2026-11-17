"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { BookableSlot, listBookableSlots } from "@/lib/availability";

export default function BookingModal({
  tutorId,
  tutorUserId,
  tutorName,
  subjectId,
  subjectName,
  onClose,
  onBooked,
}: {
  tutorId: string; // id del perfil de tutor (catálogo)
  tutorUserId: string; // id de la cuenta del tutor (donde se guardan sus horarios)
  tutorName?: string;
  subjectId: string;
  subjectName: string;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { token } = useAuth();
  const showToast = useToast();
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setScheduleError("");
    setSelectedSlot("");
    setSlots([]);
    listBookableSlots(tutorUserId, tutorId)
      .then((list) => {
        if (!cancelled) setSlots(list);
      })
      .catch((e) => {
        if (!cancelled) setScheduleError(e instanceof Error ? e.message : "No se pudo leer la disponibilidad del tutor.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tutorId, tutorUserId]);

  async function submit() {
    const slot = slots.find((s) => s.value === selectedSlot);
    if (!slot) {
      showToast("Elige uno de los horarios disponibles", true);
      return;
    }
    try {
      await api("booking", "/bookings", {
        method: "POST",
        token,
        body: { tutorId, subjectId, scheduledAt: slot.value, durationMinutes: slot.durationMinutes },
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
        <h3>Reservar {subjectName} con {tutorName || "este tutor"}</h3>
        <p className="empty-note" style={{ margin: "4px 0 0" }}>
          Solo puedes elegir entre los horarios que publicó el tutor. La solicitud queda pendiente hasta que la acepte.
        </p>
        <label htmlFor="booking-slot">Horarios disponibles</label>
        <select
          id="booking-slot"
          value={selectedSlot}
          disabled={loading || slots.length === 0}
          onChange={(e) => setSelectedSlot(e.target.value)}
        >
          <option value="">{loading ? "Cargando horarios…" : "Selecciona día y hora…"}</option>
          {slots.map((slot) => (
            <option value={slot.value} key={slot.value}>
              {slot.label} ({slot.durationMinutes} min)
            </option>
          ))}
        </select>
        {scheduleError && <p className="empty-note">{scheduleError}</p>}
        {!loading && !scheduleError && slots.length === 0 && (
          <p className="empty-note">Este tutor aún no tiene horarios libres en los próximos 28 días.</p>
        )}
        <div className="close-row">
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button onClick={submit} disabled={!selectedSlot || Boolean(scheduleError)}>
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}
