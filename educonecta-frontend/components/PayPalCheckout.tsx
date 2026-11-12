"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

declare global {
  interface Window {
    paypal?: any;
  }
}

// Carga el SDK de PayPal una sola vez por client-id.
function loadPaypalSdk(clientId: string, currency: string): Promise<any> {
  if (window.paypal) return Promise.resolve(window.paypal);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("paypal-sdk") as HTMLScriptElement | null;
    const script = existing || document.createElement("script");
    script.addEventListener("load", () => resolve(window.paypal));
    script.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal")));
    if (!existing) {
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&components=buttons`;
      document.body.appendChild(script);
    }
  });
}

// Botones de PayPal para pagar UNA transacción pendiente. El monto lo calcula
// el servidor al crear la orden y el pago solo se marca como exitoso cuando el
// servidor captura la orden (el navegador no decide nada).
export default function PayPalCheckout({
  transactionId,
  clientId,
  currency,
  onDone,
  onCancel,
}: {
  transactionId: string;
  clientId: string;
  currency: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const showToast = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [usd, setUsd] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let buttons: any;
    let cancelled = false;
    loadPaypalSdk(clientId, currency)
      .then((paypal) => {
        if (cancelled || !containerRef.current) return;
        buttons = paypal.Buttons({
          style: { shape: "rect", layout: "vertical", color: "gold", label: "pay" },
          async createOrder() {
            const r = await api("payment", `/transactions/${transactionId}/paypal/order`, { method: "POST", token });
            setUsd(r.usdAmount);
            return r.orderId;
          },
          async onApprove(data: any) {
            try {
              const r = await api("payment", `/transactions/${transactionId}/paypal/capture`, {
                method: "POST",
                token,
                body: { orderId: data.orderID },
              });
              if (r.status === "COMPLETED") showToast("¡Pago aprobado!");
              else if (r.status === "FAILED") showToast("PayPal no aprobó el pago. Puedes reintentarlo.", true);
              else showToast("Tu pago está en proceso; se actualizará en unos minutos");
            } catch (e: any) {
              showToast(e.message, true);
            }
            onDone();
          },
          onCancel() {
            showToast("Pago cancelado. Puedes pagar más tarde desde esta pestaña.", true);
          },
          onError(err: any) {
            console.error(err);
            showToast("Error con PayPal. Intenta de nuevo.", true);
          },
        });
        buttons.render(containerRef.current);
      })
      .catch((e) => setLoadError(e.message));
    return () => {
      cancelled = true;
      try {
        buttons?.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId, clientId, currency]);

  return (
    <section className="availability-card" style={{ marginTop: 0 }}>
      <div className="section-title">
        <h2>Pagar con PayPal</h2>
        <button className="small" onClick={onCancel}>
          Cerrar
        </button>
      </div>
      <p className="availability-notice">
        Ambiente de pruebas (sandbox): usa una cuenta de comprador de prueba de PayPal. {usd ? `Se cobrará US$${usd}.` : ""}
      </p>
      {loadError && <p className="empty-note">{loadError}</p>}
      <div ref={containerRef} style={{ maxWidth: 420 }} />
    </section>
  );
}
