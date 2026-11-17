import { api } from "./api";

// Los horarios del tutor viven en el servidor de usuarios (GET/PATCH /users/:id/availability).
// Ahí cada "slot" es un bloque (día de la semana + hora de inicio + hora de fin). La pantalla
// del tutor trabaja con "días + rango + duración"; aquí se convierte de un formato al otro:
//   - al guardar, cada día activo se parte en bloques de `durationMinutes`;
//   - al leer, los bloques de cada día se vuelven a juntar en un solo rango.

export interface WeeklyDayAvailability {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
}

export interface WeeklyAvailability {
  durationMinutes: number;
  days: WeeklyDayAvailability[];
}

export interface AvailabilitySlot {
  day_of_week: number;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
}

export interface BookableSlot {
  value: string; // fecha/hora ISO de inicio
  label: string;
  durationMinutes: number;
}

export const WEEK_DAYS = [
  { day: 1, label: "Lunes" },
  { day: 2, label: "Martes" },
  { day: 3, label: "Miércoles" },
  { day: 4, label: "Jueves" },
  { day: 5, label: "Viernes" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
] as const;

export function emptyWeeklyAvailability(): WeeklyAvailability {
  return {
    durationMinutes: 60,
    days: WEEK_DAYS.map(({ day }) => ({ day, enabled: false, start: "08:00", end: "17:00" })),
  };
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// El servidor devuelve la hora como "08:00:00"; la pantalla usa "08:00".
function normalizeTime(time: string) {
  return String(time).slice(0, 5);
}

export function weeklyToSlots(weekly: WeeklyAvailability): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  for (const entry of weekly.days) {
    if (!entry.enabled) continue;
    const start = toMinutes(entry.start);
    const end = toMinutes(entry.end);
    for (let minute = start; minute + weekly.durationMinutes <= end; minute += weekly.durationMinutes) {
      slots.push({
        day_of_week: entry.day,
        start_time: toTime(minute),
        end_time: toTime(minute + weekly.durationMinutes),
      });
    }
  }
  return slots;
}

export function slotsToWeekly(slots: AvailabilitySlot[]): WeeklyAvailability | null {
  if (!slots.length) return null;
  const weekly = emptyWeeklyAvailability();
  let duration = 0;
  for (const entry of weekly.days) {
    const daySlots = slots
      .filter((s) => s.day_of_week === entry.day)
      .map((s) => ({ start: toMinutes(normalizeTime(s.start_time)), end: toMinutes(normalizeTime(s.end_time)) }))
      .sort((a, b) => a.start - b.start);
    if (!daySlots.length) continue;
    entry.enabled = true;
    entry.start = toTime(daySlots[0].start);
    entry.end = toTime(daySlots[daySlots.length - 1].end);
    if (!duration) duration = daySlots[0].end - daySlots[0].start;
  }
  weekly.durationMinutes = duration >= 15 ? duration : 60;
  return weekly;
}

async function fetchSlots(userId: string): Promise<AvailabilitySlot[]> {
  const rows = await api("user", `/users/${userId}/availability`, { auth: false });
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    day_of_week: Number(r.day_of_week),
    start_time: normalizeTime(r.start_time),
    end_time: normalizeTime(r.end_time),
  }));
}

// Horario semanal de un tutor (para que él lo vea y edite). null si todavía no configuró nada.
export async function loadWeeklyAvailability(userId: string): Promise<WeeklyAvailability | null> {
  return slotsToWeekly(await fetchSlots(userId));
}

export async function saveWeeklyAvailability(userId: string, weekly: WeeklyAvailability, token: string | null) {
  const slots = weeklyToSlots(weekly);
  if (!slots.length) {
    throw new Error("Con ese rango y esa duración no cabe ninguna tutoría. Amplía el horario o reduce la duración.");
  }
  await api("user", `/users/${userId}/availability`, { method: "PATCH", token, body: { slots } });
}

// Horarios que un estudiante puede elegir: los bloques publicados por el tutor en los próximos
// 28 días, sin los que ya tienen una reserva pendiente o confirmada.
export async function listBookableSlots(tutorUserId: string, tutorProfileId: string): Promise<BookableSlot[]> {
  const slots = await fetchSlots(tutorUserId);
  if (!slots.length) return [];

  let takenStarts = new Set<number>();
  try {
    const bookings = await api("booking", `/bookings?tutorId=${tutorProfileId}`, { auth: false });
    takenStarts = new Set(
      (bookings as { status: string; scheduled_at: string }[])
        .filter((b) => b.status === "pending" || b.status === "confirmed")
        .map((b) => new Date(b.scheduled_at).getTime()),
    );
  } catch (_) {
    /* si no se pueden leer las reservas, el servidor igual rechaza los solapamientos */
  }

  const result: BookableSlot[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const daySlots = slots
      .filter((s) => s.day_of_week === date.getDay())
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    for (const s of daySlots) {
      const start = new Date(date);
      const minutes = toMinutes(s.start_time);
      start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (start <= now || takenStarts.has(start.getTime())) continue;
      result.push({
        value: start.toISOString(),
        label: start.toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }),
        durationMinutes: Math.min(240, Math.max(15, toMinutes(s.end_time) - minutes)),
      });
    }
  }
  return result.slice(0, 120);
}
