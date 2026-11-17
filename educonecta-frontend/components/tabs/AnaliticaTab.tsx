"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AnalyticsDashboard } from "@/lib/types";
import { money, percent } from "@/lib/format";

// Panel de Analítica (sección 5.9, Analytics Service). Solo-lectura y
// restringido a admin en el propio backend (JwtRolesGuard + @Roles("admin")
// en analytics-service), así que esta pestaña solo aparece para isAdmin.
export default function AnaliticaTab() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api("analytics", "/analytics/dashboard", { token })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <div className="section-title">
        <h2>Panel de Analítica</h2>
        <span className="sub">Métricas agregadas de toda la plataforma</span>
      </div>

      {loading && <p className="empty-note">Cargando…</p>}
      {error && <p className="empty-note">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="stat-grid">
            <div className="stat-card highlight">
              <span>Retención de tutores</span>
              <b>{percent(data.tutorRetention.tasaRetencion)}</b>
            </div>
            <div className="stat-card">
              <span>Tutores con sesiones</span>
              <b>{data.tutorRetention.totalTutorsConSesiones}</b>
            </div>
            <div className="stat-card">
              <span>Tutores retenidos (2+ sesiones)</span>
              <b>{data.tutorRetention.tutoresRetenidos}</b>
            </div>
            <div className="stat-card highlight">
              <span>Conversión prueba → paquete</span>
              <b>{percent(data.trialConversion.tasaConversion)}</b>
            </div>
            <div className="stat-card">
              <span>Estudiantes con prueba gratuita</span>
              <b>{data.trialConversion.estudiantesConPruebaGratuita}</b>
            </div>
            <div className="stat-card">
              <span>Convertidos a paquete pagado</span>
              <b>{data.trialConversion.estudiantesConvertidos}</b>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 26 }}>
            <h2>Sesiones realizadas por materia</h2>
          </div>
          {data.sessionsBySubject.length === 0 && <p className="empty-note">Todavía no hay sesiones completadas.</p>}
          {data.sessionsBySubject.map((row) => (
            <div className="booking-row" key={row.subjectId || "sin-materia"}>
              <div className="info">
                <b>{row.subjectName}</b>
              </div>
              <span className="status-pill status-completed">{row.sessionsCompleted} sesión(es)</span>
            </div>
          ))}

          <div className="section-title" style={{ marginTop: 26 }}>
            <h2>Ingresos por materia</h2>
          </div>
          {data.revenueBySubject.length === 0 && <p className="empty-note">Todavía no hay ingresos registrados.</p>}
          {data.revenueBySubject.map((row) => (
            <div className="booking-row" key={row.subjectId || "sin-materia"}>
              <div className="info">
                <b>{row.subjectName}</b>
              </div>
              <span className="status-pill status-approved">${money(row.revenue)}</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}
