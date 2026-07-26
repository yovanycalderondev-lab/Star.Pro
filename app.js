import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioActual = null;
let rutaActual = "landing";

// ==========================================
// NAVEGACIÓN Y VISTAS
// ==========================================
function navegarA(ruta) {
  rutaActual = ruta;
  const mainApp = document.getElementById("app");
  const tpl = document.getElementById(`tpl-${ruta}`);
  
  if (!tpl || !mainApp) return;

  mainApp.innerHTML = "";
  mainApp.appendChild(tpl.content.cloneNode(true));

  // Cargar lógica de la pantalla actual
  if (ruta === "landing") renderPlaques("landingPlaques");
  if (ruta === "login") initLogin();
  if (ruta === "registro") initRegistro();
  if (ruta === "dashboard") {
    initDashboard();
    renderPlaques("dashPlaques");
  }
  if (ruta === "catalogo") renderPlaques("catalogoPlaques");
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

function renderPlaques(contenedorId) {
  const container = document.getElementById(contenedorId);
  if (!container || typeof CATEGORIAS === "undefined") return;

  container.innerHTML = CATEGORIAS.map(cat => `
    <div class="dash-card" style="border-left: 4px solid ${cat.color || 'var(--accent)'}">
      <span class="dash-card-title">${cat.nombre}</span>
      <p class="dash-card-text">${cat.descripcion || ''}</p>
      <span style="display: block; margin-top: 10px; font-weight: 700; color: var(--accent);">
        Tarifa prom: Q${cat.tarifa_base} / hora
      </span>
    </div>
  `).join("");
}

// ==========================================
// SESIÓN DE AUTENTICACIÓN
// ==========================================
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    usuarioActual = session.user;
    actualizarNavegacion(usuarioActual);
    if (["landing", "login", "registro"].includes(rutaActual)) {
      navegarA("dashboard");
    }
  } else {
    usuarioActual = null;
    actualizarNavegacion(null);
    if (!["login", "registro"].includes(rutaActual)) {
      navegarA("landing");
    }
  }
});

// ==========================================
// FORMULARIOS
// ==========================================
function initLogin() {
  const form = document.getElementById("formLogin");
  const errorMsg = document.getElementById("loginError");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (errorMsg) errorMsg.hidden = true;

    const email = form.email.value.trim();
    const password = form.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error && errorMsg) {
      errorMsg.hidden = false;
      errorMsg.textContent = "Correo o contraseña incorrectos.";
    }
  };
}

function initRegistro() {
  const form = document.getElementById("formRegistro");
  const helpText = document.getElementById("regHelp");
  let tipoUsuario = "consumidor";

  if (!form) return;

  const renderForm = () => {
    const esPro = tipoUsuario === "emprendedor";
    form.innerHTML = `
      <label class="field">
        <span>Nombre completo</span>
        <input type="text" name="nombre" placeholder="Ej. Carlos Mendoza" required>
      </label>
      <label class="field">
        <span>Correo electrónico</span>
        <input type="email" name="email" placeholder="correo@ejemplo.com" required>
      </label>
      <label class="field">
        <span>Foto de Perfil (URL de imagen)</span>
        <input type="url" name="avatar_url" placeholder="https://ejemplo.com/mi-foto.jpg">
      </label>
      ${esPro ? `
        <label class="field">
          <span>Especialidad / Oficio</span>
          <input type="text" name="oficio" placeholder="Ej. Plomería, Electricista" required>
        </label>
        <label class="field">
          <span>Tarifa por hora (Q / hora)</span>
          <input type="number" name="tarifa_hora" placeholder="Ej. 125" step="5" min="0" required>
        </label>
      ` : ""}
      <label class="field">
        <span>Contraseña</span>
        <input type="password" name="password" required>
      </label>
      <p class="form-error" id="regError" hidden></p>
      <button class="btn btn--accent btn--full" type="submit">Registrarme en Samazil · STAR.PRO</button>
    `;
  };

  renderForm();

  // Escuchar cambio de tipo de usuario en registro
  document.addEventListener("click", (e) => {
    const segBtn = e.target.closest(".seg-btn");
    if (segBtn) {
      document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
      segBtn.classList.add("active");
      tipoUsuario = segBtn.dataset.tipo;
      if (helpText) {
        helpText.textContent = tipoUsuario === "consumidor" 
          ? "Busco profesionales para contratar servicios."
          : "Ofrezco mis servicios y defino mi precio por hora.";
      }
      renderForm();
    }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const regError = document.getElementById("regError");
    if (regError) regError.hidden = true;

    const nombre = form.nombre.value.trim();
    const email = form.email.value.trim();
    const avatarUrl = form.avatar_url ? form.avatar_url.value.trim() : "";
    const password = form.password.value;
    const oficio = form.oficio ? form.oficio.value.trim() : "";
    const tarifaHora = form.tarifa_hora ? form.tarifa_hora.value : "0";

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nombre,
          tipo: tipoUsuario,
          avatar_url: avatarUrl || "logo.png",
          oficio: oficio,
          tarifa_hora: tarifaHora
        }
      }
    });

    if (error && regError) {
      regError.hidden = false;
      regError.textContent = error.message;
    } else {
      await supabase.auth.signInWithPassword({ email, password });
    }
  };
}

