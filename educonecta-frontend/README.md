# EduConecta — Frontend (Next.js)

Port 1:1 del `index.html` original a Next.js 14 (App Router) + TypeScript,
conservando el mismo diseño (mismo CSS, mismas clases) y el mismo
comportamiento. Cambios respecto al original, tal como se pidió:

1. **Se eliminó la opción de registrar cuenta "Administrador"** del
   formulario de registro — ya existe una cuenta admin creada
   directamente en la base de datos. El registro público solo permite
   `student` o `tutor`.
2. **Se eliminó el panel "Configurar URLs de los servicios"** y todo el
   guardado en `localStorage` de esas URLs. Las 4 URLs de los
   microservicios ahora están fijas dentro del frontend
   (`lib/config.ts`), con posibilidad de sobreescribirlas en build time
   con variables de entorno de Vercel — pero nunca editables desde el
   navegador de quien usa la app.

La sesión del usuario (token JWT + datos de usuario) se sigue guardando
en `localStorage`, igual que en el original — eso no se tocó, es
comportamiento distinto al de las URLs de configuración.

## Estructura

```
app/
  layout.tsx        Layout raíz, monta los providers (Auth, Toast)
  page.tsx           Decide auth-screen vs app-shell (igual que el original)
  globals.css        CSS idéntico al del index.html original
components/
  AuthScreen.tsx      Login / registro (sin opción admin)
  AppShell.tsx        Topbar + tabbar + enrutador de pestañas
  SessionActions.tsx  Botones "Entrar a la sesión" / "Finalizar" (compartido)
  tabs/               Una por cada pestaña original
  modals/             Modal de calificación y de reserva
lib/
  config.ts          URLs de los 4 microservicios (fijas, no editables)
  api.ts             Helper fetch, equivalente al api() del original
  auth-context.tsx   Reemplaza el objeto `state` global
  toast-context.tsx  Reemplaza el showToast() global
  types.ts / format.ts
```

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # opcional: solo si quieres apuntar a otros backends
npm run dev
```

## Despliegue en Vercel

1. Sube esta carpeta como repo de GitHub (o como parte del monorepo, indicando
   esta carpeta como Root Directory del proyecto en Vercel).
2. Vercel detecta Next.js automáticamente — no hace falta configurar nada más.
3. Si quieres cambiar a qué backends apunta sin tocar código, configura las 4
   variables `NEXT_PUBLIC_*` del `.env.local.example` en Project Settings →
   Environment Variables. Si no las configuras, usa las URLs de Render que ya
   están puestas por defecto en `lib/config.ts`.

## Nota sobre el stack

El documento de arquitectura menciona Next.js + TypeScript + TailwindCSS.
Este port usa Next.js + TypeScript tal como está documentado. Para conservar
el diseño exactamente igual al original se portó el CSS existente tal cual
(`app/globals.css`) en vez de reescribirlo con clases de Tailwind — así se
garantiza que se vea idéntico sin el riesgo de introducir diferencias
visuales al traducir cada estilo a utilidades. Tailwind se puede añadir
después para nuevas pantallas sin conflicto con este CSS.
