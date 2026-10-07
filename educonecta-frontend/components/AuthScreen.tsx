"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Role } from "@/lib/types";

export default function AuthScreen() {
  const { login } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  // Solo estudiante/tutor pueden autorregistrarse — la cuenta admin ya
  // existe y no se ofrece como opción pública.
  const [regRole, setRegRole] = useState<Extract<Role, "student" | "tutor">>("student");

  function switchTab(which: "login" | "register") {
    setTab(which);
    setMsg(null);
  }

  async function doLogin(ev: FormEvent) {
    ev.preventDefault();
    try {
      const data = await api("user", "/auth/login", {
        method: "POST",
        auth: false,
        body: { email: loginEmail.trim(), password: loginPassword },
      });
      setMsg(null);
      await login(data.accessToken, data.user);
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  async function doRegister(ev: FormEvent) {
    ev.preventDefault();
    try {
      await api("user", "/auth/register", {
        method: "POST",
        auth: false,
        body: {
          fullName: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: regRole,
        },
      });
      setMsg({ text: "Cuenta creada. Ahora inicia sesión.", ok: true });
      setTab("login");
      setLoginEmail(regEmail.trim());
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    }
  }

  return (
    <div id="auth-screen">
      <div className="auth-wrap">
        <div className="auth-hero">
          <div>
            <div className="brand">EduConecta</div>
            <div className="tag">Un tutor a la medida, sin salir de una sola plataforma.</div>
            <div className="desc">
              Busca tutores por materia, reserva tu sesión, entra a la videollamada y califica al tutor cuando
              termines. Esta demo consume los cuatro microservicios reales: identidad, catálogo, reservas y
              sesiones, con permisos distintos para estudiante, tutor y administrador.
            </div>
          </div>
          <div className="foot">Universidad Cooperativa de Colombia · Ingeniería de Sistemas</div>
        </div>

        <div className="auth-form-side">
          <div className="tabs-switch">
            <button className={tab === "login" ? "active" : ""} onClick={() => switchTab("login")}>
              Ingresar
            </button>
            <button className={tab === "register" ? "active" : ""} onClick={() => switchTab("register")}>
              Registrarme
            </button>
          </div>

          {tab === "login" && (
            <form onSubmit={doLogin}>
              <label>Correo</label>
              <input
                type="email"
                required
                placeholder="tucorreo@educonecta.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <label>Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button className="auth-submit" type="submit">
                Ingresar
              </button>
            </form>
          )}

          {tab === "register" && (
            <form onSubmit={doRegister}>
              <label>Nombre completo</label>
              <input
                type="text"
                required
                placeholder="Ana Torres"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
              <label>Correo</label>
              <input
                type="email"
                required
                placeholder="tucorreo@educonecta.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <label>Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="mínimo 8 caracteres"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <label>Soy...</label>
              <div className="role-pick">
                <label className={regRole === "student" ? "checked" : ""}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={regRole === "student"}
                    onChange={() => setRegRole("student")}
                  />{" "}
                  Estudiante
                </label>
                <label className={regRole === "tutor" ? "checked" : ""}>
                  <input
                    type="radio"
                    name="role"
                    value="tutor"
                    checked={regRole === "tutor"}
                    onChange={() => setRegRole("tutor")}
                  />{" "}
                  Tutor
                </label>
              </div>
              <button className="auth-submit" type="submit">
                Crear cuenta
              </button>
            </form>
          )}

          {msg && <div className={"auth-msg " + (msg.ok ? "ok" : "err")}>{msg.text}</div>}
        </div>
      </div>
    </div>
  );
}
