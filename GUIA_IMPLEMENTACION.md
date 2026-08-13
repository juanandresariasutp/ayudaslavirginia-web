# Guía de implementación y despliegue

Este documento describe el estado actual de **Ayudas La Virginia Web**, lo que falta para convertirla en una aplicación funcional y el orden recomendado para conectar Supabase, publicar el código en GitHub y desplegar el frontend en Vercel.

> El proyecto actual es una demostración frontend. No se deben registrar personas, teléfonos, direcciones exactas ni evidencias reales hasta implementar autenticación, permisos, políticas de privacidad y seguridad en la base de datos.

## 1. Estado actual

### Ya está implementado

- [x] Aplicación creada con React, TypeScript y Vite.
- [x] Diseño adaptable para escritorio y dispositivos móviles.
- [x] Navegación entre Inicio, Mapa, Solicitudes y Mi cuenta.
- [x] Panel con métricas calculadas desde el estado local.
- [x] Listado, búsqueda y filtros de solicitudes.
- [x] Formulario demostrativo para crear solicitudes.
- [x] Flujo público sin creación de cuenta para solicitar ayuda.
- [x] Campos privados de identificación, contacto, barrio y dirección.
- [x] Categorías de ayuda y captura de fotografía para escombros.
- [x] Solicitud de ubicación mediante permisos del dispositivo.
- [x] Paginación preparada para 25 registros, filtros y orden por prioridad o fecha.
- [x] Estados simplificados: sin atender, en progreso y completada.
- [x] Panel administrativo demostrativo para solicitudes, aprobaciones y usuarios.
- [x] Evidencia fotográfica y firma digital en solicitudes de cambio de estado.
- [x] Tipos de TypeScript para solicitudes, necesidades, estados y urgencias.
- [x] Datos ficticios para probar la interfaz.
- [x] Compilación de producción mediante `npm run build`.

### Todavía no está implementado

- [ ] Base de datos permanente.
- [ ] Conexión con Supabase.
- [ ] Autenticación, recuperación y MFA exclusivamente para administradores.
- [ ] Control antibots real y validado en el servidor.
- [ ] Roles y permisos administrativos reales.
- [ ] Persistencia de solicitudes, compromisos y entregas.
- [x] Integración inicial de Leaflet y geolocalización del navegador.
- [ ] Persistencia segura y anonimización geográfica en Supabase.
- [ ] Almacenamiento de fotografías o documentos.
- [ ] Notificaciones.
- [ ] Panel administrativo.
- [ ] Pruebas automatizadas.
- [ ] Integración continua con GitHub.
- [ ] Despliegue en Vercel.
- [ ] Dominio, analítica, monitoreo y alertas.

Actualmente las solicitudes están definidas en `src/data.ts` y se administran con estado local en `src/App.tsx`. Los cambios se pierden cuando se recarga la página.

## 2. Arquitectura objetivo

```text
Usuario
  │
  ▼
Vercel ── React + TypeScript + Vite
  │
  ├── Supabase Auth, solo para administradores
  ├── Supabase PostgreSQL
  ├── Supabase Storage
  └── Supabase Edge Functions, solo cuando se necesite lógica privilegiada
```

Responsabilidades:

- **React/Vercel:** interfaz, formularios, navegación y presentación de información pública.
- **Supabase Auth:** identidad y sesiones de administradores. Las personas solicitantes no crean cuenta.
- **PostgreSQL:** solicitudes, necesidades, compromisos, entregas, perfiles e historial.
- **Row Level Security (RLS):** autorización real por usuario y rol.
- **Storage:** evidencias privadas con políticas de acceso.
- **Edge Functions:** operaciones que necesiten secretos o privilegios del servidor.

El navegador no debe decidir por sí solo quién puede leer o modificar datos. Las reglas importantes deben estar aplicadas en PostgreSQL mediante RLS y, cuando corresponda, en funciones del servidor.

## 3. Preparación local

Requisitos recomendados:

- Node.js 20 o superior.
- npm.
- Git.
- Una cuenta de GitHub.
- Una organización o cuenta de Supabase.
- Una cuenta de Vercel.

Para ejecutar el proyecto:

```bash
cd web-app
npm install
npm run dev
```

Para verificarlo antes de subir cambios:

```bash
npm run typecheck
npm run build
```

## 4. Crear el proyecto en Supabase

