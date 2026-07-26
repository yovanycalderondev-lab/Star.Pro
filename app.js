import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Configuración de Supabase
const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRefiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioActual = null;
let rutaActual = "landing";

const mainApp = document.getElementById("app");
const topbarNav = document.getElementById("topbarNav");
const topbarGuest = document.getElementById("topbarGuest");
const btnLogout = document.getElementById("btnLogout");
const btnBrandHome = document.getElementById("btnBrandHome");

// ==========================================
// RUTAS Y NAVEGACIÓN
// ==========================================
function navegarA(ruta) {
  rutaActual = ruta;
  const tpl = document.getElementById(`tpl-${ruta}`);
  if (!tpl) return;

  mainApp.innerHTML = "";
  mainApp.appendChild(tpl.content.cloneNode(true));

  if (ruta === "login") initLogin();
  if (ruta === "registro") initRegistro();
  if (ruta === "dashboard") initDashboard();
  if (ruta === "perfil") initPerfil();
  if (ruta === "mensajes") initMensajes();

  vincularEventosNavegacion();
}

function vincularEventosNavegacion() {
  document.querySelectorAll("[data-route]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      navegarA(btn.getAttribute("data-route"));
    };
  });
}

function actualizarNavegacion(usuario) {
  if (usuario) {
    if (topbarNav) topbarNav.hidden = false;
    if (topbarGuest) topbarGuest.hidden = true;
  } else {
    if (topbarNav) topbarNav.hidden = true;
    if (topbarGuest) topbarGuest.hidden = false;
  }
}

// ==========================================
// CONTROL DE SESIÓN EN VIVO
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
// INICIO DE SESIÓN CON CORREO
// ==========================================
function initLogin() {
  const form = document.getElementById("formLogin");
  const errorMsg = document.getElementById("loginError");
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.hidden = false;
      errorMsg.textContent = "Correo o contraseña incorrectos.";
    }
  };
}

// ==========================================
// REGISTRO (CON TARIFAS Y FOTO DE PERFIL)
// ==========================================
function initRegistro() {
  const form = document.getElementById("formRegistro");
  const helpText = document.getElementById("regHelp");
  const segBtns = document.querySelectorAll(".seg-btn");

  let tipoUsuario = "consumidor";

  if (form) {
    const renderForm = () => {
      const esPro = tipoUsuario === "emprendedor";
      form.innerHTML = `
        <label class="field">
          <span>Nombre completo</span>
          <input type="text" name="nombre" required>
        </label>
        <label class="field">
          <span>Correo electrónico</span>
          <input type="email" name="email" placeholder="ejemplo@correo.com" required>
        </label>
        <label class="field">
          <span>Foto de Perfil (URL de imagen)</span>
          <input type="url" name="avatar_url" placeholder="https://ejemplo.com/mi-foto.jpg">
        </label>
        ${esPro ? `
          <label class="field">
            <span>Especialidad / Oficio</span>
            <input type="text" name="oficio" placeholder="Ej. Plomería, Electricidad" required>
          </label>
          <label class="field">
            <span>Tarifa por hora (Q / hora)</span>
            <input type="number" name="tarifa_hora" placeholder="Ej. 150" step="5" min="0" required>
          </label>
        ` : ""}
        <label class="field">
          <span>Contraseña</span>
          <input type="password" name="password" required>
        </label>
        <p class="form-error" id="regError" hidden></p>
        <button class="btn btn--accent btn--full" type="submit">Crear cuenta en Samazil</button>
      `;
    };

    renderForm();

    segBtns.forEach((btn) => {
      btn.onclick = () => {
        segBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        tipoUsuario = btn.dataset.tipo;
        if (helpText) {
          helpText.textContent = tipoUsuario === "consumidor" 
            ? "Busco profesionales para contratar servicios."
            : "Ofrezco mis servicios y defino mi precio por hora.";
        }
        renderForm();
      };
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const email = form.email.value.trim();
      const avatarUrl = form.avatar_url.value.trim();
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
            avatar_url: avatarUrl || "https://via.placeholder.com/150",
            oficio: oficio,
            tarifa_hora: tarifaHora
          }
        }
      });

      if (error) {
        const regError = document.getElementById("regError");
        if (regError) {
          regError.hidden = false;
          regError.textContent = error.message;
        }
      } else {
        await supabase.auth.signInWithPassword({ email, password });
      }
    };
  }
}

// ==========================================
// DENTRO DE MI PERFIL
// ==========================================
function initPerfil() {
  const profileRoot = document.getElementById("profileRoot");
  if (!profileRoot || !usuarioActual) return;

  const meta = usuarioActual.user_metadata || {};
  const esPro = meta.tipo === "emprendedor";

  profileRoot.innerHTML = `
    <div class="auth-card" style="max-width: 600px; margin: 0 auto; text-align: center;">
      <img src="${meta.avatar_url || 'https://via.placeholder.com/150'}" alt="Foto de perfil" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); margin-bottom: 15px;">
      <h1 class="auth-title">${meta.display_name || "Usuario Samazil"}</h1>
      <p style="color: var(--text-muted);">${usuarioActual.email}</p>
      <p style="margin-top: 5px;"><strong>Rol:</strong> ${esPro ? "Prestador de Servicios" : "Cliente"}</p>
      ${esPro ? `<p><strong>Especialidad:</strong> ${meta.oficio || "Oficios Varios"}</p>` : ""}
      ${esPro ? `<p style="font-size: 1.2rem; color: var(--accent); font-weight: bold; margin-top: 10px;">Tarifa: Q${meta.tarifa_hora || 0} / hora</p>` : ""}
    </div>
  `;
}

// ==========================================
// CHAT CON FOTOGRAFÍA DE PERFIL Y HORAS
// ==========================================
function initMensajes() {
  const msgThread = document.getElementById("msgThread");
  if (!msgThread || !usuarioActual) return;

  msgThread.innerHTML = `
    <div id="chatBox" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; max-height: 400px;"></div>
    <form id="formChat" style="display: flex; gap: 10px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
      <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required style="flex: 1;">
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
    const nombre = meta.display_name || "Usuario";
    const avatar = meta.avatar_url || "https://via.placeholder.com/150";

    await supabase.from("mensajes").insert([
      { texto: texto, usuario: nombre, user_id: usuarioActual.id, avatar_url: avatar }
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

  const avatarImg = msg.avatar_url ? `<img src="${msg.avatar_url}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">` : "";

  div.innerHTML = `
    ${!esMio ? avatarImg : ""}
    <div>
      <strong style="display: block; font-size: 11px; opacity: 0.8;">${msg.usuario}</strong>
      <span>${msg.texto}</span>
    </div>
    ${esMio ? avatarImg : ""}
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
      ? `Prestador de Servicios (${meta.oficio || 'Oficios'}) - Q${meta.tarifa_hora || 0}/hora` 
      : "Panel de Cliente";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (btnBrandHome) btnBrandHome.onclick = () => navegarA(usuarioActual ? "dashboard" : "landing");
  if (btnLogout) btnLogout.onclick = () => supabase.auth.signOut();
  navegarA("landing");
});