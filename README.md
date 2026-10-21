# ChequesPro

Registro de cheques postfechados, caja y transferencias para Cristian y María.

## Base de datos compartida (Supabase)

Los datos se guardan en una base de datos Postgres (Supabase) y se sincronizan en
tiempo real: lo que se registra en un dispositivo aparece al instante en todos los
demás. Sin configurar Supabase, la app funciona como antes (solo en el navegador).

### Configuración (una sola vez)

1. Crea un proyecto gratis en <https://supabase.com>.
2. En **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.
3. En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up*
   (así nadie más puede crearse una cuenta).
4. En **Authentication → Users → Add user**, crea una cuenta para Cristian y otra para María
   (correo + contraseña, marcando *Auto Confirm User*).
5. En **Project Settings → API**, copia *Project URL* y la llave *anon public* a un archivo
   `.env.local` en la raíz del proyecto:

   ```
   VITE_SUPABASE_URL="https://xxxx.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJ..."
   ```

   En el hosting (Vercel, Netlify…) puedes usar los nombres sin prefijo, `SUPABASE_URL` y
   `SUPABASE_ANON_KEY`, para evitar la advertencia de "public prefix". Después hay que volver a desplegar.

### Migración de los datos actuales

La primera vez que un navegador con datos guardados localmente inicia sesión:

- Si la base de datos está vacía, sus datos se suben automáticamente.
- Si ya tiene datos, la app pregunta si quieres subir también los registros locales que faltan.

## Desarrollo

```
npm install
npm run dev     # http://localhost:3000
npm run build
```