- [ ] Crear una organización y un proyecto en Supabase.
- [ ] Elegir la región más cercana a los usuarios de Colombia.
- [ ] Guardar las credenciales administrativas en un gestor de contraseñas.
- [ ] Definir ambientes separados para desarrollo y producción.
- [ ] Nunca reutilizar datos personales reales en el ambiente de desarrollo.

Como mínimo conviene tener:

- un proyecto Supabase de **desarrollo** para trabajar y probar;
- un proyecto Supabase de **producción** conectado al dominio público.

## 5. Modelo inicial de base de datos

El esquema debe revisarse antes de escribir las migraciones. Una propuesta inicial es:

### `admin_users`

- `id`: UUID, igual al administrador de Supabase Auth.
- `display_name` y correo institucional.
- `role`: `super_admin`, `admin` o `reviewer`.
- estado activo/inactivo y administrador que lo creó.
- `created_at` y `updated_at`.

### `organizations`

- `id`, `name`, `description`.
- estado de verificación.
- datos de contacto institucional.
- fechas de creación y actualización.

### `help_requests`

- `id`: UUID interno.
- `public_code`: código legible como `LVR-2026-000123`.
- `full_name`, `document_type`, `document_number` y `phone`, todos privados.
- `sector`, `reference` y `description`.
- `people_count`, `urgency` y `status`.
- coordenadas exactas privadas.
- coordenadas aproximadas para la vista pública.
- token o huella antiabuso con retención limitada, nunca el token Turnstile completo.
- fechas de creación, verificación, cierre y actualización.

### `request_needs`

- solicitud relacionada.
- categoría, nombre, unidad y cantidad solicitada.
- cantidades comprometidas y entregadas, preferiblemente calculadas desde sus registros relacionados.

### `status_change_requests`

- solicitud relacionada y estado propuesto.
- responsable que atendió el caso.
- ruta privada de la fotografía de evidencia.
- firma digital, fecha y administrador que revisa.
- estado de aprobación: pendiente, aprobado o rechazado.

### `admin_audit_log`

- administrador, acción, entidad afectada y fecha.
- metadatos mínimos para auditoría, sin duplicar documentos o teléfonos.

### `request_events`

- solicitud relacionada.
- tipo de evento.
- actor responsable.
- datos mínimos del cambio.
- fecha del evento.

Esta tabla funciona como historial de auditoría. Los eventos sensibles no deberían poder editarse desde el cliente.

### `reports`

- solicitud reportada.
- usuario que reporta.
- motivo, estado y respuesta de coordinación.

## 6. Migraciones y control de cambios

No conviene crear las tablas manualmente solo desde el panel web. El esquema debe quedar versionado en Git mediante migraciones.

- [ ] Instalar y configurar Supabase CLI.
- [ ] Inicializar la carpeta local de Supabase.
- [ ] Crear la primera migración SQL.
- [ ] Agregar restricciones, índices y relaciones.
- [ ] Crear datos ficticios de desarrollo mediante un archivo de seed.
- [ ] Probar las migraciones desde una base vacía.
- [ ] Aplicar migraciones a producción desde un flujo controlado.

La carpeta esperada será similar a:

```text
web-app/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── src/
```

## 7. Acceso público, control antibots y administración

Antes de conectar información real:

- [ ] Mantener la creación de solicitudes sin cuenta de usuario.
- [ ] Integrar Cloudflare Turnstile en el formulario público.
- [ ] Validar el token Turnstile dentro de una Supabase Edge Function.
- [ ] Aplicar límites por IP/huella temporal y detectar duplicados sin bloquear injustamente redes compartidas.
- [ ] Hacer que la Edge Function valide y escriba la solicitud; el navegador no debe insertar datos privados directamente.
- [ ] Activar autenticación para administradores.
- [ ] Configurar las URLs permitidas para desarrollo y producción.
- [ ] Crear el registro `admin_users` únicamente desde una operación privilegiada.
- [ ] Permitir que solo un `super_admin` cree, desactive o elimine otros administradores.
- [ ] Activar MFA para cuentas administrativas.
- [ ] Implementar roles sin depender de valores modificables desde el navegador.
- [ ] Activar RLS en todas las tablas expuestas por la API.
- [ ] Escribir políticas para lectura, creación, actualización y eliminación.
- [ ] Probar cada política como usuario anónimo y como cada rol.

Ejemplos de reglas esperadas:

