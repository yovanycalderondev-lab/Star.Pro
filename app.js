/* ============================================================
   app.js — Lógica de la aplicación.
   Persistencia: localStorage (no requiere servidor para funcionar,
   ideal para desplegar como sitio estático). Ver README.md para
   notas sobre cómo migrar a un backend real con varios usuarios
   compartiendo los mismos datos.
   ============================================================ */

const DB_KEYS = {
  users: "ovs_users",
  session: "ovs_session",
  tariffs: "ovs_tariffs_override",
  messages: "ovs_messages",
  adminSession: "ovs_admin_session"
};

/* ---------- helpers de almacenamiento ---------- */
function loadUsers(){
  let raw = localStorage.getItem(DB_KEYS.users);
  if (!raw){
    localStorage.setItem(DB_KEYS.users, JSON.stringify(SEED_PROS));
    return [...SEED_PROS];
  }
  return JSON.parse(raw);
}
function saveUsers(list){ localStorage.setItem(DB_KEYS.users, JSON.stringify(list)); }
function getSessionUserId(){ return localStorage.getItem(DB_KEYS.session); }
function setSessionUserId(id){ localStorage.setItem(DB_KEYS.session, id); }
function clearSession(){ localStorage.removeItem(DB_KEYS.session); }
function isAdminLoggedIn(){ return localStorage.getItem(DB_KEYS.adminSession) === "1"; }

function loadTariffOverrides(){
  let raw = localStorage.getItem(DB_KEYS.tariffs);
  return raw ? JSON.parse(raw) : {};
}
function saveTariffOverrides(obj){ localStorage.setItem(DB_KEYS.tariffs, JSON.stringify(obj)); }
function getCategoryTariffs(catId){
  const overrides = loadTariffOverrides();
  if (overrides[catId]) return overrides[catId];
  const cat = CATEGORIES.find(c => c.id === catId);
  return cat ? cat.tariffs : [];
}

function loadMessages(){
  let raw = localStorage.getItem(DB_KEYS.messages);
  return raw ? JSON.parse(raw) : [];
}
function saveMessages(list){ localStorage.setItem(DB_KEYS.messages, JSON.stringify(list)); }

function uid(prefix){ return prefix + "-" + Math.random().toString(36).slice(2,9); }
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showToast(text){
  let el = document.querySelector(".toast");
  if (el) el.remove();
  el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- estado de ruta ---------- */
let CURRENT_ROUTE = "landing";
let CURRENT_PARAMS = {};
let PENDING_REG_TIPO = "consumidor";
let ACTIVE_THREAD_PARTNER_ID = null;

function currentUser(){
  const id = getSessionUserId();
  if (!id) return null;
  return loadUsers().find(u => u.id === id) || null;
}

/* ============================================================
   ROUTER
   ============================================================ */
function navigate(route, params = {}){
  CURRENT_ROUTE = route;
  CURRENT_PARAMS = params;
  render();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-route]");
  if (!t) return;
  const route = t.getAttribute("data-route");
  const tipo = t.getAttribute("data-tipo");
  if (tipo) PENDING_REG_TIPO = tipo;
  navigate(route, {});
});

document.getElementById("btnBrandHome").addEventListener("click", () => {
  navigate(currentUser() ? "dashboard" : "landing");
});
document.getElementById("btnLogout").addEventListener("click", () => {
  clearSession();
  showToast("Sesión cerrada");
  navigate("landing");
});

function updateTopbar(){
  const user = currentUser();
  document.getElementById("topbarNav").hidden = !user;
  document.getElementById("topbarGuest").hidden = !!user;
}

/* ============================================================
   RENDER ROOT
   ============================================================ */