// ==========================================
// VISTAS PERFIL Y CHAT
// ==========================================
function initPerfil() {
  const profileRoot = document.getElementById("profileRoot");
  if (!profileRoot || !usuarioActual) return;

  const meta = usuarioActual.user_metadata || {};
  const esPro = meta.tipo === "emprendedor";

  profileRoot.innerHTML = `
    <div class="auth-card" style="max-width: 550px; margin: 0 auto; text-align: center;">
      <img src="${meta.avatar_url || 'logo.png'}" alt="Foto de perfil" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); margin-bottom: 15px;">
      <h1 class="auth-title">${meta.display_name || "Usuario"}</h1>
      <p style="color: var(--text-muted);">${usuarioActual.email}</p>
      <div style="margin-top: 15px; text-align: left; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px;">
        <p><strong>Tipo de Cuenta:</strong> ${esPro ? "Prestador de Servicios / Profesional" : "Cliente / Consumidor"}</p>
        ${esPro ? `<p style="margin-top: 5px;"><strong>Especialidad:</strong> ${meta.oficio || "Oficios Varios"}</p>` : ""}
        ${esPro ? `<p style="margin-top: 5px; font-size: 1.1rem; color: var(--accent); font-weight: bold;">Tarifa asignada: Q${meta.tarifa_hora || 0} / hora</p>` : ""}
      </div>
    </div>
  `;
}

function initMensajes() {
  const msgThread = document.getElementById("msgThread");
  if (!msgThread || !usuarioActual) return;

  msgThread.innerHTML = `
    <div id="chatBox" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; max-height: 400px;"></div>
    <form id="formChat" style="display: flex; gap: 10px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
      <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: rgba(0,0,0,0.4); color: #fff;">
      <button type="submit" class="btn btn--accent">Enviar</button>
    </form>
  `;

  const chatBox = document.getElementById("chatBox");
  const formChat = document.getElementById("formChat");
  const chatInput = document.getElementById("chatInput");

  formChat.onsubmit = async (e) => {
    e.preventDefault();
    const texto = chatInput.value.trim();
    if (!texto) return;

    const meta = usuarioActual.user_metadata || {};

    await supabase.from("mensajes").insert([
      { 
        texto: texto, 
        usuario: meta.display_name || "Usuario", 
        user_id: usuarioActual.id, 
        avatar_url: meta.avatar_url || "logo.png" 
      }
    ]);

    chatInput.value = "";
  };

  supabase
    .from("mensajes")
    .select("*")
    .order("created_at", { ascending: true })
    .then(({ data }) => {
      if (data) {
        chatBox.innerHTML = "";
        data.forEach((msg) => renderMensaje(msg, chatBox));
      }
    });

  supabase
    .channel("mensajes-samazil")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
      renderMensaje(payload.new, chatBox);
    })
    .subscribe();
}

function renderMensaje(msg, chatBox) {
  const div = document.createElement("div");
  const esMio = usuarioActual && msg.user_id === usuarioActual.id;

  div.style.alignSelf = esMio ? "flex-end" : "flex-start";
  div.style.backgroundColor = esMio ? "var(--accent)" : "rgba(255,255,255,0.1)";
  div.style.color = esMio ? "#000" : "#fff";
  div.style.padding = "10px 14px";
  div.style.borderRadius = "10px";
  div.style.maxWidth = "75%";
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";

  const imgAvatar = `<img src="${msg.avatar_url || 'logo.png'}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">`;

  div.innerHTML = `
    ${!esMio ? imgAvatar : ""}
    <div>
      <strong style="display: block; font-size: 11px; opacity: 0.8;">${msg.usuario}</strong>
      <span>${msg.texto}</span>
    </div>
    ${esMio ? imgAvatar : ""}
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
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

// ==========================================
// GESTIÓN GLOBAL DE CLICS (DELEGACIÓN DE EVENTOS)
// ==========================================
document.addEventListener("click", (e) => {
  // Botones con rutas
  const routeBtn = e.target.closest("[data-route]");
  if (routeBtn) {
    e.preventDefault();
    const ruta = routeBtn.getAttribute("data-route");
    navegarA(ruta);
    return;
  }

  // Clic en el logo del header
  const brandBtn = e.target.closest("#btnBrandHome");
  if (brandBtn) {
    e.preventDefault();
    navegarA(usuarioActual ? "dashboard" : "landing");
    return;
  }

  // Botón Cerrar Sesión
  const logoutBtn = e.target.closest("#btnLogout");
  if (logoutBtn) {
    e.preventDefault();
    supabase.auth.signOut();
    return;
  }
});

// Inicialización de la App
document.addEventListener("DOMContentLoaded", () => {
  navegarA("landing");
});