- El público solo puede leer una vista aprobada y anonimizada: código, barrio, categoría, descripción revisada, prioridad, fecha y estado.
- Ninguna consulta pública devuelve nombre, documento, teléfono, dirección exacta, fotografía, firma o coordenada exacta.
- Solo los administradores autorizados pueden consultar datos privados.
- Un cambio de estado exige evidencia y firma, y permanece pendiente hasta su aprobación.
- Quien propone un cambio no debería aprobar su propia solicitud cuando haya suficientes operadores.
- Nadie obtiene una dirección exacta solo por conocer el ID de una solicitud.

No se debe implementar seguridad ocultando botones. Ocultar un botón mejora la experiencia, pero RLS es lo que protege los datos.

## 8. Variables de entorno

Vite solo expone al navegador las variables que comienzan por `VITE_`. Por lo tanto, cualquier valor con ese prefijo debe considerarse **público**.

Variables iniciales del frontend:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
VITE_TURNSTILE_SITE_KEY=TU_CLAVE_PUBLICA_TURNSTILE
```

También puede utilizarse el nombre de clave pública que muestre Supabase para proyectos nuevos, siempre que sea la clave diseñada para clientes públicos.

### Valores que nunca deben ir en el frontend

- Clave `service_role` de Supabase.
- Claves secretas o privadas de Supabase.
- Contraseña directa de PostgreSQL.
- Tokens personales de GitHub.
- Tokens de administración de Vercel.
- Claves privadas de correo, mapas, pagos o proveedores externos.
- Clave secreta de Cloudflare Turnstile.

Los secretos se usan únicamente en un entorno de servidor, por ejemplo una Supabase Edge Function o una función segura de backend.

### Archivos locales

Crear más adelante un archivo `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TURNSTILE_SITE_KEY=
```

El `.gitignore` de esta carpeta ya protege:

```gitignore
.env
.env.*
!.env.example
```

Esto ignora `.env.local`, `.env.development`, `.env.production` y variantes similares, pero permite subir un `.env.example` sin valores reales.

Antes de cada commit se debe comprobar:

```bash
git status
git diff --cached
```

Si un secreto llega a subirse, eliminar el archivo en un commit posterior no es suficiente: hay que revocar o rotar inmediatamente la credencial y revisar el historial.

## 9. Conectar React con Supabase

Orden recomendado:

- [ ] Instalar `@supabase/supabase-js`.
- [ ] Crear un módulo único, por ejemplo `src/lib/supabase.ts`.
- [ ] Validar que las variables requeridas existan al iniciar la aplicación.
- [ ] Crear servicios tipados por dominio, no consultas dispersas en los componentes.
- [ ] Generar tipos TypeScript desde el esquema de Supabase.
- [ ] Reemplazar `src/data.ts` gradualmente por consultas reales.
- [ ] Añadir estados de carga, error, vacío y reintento.
- [ ] Implementar actualización segura de datos y manejo de conflictos.

Estructura sugerida:

```text
src/
├── components/
├── features/
│   ├── auth/
│   ├── requests/
│   ├── commitments/
│   └── deliveries/
├── lib/
│   └── supabase.ts
├── services/
├── types/
└── App.tsx
```

Para una aplicación que crecerá, conviene dividir el actual `App.tsx` antes de añadir toda la lógica remota.

## 10. Funcionalidades por implementar

### Primera versión funcional

- [ ] Crear solicitudes públicas sin cuenta mediante Edge Function y Turnstile.
- [ ] Acceso, cierre de sesión, recuperación y MFA para administradores.
- [ ] Crear un código de consulta y mecanismo privado para que el solicitante pueda consultar su caso sin cuenta, si se aprueba este requisito.
- [ ] Lista pública anonimizada.
- [ ] Detalle de solicitud según permisos.
- [ ] Solicitar cambios a en progreso o completada con fotografía y firma.
- [ ] Aprobar o rechazar cambios desde un panel separado.
- [ ] Historial de cambios.
- [ ] Panel básico para coordinación.

### Después de validar la primera versión

- [ ] Mapa real con ubicación pública aproximada.
- [ ] Evidencias privadas en Supabase Storage.
- [ ] Notificaciones por correo o canales aprobados.
- [ ] Gestión de organizaciones y miembros.
- [ ] Reportes de abuso o información incorrecta.
- [ ] Estadísticas y exportaciones con datos anonimizados.

## 11. Pruebas necesarias

- [ ] Configurar ESLint y Prettier.
- [ ] Agregar Vitest y Testing Library.
- [ ] Probar validación de formularios y reglas de negocio.
- [ ] Probar estados de carga y errores de red.
- [ ] Agregar Playwright para recorridos de usuario.
- [ ] Probar todas las políticas RLS con usuarios de distintos roles.
- [ ] Revisar accesibilidad con teclado y lector de pantalla.
- [ ] Revisar rendimiento en dispositivos y conexiones lentas.
- [ ] Ejecutar `npm run typecheck` y `npm run build` en GitHub Actions.

## 12. Subir el proyecto a GitHub

Antes del primer push:

- [ ] Confirmar que no haya secretos ni información personal.
- [ ] Confirmar que `node_modules/`, `dist/` y archivos `.env*` estén ignorados.
- [ ] Crear un `.env.example` únicamente con nombres y valores vacíos.
- [ ] Revisar el README y esta guía.
- [ ] Configurar la rama principal y protección de rama.
- [ ] Habilitar revisión de dependencias y alertas de seguridad.
- [ ] Agregar un workflow de GitHub Actions para tipado, pruebas y compilación.

Comprobaciones locales:

```bash
git status
git check-ignore .env.local
npm run typecheck
npm run build
```

`git check-ignore .env.local` debe mostrar el nombre del archivo, confirmando que Git lo ignora.

## 13. Desplegar en Vercel

Flujo esperado:

1. Subir el repositorio a GitHub.
2. Importar el repositorio desde Vercel.
3. Seleccionar `web-app` como **Root Directory** si el repositorio conserva Flutter en la raíz.
4. Usar Vite como framework.
5. Comando de instalación: `npm install`.
6. Comando de compilación: `npm run build`.
7. Directorio de salida: `dist`.
8. Registrar las variables públicas de Supabase en la configuración de Vercel.
9. Configurar valores diferentes para Preview y Production.
10. Desplegar y verificar los recorridos críticos.

Variables que se configurarán en Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_TURNSTILE_SITE_KEY
```

