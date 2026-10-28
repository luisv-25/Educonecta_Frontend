export type Role = "student" | "tutor" | "admin";

export type TutorVerificationStatus = "not_submitted" | "pending" | "approved" | "rejected";

export interface AppUser {
  id: string;
  email: string;
  role: Role;
  fullName?: string;
  tutorVerificationStatus?: TutorVerificationStatus;
}

export type CredentialType = "identidad" | "titulo" | "certificacion" | "referencia";
export type CredentialStatus = "pending" | "approved" | "rejected";

export interface TutorCredential {
  id: string;
  document_type: CredentialType;
  document_url: string;
  status: CredentialStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

// Forma que devuelve GET /credentials/pending: la credencial más una
// proyección mínima del tutor dueño (nunca el User completo).
export interface PendingCredential extends TutorCredential {
  user: { id: string; email: string; full_name?: string };
}

export interface Subject {
  id: string;
  name: string;
  area: string;
  level: string;
}

export interface TutorSubjectLink {
  subject?: Subject;
  years_experience?: number;
}

export interface TutorProfile {
  id: string;
  user_id: string;
  full_name?: string;
  bio?: string;
  hourly_rate: number;
  avg_rating: number;
  tutorSubjects?: TutorSubjectLink[];
  user?: AppUser;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id?: string;
  scheduled_at: string;
  price_snapshot: number;
  status: BookingStatus;
}

export interface HourPackage {
  id: string;
  student_id: string;
  hours_purchased: number;
  hours_remaining: number;
  purchased_at: string;
}

export type TransactionStatus = "pending" | "succeeded" | "failed";

export interface PaymentTransaction {
  id: string;
  package_id: string | null;
  booking_id: string | null;
  student_id: string | null;
  tutor_id: string | null;
  amount: number | string;
  status: TransactionStatus;
  commission_amount: number | string;
  tutor_net_amount: number | string;
  gateway_reference: string;
  created_at: string;
}

export interface TutorSettlement {
  tutorId: string;
  transactionsCount: number;
  grossAmount: number;
  commissionRetained: number;
  refundedAmount?: number;
  netPayable: number;
}

export interface FeedbackRating {
  id: string;
  booking_id: string;
  tutor_id: string;
  student_id: string;
  score: number | null;
  comment: string | null;
  rated_at: string | null;
}

export interface ProgressNote {
  id: string;
  student_id: string;
  subject_id: string;
  note: string;
  created_at: string;
}

// --- Content Service (sección 5.7) ---

export interface FileMetadata {
  id: string;
  session_id: string;
  student_id: string | null;
  tutor_id: string;
  file_name: string;
  mime_type: string;
  storage_key: string;
  size_bytes: number;
  created_at: string;
}

export interface DownloadUrlResult {
  available: boolean;
  url?: string;
  expiresInSeconds?: number;
  message?: string;
}

// --- Notification Service (sección 5.8) ---

export type NotificationChannel = "email" | "in_app";
export type NotificationStatus = "queued" | "sent" | "failed";

export interface NotificationPreference {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationLogEntry {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  template: string;
  status: NotificationStatus;
  sent_at: string | null;
  reference_id: string | null;
  created_at: string;
}

// --- Analytics Service (sección 5.9) ---

export interface SessionsBySubjectRow {
  subjectId: string | null;
  subjectName: string;
  sessionsCompleted: number;
}

export interface RevenueBySubjectRow {
  subjectId: string | null;
  subjectName: string;
  revenue: number;
}

export interface TutorRetentionKpi {
  totalTutorsConSesiones: number;
  tutoresRetenidos: number;
  tasaRetencion: number;
}

export interface TrialConversionKpi {
  estudiantesConPruebaGratuita: number;
  estudiantesConvertidos: number;
  tasaConversion: number;
}

export interface AnalyticsDashboard {
  sessionsBySubject: SessionsBySubjectRow[];
  revenueBySubject: RevenueBySubjectRow[];
  tutorRetention: TutorRetentionKpi;
  trialConversion: TrialConversionKpi;
}
