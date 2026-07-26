import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://slzbakhcodhebjltriak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsemJha2hjb2RoZWJqbHRyaWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTg5NTAsImV4cCI6MjEwMDU5NDk1MH0.iksEXnM3ni17QtVMGkzfZcN1mmZSP8V5d4wV0YxXvjA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_AVATAR = "WhatsApp Image 2026-07-25 at 12.05.29 PM_2.jpeg";
let usuarioActual = null;
let receptorActivoId = null;

// ================= NAVEGACIÓN =================
function navegarA(ruta) {
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
  if (ruta === "catalogo") renderCatalogo();
}

function actualizarNav() {
  document.getElementById("topbarNav").hidden = !usuarioActual;
  document.getElementById("topbarGuest").hidden = !!usuarioActual;
}

// ================= STORAGE =================
async function subirFoto(file, userId) {
  if (!file) return DEFAULT_AVATAR;
  const ext = file.name.split('.').pop();
  const path = `perfiles/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) return DEFAULT_AVATAR;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// ================= VISTAS =================
function renderCatalogo() {
  const container = document.getElementById("catalogoPlaques");
  if (container && typeof CATEGORIAS !== "undefined") {
    container.innerHTML = CATEGORIAS.map(cat => `
      <div class="card">
        <h3>${cat.nombre}</h3>
        <p>${cat.descripcion}</p>
        <p class="accent-text" style="margin-top:10px; font-weight:bold;">Q${cat.tarifa_base} / h</p>
      </div>
    `).join("");
  }
}

function initRegistro() {
  const form = document.getElementById("formRegistro");
  const camposPro = document.getElementById("camposPrestador");
  let tipo = "consumidor";

  document.querySelectorAll(".seg-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tipo = btn.dataset.tipo;
      camposPro.style.display = tipo === "emprendedor" ? "block" : "none";
    };
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.textContent = "Cargando...";
    btn.disabled = true;

    const email = form.email.value.trim();
    const password = form.password.value;
    const nombre = form.nombre.value.trim();
    const file = document.getElementById("inputAvatarFile")?.files[0];

    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
    
    if (authErr) {
      document.getElementById("regError").hidden = false;
      document.getElementById("regError").textContent = authErr.message;
      btn.textContent = "Crear cuenta";
      btn.disabled = false;
      return;
    }

    if (authData.user) {
      const avatarUrl = await subirFoto(file, authData.user.id);
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        nombre, email, tipo,
        oficio: form.oficio ? form.oficio.value : "",
        tarifa_hora: form.tarifa_hora ? parseFloat(form.tarifa_hora.value) : 0,
        avatar_url: avatarUrl
      });
      await supabase.auth.signInWithPassword({ email, password });
    }
  };
}

function initLogin() {
  const form = document.getElementById("formLogin");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value
    });
    if (error) {
      document.getElementById("loginError").hidden = false;
      document.getElementById("loginError").textContent = "Datos incorrectos.";
    }
  };
}

async function initDashboard() {
  const { data } = await supabase.from("profiles").select("*").eq("id", usuarioActual.id).single();
  if (data) {
    document.getElementById("dashGreeting").textContent = `Hola, ${data.nombre}`;
    document.getElementById("dashSub").textContent = data.tipo === "emprendedor" ? `Prestador: ${data.oficio} | Q${data.tarifa_hora}/h` : "Panel de Cliente";
  }
}

async function initPerfil() {
  const root = document.getElementById("profileRoot");
  const { data } = await supabase.from("profiles").select("*").eq("id", usuarioActual.id).single();
  if (data) {
    root.innerHTML = `
      <div class="auth-card" style="margin: 0 auto;">
        <img src="${data.avatar_url}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;">
        <h2>${data.nombre}</h2>
        <p style="color: var(--text-muted)">${data.email}</p>
        <div style="text-align: left; margin-top: 20px; background: #000; padding: 15px; border-radius: 8px;">
          <p><strong>Tipo:</strong> ${data.tipo}</p>
          ${data.tipo === 'emprendedor' ? `<p><strong>Oficio:</strong> ${data.oficio}</p><p><strong>Tarifa:</strong> Q${data.tarifa_hora}/h</p>` : ''}
        </div>
      </div>
    `;
  }
}

// ================= CHAT =================
async function initMensajes() {
  const lista = document.getElementById("listaContactos");
  const { data: usuarios } = await supabase.from("profiles").select("*").neq("id", usuarioActual.id);

  if (usuarios) {
    lista.innerHTML = usuarios.map(u => `
      <div class="contact-item" data-id="${u.id}" data-name="${u.nombre}">
        <img src="${u.avatar_url}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div><strong>${u.nombre}</strong><br><small class="accent-text">${u.tipo === 'emprendedor' ? u.oficio : 'Cliente'}</small></div>
      </div>
    `).join("");

    document.querySelectorAll(".contact-item").forEach(item => {
      item.onclick = () => {
        document.querySelectorAll(".contact-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        cargarChat(item.dataset.id, item.dataset.name);
      };
    });
  }

  supabase.channel("chat").on("postgres_changes", { event: "INSERT", schema: "public", table: "mensajes" }, payload => {
    const m = payload.new;
    if (receptorActivoId && ((m.emisor_id === usuarioActual.id && m.receptor_id === receptorActivoId) || (m.emisor_id === receptorActivoId && m.receptor_id === usuarioActual.id))) {
      renderMsg(m);
    }
  }).subscribe();

  document.getElementById("formChat").onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    if (!input.value.trim() || !receptorActivoId) return;
    
    await supabase.from("mensajes").insert([{ texto: input.value.trim(), emisor_id: usuarioActual.id, receptor_id: receptorActivoId }]);
    input.value = "";
  };
}

async function cargarChat(receptorId, nombre) {
  receptorActivoId = receptorId;
  document.getElementById("chatTitulo").textContent = `Chat con ${nombre}`;
  document.getElementById("msgThread").innerHTML = "";

  const { data } = await supabase.from("mensajes").select("*")
    .or(`and(emisor_id.eq.${usuarioActual.id},receptor_id.eq.${receptorId}),and(emisor_id.eq.${receptorId},receptor_id.eq.${usuarioActual.id})`)
    .order("created_at", { ascending: true });

  if (data) data.forEach(renderMsg);
}

function renderMsg(msg) {
  const thread = document.getElementById("msgThread");
  const div = document.createElement("div");
  div.className = `msg-bubble ${msg.emisor_id === usuarioActual.id ? 'msg-mine' : 'msg-theirs'}`;
  div.textContent = msg.texto;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
}

// ================= EVENTOS GLOBALES =================
supabase.auth.onAuthStateChange((event, session) => {
  usuarioActual = session ? session.user : null;
  actualizarNav();
  if (session && !document.getElementById("tpl-dashboard")) {
    // Evita recargar si ya está en una ruta válida logueada
    navegarA("dashboard");
  }
});

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-route]");
  if (btn) { e.preventDefault(); navegarA(btn.dataset.route); }
  if (e.target.closest("#btnLogout")) { supabase.auth.signOut(); navegarA("landing"); }
  if (e.target.closest("#btnBrandHome")) { navegarA(usuarioActual ? "dashboard" : "landing"); }
});

document.addEventListener("DOMContentLoaded", () => navegarA("landing"));
