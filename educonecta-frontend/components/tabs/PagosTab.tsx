"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { HOUR_PACKAGE_PRICE } from "@/lib/config";
import { HourPackage, PaymentTransaction, PaypalStatus, PayoutSettlement, TutorSettlement } from "@/lib/types";
import PayPalCheckout from "@/components/PayPalCheckout";
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
          <span>Reembolsos descontados</span>
          <b>${money(s.refundedAmount)}</b>
        </div>
      )}
      <div className="stat-card highlight">
        <span>Neto por liquidar</span>
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
  const [payouts, setPayouts] = useState<PayoutSettlement[]>([]);
  const [generating, setGenerating] = useState(false);
  const [tutorNames, setTutorNames] = useState<Record<string, string>>({});
  const [hours, setHours] = useState(5);
  const [buying, setBuying] = useState(false);
  const [paypal, setPaypal] = useState<PaypalStatus>({ enabled: false, clientId: null, currency: "USD" });
  const [payingId, setPayingId] = useState<string | null>(null);
  const payEnabled = paypal.enabled && Boolean(paypal.clientId);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const txs: PaymentTransaction[] = await api("payment", "/transactions", { token });
      setTransactions(txs);

      if (isStudent) {
        const st = await api("payment", "/paypal/status", { auth: false }).catch(() => ({ enabled: false }));
        setPaypal({ enabled: Boolean(st?.enabled), clientId: st?.clientId ?? null, currency: st?.currency || "USD" });
        setPackages(await api("payment", "/packages", { token }));
      }
      if (isTutor) {
        setMySettlement(await api("payment", `/payouts/open/tutor/${user.id}`, { token }));
        setPayouts(await api("payment", "/payouts", { token }));
      }
      if (isAdmin) {
        setAllSettlements(await api("payment", "/payouts/open", { token }));
        setPayouts(await api("payment", "/payouts", { token }));
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
      const res = await api("payment", "/packages", {
        method: "POST",
        token,
        body: { hoursPurchased: h, amount: h * HOUR_PACKAGE_PRICE },
      });
      if (res?.requiresPayment) {
        showToast("Completa el pago con PayPal para recibir tus horas");
        setPayingId(res.transactionId);
        load();
        return;
      }
      showToast("Paquete comprado");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setBuying(false);
    }
  }

  async function generatePayouts(tutorId?: string) {
    setGenerating(true);
    try {
      const created: PayoutSettlement[] = await api("payment", "/payouts/generate", {
        method: "POST",
        token,
        body: tutorId ? { tutorId } : {},
      });
      showToast(created.length ? `${created.length} liquidación(es) generada(s)` : "No hay saldo por liquidar");
      load();
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid(p: PayoutSettlement) {
    const reference = prompt(`Referencia de la transferencia de $${money(p.netAmount)} al tutor (opcional):`, "");
    if (reference === null) return;
    try {
      await api("payment", `/payouts/${p.id}/paid`, { method: "POST", token, body: { reference } });
      showToast("Liquidación marcada como pagada");
      load();
    } catch (e: any) {
      showToast(e.message, true);
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

      {isStudent && payingId && payEnabled && (
        <PayPalCheckout
          transactionId={payingId}
          clientId={paypal.clientId as string}
          currency={paypal.currency}
          onCancel={() => setPayingId(null)}
          onDone={() => {
            setPayingId(null);
            load();
          }}
        />
      )}

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
              {buying ? "Procesando…" : payEnabled ? "Pagar con PayPal" : "Comprar paquete"}
            </button>
          </div>
          <p className="availability-notice">
            {payEnabled
              ? "Pago con PayPal (ambiente de pruebas): el valor se convierte a dólares con una tasa fija y se cobra en USD."
              : "Pago simulado: no se usa ninguna tarjeta ni pasarela real."}
          </p>
          {packages.length === 0 && <p className="empty-note">Aún no has comprado paquetes.</p>}
          {packages.map((p) => {
            const pendingTx = transactions.find((t) => t.package_id === p.id && !t.booking_id && t.status !== "succeeded");
            return (
            <div className="booking-row" key={p.id}>
              <div className="info">
                <div>
                  <b>{p.hours_purchased} hora(s)</b> — te quedan {p.hours_remaining}
                </div>
                <div className="when">Comprado {fmtDate(p.purchased_at)}</div>
              </div>
              {pendingTx ? (
                <>
                  <span className={`status-pill status-${pendingTx.status}`}>
                    {pendingTx.status === "failed" ? "Pago rechazado" : "Pago pendiente"}
                  </span>
                  {payEnabled && !pendingTx.gateway_reference.endsWith(".cancelled") && (
                    <div className="actions">
                      <button className="small" onClick={() => setPayingId(pendingTx.id)}>
                        {pendingTx.status === "failed" ? "Reintentar pago" : "Pagar"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <span className={`status-pill ${p.hours_remaining > 0 ? "status-approved" : "status-completed"}`}>
                  {p.hours_remaining > 0 ? "Con saldo" : "Agotado"}
                </span>
              )}
            </div>
            );
          })}
        </section>
      )}

      {isTutor && mySettlement && !loading && (
        <section className="availability-card" style={{ marginTop: 0 }}>
          <div className="section-title">
            <h2>Mis ingresos</h2>
            <span className="sub">Pendiente por liquidar</span>
          </div>
          <SettlementCard s={mySettlement} />
          <p className="availability-notice">
            Lo cobrado desde tu última liquidación. La administración hace el corte periódico y te transfiere el valor neto.
          </p>
        </section>
      )}

      {(isTutor || isAdmin) && !loading && (
        <section className="availability-card" style={{ marginTop: 0, maxWidth: "none" }}>
          <div className="section-title">
            <h2>{isAdmin ? "Liquidaciones" : "Mis liquidaciones"}</h2>
            <span className="sub">{payouts.length} registro(s)</span>
          </div>
          {payouts.length === 0 && <p className="empty-note">Todavía no se ha generado ninguna liquidación.</p>}
          {payouts.map((p) => (
            <div className="booking-row" key={p.id}>
              <div className="info">
                <div>
                  <b>${money(p.netAmount)}</b>
                  {isAdmin && <> — {tutorNames[p.tutorId] || "Tutor " + shortId(p.tutorId)}</>}
                </div>
                <div className="when">
                  Corte {fmtDate(p.createdAt)} · {p.transactionsCount} cobro(s) · bruto ${money(p.grossAmount)} · comisión $
                  {money(p.commissionAmount)}
                  {p.refundedAmount > 0 && <> · reembolsos −${money(p.refundedAmount)}</>}
                  {p.status === "paid" && (
                    <>
                      {" "}
                      · pagada {fmtDate(p.paidAt || "")}
                      {p.paymentReference ? ` (ref. ${p.paymentReference})` : ""}
                    </>
                  )}
                </div>
              </div>
              <span className={`status-pill ${p.status === "paid" ? "status-approved" : "status-pending"}`}>
                {p.status === "paid" ? "Pagada" : "Pendiente de pago"}
              </span>
              {isAdmin && p.status === "pending" && (
                <div className="actions">
                  <button className="small" onClick={() => markPaid(p)}>
                    Marcar pagada
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {isAdmin && !loading && (
        <section className="availability-card" style={{ marginTop: 0, maxWidth: "none" }}>
          <div className="section-title">
            <h2>Saldo pendiente por tutor</h2>
            <span className="sub">{allSettlements.length} tutor(es) con saldo sin liquidar</span>
          </div>
          {allSettlements.length === 0 && <p className="empty-note">No hay cobros pendientes de liquidar.</p>}
          {allSettlements.map((s) => (
            <div className="booking-row" key={s.tutorId}>
              <div className="info">
                <div>
                  <b>{tutorNames[s.tutorId] || "Tutor " + shortId(s.tutorId)}</b>
                </div>
                <div className="when">
                  {s.transactionsCount} cobro(s) · total ${money(s.grossAmount)} · comisión ${money(s.commissionRetained)}
                  {(s.refundedAmount || 0) > 0 && <> · reembolsos −${money(s.refundedAmount || 0)}</>}
                </div>
              </div>
              <b>A liquidar: ${money(s.netPayable)}</b>
              {s.netPayable > 0 && (
                <div className="actions">
                  <button className="small" disabled={generating} onClick={() => generatePayouts(s.tutorId)}>
                    Liquidar
                  </button>
                </div>
              )}
            </div>
          ))}
          {allSettlements.some((s) => s.netPayable > 0) && (
            <button style={{ marginTop: 10 }} disabled={generating} onClick={() => generatePayouts()}>
              {generating ? "Generando…" : "Generar liquidación de todos"}
            </button>
          )}
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
            {isStudent && payEnabled && t.status !== "succeeded" && Number(t.amount) > 0 && !t.gateway_reference.endsWith(".cancelled") && !t.package_id && (
              <div className="actions">
                <button className="small" onClick={() => setPayingId(t.id)}>
                  {t.status === "failed" ? "Reintentar pago" : "Pagar ahora"}
                </button>
              </div>
            )}
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
