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
import PagosTab from "./tabs/PagosTab";
import ProgresoTab from "./tabs/ProgresoTab";
import NotificacionesTab from "./tabs/NotificacionesTab";
import AnaliticaTab from "./tabs/AnaliticaTab";

type TabId =
  | "materias"
  | "tutores"
  | "estudiantes"
  | "reservas"
  | "solicitudes"
  | "perfil"
  | "verificaciones"
  | "pagos"
  | "progreso"
  | "notificaciones"
  | "analitica";

export default function AppShell() {
  const { user, isStudent, isTutor, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState<TabId>(isTutor ? "perfil" : "materias");

  if (!user) return null;

  // CAMBIO MARCADO: estudiantes reservan desde Materias; solo administración consulta el directorio de tutores.
  const canSeeTutors = isAdmin;
  const canSeeStudents = !isStudent;

  const tabs: { id: TabId; label: string }[] = [{ id: "materias", label: "Materias" }];
  if (canSeeTutors) tabs.push({ id: "tutores", label: "Tutores" });
  if (canSeeStudents) tabs.push({ id: "estudiantes", label: "Estudiantes" });
  if (isStudent) {
    tabs.push({ id: "reservas", label: "Mis reservas" });
    tabs.push({ id: "progreso", label: "Mi progreso" });
  }
  if (isTutor) {
    tabs.push({ id: "solicitudes", label: "Solicitudes" });
    tabs.push({ id: "perfil", label: "Mi perfil" });
  }
  tabs.push({ id: "pagos", label: "Pagos" });
  if (isAdmin) tabs.push({ id: "verificaciones", label: "Verificaciones" });
  tabs.push({ id: "notificaciones", label: "Notificaciones" });
  if (isAdmin) tabs.push({ id: "analitica", label: "Analítica" });

  const firstName = user.fullName?.trim().split(/\s+/)[0] || "bienvenido";
  const welcomeMessage = isTutor
    ? "Comparte tu conocimiento y acompaña a más estudiantes."
    : isStudent
      ? "Encuentra el apoyo que necesitas para seguir aprendiendo."
      : "Administra y acompaña la comunidad EduConecta.";

  return (
    <div id="app-screen">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo-slot" aria-hidden="true" />
          EduConecta
        </div>

        <p className="sidebar-caption">MENÚ PRINCIPAL</p>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className="sidebar-nav-mark" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">
            {(user.fullName || user.email).charAt(0).toUpperCase()}
          </div>
          <span className="account-details">
            <b>{user.fullName || user.email}</b>
            <span>{roleLabel(user.role)}</span>
          </span>
          <button className="logout-btn" onClick={logout}>
            Salir
          </button>
        </div>
      </aside>

      <div className="dashboard-area">
        <main className="dashboard-main">
          <header className="welcome-banner">
            <div className="welcome-copy">
              <span className="welcome-eyebrow">EDU CONECTA · TU ESPACIO DE APRENDIZAJE</span>
              <h1>¡Hola, {firstName}!</h1>
              <p>{welcomeMessage}</p>
            </div>
          </header>

          {tab === "materias" && <MateriasTab />}
          {tab === "tutores" && canSeeTutors && <TutoresTab />}
          {tab === "estudiantes" && canSeeStudents && <EstudiantesTab />}
          {tab === "reservas" && isStudent && <ReservasTab />}
          {tab === "solicitudes" && isTutor && <SolicitudesTab />}
          {tab === "perfil" && isTutor && <PerfilTab />}
          {tab === "verificaciones" && isAdmin && <VerificacionesTab />}
          {tab === "pagos" && <PagosTab />}
          {tab === "progreso" && isStudent && <ProgresoTab />}
          {tab === "notificaciones" && <NotificacionesTab />}
          {tab === "analitica" && isAdmin && <AnaliticaTab />}
        </main>
      </div>
    </div>
  );
}
