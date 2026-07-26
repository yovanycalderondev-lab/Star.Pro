// Importar Supabase desde CDN
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables de Estado Global
let usuarioActual = null;
let rutaActual = "landing";

// Nodos Elementales del DOM
const mainApp = document.getElementById("app");
const topbarNav = document.getElementById("topbarNav");
const topbarGuest = document.getElementById("topbarGuest");
const btnLogout = document.getElementById("btnLogout");
const btnBrandHome = document.getElementById("btnBrandHome");

// ==========================================
// 1. SISTEMA DE RUTAS Y RENDERING (TEMPLATES)
// ==========================================
function navegarA(ruta, parametro = null) {
  rutaActual = ruta;
  const tpl = document.getElementById(`tpl-${ruta}`);
  if (!tpl) return;

  // Clonar la plantilla HTML
  mainApp.innerHTML = "";
  mainApp.appendChild(tpl.content.cloneNode(true));

  // Inicializar componentes dinámicos de cada ruta
  if (ruta === "login") initLogin();
  if (ruta === "registro") initRegistro();
  if (ruta === "dashboard") initDashboard();
  if (ruta === "catalogo") initCatalogo();
  if (ruta === "perfil") initPerfil();
  if (ruta === "mensajes") initMensajes();
  if (ruta === "pro") initDetalleProfesional(parametro);

  // Re-vincular botones con data-route
  vincularEventosNavegacion();
}

function vincularEventosNavegacion() {
  document.querySelectorAll("[data-route]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const ruta = btn.getAttribute("data-route");
      const param = btn.getAttribute("data-param");
      navegarA(ruta, param);
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
// 2. SESIÓN CON SUPABASE
// ==========================================
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    usuarioActual = session.user;
    actualizarNavegacion(usuarioActual);
    if (rutaActual === "landing" || rutaActual === "login" || rutaActual === "registro") {
      navegarA("dashboard");
    }
  } else {
    usuarioActual = null;
    actualizarNavegacion(null);
    if (rutaActual !== "login" && rutaActual !== "registro") {
      navegarA("landing");
    }
  }
});

// ==========================================
// 3. AUTENTICACIÓN Y REGISTRO
// ==========================================
function initLogin() {
  const form = document.getElementById("formLogin");
  const errorMsg = document.getElementById("loginError");

  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const telefono = form.telefono.value.trim();
    const password = form.password.value;
    const email = `${telefono}@starpro.gt`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      errorMsg.hidden = false;
      errorMsg.textContent = "Teléfono o contraseña incorrectos.";
    }
  };
}

