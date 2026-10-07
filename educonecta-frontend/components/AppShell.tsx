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

  const tabs: { id: TabId; label: string }[] = [
    { id: "materias", label: "Materias" },
    { id: "tutores", label: "Tutores" },
    { id: "estudiantes", label: "Estudiantes" },
  ];
  if (isStudent) tabs.push({ id: "reservas", label: "Mis reservas" });
  if (isTutor) {
    tabs.push({ id: "solicitudes", label: "Solicitudes" });
    tabs.push({ id: "perfil", label: "Mi perfil" });
  }
  if (isAdmin) tabs.push({ id: "verificaciones", label: "Verificaciones" });

  return (
    <div id="app-screen">
      <header className="topbar">
        <div className="brand">EduConecta</div>
        <div className="who">
          <span>
            <b>{user.fullName || user.email}</b>
          </span>
          <span className={"role-badge" + (isAdmin ? " admin" : "")}>{roleLabel(user.role)}</span>
          <button className="settings-btn" onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.35)", fontSize: "0.72rem", padding: "5px 10px" }}>
            Salir
          </button>
        </div>
      </header>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "materias" && <MateriasTab />}
        {tab === "tutores" && <TutoresTab onNavigate={setTab} />}
        {tab === "estudiantes" && <EstudiantesTab />}
        {tab === "reservas" && <ReservasTab />}
        {tab === "solicitudes" && <SolicitudesTab />}
        {tab === "perfil" && <PerfilTab />}
        {tab === "verificaciones" && <VerificacionesTab />}
      </main>
    </div>
  );
}
