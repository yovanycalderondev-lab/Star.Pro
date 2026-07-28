# Samazil

Plataforma web para contratar u ofrecer servicios de oficios en Guatemala.
Catálogo de 12 oficios con tarifas oficiales de referencia **por hora y en
quetzales**, perfiles con foto propia, verificación de DPI, calificaciones
de 1 a 5 estrellas y backend real con Supabase.

## ⚠️ Antes de usarla: configurar Supabase (backend real)

Esta versión ya NO usa localStorage — usa una base de datos real (Supabase).
Sin este paso, la app va a mostrar un aviso de "Falta configurar Supabase".

1. Creá una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. Andá a **SQL Editor** → pegá y ejecutá todo el contenido de `supabase/schema.sql` (crea las tablas `profiles`, `messages`, `ratings`, la vista de promedios y el bucket de fotos `avatars` con sus políticas de seguridad).
3. Andá a **Authentication → Providers → Email** y **desactivá "Confirm email"** (para que las cuentas queden activas al instante; podés reactivarlo luego para producción real, pero entonces hay que ajustar el flujo de registro).
4. Andá a **Project Settings → API**, copiá el **Project URL** y la clave **anon public**.
5. Abrí `config.js` en esta carpeta y pegalas ahí.
6. Listo — abrí `index.html` o desplegá la carpeta normalmente.

## Cómo probarlo localmente

Es un sitio estático (HTML + CSS + JS puro, sin build step) que se conecta a Supabase:

1. Abrí `index.html` directamente en el navegador, o
2. Corré un servidor local desde esta carpeta: `python3 -m http.server 8000` y abrí `http://localhost:8000`

## Cómo desplegarlo a internet

Subí esta carpeta tal cual a cualquiera de estas opciones gratuitas, sin configuración adicional:

- **Netlify**: arrastrá la carpeta a app.netlify.com/drop
- **Vercel**: `vercel deploy` desde esta carpeta (o conectá el repo de GitHub)
- **GitHub Pages**: subí los archivos a un repositorio y activá Pages
- **Render**: como "Static Site" apuntando a esta carpeta

## Qué incluye esta versión

- **Backend real con Supabase**: autenticación (email + contraseña), base de datos Postgres y almacenamiento de fotos, todo compartido entre todos los usuarios y todos los dispositivos.
- **Rebranding completo a Samazil**, con el logo nuevo (estrella + llave + casa con motivo de huipil) como ícono de pestaña, logo del encabezado y logo de las pantallas de acceso.
- **Catálogo oficial de 12 oficios** (Tutorías, Bodeguero, Camionero, Repartidor, Instalador de cámaras, Plomero, Electricista, Jardinero, Pintor, Músico, Ama de casa, Cocinero) con tarifa de referencia **por hora, en quetzales**, calculada a partir del documento de tarifas original.
- **Cada profesional define su propia tarifa por hora** al registrarse o al editar su perfil — el campo está claramente separado de la tarifa de referencia del oficio.
- **Foto de perfil real**: se sube un archivo de imagen (no una URL), se comprime en el navegador y se guarda en Supabase Storage (bucket `avatars`, público para lectura). Si no subís foto, se muestran tus iniciales.
- **Verificación de DPI**: al registrarse como Emprendedor/Profesional se pide el número de DPI (13 dígitos) y una confirmación explícita de mayoría de edad. Es una verificación declarativa, no una consulta a una base de datos gubernamental — está explicado así en los Términos y condiciones.
- **Calificaciones de 1 a 5 estrellas**: cualquier usuario logueado puede calificar a un profesional (una calificación por persona, editable) desde el catálogo o desde el chat. El promedio se calcula en tiempo real con una vista SQL (`profile_ratings`).
- **Términos y condiciones** (`supabase/schema.sql` + página `/terminos` dentro de la app) con una cláusula clara de que **Samazil es solo un intermediario y no se hace responsable por estafas, fraudes o incumplimientos entre usuarios**. Se debe aceptar obligatoriamente al registrarse.
- **Diseño premium** con paleta inspirada en el logo (naranja marigold, teal profundo, rojo chapín) y un detalle tejido multicolor (huipil) como acento en tarjetas y encabezados.
- Registro diferenciado **Cliente / Prestador**, mensajería interna entre usuarios, y panel de "Mi cuenta" para editar todo lo anterior.

## Cuentas de prueba

No hay cuentas de muestra precargadas en esta versión (los datos ahora viven en tu propio proyecto de Supabase, vacío al empezar). Creá tu primera cuenta desde "Crear cuenta" — podés registrar una como Cliente y otra como Profesional para probar el flujo completo, incluyendo el chat y las calificaciones.

## Estructura de archivos

```
index.html          → estructura base, encabezado y pie de página
styles.css           → identidad visual completa (paleta Samazil)
config.js            → tus credenciales de Supabase (URL + clave anon) — completalo antes de usar la app
data.js              → las 12 categorías oficiales y sus tarifas de referencia
app.js               → toda la lógica: rutas, auth, subida de foto, catálogo, chat, calificaciones
logo.jpeg            → logo oficial de Samazil
supabase/schema.sql  → script SQL para crear todas las tablas, políticas y el bucket de fotos en Supabase
```

## Seguridad de los datos

Todas las tablas usan **Row Level Security (RLS)** de Supabase:
- Cualquiera puede ver el catálogo de profesionales y sus calificaciones (para que el directorio sea público).
- Cada usuario solo puede crear y editar **su propio** perfil.
- Los mensajes solo los puede ver quien los envió o quien los recibió.
- Cada persona solo puede calificar en su propio nombre (y no a sí misma).
- Cada quien solo puede subir/editar fotos dentro de su propia carpeta del bucket `avatars`.

La clave `anon` en `config.js` es pública por diseño — la protección real la
dan estas políticas, no el secreto de la clave.
