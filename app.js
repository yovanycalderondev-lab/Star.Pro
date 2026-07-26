// app.js - Samazil Plataforma de Servicios

import { CATEGORIAS } from './data.js';

// Estado global de la aplicación
const state = {
  route: 'landing',
  user: JSON.parse(localStorage.getItem('samazil_user')) || null,
  users: JSON.parse(localStorage.getItem('samazil_users')) || [
    { id: 'u1', nombre: 'Carlos Pérez', email: 'carlos@samazil.gt', tipo: 'emprendedor', oficio: 'Electricista', tarifa_hora: 150, avatar: '⚡', rating: 4.9 },
    { id: 'u2', nombre: 'María Gómez', email: 'maria@samazil.gt', tipo: 'emprendedor', oficio: 'Plomería', tarifa_hora: 120, avatar: '🔧', rating: 4.8 },
    { id: 'u3', nombre: 'Ana López', email: 'ana@samazil.gt', tipo: 'consumidor', avatar: '👤' }
  ],
  messages: JSON.parse(localStorage.getItem('samazil_messages')) || [
    { id: 1, de: 'u3', para: 'u1', texto: 'Hola Carlos, necesito una cotización para una instalación.', timestamp: Date.now() - 3600000 },
    { id: 2, de: 'u1', para: 'u3', texto: '¡Hola Ana! Claro que sí, dime de cuántos ambientes es la casa.', timestamp: Date.now() - 1800000 }
  ],
  activeChatUser: null
};

function saveState() {
  localStorage.setItem('samazil_user', JSON.stringify(state.user));
  localStorage.setItem('samazil_users', JSON.stringify(state.users));
  localStorage.setItem('samazil_messages', JSON.stringify(state.messages));
}

// Enrutador principal
function navigate(route, params = {}) {
  state.route = route;
  window.scrollTo(0, 0);
  renderApp(params);
  updateTopbar();
}

function updateTopbar() {
  const guestNav = document.getElementById('topbarGuest');
  const userNav = document.getElementById('topbarNav');
  
  if (state.user) {
    if (guestNav) guestNav.style.display = 'none';
    if (userNav) userNav.hidden = false;
  } else {
    if (guestNav) guestNav.style.display = 'flex';
    if (userNav) userNav.hidden = true;
  }
}

// Renderizador de vistas
function renderApp(params) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  switch (state.route) {
    case 'landing':
      renderLanding(app);
      break;
    case 'registro':
      renderRegistro(app, params.tipo || 'consumidor');
      break;
    case 'login':
      renderLogin(app);
      break;
    case 'dashboard':
      renderDashboard(app);
      break;
    case 'catalogo':
      renderCatalogo(app);
      break;
    case 'mensajes':
      renderMensajes(app);
      break;
    case 'perfil':
      renderPerfil(app);
      break;
    default:
      renderLanding(app);
  }
}

function renderLanding(app) {
  const tpl = document.getElementById('tpl-landing');
  if (tpl) {
    app.appendChild(tpl.content.cloneNode(true));
  } else {
    app.innerHTML = `
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">Conecta con quien lo hace <span class="accent-text">bien.</span></h1>
          <p class="hero-sub">Encuentra expertos en oficios o ofrece tus servicios en Guatemala con tarifas claras.</p>
          <div class="hero-actions">
            <button class="btn btn--accent" onclick="window.routerNavigate('registro', {tipo: 'consumidor'})">Busco un servicio</button>
            <button class="btn btn--outline" onclick="window.routerNavigate('registro', {tipo: 'emprendedor'})">Ofrezco mis servicios</button>
          </div>
        </div>
      </section>
    `;
  }
}

