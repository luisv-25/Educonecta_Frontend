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
