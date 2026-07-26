# Cómo conectar Samazil a Supabase

Esta versión ya no usa `localStorage`. Los usuarios, perfiles, mensajes y
fotos de perfil se guardan en un proyecto real de **Supabase** (Postgres +
Auth + Storage + Realtime), compartido entre todos los dispositivos.

## 1. Crear el proyecto

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (gratis).
2. "New project" → ponele un nombre (ej. `samazil`), elegí una contraseña
   para la base de datos y una región cercana (ej. `us-east-1`).
3. Esperá 1-2 minutos a que el proyecto termine de aprovisionarse.

## 2. Crear las tablas y permisos

1. En el menú lateral, andá a **SQL Editor** → **New query**.
2. Abrí el archivo `supabase-schema.sql` de esta carpeta, copiá todo su
   contenido, pegalo en el editor y dale a **Run**.
3. Esto crea:
   - la tabla `profiles` (usuarios: nombre, tipo, categoría, tarifa, foto, etc.)
   - la tabla `messages` (chat entre usuarios)
   - las políticas de seguridad (RLS) para que cada quien solo edite lo suyo
   - un bucket de Storage llamado `avatars` para las fotos de perfil
   - un trigger que crea el perfil automáticamente cuando alguien se registra

## 3. (Recomendado para pruebas) Desactivar confirmación de correo

Por defecto Supabase pide confirmar el correo antes de dar sesión activa.
Para que el registro funcione de inmediato (como en la demo original):

1. Andá a **Authentication → Providers → Email**.
2. Desactivá **"Confirm email"**.
3. Guardá cambios.

Si preferís dejarlo activado para producción, el registro va a funcionar
igual, pero el usuario tendrá que confirmar su correo e iniciar sesión antes
de que su foto/tarifa/categoría queden guardadas (se lo indica un mensaje).

## 4. Conectar la app a tu proyecto

1. Andá a **Project Settings → API**.
2. Copiá el **Project URL** y la clave **anon public**.
3. Abrí `config.js` en esta carpeta y reemplazá:

```js
window.SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
window.SUPABASE_ANON_KEY = 'TU-CLAVE-ANON-PUBLICA';
```

con tus valores reales.

## 5. Probarlo

Corré un servidor local desde esta carpeta:

```bash
python3 -m http.server 8000
```

Abrí `http://localhost:8000`, creá una cuenta y probá:
- Registro como cliente y como prestador
- Subida de foto de perfil
- Editar "Mi cuenta"
- Enviar mensajes entre dos cuentas distintas (probalo en dos pestañas o
  navegadores; el chat llega en tiempo real sin recargar)

## 6. Desplegar a internet

Subí esta carpeta (con `config.js` ya editado) a Netlify, Vercel, GitHub
Pages o Render, igual que antes — sigue siendo un sitio estático, solo que
ahora habla con Supabase en vez de `localStorage`.

## Notas

- Las cuentas de muestra (`marvin@samazil.gt`, etc.) ya no existen: ahora
  cada quien crea su propia cuenta real con contraseña.
- Las fotos de perfil se comprimen en el navegador y se suben al bucket
  `avatars` de Supabase Storage (público de lectura, privado de escritura).
- El chat usa Supabase Realtime: los mensajes nuevos aparecen sin recargar
  la página si el chat está abierto.
- Si en algún momento ves el mensaje "Falta configurar Supabase", es porque
  `config.js` todavía tiene los valores de ejemplo.
