"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/format";
import MateriasTab from "./tabs/MateriasTab";
import TutoresTab from "./tabs/TutoresTab";
import EstudiantesTab from "./tabs/EstudiantesTab";
import ReservasTab from "./tabs/ReservasTab";
import SolicitudesTab from "./tabs/SolicitudesTab";
import PerfilTab from "./tabs/PerfilTab";
import VerificacionesTab from "./tabs/VerificacionesTab";

type TabId = "materias" | "tutores" | "estudiantes" | "reservas" | "solicitudes" | "perfil" | "verificaciones";

export default function AppShell() {
  const { user, isStudent, isTutor, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState<TabId>(isTutor ? "perfil" : "materias");

  if (!user) return null;

  // Reglas de visibilidad (requisito del profesor):
  //  - Un estudiante NO ve a otros estudiantes (la pestaña Estudiantes es solo para el admin; los tutores tampoco la ven).
  //  - Un tutor NO ve a otros tutores (la pestaña Tutores es solo para estudiantes/admin).
  const canSeeTutors = !isTutor;
  const canSeeStudents = isAdmin;

  const tabs: { id: TabId; label: string }[] = [{ id: "materias", label: "Materias" }];
  if (canSeeTutors) tabs.push({ id: "tutores", label: "Tutores" });
  if (canSeeStudents) tabs.push({ id: "estudiantes", label: "Estudiantes" });
  if (isStudent) tabs.push({ id: "reservas", label: "Mis reservas" });
  if (isTutor) {
    tabs.push({ id: "solicitudes", label: "Solicitudes" });
    tabs.push({ id: "perfil", label: "Mi perfil" });
  }
  if (isAdmin) tabs.push({ id: "verificaciones", label: "Verificaciones" });

  return (
    <div id="app-screen">
      <header className="topbar">
        <div className="brand">
          {/* Espacio para el logo: ver public/LEEME-imagenes.txt */}
          <span className="logo-slot" aria-hidden="true" />
          EduConecta
        </div>

        <nav className="tabbar">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="who">
          <span>
            <b>{user.fullName || user.email}</b>
          </span>
          <span className={"role-badge" + (isAdmin ? " admin" : "")}>{roleLabel(user.role)}</span>
          <button className="logout-btn" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main>
        {tab === "materias" && <MateriasTab />}
        {tab === "tutores" && canSeeTutors && <TutoresTab onNavigate={setTab} />}
        {tab === "estudiantes" && canSeeStudents && <EstudiantesTab />}
        {tab === "reservas" && <ReservasTab />}
        {tab === "solicitudes" && <SolicitudesTab />}
        {tab === "perfil" && <PerfilTab />}
        {tab === "verificaciones" && <VerificacionesTab />}
      </main>
    </div>
  );
}