function renderRegistro(app, tipoInicial) {
  app.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card">
        <img src="logo.jpeg" alt="Samazil" class="auth-logo" onerror="this.src='https://via.placeholder.com/64?text=S'">
        <h1 class="auth-title">Únete a Samazil</h1>
        
        <div class="seg-toggle">
          <button class="seg-btn ${tipoInicial === 'consumidor' ? 'active' : ''}" id="btnTipoConsumidor" type="button">Cliente</button>
          <button class="seg-btn ${tipoInicial === 'emprendedor' ? 'active' : ''}" id="btnTipoEmprendedor" type="button">Prestador</button>
        </div>
        
        <form id="formRegistroAuth" class="auth-form">
          <label>Nombre completo <input type="text" name="nombre" required placeholder="Ej. Juan Pérez"></label>
          <label>Correo electrónico <input type="email" name="email" required placeholder="correo@ejemplo.com"></label>

          <div id="camposPrestador" style="display: ${tipoInicial === 'emprendedor' ? 'block' : 'none'};">
            <label>Oficio / Especialidad 
              <select name="oficio" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:#000; color:#fff; margin-top:6px;">
                ${CATEGORIAS.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')}
              </select>
            </label>
            <label>Tarifa por hora (Q) <input type="number" name="tarifa_hora" value="100" min="10"></label>
          </div>

          <label>Contraseña <input type="password" name="password" required placeholder="••••••••"></label>
          <p id="regError" class="error-msg" style="display:none;"></p>
          <button class="btn btn--accent btn--full" type="submit">Crear cuenta</button>
        </form>
      </div>
    </section>
  `;

  let currentTipo = tipoInicial;
  const btnC = document.getElementById('btnTipoConsumidor');
  const btnE = document.getElementById('btnTipoEmprendedor');
  const camposP = document.getElementById('camposPrestador');

  btnC.addEventListener('click', () => {
    currentTipo = 'consumidor';
    btnC.classList.add('active');
    btnE.classList.remove('active');
    camposP.style.display = 'none';
  });

  btnE.addEventListener('click', () => {
    currentTipo = 'emprendedor';
    btnE.classList.add('active');
    btnC.classList.remove('active');
    camposP.style.display = 'block';
  });

  document.getElementById('formRegistroAuth').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const nombre = data.get('nombre');
    const email = data.get('email');
    const password = data.get('password');
    const oficio = data.get('oficio');
    const tarifa_hora = parseFloat(data.get('tarifa_hora')) || 100;

    const existe = state.users.find(u => u.email === email);
    if (existe) {
      const err = document.getElementById('regError');
      err.textContent = 'El correo electrónico ya está registrado.';
      err.style.display = 'block';
      return;
    }

    const nuevoUsuario = {
      id: 'u_' + Date.now(),
      nombre,
      email,
      password,
      tipo: currentTipo,
      oficio: currentTipo === 'emprendedor' ? oficio : null,
      tarifa_hora: currentTipo === 'emprendedor' ? tarifa_hora : null,
      avatar: nombre.charAt(0).toUpperCase()
    };

    state.users.push(nuevoUsuario);
    state.user = nuevoUsuario;
    saveState();
    navigate('dashboard');
  });
}

function renderLogin(app) {
  app.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card">
        <img src="logo.jpeg" alt="Samazil" class="auth-logo" onerror="this.src='https://via.placeholder.com/64?text=S'">
        <h1 class="auth-title">Iniciar sesión</h1>
        <form id="formLoginAuth" class="auth-form">
          <label>Correo <input type="email" name="email" required placeholder="correo@ejemplo.com"></label>
          <label>Contraseña <input type="password" name="password" required placeholder="••••••••"></label>
          <p id="loginError" class="error-msg" style="display:none;"></p>
          <button class="btn btn--accent btn--full" type="submit">Entrar</button>
        </form>
      </div>
    </section>
  `;

  document.getElementById('formLoginAuth').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get('email');
    const password = data.get('password');

    const usuarioEncontrado = state.users.find(u => u.email === email && u.password === password);
    if (!usuarioEncontrado) {
      const err = document.getElementById('loginError');
      err.textContent = 'Credenciales incorrectas.';
      err.style.display = 'block';
      return;
    }

    state.user = usuarioEncontrado;
    saveState();
    navigate('dashboard');
  });
}

function renderDashboard(app) {
  if (!state.user) {
    navigate('login');
    return;
  }
  app.innerHTML = `
    <section class="dash-shell">
      <h1 class="dash-title">¡Hola, ${state.user.nombre}!</h1>
      <p class="dash-sub">Bienvenido a tu panel de control en Samazil.</p>
      <div class="grid-cards">
        <div class="card" onclick="window.routerNavigate('catalogo')"><h3>Explorar Servicios</h3><p>Ver profesionales disponibles</p></div>
        <div class="card" onclick="window.routerNavigate('mensajes')"><h3>Mensajes</h3><p>Chatea con tus contactos</p></div>
        <div class="card" onclick="window.routerNavigate('perfil')"><h3>Mi Cuenta</h3><p>Edita tu información</p></div>
      </div>
    </section>
  `;
}

