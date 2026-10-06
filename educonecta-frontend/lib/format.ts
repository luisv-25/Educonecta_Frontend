export function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export function stars(avg: number | string) {
  const n = Math.round(Number(avg) || 0);
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function shortId(id?: string) {
  return id ? id.slice(0, 8) : "";
}

export function roleLabel(r?: string) {
  return ({ student: "Estudiante", tutor: "Tutor", admin: "Administrador" } as Record<string, string>)[r || ""] || r || "";
}

export function statusLabel(s?: string) {
  return (
    ({ pending: "Pendiente", confirmed: "Confirmada", cancelled: "Cancelada", completed: "Completada" } as Record<
      string,
      string
    >)[s || ""] || s
  );
}

export function money(n: number | string) {
  return Number(n).toLocaleString("es-CO");
}

export function verificationLabel(s?: string) {
  return (
    ({
      not_submitted: "Sin credenciales",
      pending: "En revisión",
      approved: "Verificado",
      rejected: "Rechazado",
    } as Record<string, string>)[s || ""] || s || "Sin credenciales"
  );
}

export function credentialTypeLabel(t?: string) {
  return ({ titulo: "Título", certificacion: "Certificación", referencia: "Referencia" } as Record<string, string>)[
    t || ""
  ] || t;
}
