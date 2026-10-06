// URLs de los 4 microservicios. Antes eran editables desde un panel de
// "Servicios" y se guardaban en localStorage; ahora quedan fijas dentro
// del frontend (con posibilidad de overridearlas en build time con
// variables de entorno de Vercel, pero nunca desde la UI ni el navegador
// de quien usa la app).
export const CFG = {
  user: process.env.NEXT_PUBLIC_USER_SERVICE_URL || "https://user-service-i7q4.onrender.com/api/v1",
  catalog: process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || "https://catalog-service-uree.onrender.com/api/v1",
  booking: process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || "https://booking-services-y22o.onrender.com/api/v1",
  session: process.env.NEXT_PUBLIC_SESSION_SERVICE_URL || "https://session-services.onrender.com/api/v1",
} as const;

export type ServiceName = keyof typeof CFG;
