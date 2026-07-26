// Importar Supabase desde CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CONFIGURACIÓN DE SUPABASE (CON TUS DATOS)
// ==========================================
const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Nodos del DOM
const authContainer = document.getElementById("auth-container");
const formAuth = document.getElementById("form-auth");
const btnLogout = document.getElementById("btn-logout");
const usuarioInfo = document.getElementById("usuario-info");
const nombreUsuarioHeader = document.getElementById("nombre-usuario-header");
const contenidoPrincipal = document.getElementById("contenido-principal");
const formPerfil = document.getElementById("perfilUsuario");
const precioHoraInput = document.getElementById("precioHora");
const formMensaje = document.getElementById("form-mensaje");
const inputMensaje = document.getElementById("input-mensaje");
const chatBox = document.getElementById("chat-box");

let usuarioActual = null;

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN
// ==========================================
if (formAuth) {
  formAuth.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("auth-nombre").value.trim();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;

    // Intentar iniciar sesión
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Si no existe el usuario, lo creamos automáticamente
    if (error) {
      const registro = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: nombre } }
      });

      if (registro.error) {
        alert("Error de autenticación: " + registro.error.message);
      }
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => supabase.auth.signOut());
}

// Escuchar cambios de sesión
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    usuarioActual = session.user;
    const nombre = usuarioActual.user_metadata?.display_name || usuarioActual.email;

    if (authContainer) authContainer.style.display = "none";
    if (usuarioInfo) usuarioInfo.style.display = "flex";
    if (nombreUsuarioHeader) nombreUsuarioHeader.textContent = `Hola, ${nombre}`;
    if (contenidoPrincipal) contenidoPrincipal.style.display = "block";

    escucharMensajes();
  } else {
    usuarioActual = null;
    if (authContainer) authContainer.style.display = "block";
    if (usuarioInfo) usuarioInfo.style.display = "none";
    if (contenidoPrincipal) contenidoPrincipal.style.display = "none";
  }
});

// ==========================================
// 2. GESTIÓN DEL PERFIL
// ==========================================
if (formPerfil) {
  formPerfil.addEventListener("submit", (e) => {
    e.preventDefault();
    if (precioHoraInput) {
      localStorage.setItem("samazil_precio_hora", precioHoraInput.value);
      alert("¡Tarifa guardada exitosamente!");
    }
  });
}

// Cargar tarifa local al iniciar
if (precioHoraInput && localStorage.getItem("samazil_precio_hora")) {
  precioHoraInput.value = localStorage.getItem("samazil_precio_hora");
}

// ==========================================
// 3. CHAT EN TIEMPO REAL
// ==========================================
if (formMensaje) {
  formMensaje.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = inputMensaje.value.trim();
    if (!texto || !usuarioActual) return;

    const nombre = usuarioActual.user_metadata?.display_name || usuarioActual.email;

    const { error } = await supabase.from("mensajes").insert([
      { texto: texto, usuario: nombre, user_id: usuarioActual.id }
    ]);

    if (error) {
      console.error("Error al enviar mensaje:", error.message);
    } else {
      inputMensaje.value = "";
    }
  });
}

function escucharMensajes() {
  // Cargar mensajes existentes
  supabase
    .from("mensajes")
    .select("*")
    .order("created_at", { ascending: true })
    .then(({ data }) => {
      if (data) renderizarMensajes(data);
    });

  // Escuchar nuevos mensajes en tiempo real
  supabase
    .channel("chat-room")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
      agregarMensajeAlChat(payload.new);
    })
    .subscribe();
}

function renderizarMensajes(mensajes) {
  if (!chatBox) return;
  chatBox.innerHTML = "";
  mensajes.forEach((msg) => agregarMensajeAlChat(msg));
}

function agregarMensajeAlChat(msg) {
  if (!chatBox) return;
  const div = document.createElement("div");
  const esMio = usuarioActual && msg.user_id === usuarioActual.id;

  div.style.alignSelf = esMio ? "flex-end" : "flex-start";
  div.style.backgroundColor = esMio ? "var(--marigold)" : "var(--ink-3)";
  div.style.color = esMio ? "var(--charcoal)" : "var(--paper)";
  div.style.borderBottomRightRadius = esMio ? "3px" : "12px";
  div.style.borderBottomLeftRadius = esMio ? "12px" : "3px";

  div.innerHTML = `
    <strong style="font-family: var(--font-data); font-size: 12px; display: block; margin-bottom: 2px;">${msg.usuario}:</strong>
    <span>${msg.texto}</span>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}