// app.js - Samazil Plataforma de Servicios

import { CATEGORIAS } from './data.js';

// Estado global de la aplicación
const state = {
  route: 'landing',
  user: JSON.parse(localStorage.getItem('samazil_user')) || null,
  users: JSON.parse(localStorage.getItem('samazil_users')) || [
    { id: 'u1', nombre: 'Carlos Pérez', email: 'carlos@samazil.gt', tipo: 'emprendedor', oficio: 'Electricista', tarifa_hora: 150, avatar: '', rating: 4.9 },
    { id: 'u2', nombre: 'María Gómez', email: 'maria@samazil.gt', tipo: 'emprendedor', oficio: 'Plomería', tarifa_hora: 120, avatar: '', rating: 4.8 },
    { id: 'u3', nombre: 'Ana López', email: 'ana@samazil.gt', tipo: 'consumidor', avatar: '' }
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

// Obtener avatar: usa la foto guardada en localStorage o un SVG genérico de internet
function getUserAvatar(user) {
  if (!user) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  if (user.avatar && user.avatar.trim() !== '') {
    return user.avatar;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.nombre || 'usuario')}`;
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
  const topbarInner = document.querySelector('.topbar-inner');
  
  let userProfileContainer = document.getElementById('topbarUserProfile');

  if (state.user) {
    if (guestNav) guestNav.style.display = 'none';
    if (userNav) userNav.hidden = false;

    if (!userProfileContainer && topbarInner) {
      userProfileContainer = document.createElement('div');
      userProfileContainer.id = 'topbarUserProfile';
      userProfileContainer.className = 'topbar-user-profile';
      topbarInner.appendChild(userProfileContainer);
    }

    if (userProfileContainer) {
      userProfileContainer.style.display = 'flex';
      userProfileContainer.innerHTML = `
        <div class="topbar-user-avatar">
          <img src="${getUserAvatar(state.user)}" alt="${state.user.nombre}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'">
        </div>
        <div class="topbar-user-info">
          <span class="topbar-welcome-text">¡Bienvenido!</span>
          <span class="topbar-user-name">${state.user.nombre}</span>
        </div>
      `;
    }
  } else {
    if (guestNav) guestNav.style.display = 'flex';
    if (userNav) userNav.hidden = true;
    if (userProfileContainer) {
      userProfileContainer.style.display = 'none';
    }
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
  app.innerHTML = `
    <section class="hero">
      <div class="hero-bg">
        <div class="stripe s1"></div>
        <div class="stripe s2"></div>
        <div class="stripe s3"></div>
      </div>
      <div class="hero-content">
        <p class="eyebrow">Plataforma de servicios profesionales</p>
        <h1 class="hero-title">Conecta con quien lo hace <span class="accent-underline">bien.</span></h1>
        <p class="hero-sub">Encuentra expertos calificados en oficios o ofrece tus servicios en toda Guatemala con tarifas claras y transparentes.</p>
        <div class="hero-actions">
          <button class="btn btn--accent btn--lg" onclick="window.routerNavigate('registro', {tipo: 'consumidor'})">Busco un servicio</button>
          <button class="btn btn--outline-light btn--lg" onclick="window.routerNavigate('registro', {tipo: 'emprendedor'})">Ofrezco mis servicios</button>
        </div>
      </div>
    </section>
  `;
}

function renderRegistro(app, tipoInicial) {
  app.innerHTML = `
    <section class="auth-shell">
      <div class="auth-card auth-card--narrow">
        <h1 class="auth-title">Únete a Samazil</h1>
        <p class="auth-help">Crea tu cuenta para conectar con profesionales o clientes.</p>
        
        <div class="seg-toggle">
          <button class="seg-btn ${tipoInicial === 'consumidor' ? 'is-active' : ''}" id="btnTipoConsumidor" type="button">Cliente</button>
          <button class="seg-btn ${tipoInicial === 'emprendedor' ? 'is-active' : ''}" id="btnTipoEmprendedor" type="button">Prestador</button>
        </div>
        
        <form id="formRegistroAuth">
          <label class="field"><span>Nombre completo</span> <input type="text" name="nombre" required placeholder="Ej. Juan Pérez"></label>
          <label class="field"><span>Correo electrónico</span> <input type="email" name="email" required placeholder="correo@ejemplo.com"></label>

          <div id="camposPrestador" style="display: ${tipoInicial === 'emprendedor' ? 'block' : 'none'};">
            <label class="field"><span>Oficio / Especialidad</span> 
              <select name="oficio">
                ${CATEGORIAS.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Tarifa por hora (Q)</span> <input type="number" name="tarifa_hora" value="100" min="10"></label>
          </div>

          <label class="field"><span>Contraseña</span> <input type="password" name="password" required placeholder="••••••••"></label>
          <div id="regError" class="form-error" style="display:none;"></div>
          <button class="btn btn--accent btn--full btn--lg" type="submit">Crear cuenta</button>
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
    btnC.classList.add('is-active');
    btnE.classList.remove('is-active');
    camposP.style.display = 'none';
  });

  btnE.addEventListener('click', () => {
    currentTipo = 'emprendedor';
    btnE.classList.add('is-active');
    btnC.classList.remove('is-active');
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
      avatar: '' // Se asignará el SVG genérico por defecto
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
      <div class="auth-card auth-card--narrow">
        <h1 class="auth-title">Iniciar sesión</h1>
        <p class="auth-help">Ingresa tus credenciales para acceder a tu panel.</p>
        <form id="formLoginAuth">
          <label class="field"><span>Correo electrónico</span> <input type="email" name="email" required placeholder="correo@ejemplo.com"></label>
          <label class="field"><span>Contraseña</span> <input type="password" name="password" required placeholder="••••••••"></label>
          <div id="loginError" class="form-error" style="display:none;"></div>
          <button class="btn btn--accent btn--full btn--lg" type="submit">Entrar</button>
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
    <section class="dash-head">
      <h1 class="dash-title">¡Hola, ${state.user.nombre}!</h1>
      <p class="dash-sub">Panel de control principal en Samazil.</p>
      <div class="dash-actions">
        <div class="dash-card" onclick="window.routerNavigate('catalogo')" style="cursor:pointer;">
          <span class="dash-card-num">01</span>
          <span class="dash-card-title">Explorar Servicios</span>
          <span class="dash-card-text">Ver profesionales disponibles en la plataforma.</span>
        </div>
        <div class="dash-card" onclick="window.routerNavigate('mensajes')" style="cursor:pointer;">
          <span class="dash-card-num">02</span>
          <span class="dash-card-title">Mensajes</span>
          <span class="dash-card-text">Comunícate directamente con tus contactos.</span>
        </div>
        <div class="dash-card" onclick="window.routerNavigate('perfil')" style="cursor:pointer;">
          <span class="dash-card-num">03</span>
          <span class="dash-card-title">Mi Cuenta</span>
          <span class="dash-card-text">Actualiza tu información y foto de perfil.</span>
        </div>
      </div>
    </section>
  `;
}

function renderCatalogo(app) {
  const prestadores = state.users.filter(u => u.tipo === 'emprendedor');
  app.innerHTML = `
    <section class="catdetail">
      <h1 class="section-title">Servicios Disponibles</h1>
      <p class="section-sub">Contacta con prestadores calificados listos para ayudarte.</p>
      <div style="margin-top: 24px;">
        ${prestadores.length === 0 ? '<p class="empty-note">No hay prestadores registrados actualmente.</p>' : prestadores.map(p => `
          <div class="pro-card">
            <div class="pro-avatar" style="overflow:hidden; background:var(--paper-dim);">
              <img src="${getUserAvatar(p)}" alt="${p.nombre}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'">
            </div>
            <div class="pro-info">
              <div class="pro-name">${p.nombre}</div>
              <div class="pro-meta">${p.oficio} • Q${p.tarifa_hora} / hora</div>
            </div>
            <button class="btn btn--accent btn--small" onclick="window.iniciarChatCon('${p.id}')">Contactar</button>
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
      <div class="msg-list">
        <h3 style="margin:0 0 12px; font-size:14px; text-transform:uppercase; font-family:var(--font-data); color:var(--marigold);">Contactos</h3>
        ${contactos.length === 0 ? '<p class="msg-empty" style="font-size:13px;">Sin contactos</p>' : contactos.map(c => `
          <button class="msg-thread-item ${c.id === state.activeChatUser ? 'is-active' : ''}" onclick="window.cambiarChat('${c.id}')">
            <div style="font-weight:700;">${c.nombre}</div>
            <div style="font-size:11.5px; opacity:0.6;">${c.oficio || c.tipo}</div>
          </button>
        `).join('')}
      </div>
      <div class="msg-thread">
        <h3 style="margin:0 0 16px; font-size:16px; font-family:var(--font-display); text-transform:uppercase;">${contactoActivo ? contactoActivo.nombre : 'Selecciona un chat'}</h3>
        <div id="msgBubbles" class="msg-bubbles">
          ${mensajesChat.length === 0 ? '<div class="msg-empty">No hay mensajes aún. ¡Escribe el primero!</div>' : mensajesChat.map(m => `
            <div class="bubble ${m.de === state.user.id ? 'bubble--me' : 'bubble--them'}">
              ${m.texto}
            </div>
          `).join('')}
        </div>
        <form id="formChat" class="msg-form">
          <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required autocomplete="off">
          <button type="submit" class="btn btn--accent">Enviar</button>
        </form>
      </div>
    </section>
  `;

  const bubbles = document.getElementById('msgBubbles');
  if (bubbles) {
    bubbles.scrollTop = bubbles.scrollHeight;
  }

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
    <section class="profile-shell" style="margin:0 auto;">
      <div class="auth-card" style="max-width:100%;">
        <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
          <div style="width:64px; height:64px; border-radius:50%; background:var(--marigold); display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid var(--marigold-dark);">
            <img src="${getUserAvatar(state.user)}" alt="${state.user.nombre}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'">
          </div>
          <div>
            <h1 class="auth-title" style="margin:0; font-size:22px;">Mi Cuenta</h1>
            <p style="margin:4px 0 0; font-size:13px; color:#555;">Actualiza tus datos y tu foto de perfil</p>
          </div>
        </div>

        <form id="formPerfil">
          <label class="field"><span>Nombre completo</span> <input type="text" name="nombre" value="${state.user.nombre}" required></label>
          <label class="field"><span>Correo electrónico</span> <input type="email" name="email" value="${state.user.email}" required></label>
          <label class="field"><span>Enlace de imagen o Avatar (URL externa o Storage)</span> <input type="text" name="avatar" value="${state.user.avatar || ''}" placeholder="https://ejemplo.com/tu-foto.jpg"></label>
          
          ${state.user.tipo === 'emprendedor' ? `
            <label class="field"><span>Oficio</span> <input type="text" name="oficio" value="${state.user.oficio || ''}"></label>
            <label class="field"><span>Tarifa por hora (Q)</span> <input type="number" name="tarifa_hora" value="${state.user.tarifa_hora || 100}"></label>
          ` : ''}
          
          <div id="perfilMsg" class="admin-save-note" style="display:none; color:#2c7a4b;">¡Cambios guardados con éxito!</div>
          <button class="btn btn--accent btn--full btn--lg" type="submit" style="margin-top:15px;">Guardar Cambios</button>
        </form>
        <button class="btn btn--danger btn--full" style="margin-top:12px;" onclick="window.cerrarSesion()">Cerrar sesión</button>
      </div>
    </section>
  `;

  document.getElementById('formPerfil').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    state.user.nombre = data.get('nombre');
    state.user.email = data.get('email');
    state.user.avatar = data.get('avatar');
    
    if (state.user.tipo === 'emprendedor') {
      state.user.oficio = data.get('oficio');
      state.user.tarifa_hora = parseFloat(data.get('tarifa_hora')) || 100;
    }

    const idx = state.users.findIndex(u => u.id === state.user.id);
    if (idx !== -1) state.users[idx] = { ...state.user };
    
    saveState();
    updateTopbar();

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

  if (state.user) {
    navigate('dashboard');
  } else {
    navigate('landing');
  }
});
