// URLs de los 4 microservicios. Antes eran editables desde un panel de
// "Servicios" y se guardaban en localStorage; ahora quedan fijas dentro
// del frontend (con posibilidad de overridearlas en build time con
// variables de entorno de Vercel, pero nunca desde la UI ni el navegador
// de quien usa la app).
// Todo el frontend habla con UN solo punto de entrada: el API Gateway, que enruta cada petición
// al microservicio correspondiente (por el primer segmento de la ruta: /auth, /tutors, /bookings...).
// Se define con NEXT_PUBLIC_API_URL en Vercel. Cada servicio conserva su variable propia opcional
// (NEXT_PUBLIC_<X>_SERVICE_URL) solo por si se necesita saltarse el gateway en una prueba puntual.
const GATEWAY = process.env.NEXT_PUBLIC_API_URL || "https://educonecta-gateway.onrender.com/api/v1";

export const CFG = {
  user: process.env.NEXT_PUBLIC_USER_SERVICE_URL || GATEWAY,
  catalog: process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || GATEWAY,
  booking: process.env.NEXT_PUBLIC_BOOKING_SERVICE_URL || GATEWAY,
  session: process.env.NEXT_PUBLIC_SESSION_SERVICE_URL || GATEWAY,
  payment: process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || GATEWAY,
  feedback: process.env.NEXT_PUBLIC_FEEDBACK_SERVICE_URL || GATEWAY,
  content: process.env.NEXT_PUBLIC_CONTENT_SERVICE_URL || GATEWAY,
  notification: process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || GATEWAY,
  analytics: process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || GATEWAY,
} as const;

// Valor (COP) de cada hora dentro de un paquete prepagado. El servicio de pagos
// recibe el monto total desde el cliente, así que se calcula aquí: horas × este valor.
export const HOUR_PACKAGE_PRICE = 20000;

// Tamaño máximo del PDF de credenciales. El servidor de usuarios debe aceptar cuerpos
// JSON de al menos este tamaño + 33% (ver backend-patch/LEEME.txt).
export const MAX_PDF_MB = 5;

// Ventana para entrar a la videollamada, medida desde la hora de la tutoría que el estudiante
// eligió dentro del horario del tutor: se abre unos minutos antes y se cierra al terminar la
// tutoría (la duración por defecto es de 60 min; es la misma que usa el servicio de reservas).
export const JOIN_EARLY_MINUTES = 10;
export const SESSION_MINUTES = 60;

export type ServiceName = keyof typeof CFG;
