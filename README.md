# Oficios & Servicios GT

Sitio web funcional construido a partir del documento de requisitos:
registro de Consumidor y Emprendedor/Profesional, validación de mayoría
de edad por DPI, catálogo de 12 oficios con las tarifas y colores
exactos definidos en el documento, directorio de profesionales,
mensajería interna y panel de administración para editar tarifas.

## Cómo probarlo ahora mismo

No necesita instalación. Es un sitio 100% estático (HTML + CSS + JS puro,
sin frameworks ni build step):

1. Abrí `index.html` directamente en el navegador, o
2. Corré un servidor local desde esta carpeta: `python3 -m http.server 8000`
   y abrí `http://localhost:8000`

## Cómo desplegarlo a internet

Como es un sitio 100% estático, podés subir esta carpeta tal cual a
cualquiera de estas opciones gratuitas, sin configuración adicional:

- **Netlify**: arrastrá la carpeta a app.netlify.com/drop
- **Vercel**: `vercel deploy` desde esta carpeta (o subila a un repo de GitHub y conectalo)
- **GitHub Pages**: subí los archivos a un repositorio y activá Pages en la configuración
- **Cloudflare Pages**: conectá el repo o subí la carpeta directo

No requiere variables de entorno ni backend para funcionar.

## Cuentas de prueba

**Administrador** (panel de tarifas, enlace "¿Sos administrador?" en la
pantalla de inicio de sesión):
- Usuario: `admin`
- Contraseña: `admin123`

**Profesionales de muestra** (ya cargados para que el catálogo no se vea
vacío — uno por categoría más poblada):
- Teléfono `55012345`, contraseña `demo` → Plomero (Marvin Sutuj)
- Teléfono `55023456`, contraseña `demo` → Tutorías (Lesbia Choc)
- (los demás siguen el mismo patrón, ver `data.js` → `SEED_PROS`)

También podés crear tu propia cuenta de Consumidor o Emprendedor desde
"Crear cuenta".

## Cómo funciona la persistencia de datos (importante)

Esta versión guarda todo en **localStorage del navegador** (usuarios,
mensajes, tarifas editadas por el admin). Esto significa:

- Es completamente funcional para una demo, una prueba con usuarios
  reales en un mismo dispositivo, o como base para seguir iterando.
- **Cada navegador/dispositivo tiene sus propios datos.** Un usuario
  registrado desde tu computadora no será visible desde el celular de
  otra persona, porque no hay una base de datos compartida en un
  servidor.

Para una versión en producción con muchos usuarios compartiendo los
mismos datos (profesionales, mensajes, calificaciones) en tiempo real,
el siguiente paso es agregar un backend con base de datos — por ejemplo
Supabase, Firebase, o un servidor propio con Node.js/PostgreSQL — y
reemplazar las funciones de `app.js` que leen/escriben en `localStorage`
por llamadas a esa API. La estructura del código (funciones `loadUsers`,
`saveUsers`, `loadMessages`, etc.) ya está separada justamente para que
ese cambio sea sencillo el día que lo necesités.

## Validación de DPI

El documento pide validar el DPI para confirmar mayoría de edad. No
existe una API pública gratuita de RENAP para verificar el DPI en
tiempo real, así que esta versión valida: (1) que el DPI tenga el
formato de 13 dígitos, y (2) la edad calculada a partir de la fecha de
nacimiento que la persona ingresa en el mismo formulario. Si se conecta
en el futuro a un servicio oficial de verificación de identidad, esa
lógica se reemplaza en la función `handleRegistroSubmit` de `app.js`.

## Estructura de archivos

```
index.html   → estructura y templates de todas las pantallas
styles.css   → identidad visual completa
data.js      → las 12 categorías, colores, tarifas oficiales y profesionales de muestra
app.js       → toda la lógica: rutas, formularios, validaciones, mensajería, panel admin
```
