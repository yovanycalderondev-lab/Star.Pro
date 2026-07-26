# Samazil

Plataforma web para contratar u ofrecer servicios de oficios en Guatemala.
Catálogo de 12 oficios con tarifas oficiales de referencia **por hora y en
quetzales**, perfiles con foto propia, y cada profesional define su propia
tarifa final.

## Backend real: Supabase

Esta versión ya tiene un backend real conectado — **no es una demo con
localStorage**. Usuarios, perfiles, mensajes y fotos de perfil se guardan en
un proyecto de [Supabase](https://supabase.com) (Postgres + Auth + Storage +
Realtime), compartido entre todos los dispositivos.

**Antes de usarlo tenés que conectarlo a tu propio proyecto de Supabase.**
Seguí la guía paso a paso en [`SETUP-SUPABASE.md`](./SETUP-SUPABASE.md):
1. Creás un proyecto gratis en supabase.com
2. Corrés `supabase-schema.sql` en el SQL Editor
3. Pegás tu URL y clave "anon" en `config.js`

## Cómo probarlo ahora mismo

Sigue siendo un sitio estático del lado del cliente (HTML + CSS + JS puro,
sin frameworks ni build step), solo que ahora habla con Supabase:

1. Completá la conexión a Supabase (ver arriba y `SETUP-SUPABASE.md`)
2. Abrí `index.html` directamente en el navegador, o
3. Corré un servidor local desde esta carpeta: `python3 -m http.server 8000` y abrí `http://localhost:8000`

## Cómo desplegarlo a internet

Subí esta carpeta tal cual a cualquiera de estas opciones gratuitas, sin configuración adicional:

- **Netlify**: arrastrá la carpeta a app.netlify.com/drop
- **Vercel**: `vercel deploy` desde esta carpeta (o conectá el repo de GitHub)
- **GitHub Pages**: subí los archivos a un repositorio y activá Pages
- **Render**: como "Static Site" apuntando a esta carpeta

## Qué incluye esta versión

- **Rebranding completo a Samazil**, con el logo nuevo (estrella + llave + casa con motivo de huipil) como ícono de pestaña, logo del encabezado y logo de las pantallas de acceso.
- **Catálogo oficial de 12 oficios** (Tutorías, Bodeguero, Camionero, Repartidor, Instalador de cámaras, Plomero, Electricista, Jardinero, Pintor, Músico, Ama de casa, Cocinero) con tarifa de referencia **por hora, en quetzales**, calculada a partir del documento de tarifas original.
- **Cada profesional define su propia tarifa por hora** al registrarse o al editar su perfil — el campo está claramente separado de la tarifa de referencia del oficio.
- **Foto de perfil real**: se sube un archivo de imagen (no una URL), se comprime automáticamente en el navegador y se guarda como parte del perfil. Si no subís foto, se muestran tus iniciales.
- **Diseño premium** con paleta inspirada en el logo (naranja marigold, teal profundo, rojo chapín) y un detalle tejido multicolor (huipil) como acento en tarjetas y encabezados.
- Registro diferenciado **Cliente / Prestador**, mensajería interna entre usuarios, y panel de "Mi cuenta" para editar todo lo anterior.

## Cuentas

Ya no hay cuentas de muestra precargadas: cada quien crea su propia cuenta
real (con correo y contraseña) desde "Crear cuenta". Los datos quedan
guardados en tu proyecto de Supabase, no en el navegador.

## Persistencia de datos

Todo se guarda en una base de datos real en Supabase (Postgres):

- **`profiles`**: usuarios (nombre, tipo, categoría, tarifa por hora, bio, foto)
- **`messages`**: mensajes entre usuarios, con actualización en tiempo real
- **Storage `avatars`**: fotos de perfil, comprimidas en el navegador antes de subirse

Todos los usuarios comparten los mismos datos sin importar el dispositivo o
navegador. La seguridad se controla con políticas RLS (Row Level Security):
cada quien solo puede editar su propio perfil, subir su propia foto, y leer
solamente los mensajes donde participa.

## Estructura de archivos

```
index.html            → estructura base y encabezado
styles.css             → identidad visual completa (paleta Samazil)
data.js                → las 12 categorías oficiales y sus tarifas de referencia
app.js                 → toda la lógica: rutas, formularios, auth, mensajería en tiempo real
config.js              → credenciales de tu proyecto de Supabase (¡completar!)
supabase-schema.sql    → esquema SQL: tablas, RLS, trigger de perfil y bucket de fotos
SETUP-SUPABASE.md      → guía paso a paso para conectar el backend
logo.jpeg              → logo oficial de Samazil
```
