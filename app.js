import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Configuración Supabase
const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioActual = null;
let rutaActual = "landing";
let receptorActivoId = null;

// ==========================================
// SUBIDA DE ARCHIVO A SUPABASE STORAGE
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
    console.error("Error al subir foto:", uploadError);
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
  if (["landing", "catalogo", "dashboard"].includes(ruta)) renderPlaques();
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

function renderPlaques() {
  const containers = ["landingPlaques", "dashPlaques", "catalogoPlaques"];
  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el && typeof CATEGORIAS !== "undefined") {
      el.innerHTML = CATEGORIAS.map(cat => `
        <div class="dash-card" style="border-left: 4px solid ${cat.color || 'var(--accent)'}">
          <span class="dash-card-title">${cat.nombre}</span>
          <p class="dash-card-text">${cat.descripcion || ''}</p>
          <span style="display: block; margin-top: 10px; font-weight: 700; color: var(--accent);">
            Tarifa prom: Q${cat.tarifa_base} / hora
          </span>
        </div>
      `).join("");
    }
  });
}

// ==========================================
// REGISTRO
// ==========================================
function initRegistro() {
  const form = document.getElementById("formRegistro");
  const helpText = document.getElementById("regHelp");
  const camposPrestador = document.getElementById("camposPrestador");
  let tipoUsuario = "consumidor";

  if (!form) return;

  // Toggle de cliente / prestador
  document.querySelectorAll(".seg-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tipoUsuario = btn.dataset.tipo;
      if (camposPrestador) {
        camposPrestador.style.display = tipoUsuario === "emprendedor" ? "block" : "none";
      }
      if (helpText) {
        helpText.textContent = tipoUsuario === "consumidor" 
          ? "Busco profesionales para contratar servicios."
          : "Ofrezco mis servicios y defino mi precio por hora.";
      }
    };
  });

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

    // 1. Registro
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

    // 2. Subida de imagen
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
// LOGIN Y DASHBOARD
// ==========================================
function initLogin() {
  const form = document.getElementById("formLogin");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById("loginError");
    if (errorMsg) errorMsg.hidden = true;

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value
    });

    if (error && errorMsg) {
      errorMsg.hidden = false;
      errorMsg.textContent = "Correo o contraseña incorrectos.";
    }
  };
}

function initDashboard() {
  const greeting = document.getElementById("dashGreeting");
  const dashSub = document.getElementById("dashSub");

  if (usuarioActual && greeting) {
    const meta = usuarioActual.user_metadata || {};
    greeting.textContent = `Hola, ${meta.display_name || "Usuario"}`;
    dashSub.textContent = meta.tipo === "emprendedor" 
      ? `Prestador (${meta.oficio || 'Profesional'}) - Q${meta.tarifa_hora || 0}/hora` 
      : "Panel de Cliente";
  }
}

function initPerfil() {
  const profileRoot = document.getElementById("profileRoot");
  if (!profileRoot || !usuarioActual) return;

  const meta = usuarioActual.user_metadata || {};
  const esPro = meta.tipo === "emprendedor";

  profileRoot.innerHTML = `
    <div class="auth-card" style="max-width: 550px; margin: 0 auto; text-align: center;">
      <img src="${meta.avatar_url || 'logo.png'}" alt="Foto de perfil" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); margin-bottom: 15px;">
      <h1 class="auth-title">${meta.display_name || "Usuario"}</h1>
      <p style="color: var(--text-muted);">${usuarioActual.email}</p>
      <div style="margin-top: 20px; text-align: left; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;">
        <p><strong>Tipo de Cuenta:</strong> ${esPro ? "Prestador de Servicios / Profesional" : "Cliente / Consumidor"}</p>
        ${esPro ? `<p style="margin-top: 5px;"><strong>Especialidad:</strong> ${meta.oficio || "Oficios Varios"}</p>` : ""}
        ${esPro ? `<p style="margin-top: 5px; font-size: 1.1rem; color: var(--accent); font-weight: bold;">Tarifa asignada: Q${meta.tarifa_hora || 0} / hora</p>` : ""}
      </div>
    </div>
  `;
}

// ==========================================
// CHAT INDIVIDUAL (CLIENTE <-> PRESTADOR)
// ==========================================
async function initMensajes() {
  if (!usuarioActual) return;

  const listaContactos = document.getElementById("listaContactos");
  const formChat = document.getElementById("formChat");

  // Escuchar mensajes entrantes en tiempo real
  supabase
    .channel("mensajes-directos")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
      const msg = payload.new;
      if (receptorActivoId && (
        (msg.emisor_id === usuarioActual.id && msg.receptor_id === receptorActivoId) ||
        (msg.emisor_id === receptorActivoId && msg.receptor_id === usuarioActual.id)
      )) {
        renderizarMensaje(msg);
      }
    })
    .subscribe();

  // Enviar mensaje
  if (formChat) {
    formChat.onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById("chatInput");
      const texto = input.value.trim();

      if (!texto) return;
      if (!receptorActivoId) {
        alert("Selecciona un usuario de la lista izquierda para chatear.");
        return;
      }

      const meta = usuarioActual.user_metadata || {};

      await supabase.from("mensajes").insert([
        {
          texto: texto,
          emisor_id: usuarioActual.id,
          receptor_id: receptorActivoId,
          usuario: meta.display_name || "Usuario"
        }
      ]);

      input.value = "";
    };
  }
}

async function cargarChatConUsuario(receptorId, nombreReceptor) {
  receptorActivoId = receptorId;
  const chatTitulo = document.getElementById("chatTitulo");
  const msgThread = document.getElementById("msgThread");

  if (chatTitulo) chatTitulo.textContent = `Chat con ${nombreReceptor}`;
  if (msgThread) msgThread.innerHTML = "";

  const { data: mensajes } = await supabase
    .from("mensajes")
    .select("*")
    .or(`and(emisor_id.eq.${usuarioActual.id},receptor_id.eq.${receptorId}),and(emisor_id.eq.${receptorId},receptor_id.eq.${usuarioActual.id})`)
    .order("created_at", { ascending: true });

  if (mensajes) {
    mensajes.forEach(renderizarMensaje);
  }
}

function renderizarMensaje(msg) {
  const msgThread = document.getElementById("msgThread");
  if (!msgThread) return;

  const div = document.createElement("div");
  const esMio = msg.emisor_id === usuarioActual.id;

  div.style.alignSelf = esMio ? "flex-end" : "flex-start";
  div.style.backgroundColor = esMio ? "var(--accent)" : "rgba(255,255,255,0.1)";
  div.style.color = esMio ? "#000" : "#fff";
  div.style.padding = "8px 14px";
  div.style.borderRadius = "10px";
  div.style.maxWidth = "75%";
  div.style.fontSize = "0.95rem";
  div.textContent = msg.texto;

  msgThread.appendChild(div);
  msgThread.scrollTop = msgThread.scrollHeight;
}

// ==========================================
// EVENTOS Y AUTENTICACIÓN GLOBAL
// ==========================================
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
    return;
  }

  const logoutBtn = e.target.closest("#btnLogout");
  if (logoutBtn) {
    e.preventDefault();
    supabase.auth.signOut();
    return;
  }

  const brandBtn = e.target.closest("#btnBrandHome");
  if (brandBtn) {
    e.preventDefault();
    navegarA(usuarioActual ? "dashboard" : "landing");
    return;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  navegarA("landing");
});
