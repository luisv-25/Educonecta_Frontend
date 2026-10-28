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
  payment: process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || "https://payment-service-ogh1.onrender.com/api/v1",
  feedback: process.env.NEXT_PUBLIC_FEEDBACK_SERVICE_URL || "https://feedback-service-o417.onrender.com/api/v1",
  
  content: process.env.NEXT_PUBLIC_CONTENT_SERVICE_URL || "https://content-service-rsbo.onrender.com/api/v1",
  notification: process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "https://notificacion-service-rlnh.onrender.com/api/v1",
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || "https://analytics-service-ejtf.onrender.com/api/v1",
} as const;

// Valor (COP) de cada hora dentro de un paquete prepagado. El servicio de pagos
// recibe el monto total desde el cliente, así que se calcula aquí: horas × este valor.
export const HOUR_PACKAGE_PRICE = 20000;

// Tamaño máximo del PDF de credenciales. El servidor de usuarios debe aceptar cuerpos
// JSON de al menos este tamaño + 33% (ver backend-patch/LEEME.txt).
export const MAX_PDF_MB = 5;

export type ServiceName = keyof typeof CFG;