function initRegistro() {
  const form = document.getElementById("formRegistro");
  const helpText = document.getElementById("regHelp");
  const segBtns = document.querySelectorAll(".seg-btn");

  let tipoUsuario = "consumidor";

  if (form) {
    form.innerHTML = `
      <label class="field">
        <span>Nombre completo</span>
        <input type="text" name="nombre" required>
      </label>
      <label class="field">
        <span>Número de teléfono</span>
        <input type="tel" name="telefono" required>
      </label>
      <label class="field" id="campoOficio" style="display:none;">
        <span>Oficio o Especialidad (ej. Plomero, Electricista)</span>
        <input type="text" name="oficio" placeholder="Ej. Plomería residencial">
      </label>
      <label class="field">
        <span>Contraseña</span>
        <input type="password" name="password" required>
      </label>
      <p class="form-error" id="regError" hidden></p>
      <button class="btn btn--accent btn--full" type="submit">Completar registro</button>
    `;
  }

  segBtns.forEach((btn) => {
    btn.onclick = () => {
      segBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      tipoUsuario = btn.dataset.tipo;

      const campoOficio = document.getElementById("campoOficio");
      if (campoOficio) {
        campoOficio.style.display = tipoUsuario === "emprendedor" ? "block" : "none";
      }

      if (helpText) {
        helpText.textContent = tipoUsuario === "consumidor" 
          ? "Busco profesionales para contratar servicios."
          : "Ofrezco mis servicios y habilidades en la plataforma.";
      }
    };
  });

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = form.nombre.value.trim();
      const telefono = form.telefono.value.trim();
      const oficio = form.oficio ? form.oficio.value.trim() : "";
      const password = form.password.value;
      const email = `${telefono}@starpro.gt`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            display_name: nombre, 
            tipo: tipoUsuario, 
            telefono: telefono,
            oficio: oficio 
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
// 4. PERFIL DE USUARIO Y PORTAFOLIO DE OBRAS
// ==========================================
function initPerfil() {
  const profileRoot = document.getElementById("profileRoot");
  if (!profileRoot || !usuarioActual) return;

  const meta = usuarioActual.user_metadata || {};
  const esEmprendedor = meta.tipo === "emprendedor";

  profileRoot.innerHTML = `
    <div class="auth-card" style="max-width: 650px; margin: 0 auto;">
      <h1 class="auth-title">Mi Cuenta</h1>
      <p><strong>Nombre:</strong> ${meta.display_name || "Sin nombre"}</p>
      <p><strong>Teléfono:</strong> ${meta.telefono || "Sin teléfono"}</p>
      <p><strong>Tipo de perfil:</strong> ${esEmprendedor ? "Emprendedor / Profesional" : "Consumidor"}</p>
      ${esEmprendedor ? `<p><strong>Especialidad:</strong> ${meta.oficio || "Oficios Varios"}</p>` : ""}

      ${esEmprendedor ? `
        <hr style="margin: 20px 0; opacity: 0.2;">
        <h2 style="font-size: 1.2rem; margin-bottom: 10px;">Subir fotos de mis trabajos / obras</h2>
        <form id="formSubirObra" style="display: flex; flex-direction: column; gap: 12px;">
          <label class="field">
            <span>Título del trabajo realizado</span>
            <input type="text" id="obraTitulo" placeholder="Ej. Instalación de tubería de cobre" required>
          </label>
          <label class="field">
            <span>Enlace / URL de la imagen de tu obra</span>
            <input type="url" id="obraImagen" placeholder="https://mi-imagen.com/foto.jpg" required>
          </label>
          <button type="submit" class="btn btn--accent">Publicar en mi portafolio</button>
        </form>
      ` : ""}
    </div>
    
    ${esEmprendedor ? `
      <div style="max-width: 650px; margin: 30px auto 0;">
        <h2>Mis Obras Publicadas</h2>
        <div id="galeriaObrasPerfil" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-top: 15px;"></div>
      </div>
    ` : ""}
  `;

  if (esEmprendedor) {
    const formSubir = document.getElementById("formSubirObra");
    formSubir.onsubmit = async (e) => {
      e.preventDefault();
      const titulo = document.getElementById("obraTitulo").value;
      const urlImagen = document.getElementById("obraImagen").value;

      const { error } = await supabase.from("obras").insert([
        { 
          titulo: titulo, 
          imagen_url: urlImagen, 
          pro_id: usuarioActual.id,
          pro_nombre: meta.display_name 
        }
      ]);

      if (error) {
        alert("Error al publicar la obra: " + error.message);
      } else {
        alert("¡Obra agregada a tu catálogo exitosamente!");
        formSubir.reset();
        cargarObrasPerfil(usuarioActual.id);
      }
    };

    cargarObrasPerfil(usuarioActual.id);
  }
}

async function cargarObrasPerfil(proId) {
  const galeria = document.getElementById("galeriaObrasPerfil");
  if (!galeria) return;

  const { data } = await supabase
    .from("obras")
    .select("*")
    .eq("pro_id", proId)
    .order("created_at", { ascending: false });

  if (data && data.length > 0) {
    galeria.innerHTML = data.map((obra) => `
      <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; background: #222;">
        <img src="${obra.imagen_url}" alt="${obra.titulo}" style="width: 100%; height: 120px; object-fit: cover;">
        <p style="padding: 8px; font-size: 0.85rem; margin: 0; color: #fff;">${obra.titulo}</p>
      </div>
    `).join("");
  } else {
    galeria.innerHTML = `<p style="opacity:0.6;">No has subido fotos de tus trabajos todavía.</p>`;
  }
}

// ==========================================
// 5. CHAT Y INTERACCIÓN EN TIEMPO REAL
// ==========================================
function initMensajes() {
  const msgThread = document.getElementById("msgThread");
  if (!msgThread || !usuarioActual) return;

  msgThread.innerHTML = `
    <div id="chatBox" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; max-height: 400px;"></div>
    <form id="formChat" style="display: flex; gap: 10px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
      <input type="text" id="chatInput" placeholder="Escribe tu consulta sobre el servicio..." required style="flex: 1;">
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

    const nombre = usuarioActual.user_metadata?.display_name || "Usuario";

    await supabase.from("mensajes").insert([
      { texto: texto, usuario: nombre, user_id: usuarioActual.id }
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
    .channel("mensajes-canal")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, (payload) => {
      renderMensaje(payload.new, chatBox);
    })
    .subscribe();
}

function renderMensaje(msg, chatBox) {
  const div = document.createElement("div");
  const esMio = usuarioActual && msg.user_id === usuarioActual.id;

  div.style.alignSelf = esMio ? "flex-end" : "flex-start";
  div.style.backgroundColor = esMio ? "var(--marigold, #e0a96d)" : "rgba(255,255,255,0.1)";
  div.style.color = esMio ? "#111" : "#fff";
  div.style.padding = "8px 12px";
  div.style.borderRadius = "8px";
  div.style.maxWidth = "70%";

  div.innerHTML = `
    <strong style="display: block; font-size: 11px; opacity: 0.8;">${msg.usuario}</strong>
    <span>${msg.texto}</span>
  `;

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================================
// 6. DASHBOARD & CATÁLOGO
// ==========================================
function initDashboard() {
  const greeting = document.getElementById("dashGreeting");
  const dashSub = document.getElementById("dashSub");

  if (usuarioActual && greeting) {
    const nombre = usuarioActual.user_metadata?.display_name || "Usuario";
    const tipo = usuarioActual.user_metadata?.tipo || "consumidor";
    
    greeting.textContent = `Hola, ${nombre}`;
    dashSub.textContent = tipo === "emprendedor" 
      ? "Panel de Emprendedor / Profesional" 
      : "Panel de Consumidor";
  }
}

function initCatalogo() {
  // Lógica para desplegar lista de oficios en el catálogo
}

function initDetalleProfesional(proId) {
  // Carga perfiles de prestadores con sus obras expuestas
}

// ==========================================
// 7. INICIALIZACIÓN GLOBAL DE LA APP
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  if (btnBrandHome) {
    btnBrandHome.onclick = () => navegarA(usuarioActual ? "dashboard" : "landing");
  }

  if (btnLogout) {
    btnLogout.onclick = () => supabase.auth.signOut();
  }

  navegarA("landing");
});