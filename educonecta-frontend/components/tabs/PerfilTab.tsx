"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Subject } from "@/lib/types";
import CredentialsPanel from "@/components/CredentialsPanel";

export default function PerfilTab() {
  const { myTutorProfile, token, refreshTutorProfile } = useAuth();
  const showToast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bio, setBio] = useState(myTutorProfile?.bio || "");
  const [rate, setRate] = useState(myTutorProfile?.hourly_rate ?? 0);
  const [addSubjectId, setAddSubjectId] = useState("");
  const [addYears, setAddYears] = useState(1);

  useEffect(() => {
    api("catalog", "/subjects", { auth: false })
      .then(setSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setBio(myTutorProfile?.bio || "");
    setRate(myTutorProfile?.hourly_rate ?? 0);
  }, [myTutorProfile?.id, myTutorProfile?.bio, myTutorProfile?.hourly_rate]);

  async function saveProfile() {
    if (!myTutorProfile) return;
    try {
      await api("catalog", `/tutors/${myTutorProfile.id}/profile`, {
        method: "PATCH",
        token,
        body: { bio, hourlyRate: Number(rate) },
      });
      showToast("Perfil actualizado");
      await refreshTutorProfile();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  async function addSubjectToProfile() {
    if (!myTutorProfile) return;
    if (!addSubjectId) {
      showToast("Registra primero una materia en el catálogo", true);
      return;
    }
    try {
      await api("catalog", `/tutors/${myTutorProfile.id}/subjects`, {
        method: "POST",
        token,
        body: { subjectId: addSubjectId, yearsExperience: Number(addYears || 0) },
      });
      showToast("Materia añadida a tu perfil");
      await refreshTutorProfile();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  if (!myTutorProfile) {
    return (
      <>
        <div className="section-title">
          <h2>Mi perfil</h2>
        </div>
        <p className="empty-note">
          Tu perfil de tutor todavía se está creando (esto ocurre de forma automática al registrarte). Espera un
          momento y recarga.
        </p>
        <button className="secondary" onClick={() => refreshTutorProfile()}>
          Reintentar
        </button>
      </>
    );
  }

  return (
    <>
      <div className="section-title">
        <h2>Mi perfil de tutor</h2>
        <span className="sub">Visible para todos en la pestaña Tutores</span>
      </div>
      <div className="profile-card">
        <label>Biografía</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="row2">
          <div>
            <label>Tarifa por hora (COP)</label>
            <input type="number" min={0} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
        </div>
        <button style={{ marginTop: 14 }} onClick={saveProfile}>
          Guardar cambios
        </button>

        <div className="add-subject-row">
          <div>
            <label style={{ marginTop: 0 }}>Materia a la que dictas</label>
            <select value={addSubjectId} onChange={(e) => setAddSubjectId(e.target.value)}>
              <option value="" disabled>
                Elegir…
              </option>
              {subjects.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ marginTop: 0 }}>Años de experiencia</label>
            <input type="number" min={0} value={addYears} onChange={(e) => setAddYears(Number(e.target.value))} />
          </div>
          <button className="secondary" onClick={addSubjectToProfile}>
            Añadir
          </button>
        </div>
        <div className="subj-tags" style={{ marginTop: 12 }}>
          {(myTutorProfile.tutorSubjects || []).length ? (
            myTutorProfile.tutorSubjects!.map((ts, i) => (
              <span className="subj-tag" key={i}>
                {ts.subject?.name || ""}
              </span>
            ))
          ) : (
            <span className="empty-note">Aún no tienes materias asociadas.</span>
          )}
        </div>
      </div>

      <CredentialsPanel />
    </>
  );
}
