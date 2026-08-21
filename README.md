# Ayudas La Virginia Web

Aplicación web para registrar, visualizar y administrar solicitudes de ayuda en La Virginia, Risaralda. Las personas pueden solicitar ayuda sin crear una cuenta; los cambios de estado quedan pendientes hasta que un administrador los revise.

## Funcionalidades

- Dashboard público con filtros, orden por prioridad, recientes o antiguas y paginación de 25 registros.
- Códigos públicos legibles como `SOLICITUD_0001`.
- Formulario público con validaciones en vivo, tratamiento de datos y confirmación antiabuso.
- Geolocalización automática y selección manual con Leaflet/OpenStreetMap.
- Reportes de avance con fotografía y firma digital SVG.
- Mapa que agrupa solicitudes ubicadas en el mismo punto.
- Inicio de sesión exclusivo para administradores.
- Aprobación o rechazo administrativo de cambios de estado.
- CRUD completo para el rol `superadmin`.
- Diseño responsive con menú hamburguesa en dispositivos móviles.

## Roles y flujo

1. Cualquier persona consulta y crea solicitudes sin iniciar sesión.
2. Cualquier persona puede reportar un avance, adjuntando fotografía y firma.
3. El cambio queda pendiente y no modifica inmediatamente la solicitud.
4. Un `admin` puede aprobarlo o rechazarlo.
5. Un `superadmin` administra solicitudes, aprobaciones y usuarios administrativos.

Los datos públicos están separados de la información privada. El número de documento se almacena cifrado con AES-256, conserva una huella bcrypt para verificaciones y solo se descifra mediante una operación administrativa autorizada. Las contraseñas son gestionadas por Supabase Auth y nunca se guardan en el repositorio.

## Tecnologías

- React 19 y TypeScript.
- Vite.
- Supabase PostgreSQL, Auth, Storage y RPC.
- Leaflet y OpenStreetMap.
- CSS responsive.
- Vercel para el frontend.

## Estructura

```text
.
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── data.ts
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLoginModal.tsx
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── ApprovalDetailModal.tsx
│   │   │   ├── EditAdminModal.tsx
│   │   │   ├── EditRequestModal.tsx
│   │   │   ├── ReviewStatistics.tsx
│   │   │   └── StatusChangeFormModal.tsx
│   │   ├── collectionCenters/
│   │   │   └── CollectionCenterFormModal.tsx
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Icons.tsx
│   │   │   ├── ImageModal.tsx
│   │   │   ├── LogoMark.tsx
│   │   │   ├── NeighborhoodInput.tsx
│   │   │   ├── PasswordInput.tsx
│   │   │   └── SignaturePad.tsx
│   │   ├── maps/
│   │   │   ├── CollectionCentersMap.tsx
│   │   │   └── LeafletMap.tsx
│   │   └── requests/
│   │       ├── PrivacyConsentModal.tsx
│   │       ├── RequestCard.tsx
│   │       ├── RequestDetailModal.tsx
│   │       └── RequestForm.tsx
│   ├── config/
│   │   └── constants.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── imageOptimizer.ts
│   │   ├── mappers.ts
│   │   └── validators.ts
│   └── views/
│       ├── CollectionCentersPageView.tsx
│       ├── DashboardView.tsx
│       ├── InformationView.tsx
│       └── MapView.tsx
├── supabase/
│   └── migrations/
├── public/
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Ejecución local

Requiere Node.js 20 o superior y npm.

```bash
git clone https://github.com/juanandresariasutp/ayudaslavirginia-web.git
cd ayudaslavirginia-web
npm install
cp .env.example .env.local
npm run dev
```

Completa `.env.local` únicamente con valores públicos:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
VITE_TURNSTILE_SITE_KEY=
```

`VITE_TURNSTILE_SITE_KEY` está reservada para completar el control antibots. Cualquier variable `VITE_` forma parte del código que recibe el navegador y debe considerarse pública.

## Preparar Supabase

Las migraciones están en `supabase/migrations`. Para conectar un proyecto nuevo:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Revisa y prueba las migraciones en desarrollo antes de producción. El seed local está excluido de Git porque puede contener credenciales de desarrollo.

Nunca publiques:

- `service_role` o secret keys de Supabase;
- contraseña de PostgreSQL;
- clave privada de cifrado de documentos;
- contraseñas administrativas;
- secreto de Turnstile;
- tokens personales de GitHub o Vercel.

Los secretos de servidor deben permanecer en Supabase Secrets o Vault. El frontend solo necesita la URL y la publishable key; la autorización real se aplica mediante RLS, permisos y funciones de base de datos.

## Verificación

```bash
npm run typecheck
npm run build
npm run preview
```

La compilación se genera en `dist/`.

## Despliegue en Vercel

1. En Vercel selecciona **Add New → Project** e importa `juanandresariasutp/ayudaslavirginia-web`.
2. Confirma el framework **Vite**.
3. Usa:

   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

4. En **Settings → Environment Variables**, agrega para Production, Preview y Development:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_TURNSTILE_SITE_KEY`, cuando esté integrado

5. Despliega y registra el dominio definitivo en las URL permitidas de Supabase Auth.

No es necesario subir `dist/`; Vercel lo genera en cada despliegue.

## Privacidad

La aplicación procesa información personal, ubicación, fotografías y firmas. Antes del uso público deben revisarse las políticas de tratamiento de datos, retención, eliminación, acceso administrativo, respaldos y respuesta a incidentes. La plataforma no reemplaza las líneas oficiales de emergencia.
