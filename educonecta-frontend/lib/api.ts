import { CFG, ServiceName } from "./config";

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  token?: string | null;
}

export async function api(service: ServiceName, path: string, opts: ApiOptions = {}) {
  const { method = "GET", body, auth = true, token = null } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // El gateway valida el JWT en todas las rutas no públicas: se envía el token de la sesión
  // siempre que exista (también en llamadas que antes iban "sin auth" directo al servicio).
  let bearer = token;
  if (!bearer && typeof window !== "undefined") {
    try { bearer = localStorage.getItem("educonecta_token"); } catch (_) {}
  }
  if (bearer) headers["Authorization"] = "Bearer " + bearer;

  let res: Response;
  try {
    res = await fetch(CFG[service] + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(
      `No se pudo contactar el servicio "${service}" (${CFG[service]}). ¿Está corriendo y la URL es correcta?`,
    );
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch (_) {
    /* respuesta sin cuerpo (204, etc.) */
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }
  return data;
}