function render(){
  updateTopbar();
  const app = document.getElementById("app");
  app.innerHTML = "";

  const user = currentUser();
  const guestOnlyRoutes = ["landing","registro","login","admin-login"];
  if (!user && !guestOnlyRoutes.includes(CURRENT_ROUTE) && CURRENT_ROUTE !== "admin"){
    CURRENT_ROUTE = "login";
  }
  if (user && (CURRENT_ROUTE === "landing" || CURRENT_ROUTE === "login" || CURRENT_ROUTE === "registro")){
    CURRENT_ROUTE = "dashboard";
  }

  switch(CURRENT_ROUTE){
    case "landing": return renderLanding(app);
    case "registro": return renderRegistro(app);
    case "login": return renderLogin(app);
    case "dashboard": return renderDashboard(app);
    case "catalogo": return renderCatalogo(app);
    case "categoria": return renderCategoria(app, CURRENT_PARAMS.id);
    case "pro": return renderPro(app, CURRENT_PARAMS.id);
    case "perfil": return renderPerfil(app);
    case "mensajes": return renderMensajes(app);
    case "admin-login": return renderAdminLogin(app);
    case "admin": {
      if (!isAdminLoggedIn()){ CURRENT_ROUTE = "admin-login"; return renderAdminLogin(app); }
      return renderAdmin(app);
    }
    default: return renderLanding(app);
  }
}

/* helper para clonar templates */
function clone(tplId){
  return document.getElementById(tplId).content.cloneNode(true);
}
function plaqueColorStyle(colors){
  if (colors.length === 1) return `background:${colors[0]}`;
  return `background: linear-gradient(135deg, ${colors.join(", ")})`;
}

/* ============================================================
   LANDING
   ============================================================ */
function renderLanding(app){
  app.appendChild(clone("tpl-landing"));
  const grid = document.getElementById("landingPlaques");
  grid.innerHTML = CATEGORIES.map(plaqueHtml).join("");
  grid.querySelectorAll(".plaque").forEach(el => {
    el.addEventListener("click", () => navigate("registro", {}));
  });
}
function plaqueHtml(cat){
  return `
    <button class="plaque" style="${plaqueColorStyle(cat.colors)}" data-cat="${cat.id}">
      <span class="plaque-route">Ruta ${cat.rutaNum}</span>
      <span class="plaque-name">${escapeHtml(cat.nombre)}</span>
    </button>`;
}

/* ============================================================
   REGISTRO
   ============================================================ */
function renderRegistro(app){
  app.appendChild(clone("tpl-registro"));
  const segBtns = app.querySelectorAll(".seg-btn");
  segBtns.forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.tipo === PENDING_REG_TIPO);
    btn.addEventListener("click", () => {
      PENDING_REG_TIPO = btn.dataset.tipo;
      renderRegistroForm();
      segBtns.forEach(b => b.classList.toggle("is-active", b === btn));
    });
  });
  renderRegistroForm();
}