Después del primer despliegue:

- [ ] Añadir la URL de Vercel a las URLs permitidas de Supabase Auth.
- [ ] Configurar el dominio definitivo.
- [ ] Añadir el dominio definitivo a Supabase Auth.
- [ ] Probar formulario público, Turnstile, ingreso administrativo, cierre y recuperación.
- [ ] Verificar que una Preview no use accidentalmente la base de producción.
- [ ] Configurar alertas y revisar registros sin exponer datos personales.

## 14. Flujo de trabajo recomendado

```text
1. Definir modelo y permisos
2. Crear Supabase de desarrollo
3. Versionar migraciones y RLS
4. Implementar Edge Function pública, Turnstile y límites antiabuso
5. Implementar autenticación administrativa con MFA
6. Conectar solicitudes y aprobación de cambios
7. Añadir pruebas
8. Subir a GitHub
9. Configurar GitHub Actions
10. Crear Supabase de producción
11. Importar en Vercel
12. Configurar variables y dominios
13. Ejecutar piloto controlado
14. Autorizar uso con datos reales
```

## 15. Definiciones que necesitamos antes de continuar

- [ ] ¿Quién es legal y operativamente responsable de la plataforma?
- [x] Las personas solicitantes no crearán cuenta.
- [ ] ¿Quién puede crear al primer superadministrador y cuál será el proceso de recuperación?
- [ ] ¿Quién verifica una solicitud y quién puede marcarla como atendida?
- [ ] ¿Qué información será pública, privada o exclusiva de coordinación?
- [ ] ¿Cuánto tiempo se conservarán datos y evidencias?
- [x] Leaflet será la librería del mapa; falta seleccionar proveedor de mosaicos para producción.
- [ ] ¿Qué canales de notificación se habilitarán?
- [ ] ¿Cuál será el dominio oficial y el correo de soporte?
- [ ] ¿Habrá un proyecto Supabase separado para desarrollo y producción?
- [ ] ¿Qué organización será propietaria de GitHub, Supabase y Vercel?

## 16. Criterio para considerar la aplicación lista

La aplicación no estará lista para operar con información real hasta cumplir, como mínimo:

