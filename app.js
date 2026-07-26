import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioActual = null;
let rutaActual = "landing";
let receptorActivoId = null;

// ==========================================
// SUBIDA DE IMÁGENES A SUPABASE STORAGE
// ==========================================
async function subirFotoPerfil(file, userId) {
  if (!file) return "logo.png";

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `perfiles/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error al subir imagen:", uploadError);
    return "logo.png";
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}

// ==========================================
// NAVEGACIÓN
// ==========================================
function navegarA(ruta) {
  rutaActual = ruta;
  const mainApp = document.getElementById("app");
  const tpl = document.getElementById(`tpl-${ruta}`);
  if (!tpl || !mainApp) return;

  mainApp.innerHTML = "";
  mainApp.appendChild(tpl.content.cloneNode(true));

  if (ruta === "login") initLogin();
  if (ruta === "registro") initRegistro();
  if (ruta === "dashboard") initDashboard();
  if (ruta === "perfil") initPerfil();
  if (ruta === "mensajes") initMensajes();
}

function actualizarNavegacion(usuario) {
  const topbarNav = document.getElementById("topbarNav");
  const topbarGuest = document.getElementById("topbarGuest");

  if (usuario) {
    if (topbarNav) topbarNav.hidden = false;
    if (topbarGuest) topbarGuest.hidden = true;
  } else {
    if (topbarNav) topbarNav.hidden = true;
    if (topbarGuest) topbarGuest.hidden = false;
  }
}

// ==========================================
// REGISTRO DE USUARIO CON SUBIDA DE ARCHIVO
// ==========================================
function initRegistro() {
  const form = document.getElementById("formRegistro");
  let tipoUsuario = "consumidor";
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const regError = document.getElementById("regError");
    if (regError) regError.hidden = true;

    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const oficio = form.oficio ? form.oficio.value.trim() : "";
    const tarifaHora = form.tarifa_hora ? form.tarifa_hora.value : "0";
    const avatarFile = document.getElementById("inputAvatarFile")?.files[0];

    // 1. Registro base del usuario
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nombre,
          tipo: tipoUsuario,
          oficio: oficio,
          tarifa_hora: tarifaHora
        }
      }
    });

    if (error) {
      if (regError) { regError.hidden = false; regError.textContent = error.message; }
      return;
    }

    // 2. Subida de la foto de perfil desde el almacenamiento
    if (authData.user) {
      let avatarUrl = "logo.png";
      if (avatarFile) {
        avatarUrl = await subirFotoPerfil(avatarFile, authData.user.id);
      }

      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      await supabase.auth.signInWithPassword({ email, password });
    }
  };
}

// ==========================================
// CHAT ENTRE PERSONAS (CLIENTE - PRESTADOR)
// ==========================================
async function initMensajes() {
  if (!usuarioActual) return;

  const listaContactos = document.getElementById("listaContactos");
  const chatTitulo = document.getElementById("chatTitulo");
  const formChat = document.getElementById("formChat");

  // Cargar lista de usuarios registrados para conversar
  const { data: usuarios } = await supabase.from("profiles").select("*");

  if (listaContactos) {
    listaContactos.innerHTML = "";
    // Carga inicial de usuarios para seleccionar
    const { data: authUsers } = await supabase.auth.getSession();
  }

  // Enviar mensaje directo al usuario seleccionado
  if (formChat) {
    formChat.onsubmit = async (e) => {
      e.preventDefault();
      const chatInput = document.getElementById("chatInput");
      const texto = chatInput.value.trim();

      if (!texto || !receptorActivoId) {
        alert("Selecciona a una persona de la lista antes de enviar un mensaje.");
        return;
      }

      const meta = usuarioActual.user_metadata || {};

      await supabase.from("mensajes").insert([
        {
          texto: texto,
          emisor_id: usuarioActual.id,
          receptor_id: receptorActivoId,
          usuario_nombre: meta.display_name || "Usuario",
          avatar_url: meta.avatar_url || "logo.png"
        }
      ]);

      chatInput.value = "";
      cargarConversacion(receptorActivoId);
    };
  }
}

async function cargarConversacion(receptorId) {
  receptorActivoId = receptorId;
  const msgThread = document.getElementById("msgThread");
  if (!msgThread) return;

  // Filtrar mensajes intercambiados únicamente entre los dos usuarios
  const { data: mensajes } = await supabase
    .from("mensajes")
    .select("*")
    .or(`and(emisor_id.eq.${usuarioActual.id},receptor_id.eq.${receptorId}),and(emisor_id.eq.${receptorId},receptor_id.eq.${usuarioActual.id})`)
    .order("created_at", { ascending: true });

  msgThread.innerHTML = "";
  if (mensajes) {
    mensajes.forEach(msg => {
      const div = document.createElement("div");
      const esMio = msg.emisor_id === usuarioActual.id;

      div.style.alignSelf = esMio ? "flex-end" : "flex-start";
      div.style.backgroundColor = esMio ? "var(--accent)" : "rgba(255,255,255,0.1)";
      div.style.color = esMio ? "#000" : "#fff";
      div.style.padding = "8px 12px";
      div.style.borderRadius = "8px";
      div.style.maxWidth = "80%";
      div.textContent = msg.texto;

      msgThread.appendChild(div);
    });
    msgThread.scrollTop = msgThread.scrollHeight;
  }
}

// Escuchador global de autenticación y clics
supabase.auth.onAuthStateChange((event, session) => {
  usuarioActual = session ? session.user : null;
  actualizarNavegacion(usuarioActual);
  if (session && ["landing", "login", "registro"].includes(rutaActual)) {
    navegarA("dashboard");
  }
});

document.addEventListener("click", (e) => {
  const routeBtn = e.target.closest("[data-route]");
  if (routeBtn) {
    e.preventDefault();
    navegarA(routeBtn.getAttribute("data-route"));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  navegarA("landing");
});