function renderRegistroForm(){
  const form = document.getElementById("formRegistro");
  const help = document.getElementById("regHelp");
  if (PENDING_REG_TIPO === "consumidor"){
    help.textContent = "Dirigido a personas que buscan contratar servicios.";
    form.innerHTML = `
      <label class="field"><span>Nombre completo</span><input type="text" name="nombre" required></label>
      <label class="field"><span>Número de teléfono</span><input type="tel" name="telefono" required></label>
      <div class="field-row">
        <label class="field"><span>Departamento</span>
          <select name="departamento" required>
            <option value="">Elegí uno</option>
            ${DEPARTAMENTOS_GT.map(d => `<option value="${d}">${d}</option>`).join("")}
          </select>
        </label>
        <label class="field"><span>Municipio</span><input type="text" name="municipio" required></label>
      </div>
      <label class="field"><span>Zona de residencia</span><input type="text" name="zona" placeholder="Ej. Zona 10" required></label>
      <label class="field"><span>Contraseña de acceso</span><input type="password" name="password" minlength="4" required></label>
      <p class="form-error" id="regError" hidden></p>
      <button class="btn btn--accent btn--full" type="submit">Crear cuenta</button>
    `;
  } else {
    help.textContent = "Dirigido a personas que ofrecen sus servicios en la plataforma. El DPI es obligatorio para confirmar que sos mayor de edad.";
    form.innerHTML = `
      <label class="field"><span>Nombre completo</span><input type="text" name="nombre" required></label>
      <label class="field"><span>Número de teléfono</span><input type="tel" name="telefono" required></label>
      <label class="field"><span>Número de DPI</span><input type="text" name="dpi" inputmode="numeric" maxlength="13" placeholder="13 dígitos" required></label>
      <p class="field-hint">Usamos tu DPI únicamente para confirmar mayoría de edad, junto con tu fecha de nacimiento.</p>
      <label class="field"><span>Fecha de nacimiento</span><input type="date" name="fechaNacimiento" required></label>
      <label class="field"><span>Departamento donde trabajás</span>
        <select name="departamento" required>
          <option value="">Elegí uno</option>
          ${DEPARTAMENTOS_GT.map(d => `<option value="${d}">${d}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>Municipio / zona</span><input type="text" name="ubicacionDetalle" placeholder="Ej. Zona 7, Mixco" required></label>
      <label class="field"><span>Contraseña de acceso</span><input type="password" name="password" minlength="4" required></label>
      <p class="form-section-title">Categorías en las que querés trabajar</p>
      <div class="chip-grid" id="regChips">
        ${CATEGORIES.map(c => `<button type="button" class="chip" data-cat="${c.id}">${escapeHtml(c.nombre)}</button>`).join("")}
      </div>
      <p class="form-error" id="regError" hidden></p>
      <button class="btn btn--accent btn--full" type="submit">Validar DPI y crear cuenta</button>
    `;
    const selected = new Set();
    form.querySelectorAll("#regChips .chip").forEach(chip => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("is-active");
        const id = chip.dataset.cat;
        selected.has(id) ? selected.delete(id) : selected.add(id);
      });
    });
    form._selectedCats = selected;
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    handleRegistroSubmit(form);
  };
}

function calcAge(dateStr){
  const dob = new Date(dateStr);
  if (isNaN(dob)) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function handleRegistroSubmit(form){
  const errEl = document.getElementById("regError");
  errEl.hidden = true;
  const fd = new FormData(form);
  const users = loadUsers();
  const telefono = (fd.get("telefono") || "").trim();

  if (users.some(u => u.telefono === telefono)){
    errEl.textContent = "Ya existe una cuenta registrada con ese número de teléfono.";
    errEl.hidden = false;
    return;
  }

  if (PENDING_REG_TIPO === "consumidor"){
    const nuevo = {
      id: uid("user"),
      tipo: "consumidor",
      nombre: fd.get("nombre").trim(),
      telefono,
      password: fd.get("password"),
      departamento: fd.get("departamento"),
      municipio: fd.get("municipio").trim(),
      zona: fd.get("zona").trim()
    };
    users.push(nuevo);
    saveUsers(users);
    setSessionUserId(nuevo.id);
    showToast(`Bienvenido, ${nuevo.nombre.split(" ")[0]}`);
    navigate("dashboard");
    return;
  }

  // Emprendedor: validar DPI
  const dpi = (fd.get("dpi") || "").replace(/\D/g, "");
  if (dpi.length !== 13){
    errEl.textContent = "El número de DPI debe tener 13 dígitos. Sin este dato no se puede completar el registro.";
    errEl.hidden = false;
    return;
  }
  const fechaNacimiento = fd.get("fechaNacimiento");
  const edad = calcAge(fechaNacimiento);
  if (edad === null){
    errEl.textContent = "Ingresá una fecha de nacimiento válida.";
    errEl.hidden = false;
    return;
  }
  if (edad < 18){
    errEl.textContent = "El DPI indica que sos menor de edad. Solo personas mayores de edad pueden publicar servicios.";
    errEl.hidden = false;
    return;
  }
  const categorias = Array.from(form._selectedCats || []);
  if (categorias.length === 0){
    errEl.textContent = "Seleccioná al menos una categoría en la que querés trabajar.";
    errEl.hidden = false;
    return;
  }
  const nuevo = {
    id: uid("user"),
    tipo: "emprendedor",
    nombre: fd.get("nombre").trim(),
    telefono,
    dpi,
    fechaNacimiento,
    password: fd.get("password"),
    categorias,
    ubicacion: `${fd.get("ubicacionDetalle").trim()}, ${fd.get("departamento")}`,
    calificacion: null,
    disponibilidad: "Por definir"
  };
  users.push(nuevo);
  saveUsers(users);
  setSessionUserId(nuevo.id);
  showToast(`DPI validado. Bienvenido, ${nuevo.nombre.split(" ")[0]}`);
  navigate("dashboard");
}

/* ============================================================
   LOGIN
   ============================================================ */
function renderLogin(app){
  app.appendChild(clone("tpl-login"));
  document.getElementById("formLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const telefono = (fd.get("telefono") || "").trim();
    const password = fd.get("password");
    const user = loadUsers().find(u => u.telefono === telefono && u.password === password);
    const errEl = document.getElementById("loginError");
    if (!user){
      errEl.textContent = "Teléfono o contraseña incorrectos.";
      errEl.hidden = false;
      return;
    }
    setSessionUserId(user.id);
    showToast(`Hola de nuevo, ${user.nombre.split(" ")[0]}`);
    navigate("dashboard");
  });
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard(app){
  app.appendChild(clone("tpl-dashboard"));
  const user = currentUser();
  document.getElementById("dashGreeting").textContent = user.nombre.split(" ")[0];
  document.getElementById("dashSub").textContent = user.tipo === "emprendedor"
    ? "Gestioná tu perfil de profesional y revisá tus mensajes."
    : "Buscá un oficio o servicio y contactá directo dentro de la plataforma.";
  const grid = document.getElementById("dashPlaques");
  grid.innerHTML = CATEGORIES.map(plaqueHtml).join("");
  grid.querySelectorAll(".plaque").forEach(el => {
    el.addEventListener("click", () => navigate("categoria", { id: el.dataset.cat }));
  });
}

/* ============================================================
   CATALOGO
   ============================================================ */
function renderCatalogo(app){
  app.appendChild(clone("tpl-catalogo"));
  const grid = document.getElementById("catalogoPlaques");
  grid.innerHTML = CATEGORIES.map(plaqueHtml).join("");
  grid.querySelectorAll(".plaque").forEach(el => {
    el.addEventListener("click", () => navigate("categoria", { id: el.dataset.cat }));
  });
}

/* ============================================================
   CATEGORIA DETALLE
   ============================================================ */
function renderCategoria(app, catId){
  const cat = CATEGORIES.find(c => c.id === catId);
  app.appendChild(clone("tpl-categoria"));
  const root = document.getElementById("catdetailRoot");
  if (!cat){ root.innerHTML = `<p class="empty-note">Categoría no encontrada.</p>`; return; }

  const tariffs = getCategoryTariffs(cat.id);
  const pros = loadUsers().filter(u => u.tipo === "emprendedor" && (u.categorias||[]).includes(cat.id));

  root.innerHTML = `
    <div class="cat-banner" style="${plaqueColorStyle(cat.colors)}">
      <div class="cat-banner-inner">
        <span class="cat-banner-route">Ruta ${cat.rutaNum}</span>
        <h1 class="cat-banner-title">${escapeHtml(cat.nombre)}</h1>
      </div>
    </div>
    <div class="cat-grid">
      <div class="ticket">
        <p class="ticket-title">Tarifas oficiales</p>
        ${tariffs.map(t => `
          <div class="ticket-row">
            <span class="ticket-label">${escapeHtml(t.label)}${t.nota ? `<span class="ticket-note">${escapeHtml(t.nota)}</span>` : ""}</span>
            <span class="ticket-value">${escapeHtml(t.value)}</span>
          </div>
        `).join("")}
      </div>
      <div>
        <h2 class="pro-list-title">Profesionales disponibles</h2>
        ${pros.length ? pros.map(p => proCardHtml(p, cat)).join("") : `<p class="empty-note">Todavía no hay profesionales registrados en esta categoría. ¡Sé el primero!</p>`}
      </div>
    </div>
  `;
  root.querySelectorAll(".pro-card").forEach(el => {
    el.addEventListener("click", () => navigate("pro", { id: el.dataset.pro }));
  });
}

function initials(name){
  return name.split(" ").filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("");
}
function proCardHtml(p, cat){
  return `
    <button class="pro-card" data-pro="${p.id}">
      <span class="pro-avatar" style="${plaqueColorStyle(cat.colors)}">${initials(p.nombre)}</span>
      <span class="pro-info">
        <span class="pro-name">${escapeHtml(p.nombre)}</span><br>
        <span class="pro-meta">${escapeHtml(p.ubicacion || "Ubicación no especificada")} · ${escapeHtml(p.disponibilidad || "Disponibilidad no especificada")}</span>
      </span>
      <span class="pro-rating">${p.calificacion ? "★ " + p.calificacion.toFixed(1) : "Nuevo"}</span>
    </button>`;
}

/* ============================================================
   PERFIL DE PROFESIONAL
   ============================================================ */
function renderPro(app, proId){
  app.appendChild(clone("tpl-pro"));
  const root = document.getElementById("prodetailRoot");
  const pro = loadUsers().find(u => u.id === proId);
  if (!pro){ root.innerHTML = `<p class="empty-note">Profesional no encontrado.</p>`; return; }
  const cats = (pro.categorias||[]).map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean);
  const mainColor = cats[0] ? cats[0].colors[0] : "#4A708B";
  const me = currentUser();

  root.innerHTML = `
    <div class="pro-hero">
      <span class="pro-hero-avatar" style="background:${mainColor}">${initials(pro.nombre)}</span>
      <div>
        <h1 class="pro-hero-name">${escapeHtml(pro.nombre)}</h1>
        <p class="pro-hero-meta">${escapeHtml(pro.ubicacion || "Ubicación no especificada")}</p>
      </div>
    </div>
    <div class="info-card">
      <div class="info-row"><span>Calificación promedio</span><span>${pro.calificacion ? "★ " + pro.calificacion.toFixed(1) : "Sin calificaciones aún"}</span></div>
      <div class="info-row"><span>Disponibilidad</span><span>${escapeHtml(pro.disponibilidad || "Por definir")}</span></div>
      <div class="info-row"><span>Servicios que ofrece</span><span>${cats.map(c => `<span class="cat-badge" style="background:${c.colors[0]}">${escapeHtml(c.nombre)}</span>`).join("")}</span></div>
    </div>
    ${me && me.id !== pro.id ? `<button class="btn btn--accent" id="btnContact">Contactar dentro de la plataforma</button>` : ""}
    ${me && me.id === pro.id ? `<p class="empty-note">Este es tu propio perfil público.</p>` : ""}
  `;
  const btn = document.getElementById("btnContact");
  if (btn) btn.addEventListener("click", () => {
    ACTIVE_THREAD_PARTNER_ID = pro.id;
    navigate("mensajes", {});
  });
}

/* ============================================================
   MI PERFIL
   ============================================================ */
function renderPerfil(app){
  app.appendChild(clone("tpl-perfil"));
  const root = document.getElementById("profileRoot");
  const user = currentUser();
  let extra = "";
  if (user.tipo === "emprendedor"){
    const cats = (user.categorias||[]).map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean);
    extra = `
      <div class="info-row"><span>DPI</span><span>${escapeHtml(user.dpi)}</span></div>
      <div class="info-row"><span>Fecha de nacimiento</span><span>${escapeHtml(user.fechaNacimiento)}</span></div>
      <div class="info-row"><span>Ubicación</span><span>${escapeHtml(user.ubicacion)}</span></div>
      <div class="info-row"><span>Calificación</span><span>${user.calificacion ? "★ " + user.calificacion.toFixed(1) : "Sin calificaciones aún"}</span></div>
      <div class="info-row"><span>Categorías</span><span>${cats.map(c => `<span class="cat-badge" style="background:${c.colors[0]}">${escapeHtml(c.nombre)}</span>`).join("")}</span></div>
    `;
  } else {
    extra = `
      <div class="info-row"><span>Departamento</span><span>${escapeHtml(user.departamento)}</span></div>
      <div class="info-row"><span>Municipio</span><span>${escapeHtml(user.municipio)}</span></div>
      <div class="info-row"><span>Zona</span><span>${escapeHtml(user.zona)}</span></div>
    `;
  }
  root.innerHTML = `
    <h1 class="section-title">Mi cuenta</h1>
    <p class="section-sub">Perfil: ${user.tipo === "emprendedor" ? "Emprendedor / Profesional" : "Consumidor"}</p>
    <div class="info-card">
      <div class="info-row"><span>Nombre completo</span><span>${escapeHtml(user.nombre)}</span></div>
      <div class="info-row"><span>Teléfono</span><span>${escapeHtml(user.telefono)}</span></div>
      ${extra}
    </div>
  `;
}

/* ============================================================
   MENSAJES
   ============================================================ */
function threadIdFor(a, b){ return [a,b].sort().join("__"); }

function renderMensajes(app){
  app.appendChild(clone("tpl-mensajes"));
  const me = currentUser();
  const all = loadMessages();
  const partnerIds = new Set();
  all.forEach(m => {
    if (m.fromId === me.id) partnerIds.add(m.toId);
    if (m.toId === me.id) partnerIds.add(m.fromId);
  });
  if (ACTIVE_THREAD_PARTNER_ID) partnerIds.add(ACTIVE_THREAD_PARTNER_ID);

  const users = loadUsers();
  const list = document.getElementById("msgThreads");
  if (partnerIds.size === 0){
    list.innerHTML = `<p class="empty-note">Sin conversaciones todavía. Visitá el perfil de un profesional para escribirle.</p>`;
  } else {
    list.innerHTML = Array.from(partnerIds).map(pid => {
      const u = users.find(x => x.id === pid);
      if (!u) return "";
      return `<button class="msg-thread-item${pid === ACTIVE_THREAD_PARTNER_ID ? " is-active" : ""}" data-pid="${pid}">${escapeHtml(u.nombre)}</button>`;
    }).join("");
    list.querySelectorAll(".msg-thread-item").forEach(btn => {
      btn.addEventListener("click", () => {
        ACTIVE_THREAD_PARTNER_ID = btn.dataset.pid;
        renderMensajes(replaceApp());
      });
    });
  }

  if (ACTIVE_THREAD_PARTNER_ID){
    renderThread(me.id, ACTIVE_THREAD_PARTNER_ID);
  }
}

function replaceApp(){
  const app = document.getElementById("app");
  app.innerHTML = "";
  return app;
}

function renderThread(meId, partnerId){
  const partner = loadUsers().find(u => u.id === partnerId);
  const threadEl = document.getElementById("msgThread");
  if (!partner){ threadEl.innerHTML = `<p class="msg-empty">Usuario no encontrado.</p>`; return; }
  const tid = threadIdFor(meId, partnerId);
  const msgs = loadMessages().filter(m => threadIdFor(m.fromId, m.toId) === tid);

  threadEl.innerHTML = `
    <h2 class="section-title section-title--sm">${escapeHtml(partner.nombre)}</h2>
    <div class="msg-bubbles" id="bubbles">
      ${msgs.length ? msgs.map(m => `<span class="bubble ${m.fromId === meId ? "bubble--me" : "bubble--them"}">${escapeHtml(m.text)}</span>`).join("") : `<p class="msg-empty">Empezá la conversación. Toda la comunicación queda dentro de la plataforma.</p>`}
    </div>
    <form class="msg-form" id="msgForm">
      <input type="text" name="text" placeholder="Escribí un mensaje…" autocomplete="off" required>
      <button class="btn btn--accent" type="submit">Enviar</button>
    </form>
  `;
  const bubbles = document.getElementById("bubbles");
  bubbles.scrollTop = bubbles.scrollHeight;

  document.getElementById("msgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const text = (fd.get("text") || "").trim();
    if (!text) return;
    const all = loadMessages();
    all.push({ id: uid("msg"), fromId: meId, toId: partnerId, text, timestamp: Date.now() });
    saveMessages(all);
    e.target.reset();
    renderThread(meId, partnerId);
  });
}

/* ============================================================
   ADMIN
   ============================================================ */
function renderAdminLogin(app){
  app.appendChild(clone("tpl-admin-login"));
  document.getElementById("formAdminLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById("adminLoginError");
    if (fd.get("user") === ADMIN_USER.user && fd.get("password") === ADMIN_USER.password){
      localStorage.setItem(DB_KEYS.adminSession, "1");
      navigate("admin");
    } else {
      errEl.textContent = "Usuario o contraseña incorrectos.";
      errEl.hidden = false;
    }
  });
}

function renderAdmin(app){
  app.appendChild(clone("tpl-admin"));
  const root = document.getElementById("adminCats");
  const overrides = loadTariffOverrides();

  function draw(){
    root.innerHTML = CATEGORIES.map(cat => {
      const tariffs = overrides[cat.id] || cat.tariffs;
      return `
        <div class="admin-cat" data-cat="${cat.id}">
          <div class="admin-cat-head">
            <span class="admin-cat-name">${escapeHtml(cat.nombre)}</span>
            <span class="cat-badge" style="background:${cat.colors[0]}">Ruta ${cat.rutaNum}</span>
          </div>
          <div class="admin-rows">
            ${tariffs.map((t,i) => `
              <div class="admin-row" data-i="${i}">
                <input type="text" class="t-label" value="${escapeHtml(t.label)}" placeholder="Concepto">
                <input type="text" class="t-value" value="${escapeHtml(t.value)}" placeholder="Tarifa">
                <button type="button" class="t-del">Quitar</button>
              </div>
            `).join("")}
          </div>
          <button type="button" class="admin-add">+ Agregar concepto</button>
          <p class="admin-save-note"></p>
        </div>
      `;
    }).join("");

    root.querySelectorAll(".admin-cat").forEach(catEl => {
      const catId = catEl.dataset.cat;
      const noteEl = catEl.querySelector(".admin-save-note");

      function persist(){
        const rows = Array.from(catEl.querySelectorAll(".admin-row")).map(r => ({
          label: r.querySelector(".t-label").value.trim(),
          value: r.querySelector(".t-value").value.trim()
        })).filter(r => r.label || r.value);
        overrides[catId] = rows;
        saveTariffOverrides(overrides);
        noteEl.textContent = "Cambios guardados ✓";
        setTimeout(() => { if (noteEl) noteEl.textContent = ""; }, 1800);
      }

      catEl.querySelectorAll(".t-label, .t-value").forEach(input => {
        input.addEventListener("change", persist);
      });
      catEl.querySelectorAll(".t-del").forEach(btn => {
        btn.addEventListener("click", () => { btn.closest(".admin-row").remove(); persist(); });
      });
      catEl.querySelector(".admin-add").addEventListener("click", () => {
        const rowsWrap = catEl.querySelector(".admin-rows");
        const div = document.createElement("div");
        div.className = "admin-row";
        div.innerHTML = `<input type="text" class="t-label" placeholder="Concepto"><input type="text" class="t-value" placeholder="Tarifa"><button type="button" class="t-del">Quitar</button>`;
        rowsWrap.appendChild(div);
        div.querySelectorAll(".t-label, .t-value").forEach(input => input.addEventListener("change", persist));
        div.querySelector(".t-del").addEventListener("click", () => { div.remove(); persist(); });
      });
    });
  }
  draw();
}

/* ============================================================
   INIT
   ============================================================ */
loadUsers(); // asegura semilla de profesionales
render();
