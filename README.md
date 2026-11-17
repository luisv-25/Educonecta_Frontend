# educonecta-frontend

Interfaz web de **EduConecta** (Next.js 14 + React 18). Todas las peticiones pasan por el API Gateway.

## Roles
- **Estudiante:** materias, tutores, reservas, pagos (PayPal), progreso, notificaciones; entra a la videollamada pero no la finaliza.
- **Tutor:** perfil y disponibilidad, solicitudes (aceptar/cancelar), sus estudiantes solicitantes, material de apoyo.
- **Admin:** verificación de credenciales, analítica, gestión de cuentas.

## Puesta en marcha
```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```
Despliegue: Vercel. Variable opcional `NEXT_PUBLIC_API_GATEWAY_URL`.