function renderCatalogo(app) {
  const prestadores = state.users.filter(u => u.tipo === 'emprendedor');
  app.innerHTML = `
    <section class="cat-shell">
      <h1 class="section-title">Servicios Disponibles</h1>
      <div class="grid-cards">
        ${prestadores.length === 0 ? '<p style="color:var(--text-muted)">No hay prestadores registrados.</p>' : prestadores.map(p => `
          <div class="card" style="cursor:default;">
            <h3>${p.nombre}</h3>
            <p style="color:var(--accent); font-weight:600; margin-bottom:8px;">${p.oficio}</p>
            <p style="margin-bottom:16px;">Tarifa: Q${p.tarifa_hora} / hora</p>
            <button class="btn btn--accent btn--full" onclick="window.iniciarChatCon('${p.id}')">Contactar por Chat</button>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderMensajes(app) {
  if (!state.user) {
    navigate('login');
    return;
  }

  const contactos = state.users.filter(u => u.id !== state.user.id);
  if (!state.activeChatUser && contactos.length > 0) {
    state.activeChatUser = contactos[0].id;
  }

  const contactoActivo = state.users.find(u => u.id === state.activeChatUser);
  const mensajesChat = state.messages.filter(m => 
    (m.de === state.user.id && m.para === state.activeChatUser) ||
    (m.de === state.activeChatUser && m.para === state.user.id)
  ).sort((a, b) => a.timestamp - b.timestamp);

  app.innerHTML = `
    <section class="msg-shell">
      <div class="chat-layout" style="width:100%;">
        <div class="chat-sidebar">
          <h3>Contactos</h3>
          <div class="contact-list">
            ${contactos.length === 0 ? '<p style="color:var(--text-muted); font-size:0.9rem;">Sin contactos</p>' : contactos.map(c => `
              <div class="contact-item ${c.id === state.activeChatUser ? 'active' : ''}" onclick="window.cambiarChat('${c.id}')">
                <div style="font-weight:600;">${c.nombre}</div>
                <div style="font-size:0.8rem; color:var(--text-muted);">${c.oficio || c.tipo}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="chat-main">
          <h3>${contactoActivo ? contactoActivo.nombre : 'Selecciona un chat'}</h3>
          <div id="msgThread" class="chat-thread">
            ${mensajesChat.length === 0 ? '<p style="color:var(--text-muted); text-align:center; margin:auto;">No hay mensajes aún. ¡Escribe el primero!</p>' : mensajesChat.map(m => `
              <div class="msg-bubble ${m.de === state.user.id ? 'msg-mine' : 'msg-theirs'}">
                ${m.texto}
              </div>
            `).join('')}
          </div>
          <form id="formChat" class="chat-form">
            <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required autocomplete="off">
            <button type="submit" class="btn btn--accent">Enviar</button>
          </form>
        </div>
      </div>
    </section>
  `;

  // Mantener el scroll al fondo del chat
  const thread = document.getElementById('msgThread');
  if (thread) {
    thread.scrollTop = thread.scrollHeight;
  }

  // Manejador del formulario de chat para renderizado instantáneo
  const formChat = document.getElementById('formChat');
  if (formChat) {
    formChat.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const texto = input.value.trim();
      if (!texto || !state.activeChatUser) return;

      const nuevoMensaje = {
        id: Date.now(),
        de: state.user.id,
        para: state.activeChatUser,
        texto: texto,
        timestamp: Date.now()
      };

      state.messages.push(nuevoMensaje);
      saveState();

      // Actualizar la vista de mensajes de inmediato
      renderMensajes(app);
    });
  }
}

function renderPerfil(app) {
  if (!state.user) {
    navigate('login');
    return;
  }
  app.innerHTML = `
    <section class="profile-shell" style="max-width:500px; margin:0 auto;">
      <div class="auth-card" style="max-width:100%;">
        <h1 class="auth-title">Mi Cuenta</h1>
        <form id="formPerfil" class="auth-form">
          <label>Nombre completo <input type="text" name="nombre" value="${state.user.nombre}" required></label>
          <label>Correo electrónico <input type="email" name="email" value="${state.user.email}" required></label>
          ${state.user.tipo === 'emprendedor' ? `
            <label>Oficio <input type="text" name="oficio" value="${state.user.oficio || ''}"></label>
            <label>Tarifa por hora (Q) <input type="number" name="tarifa_hora" value="${state.user.tarifa_hora || 100}"></label>
          ` : ''}
          <p id="perfilMsg" style="color:#22c55e; font-size:0.85rem; display:none; margin-top:10px;">¡Cambios guardados con éxito!</p>
          <button class="btn btn--accent btn--full" type="submit" style="margin-top:15px;">Guardar Cambios</button>
        </form>
        <button class="btn btn--outline btn--full" style="margin-top:10px; color:#ef4444; border-color:#ef4444;" onclick="window.cerrarSesion()">Cerrar sesión</button>
      </div>
    </section>
  `;

  document.getElementById('formPerfil').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.user.nombre = data.get('nombre');
    state.user.email = data.get('email');
    if (state.user.tipo === 'emprendedor') {
      state.user.oficio = data.get('oficio');
      state.user.tarifa_hora = parseFloat(data.get('tarifa_hora')) || 100;
    }

    const idx = state.users.findIndex(u => u.id === state.user.id);
    if (idx !== -1) state.users[idx] = { ...state.user };
    saveState();

    const msg = document.getElementById('perfilMsg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  });
}

// Enlaces globales para eventos inline
window.routerNavigate = (route, params) => navigate(route, params);
window.iniciarChatCon = (userId) => {
  state.activeChatUser = userId;
  navigate('mensajes');
};
window.cambiarChat = (userId) => {
  state.activeChatUser = userId;
  renderMensajes(document.getElementById('app'));
};
window.cerrarSesion = () => {
  state.user = null;
  state.activeChatUser = null;
  localStorage.removeItem('samazil_user');
  navigate('landing');
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.getAttribute('data-route'), { tipo: btn.getAttribute('data-tipo') });
    });
  });

  const brandHome = document.getElementById('btnBrandHome');
  if (brandHome) {
    brandHome.addEventListener('click', () => navigate(state.user ? 'dashboard' : 'landing'));
  }

  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => window.cerrarSesion());
  }

  if (state.user) {
    navigate('dashboard');
  } else {
    navigate('landing');
  }
});
