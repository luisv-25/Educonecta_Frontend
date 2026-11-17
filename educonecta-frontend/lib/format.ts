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
  return (
    ({
      identidad: "Identidad (cédula/pasaporte)",
      titulo: "Título",
      certificacion: "Certificación",
      referencia: "Referencia",
    } as Record<string, string>)[t || ""] || t
  );
}

export function transactionStatusLabel(s?: string) {
  return ({ succeeded: "Exitoso", pending: "Pendiente", failed: "Fallido" } as Record<string, string>)[s || ""] || s;
}

export function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function notificationChannelLabel(c?: string) {
  return ({ email: "Correo", in_app: "En la app" } as Record<string, string>)[c || ""] || c || "";
}

export function notificationTemplateLabel(t?: string) {
  return (
    ({
      booking_confirmation: "Reserva confirmada",
      class_reminder: "Recordatorio de clase próxima",
      package_low_balance: "Saldo bajo en tu paquete de horas",
    } as Record<string, string>)[t || ""] || t || "Notificación"
  );
}

export function notificationStatusLabel(s?: string) {
  return (
    ({ queued: "En cola", sent: "Enviada", failed: "Fallida" } as Record<string, string>)[s || ""] || s || ""
  );
}

export function percent(n: number) {
  return `${Math.round(n * 1000) / 10}%`;
}
