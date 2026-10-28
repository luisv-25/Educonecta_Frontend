"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { HOUR_PACKAGE_PRICE } from "@/lib/config";
import { HourPackage, PaymentTransaction, TutorSettlement } from "@/lib/types";
import { fmtDate, money, shortId, transactionStatusLabel } from "@/lib/format";

function transactionKind(t: PaymentTransaction) {
  if (!t.booking_id) return "Compra de paquete de horas";
  return t.package_id ? "Tutoría (descontada del paquete)" : "Tutoría";
}

function SettlementCard({ s }: { s: TutorSettlement }) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <span>Cobros exitosos</span>
        <b>{s.transactionsCount}</b>
      </div>
      <div className="stat-card">
        <span>Total cobrado</span>
        <b>${money(s.grossAmount)}</b>
      </div>
      <div className="stat-card">
        <span>Comisión de la plataforma</span>
        <b>${money(s.commissionRetained)}</b>
      </div>
      {s.refundedAmount !== undefined && (
        <div className="stat-card">
          <span>Reembolsado</span>
          <b>${money(s.refundedAmount)}</b>
        </div>
      )}
      <div className="stat-card highlight">
        <span>A pagar al tutor</span>
        <b>${money(s.netPayable)}</b>
      </div>
    </div>
  );
}

export default function PagosTab() {
  const { user, token, isStudent, isTutor, isAdmin } = useAuth();
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [packages, setPackages] = useState<HourPackage[]>([]);
  const [mySettlement, setMySettlement] = useState<TutorSettlement | null>(null);
  const [allSettlements, setAllSettlements] = useState<TutorSettlement[]>([]);
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({});
  const [hours, setHours] = useState(5);
  const [buying, setBuying] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const txs: PaymentTransaction[] = await api("payment", "/transactions", { token });
      setTransactions(txs);

      if (isStudent) {
        setPackages(await api("payment", "/packages", { token }));
      }
      if (isTutor) {
        setMySettlement(await api("payment", `/settlements/tutor/${user.id}`, { token }));
      }
      if (isAdmin) {
        setAllSettlements(await api("payment", "/settlements", { token }));
        const tutors = await api("user", "/users?role=tutor", { auth: false }).catch(() => []);
        const names: Record<string, string> = {};
        for (const t of tutors) names[t.id] = t.fullName || t.email;
        setTutorNames(names);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function buyPackage() {
    const h = Math.floor(Number(hours));
    if (!h || h < 1 || h > 200) {
      showToast("Elige entre 1 y 200 horas", true);
      return;
    }
    setBuying(true);
    try {
      await api("payment", "/packages", {
        method: "POST",
        token,
        body: { hoursPurchased: h, amount: h * HOUR_PACKAGE_PRICE },
      });
      showToast("Paquete comprado");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setBuying(false);
    }
  }

  async function refund(tx: PaymentTransaction) {
    if (!confirm(`¿Reembolsar $${money(tx.amount)} de esta transacción?`)) return;
    try {
      await api("payment", `/transactions/${tx.id}/refund`, {
        method: "POST",
        token,
        body: { reason: "Reembolso manual del administrador" },
      });
      showToast("Reembolso registrado");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    }
  }

  const remainingHours = packages.reduce((sum, p) => sum + p.hours_remaining, 0);

  return (
    <>
      <div className="section-title">
        <h2>Pagos</h2>
        <span className="sub">{loading ? "Cargando…" : `${transactions.length} movimiento(s)`}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}

      {isStudent && !loading && (
        <section className="availability-card" style={{ marginTop: 0 }}>
          <div className="section-title">
            <h2>Paquetes de horas</h2>
            <span className="sub">{remainingHours} hora(s) disponible(s)</span>
          </div>
          <p className="availability-notice">
            Cuando un tutor acepta tu reserva se descuenta una hora de tu paquete. Si no tienes horas, se cobra el valor de la
            tutoría. Si cancelas, la hora vuelve a tu paquete.
          </p>
          <div className="add-subject-row" style={{ marginTop: 6 }}>
            <div>
              <label style={{ marginTop: 0 }}>Horas a comprar</label>
              <input type="number" min={1} max={200} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
            <div>
              <label style={{ marginTop: 0 }}>Total</label>
              <input readOnly value={`$${money((Math.floor(Number(hours)) || 0) * HOUR_PACKAGE_PRICE)}`} />
            </div>
            <button onClick={buyPackage} disabled={buying}>
              {buying ? "Comprando…" : "Comprar paquete"}
            </button>
          </div>
          <p className="availability-notice">Pago simulado: no se usa ninguna tarjeta ni pasarela real.</p>
          {packages.length === 0 && <p className="empty-note">Aún no has comprado paquetes.</p>}
          {packages.map((p) => (
            <div className="booking-row" key={p.id}>
              <div className="info">
                <div>
                  <b>{p.hours_purchased} hora(s)</b> — te quedan {p.hours_remaining}
                </div>
                <div className="when">Comprado {fmtDate(p.purchased_at)}</div>
              </div>
              <span className={`status-pill ${p.hours_remaining > 0 ? "status-approved" : "status-completed"}`}>
                {p.hours_remaining > 0 ? "Con saldo" : "Agotado"}
              </span>
            </div>
          ))}
        </section>
      )}

      {isTutor && mySettlement && !loading && (
        <section className="availability-card" style={{ marginTop: 0 }}>
          <div className="section-title">
            <h2>Mis ingresos</h2>
            <span className="sub">Liquidación actual</span>
          </div>
          <SettlementCard s={mySettlement} />
        </section>
      )}

      {isAdmin && !loading && (
        <section className="availability-card" style={{ marginTop: 0, maxWidth: "none" }}>
          <div className="section-title">
            <h2>Liquidación por tutor</h2>
            <span className="sub">{allSettlements.length} tutor(es) con cobros</span>
          </div>
          {allSettlements.length === 0 && <p className="empty-note">Todavía no hay cobros exitosos a tutores.</p>}
          {allSettlements.map((s) => (
            <div className="booking-row" key={s.tutorId}>
              <div className="info">
                <div>
                  <b>{tutorNames[s.tutorId] || "Tutor " + shortId(s.tutorId)}</b>
                </div>
                <div className="when">
                  {s.transactionsCount} cobro(s) · total ${money(s.grossAmount)} · comisión ${money(s.commissionRetained)}
                </div>
              </div>
              <b>A pagar: ${money(s.netPayable)}</b>
            </div>
          ))}
        </section>
      )}

      <div className="section-title" style={{ marginTop: 26 }}>
        <h2>{isAdmin ? "Todas las transacciones" : "Mis movimientos"}</h2>
      </div>
      {!loading && !error && transactions.length === 0 && (
        <p className="empty-note">
          Todavía no hay movimientos. Los cobros aparecen cuando un tutor acepta una reserva o cuando compras un paquete.
        </p>
      )}
      {!loading &&
        transactions.map((t) => (
          <div className="booking-row" key={t.id}>
            <div className="info">
              <div>
                <b>${money(t.amount)}</b> — {transactionKind(t)}
              </div>
              <div className="when">
                {fmtDate(t.created_at)} · ref. {t.gateway_reference.slice(0, 18)}
              </div>
            </div>
            <span className={`status-pill status-${t.status}`}>{transactionStatusLabel(t.status)}</span>
            {isAdmin && t.status === "succeeded" && Number(t.amount) > 0 && (
              <div className="actions">
                <button className="small danger" onClick={() => refund(t)}>
                  Reembolsar
                </button>
              </div>
            )}
          </div>
        ))}
    </>
  );
}