- [ ] Base de datos persistente con migraciones y respaldos.
- [ ] Autenticación administrativa y autorización validadas desde el servidor.
- [ ] Turnstile y límites antiabuso validados desde una Edge Function.
- [ ] RLS habilitado y probado en todas las tablas expuestas.
- [ ] Ubicaciones exactas separadas de las ubicaciones públicas.
- [ ] Consentimiento y políticas de tratamiento de datos aprobados.
- [ ] Auditoría de cambios sensibles.
- [ ] Pruebas de los recorridos y permisos críticos.
- [ ] Monitoreo, respuesta a incidentes y responsables definidos.
- [ ] Ambiente de producción separado del ambiente de pruebas.
- [ ] Piloto controlado aprobado antes del lanzamiento público.

## Próximo paso recomendado

El siguiente paso técnico debería ser definir y revisar el esquema PostgreSQL junto con la matriz de roles y permisos. Después se puede crear el proyecto Supabase de desarrollo y convertir esas decisiones en migraciones y políticas RLS. Conectar React antes de resolver el modelo de autorización puede producir retrabajo y riesgos de privacidad.

## 17. Estado de la integración Supabase (13 de agosto de 2026)

La primera integración ya fue aplicada al proyecto Supabase `oqvelpqymlelbujbsthz`:

- [x] Tablas `help_requests`, `status_change_requests`, `admin_profiles` y `admin_audit_log`.
- [x] Enumeraciones de categoría, prioridad, estado, rol y revisión.
- [x] Vista pública anonimizada `public_help_requests`.
- [x] Políticas RLS para separar acceso público, administrador y superadministrador.
- [x] Ubicación pública redondeada y ubicación exacta privada.
- [x] Bucket privado `request-evidence` para fotografías.
- [x] Función `approve_status_change` que aplica cambios aprobados y audita la acción.
- [x] Edge Function `manage-admin` para crear usuarios desde el superadministrador.
- [x] Variables públicas de Supabase configuradas localmente en `.env.local`, ignorado por Git.
- [x] Migraciones versionadas en `supabase/migrations/`.

### Crear el primer superadministrador

El primer superadministrador debe inicializarse una única vez. No se incluye una contraseña predeterminada en el código.

1. En Supabase, abrir **Authentication → Users → Add user**.
2. Crear el usuario con un correo institucional y una contraseña robusta.
3. Copiar el UUID del usuario recién creado.
4. Ejecutar en el SQL Editor, reemplazando los valores:

```sql
insert into public.admin_profiles (id, full_name, role, active)
values (
  'UUID_DEL_USUARIO_AUTH',
  'Nombre del superadministrador',
  'superadmin',
  true
);
```

5. Ingresar desde **Acceso administrativo** en la aplicación.

A partir de ese momento, el superadministrador puede crear otras cuentas mediante la Edge Function. Los administradores normales solo ven y aprueban/rechazan propuestas de cambio. El superadministrador también accede a solicitudes y gestión de usuarios.

### Seed privado del superadministrador

El primer superadministrador ya puede inicializarse mediante `supabase/seed.local.sql`. El archivo es idempotente: crea el usuario si no existe y, si ya existe, restablece su contraseña y garantiza que el perfil esté activo con rol `superadmin`.

Este archivo contiene credenciales y está excluido expresamente mediante `.gitignore`. No debe renombrarse, copiarse a una migración ni subirse a GitHub. Las migraciones públicas nunca deben contener contraseñas.

Para aplicar el seed en otro ambiente se debe ejecutar de forma privada con Supabase CLI o SQL Editor. Después de inicializar producción, se recomienda cambiar la contraseña temporal y habilitar MFA.

### Matriz administrativa implementada

| Recurso | Superadministrador | Administrador |
|---|---|---|
| Solicitudes | Crear, consultar, editar y eliminar | Sin edición directa |
| Aprobaciones | Crear, consultar, aprobar/rechazar y eliminar | Consultar y aprobar/rechazar |
| Usuarios administrativos | Listar, crear, editar, activar/desactivar y eliminar | Sin acceso |
| Auditoría | Acceso permitido | Sin acceso |

La gestión de usuarios se ejecuta mediante la Edge Function protegida `manage-admin`. Esta función valida que la sesión pertenezca a un `superadmin` activo antes de utilizar la API administrativa de Supabase Auth. El superadministrador no puede eliminarse ni quitarse su propio rol desde esa función.

### Archivos de variables

El archivo local utilizado es `.env.local` y no se sube a Git. Para Vercel se deben registrar:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_TURNSTILE_SITE_KEY
```

La clave `SUPABASE_SERVICE_ROLE_KEY` es administrada dentro de Supabase para la Edge Function y nunca debe copiarse al frontend ni a Vercel.
