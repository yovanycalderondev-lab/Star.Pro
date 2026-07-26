// app.js — Samazil · Plataforma de servicios y oficios en Guatemala
// Vanilla JS, sin frameworks. Persistencia real en Supabase
// (Auth + Postgres + Storage + Realtime).

(function () {
  'use strict';

  const CATS = window.CATEGORIAS || [];
  const getCat = (id) => window.getCategoria ? window.getCategoria(id) : CATS.find(c => c.id === id);

  // ---------------------------------------------------------------------
  // Cliente de Supabase
  // ---------------------------------------------------------------------
  if (!window.supabase || !window.SUPABASE_URL || window.SUPABASE_URL.indexOf('TU-PROYECTO') !== -1) {
    document.addEventListener('DOMContentLoaded', () => {
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = `
          <section style="max-width:640px;margin:60px auto;padding:24px;">
            <h1 style="font-family:var(--font-display, sans-serif);">Falta configurar Supabase</h1>
            <p>Editá <code>config.js</code> y poné la URL y la clave "anon" de tu proyecto de Supabase.
            Revisá <code>SETUP-SUPABASE.md</code> para el paso a paso.</p>
          </section>`;
      }
    });
    return;
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // ---------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------
  const state = {
    route: 'landing',
    routeParams: {},
    user: null,        // fila de "profiles" del usuario logueado
    users: [],          // todas las filas de "profiles" (catálogo)
    messages: [],       // hilo de mensajes del chat activo
    activeChatUser: null,
    msgChannel: null,
    booted: false
  };

  function fmtQ(n) {
    const num = Number(n) || 0;
    return 'Q' + num.toLocaleString('es-GT', { maximumFractionDigits: 0 });
  }

  function stars(rating) {
    if (!rating) return '<span style="opacity:.4;font-size:12px;">Sin calificaciones aún</span>';
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full) + ` <span style="opacity:.6;font-weight:400;">${rating.toFixed(1)}</span>`;
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function avatarHtml(user, size) {
    size = size || 44;
    if (user && user.avatar_url) {
      return `<img src="${user.avatar_url}" alt="${escapeHtml(user.nombre || '')}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:400;color:#fff;">${initials(user ? user.nombre : '')}</div>`;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------------------------------------------------------------------
  // Foto de perfil: se comprime en el navegador y se sube a Supabase Storage
  // ---------------------------------------------------------------------
  function fileToCompressed(file, maxSize) {
    maxSize = maxSize || 320;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(1, maxSize / Math.max(width, height));
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          canvas.toBlob((blob) => {
            resolve({ dataUrl, blob });
          }, 'image/jpeg', 0.85);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function wireAvatarPicker(inputId, previewImgId, previewEmptyId, removeBtnId) {
    const input = document.getElementById(inputId);
    const previewImg = document.getElementById(previewImgId);
    const previewEmpty = document.getElementById(previewEmptyId);
    const removeBtn = document.getElementById(removeBtnId);
    if (!input) return { get: () => null };
    let current = null; // null = sin cambios, 'REMOVE' = quitar, {blob,dataUrl} = nueva foto

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const result = await fileToCompressed(file);
        current = result;
        if (previewImg) { previewImg.src = result.dataUrl; previewImg.hidden = false; }
        if (previewEmpty) previewEmpty.hidden = true;
        if (removeBtn) removeBtn.hidden = false;
      } catch (err) {
        showToast(err.message || 'No se pudo procesar la imagen.');
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        current = 'REMOVE';
        input.value = '';
        if (previewImg) previewImg.hidden = true;
        if (previewEmpty) previewEmpty.hidden = false;
        removeBtn.hidden = true;
      });
    }

    return { get: () => current };
  }

  async function subirAvatar(userId, blob) {
    const path = `${userId}/avatar.jpg`;
    const { error } = await sb.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: 'image/jpeg'
    });
    if (error) throw error;
    const { data } = sb.storage.from('avatars').getPublicUrl(path);
    // Se agrega un parámetro para evitar caché vieja del navegador
    return data.publicUrl + '?t=' + Date.now();
  }

  async function borrarAvatar(userId) {
    await sb.storage.from('avatars').remove([`${userId}/avatar.jpg`]);
  }

  function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ---------------------------------------------------------------------
  // Datos desde Supabase
  // ---------------------------------------------------------------------
  async function cargarPerfiles() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); showToast('No se pudieron cargar los profesionales.'); return; }
    state.users = data || [];
  }

  async function cargarPerfilPropio(userId) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  }

  async function cargarHilo(otroId) {
    if (!state.user || !otroId) { state.messages = []; return; }
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .or(`and(de.eq.${state.user.id},para.eq.${otroId}),and(de.eq.${otroId},para.eq.${state.user.id})`)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); state.messages = []; return; }
    state.messages = data || [];
  }

  function suscribirMensajes() {
    if (!state.user) return;
    if (state.msgChannel) sb.removeChannel(state.msgChannel);
    state.msgChannel = sb
      .channel('messages-' + state.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new;
        const meInvolucrado = m.de === state.user.id || m.para === state.user.id;
        if (!meInvolucrado) return;
        if (state.route === 'mensajes' && (m.de === state.activeChatUser || m.para === state.activeChatUser)) {
          if (!state.messages.some(x => x.id === m.id)) state.messages.push(m);
          renderApp();
        }
      })
      .subscribe();
  }

  // ---------------------------------------------------------------------
  // Enrutador
  // ---------------------------------------------------------------------
  async function navigate(route, params) {
    state.route = route;
    state.routeParams = params || {};
    window.scrollTo(0, 0);
    await renderApp();
    updateTopbar();
  }
  window.routerNavigate = navigate;

  function updateTopbar() {
    const guestNav = document.getElementById('topbarGuest');
    const userNav = document.getElementById('topbarNav');
    const topbarInner = document.querySelector('.topbar-inner');
    let chip = document.getElementById('topbarUserProfile');

    if (state.user) {
      if (guestNav) guestNav.style.display = 'none';
      if (userNav) userNav.hidden = false;
      if (!chip && topbarInner) {
        chip = document.createElement('div');
        chip.id = 'topbarUserProfile';
        chip.className = 'topbar-user-profile';
        topbarInner.appendChild(chip);
      }
      if (chip) {
        chip.style.display = 'flex';
        chip.innerHTML = `
          <div class="topbar-user-avatar">${avatarHtml(state.user, 36)}</div>
          <div class="topbar-user-info">
            <span class="topbar-welcome-text">¡Bienvenido!</span>
            <span class="topbar-user-name">${escapeHtml(state.user.nombre)}</span>
          </div>`;
      }
    } else {
      if (guestNav) guestNav.style.display = 'flex';
      if (userNav) userNav.hidden = true;
      if (chip) chip.style.display = 'none';
    }
  }

  async function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;
    const p = state.routeParams || {};
    switch (state.route) {
      case 'landing': return renderLanding(app);
      case 'registro': return renderRegistro(app, p.tipo || 'consumidor');
      case 'login': return renderLogin(app);
      case 'dashboard': return renderDashboard(app);
      case 'catalogo': return renderCatalogo(app);
      case 'categoria': return renderCategoria(app, p.id);
      case 'mensajes': return renderMensajes(app);
      case 'perfil': return renderPerfil(app);
      default: return renderLanding(app);
    }
  }

  // ---------------------------------------------------------------------
  // Landing
  // ---------------------------------------------------------------------
  function renderLanding(app) {
    const destacados = CATS.slice(0, 6);
    app.innerHTML = `
      <section class="hero">
        <div class="hero-bg">
          <div class="stripe s1"></div><div class="stripe s2"></div><div class="stripe s3"></div>
          <div class="stripe s4"></div><div class="stripe s5"></div>
        </div>
        <div class="hero-content">
          <img src="logo.jpeg" alt="Samazil" class="hero-logo">
          <p class="eyebrow">Servicios y oficios en Guatemala</p>
          <h1 class="hero-title">Conecta con quien lo hace <span class="accent-underline">bien.</span></h1>
          <p class="hero-sub">En Samazil encontrás profesionales calificados por hora, en quetzales, con tarifas claras desde el primer momento. O publicá tu propio oficio y poné tu propio precio.</p>
          <div class="hero-actions">
            <button class="btn btn--accent btn--lg" data-nav="registro" data-tipo="consumidor">Busco un servicio</button>
            <button class="btn btn--outline-light btn--lg" data-nav="registro" data-tipo="emprendedor">Ofrezco mis servicios</button>
          </div>
          <div class="hero-stats">
            <div><span class="hero-stat-num">${CATS.length}</span><span class="hero-stat-label">oficios en el catálogo</span></div>
            <div><span class="hero-stat-num">${state.users.filter(u => u.tipo === 'emprendedor').length}</span><span class="hero-stat-label">profesionales activos</span></div>
            <div><span class="hero-stat-num">Q / hora</span><span class="hero-stat-label">tarifas 100% transparentes</span></div>
          </div>
        </div>
      </section>

      <section class="cat-strip">
        <h2 class="section-title">Oficios destacados</h2>
        <p class="section-sub">Cada categoría tiene una tarifa de referencia por hora en quetzales. Los profesionales fijan su propio precio final.</p>
        <div class="cat-grid-home">
          ${destacados.map(catTileHtml).join('')}
        </div>
        <div style="text-align:center;margin-top:26px;">
          <button class="btn btn--ghost-light" data-nav="catalogo">Ver los ${CATS.length} oficios completos</button>
        </div>
      </section>
    `;
    wireNavButtons(app);
  }

  function catTileHtml(c) {
    return `
      <button class="cat-tile" data-nav="categoria" data-id="${c.id}" style="--tile-top-color:${c.color}">
        <span class="cat-tile-icon">${c.icono}</span>
        <span class="cat-tile-name">${c.nombre}</span>
        <span class="cat-tile-rate" style="color:${c.color}">${fmtQ(c.refMin)}–${fmtQ(c.refMax)} / hora</span>
      </button>`;
  }

  function wireNavButtons(scope) {
    scope.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(btn.getAttribute('data-nav'), {
          tipo: btn.getAttribute('data-tipo'),
          id: btn.getAttribute('data-id')
        });
      });
    });
  }

  // ---------------------------------------------------------------------
  // Registro
  // ---------------------------------------------------------------------
  function renderRegistro(app, tipoInicial) {
    app.innerHTML = `
      <section class="auth-shell">
        <div class="auth-card">
          <div class="auth-brand-header">
            <img src="logo.jpeg" alt="Samazil" class="auth-logo">
            <h1 class="auth-title">Únete a Samazil</h1>
            <p class="auth-help">Creá tu cuenta para contratar profesionales o para ofrecer tu propio oficio con tu propia tarifa por hora.</p>
          </div>

          <div class="seg-toggle">
            <button type="button" class="seg-btn ${tipoInicial === 'consumidor' ? 'is-active' : ''}" id="btnTipoConsumidor">Busco un servicio</button>
            <button type="button" class="seg-btn ${tipoInicial === 'emprendedor' ? 'is-active' : ''}" id="btnTipoEmprendedor">Ofrezco mi servicio</button>
          </div>

          <form id="formRegistro">
            <div class="avatar-picker">
              <div class="avatar-preview">
                <img id="avatarPreviewImg" hidden>
                <span class="avatar-preview-emoji" id="avatarPreviewEmpty">👤</span>
              </div>
              <div class="avatar-picker-actions">
                <label class="avatar-file-label">Subir foto de perfil<input type="file" id="inputAvatarFile" accept="image/*"></label>
                <button type="button" class="avatar-remove" id="btnAvatarRemove" hidden>Quitar foto</button>
              </div>
            </div>

            <label class="field"><span>Nombre completo</span><input type="text" name="nombre" required placeholder="Ej. Juan Pérez"></label>
            <label class="field"><span>Correo electrónico</span><input type="email" name="email" required placeholder="correo@ejemplo.com"></label>
            <label class="field"><span>Ubicación (municipio / zona)</span><input type="text" name="ubicacion" placeholder="Ej. Guatemala, Zona 7" required></label>

            <div id="camposPrestador" style="display:${tipoInicial === 'emprendedor' ? 'block' : 'none'};">
              <label class="field"><span>Oficio / Categoría</span>
                <select name="categoria" id="selectCategoria">
                  ${CATS.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('')}
                </select>
              </label>
              <p class="field-hint" id="refRateHint"></p>
              <label class="field field-money"><span>Tu tarifa por hora (Q) — vos decidís cuánto cobrar</span>
                <input type="number" name="tarifa_hora" id="inputTarifa" min="1" step="1" value="${CATS[0] ? CATS[0].refMin : 50}" required>
              </label>
              <label class="field"><span>Breve descripción de tu experiencia</span><textarea name="bio" rows="3" placeholder="Ej. 8 años de experiencia en instalaciones residenciales..."></textarea></label>
            </div>

            <label class="field"><span>Contraseña</span><input type="password" name="password" required placeholder="••••••••" minlength="6"></label>
            <div id="regError" class="form-error" style="display:none;"></div>
            <button class="btn btn--accent btn--full btn--lg" type="submit" id="btnSubmitRegistro">Crear cuenta</button>
          </form>

          <p class="auth-switch">¿Ya tenés cuenta? <button class="link-inline" data-nav="login">Iniciar sesión</button></p>
        </div>
      </section>
    `;
    wireNavButtons(app);

    let currentTipo = tipoInicial;
    const btnC = document.getElementById('btnTipoConsumidor');
    const btnE = document.getElementById('btnTipoEmprendedor');
    const camposP = document.getElementById('camposPrestador');
    const selectCat = document.getElementById('selectCategoria');
    const refHint = document.getElementById('refRateHint');
    const inputTarifa = document.getElementById('inputTarifa');

    function setTipo(t) {
      currentTipo = t;
      camposP.style.display = t === 'emprendedor' ? 'block' : 'none';
      btnC.classList.toggle('is-active', t === 'consumidor');
      btnE.classList.toggle('is-active', t === 'emprendedor');
    }
    btnC.addEventListener('click', () => setTipo('consumidor'));
    btnE.addEventListener('click', () => setTipo('emprendedor'));

    function updateRefHint() {
      const c = getCat(selectCat.value);
      if (!c) return;
      refHint.textContent = `Referencia del oficio: ${fmtQ(c.refMin)}–${fmtQ(c.refMax)} por hora. ${c.nota}`;
      if (Number(inputTarifa.value) === 0 || !inputTarifa.dataset.touched) {
        inputTarifa.value = c.refMin;
      }
    }
    updateRefHint();
    selectCat.addEventListener('change', updateRefHint);
    inputTarifa.addEventListener('input', () => { inputTarifa.dataset.touched = '1'; });

    const avatarPicker = wireAvatarPicker('inputAvatarFile', 'avatarPreviewImg', 'avatarPreviewEmpty', 'btnAvatarRemove');

    document.getElementById('formRegistro').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const errBox = document.getElementById('regError');
      errBox.style.display = 'none';
      const btn = document.getElementById('btnSubmitRegistro');
      btn.disabled = true;
      btn.textContent = 'Creando cuenta...';

      const nombre = data.get('nombre');
      const email = (data.get('email') || '').trim().toLowerCase();
      const password = data.get('password');
      const ubicacion = data.get('ubicacion') || '';

      try {
        const { data: signUpData, error: signUpError } = await sb.auth.signUp({
          email,
          password,
          options: { data: { nombre, tipo: currentTipo } }
        });
        if (signUpError) throw signUpError;

        const extra = { ubicacion };
        if (currentTipo === 'emprendedor') {
          extra.categoria = data.get('categoria');
          extra.tarifa_hora = Math.max(1, parseFloat(data.get('tarifa_hora')) || 50);
          extra.bio = data.get('bio') || '';
        }

        const userId = signUpData.user ? signUpData.user.id : null;
        const yaHaySesion = !!signUpData.session;

        if (userId && yaHaySesion) {
          const foto = avatarPicker.get();
          if (foto && foto.blob) {
            try { extra.avatar_url = await subirAvatar(userId, foto.blob); } catch (err) { console.error(err); }
          }
          const { error: upErr } = await sb.from('profiles').update(extra).eq('id', userId);
          if (upErr) console.error(upErr);

          state.user = await cargarPerfilPropio(userId);
          await cargarPerfiles();
          suscribirMensajes();
          navigate('dashboard');
          showToast('¡Cuenta creada con éxito! Bienvenido a Samazil.');
        } else {
          showToast('¡Cuenta creada! Revisá tu correo para confirmar y luego iniciá sesión.');
          navigate('login');
        }
      } catch (err) {
        errBox.textContent = err.message || 'No se pudo crear la cuenta. Intentá de nuevo.';
        errBox.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Crear cuenta';
      }
    });
  }

  // ---------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------
  function renderLogin(app) {
    app.innerHTML = `
      <section class="auth-shell">
        <div class="auth-card auth-card--narrow">
          <div class="auth-brand-header">
            <img src="logo.jpeg" alt="Samazil" class="auth-logo">
            <h1 class="auth-title">Iniciar sesión</h1>
            <p class="auth-help">Ingresá tus credenciales para acceder a tu panel de Samazil.</p>
          </div>
          <form id="formLogin">
            <label class="field"><span>Correo electrónico</span><input type="email" name="email" required placeholder="correo@ejemplo.com"></label>
            <label class="field"><span>Contraseña</span><input type="password" name="password" required placeholder="••••••••"></label>
            <div id="loginError" class="form-error" style="display:none;"></div>
            <button class="btn btn--accent btn--full btn--lg" type="submit" id="btnSubmitLogin">Entrar</button>
          </form>
          <p class="auth-switch">¿Todavía no tenés cuenta? <button class="link-inline" data-nav="registro">Crear cuenta</button></p>
        </div>
      </section>
    `;
    wireNavButtons(app);
    document.getElementById('formLogin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const email = (data.get('email') || '').trim().toLowerCase();
      const password = data.get('password');
      const err = document.getElementById('loginError');
      err.style.display = 'none';
      const btn = document.getElementById('btnSubmitLogin');
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({ email, password });

      btn.disabled = false;
      btn.textContent = 'Entrar';

      if (signInError) {
        err.textContent = 'Correo o contraseña incorrectos.';
        err.style.display = 'block';
        return;
      }

      state.user = await cargarPerfilPropio(signInData.user.id);
      await cargarPerfiles();
      suscribirMensajes();
      navigate('dashboard');
    });
  }

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------
  function renderDashboard(app) {
    if (!state.user) return navigate('login');
    const esPrestador = state.user.tipo === 'emprendedor';
    app.innerHTML = `
      <section class="dash-head">
        <p class="eyebrow">Panel principal</p>
        <h1 class="dash-title">¡Hola, ${escapeHtml(state.user.nombre.split(' ')[0])}!</h1>
        <p class="dash-sub">${esPrestador ? `Estás ofreciendo ${getCat(state.user.categoria) ? getCat(state.user.categoria).nombre : 'tu servicio'} a ${fmtQ(state.user.tarifa_hora)} por hora.` : 'Encontrá profesionales listos para ayudarte, con tarifas claras por hora.'}</p>
        <div class="dash-actions">
          <div class="dash-card" data-nav="catalogo" style="cursor:pointer;">
            <span class="dash-card-num">01</span>
            <span class="dash-card-title">Explorar servicios</span>
            <span class="dash-card-text">Buscá profesionales por oficio y compará tarifas por hora.</span>
          </div>
          <div class="dash-card" data-nav="mensajes" style="cursor:pointer;">
            <span class="dash-card-num">02</span>
            <span class="dash-card-title">Mensajes</span>
            <span class="dash-card-text">Coordiná el servicio directamente dentro de la plataforma.</span>
          </div>
          <div class="dash-card" data-nav="perfil" style="cursor:pointer;">
            <span class="dash-card-num">03</span>
            <span class="dash-card-title">Mi cuenta</span>
            <span class="dash-card-text">${esPrestador ? 'Actualizá tu foto, tu tarifa por hora y tu descripción.' : 'Actualizá tus datos y tu foto de perfil.'}</span>
          </div>
        </div>
      </section>
    `;
    wireNavButtons(app);
  }

  // ---------------------------------------------------------------------
  // Catálogo (grid de 12 categorías)
  // ---------------------------------------------------------------------
  function renderCatalogo(app) {
    app.innerHTML = `
      <section style="padding-top:34px;">
        <p class="eyebrow">Catálogo oficial</p>
        <h1 class="section-title">Servicios disponibles</h1>
        <p class="section-sub">Tarifas de referencia por hora, en quetzales. Elegí un oficio para ver a los profesionales disponibles y su tarifa personal.</p>
        <div class="cat-grid-home">
          ${CATS.map(catTileHtml).join('')}
        </div>
      </section>
    `;
    wireNavButtons(app);
  }

  function renderCategoria(app, id) {
    const cat = getCat(id) || CATS[0];
    const pros = state.users.filter(u => u.tipo === 'emprendedor' && u.categoria === cat.id)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    app.innerHTML = `
      <section style="padding-top:30px;">
        <button class="link-inline link-inline--quiet" data-nav="catalogo" style="margin-bottom:18px;display:inline-block;">← Volver al catálogo</button>
        <div class="cat-detail-grid">
          <div class="ticket" style="--ticket-top-color:${cat.color}">
            <p class="ticket-title">${cat.icono} Tarifa de referencia</p>
            <h2 class="ticket-heading">${cat.nombre}</h2>
            <div class="ticket-rate" style="color:${cat.color}">${fmtQ(cat.refMin)}–${fmtQ(cat.refMax)} <small>/ hora</small></div>
            <p class="ticket-desc">${cat.descripcion}</p>
            <p class="ticket-note">${cat.nota} La tarifa final la define cada profesional en su perfil — la de arriba es solo una referencia del oficio.</p>
          </div>
          <div>
            <h3 class="pro-list-title">${pros.length} profesional${pros.length === 1 ? '' : 'es'} disponible${pros.length === 1 ? '' : 's'}</h3>
            ${pros.length === 0 ? '<p class="empty-note">Todavía no hay profesionales registrados en este oficio. ¡Sé el primero!</p>' : pros.map(proCardHtml).join('')}
            <button class="btn btn--ghost-light btn--full" style="margin-top:8px;" data-nav="registro" data-tipo="emprendedor">Ofrecer este oficio</button>
          </div>
        </div>
      </section>
    `;
    wireNavButtons(app);
    app.querySelectorAll('[data-contact]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.user) { navigate('login'); return; }
        state.activeChatUser = btn.getAttribute('data-contact');
        navigate('mensajes');
      });
    });
  }

  function proCardHtml(p) {
    const cat = getCat(p.categoria);
    return `
      <div class="pro-card">
        <div class="pro-avatar" style="background:${cat ? cat.color : 'var(--marigold)'}">${avatarHtml(p, 48)}</div>
        <div class="pro-info">
          <div class="pro-name">${escapeHtml(p.nombre)}</div>
          <div class="pro-meta">${escapeHtml(p.ubicacion || 'Guatemala')} · ${stars(p.rating)}</div>
        </div>
        <div style="text-align:right;">
          <div class="pro-rate">${fmtQ(p.tarifa_hora)}/hora</div>
          <button class="btn btn--accent btn--small" style="margin-top:6px;" data-contact="${p.id}">Contactar</button>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // Mensajes
  // ---------------------------------------------------------------------
  async function renderMensajes(app) {
    if (!state.user) return navigate('login');
    const contactos = state.users.filter(u => u.id !== state.user.id);
    if (!state.activeChatUser && contactos.length) state.activeChatUser = contactos[0].id;

    await cargarHilo(state.activeChatUser);

    const activo = state.users.find(u => u.id === state.activeChatUser);
    const hilo = state.messages;

    app.innerHTML = `
      <section class="msg-shell">
        <div class="msg-list">
          <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-data);color:var(--marigold);">Contactos</h3>
          ${contactos.length === 0 ? '<p class="msg-empty" style="font-size:13px;">Sin contactos todavía</p>' : contactos.map(c => `
            <button class="msg-thread-item ${c.id === state.activeChatUser ? 'is-active' : ''}" data-chat="${c.id}">
              <div class="msg-thread-avatar">${avatarHtml(c, 30)}</div>
              <div>
                <div style="font-weight:700;">${escapeHtml(c.nombre)}</div>
                <div style="font-size:11.5px;opacity:.6;">${c.categoria ? escapeHtml(getCat(c.categoria).nombre) : (c.tipo === 'consumidor' ? 'Cliente' : '')}</div>
              </div>
            </button>`).join('')}
        </div>
        <div class="msg-thread">
          <h3 style="margin:0 0 16px;font-size:17px;font-family:var(--font-display);font-weight:400;text-transform:uppercase;">${activo ? escapeHtml(activo.nombre) : 'Selecciona un chat'}</h3>
          <div id="msgBubbles" class="msg-bubbles">
            ${hilo.length === 0 ? '<div class="msg-empty">No hay mensajes aún. ¡Escribí el primero!</div>' : hilo.map(m => `<div class="bubble ${m.de === state.user.id ? 'bubble--me' : 'bubble--them'}">${escapeHtml(m.texto)}</div>`).join('')}
          </div>
          <form id="formChat" class="msg-form">
            <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required autocomplete="off">
            <button type="submit" class="btn btn--accent">Enviar</button>
          </form>
        </div>
      </section>
    `;

    app.querySelectorAll('[data-chat]').forEach(btn => {
      btn.addEventListener('click', () => { state.activeChatUser = btn.getAttribute('data-chat'); renderMensajes(app); });
    });

    const bubbles = document.getElementById('msgBubbles');
    if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;

    const formChat = document.getElementById('formChat');
    if (formChat) {
      formChat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const texto = input.value.trim();
        if (!texto || !state.activeChatUser) return;
        input.value = '';
        const { data, error } = await sb.from('messages')
          .insert({ de: state.user.id, para: state.activeChatUser, texto })
          .select()
          .single();
        if (error) { console.error(error); showToast('No se pudo enviar el mensaje.'); return; }
        state.messages.push(data);
        renderMensajes(app);
      });
    }
  }

  // ---------------------------------------------------------------------
  // Perfil
  // ---------------------------------------------------------------------
  function renderPerfil(app) {
    if (!state.user) return navigate('login');
    const u = state.user;
    const esPrestador = u.tipo === 'emprendedor';
    const cat = esPrestador ? getCat(u.categoria) : null;

    app.innerHTML = `
      <section class="profile-shell">
        <div class="auth-card" style="max-width:100%;">
          <div class="profile-head">
            <div class="profile-head-avatar">${avatarHtml(u, 68)}</div>
            <div>
              <h1 class="auth-title" style="margin:0;font-size:23px;text-align:left;">Mi cuenta</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#5b5346;">Actualizá tu foto, tus datos ${esPrestador ? 'y tu tarifa por hora' : ''}.</p>
            </div>
          </div>

          <form id="formPerfil">
            <div class="avatar-picker">
              <div class="avatar-preview">
                <img id="avatarPreviewImg" ${u.avatar_url ? '' : 'hidden'} src="${u.avatar_url || ''}">
                <span class="avatar-preview-emoji" id="avatarPreviewEmpty" ${u.avatar_url ? 'hidden' : ''}>👤</span>
              </div>
              <div class="avatar-picker-actions">
                <label class="avatar-file-label">Cambiar foto<input type="file" id="inputAvatarFile" accept="image/*"></label>
                <button type="button" class="avatar-remove" id="btnAvatarRemove" ${u.avatar_url ? '' : 'hidden'}>Quitar foto</button>
              </div>
            </div>

            <label class="field"><span>Nombre completo</span><input type="text" name="nombre" value="${escapeHtml(u.nombre)}" required></label>
            <label class="field"><span>Ubicación</span><input type="text" name="ubicacion" value="${escapeHtml(u.ubicacion || '')}"></label>

            ${esPrestador ? `
              <label class="field"><span>Oficio / Categoría</span>
                <select name="categoria" id="selectCategoriaPerfil">
                  ${CATS.map(c => `<option value="${c.id}" ${c.id === u.categoria ? 'selected' : ''}>${c.icono} ${c.nombre}</option>`).join('')}
                </select>
              </label>
              <p class="field-hint" id="refRateHintPerfil">Referencia: ${cat ? fmtQ(cat.refMin) + '–' + fmtQ(cat.refMax) : ''} por hora.</p>
              <label class="field field-money"><span>Tu tarifa por hora (Q)</span><input type="number" name="tarifa_hora" value="${u.tarifa_hora || 50}" min="1" step="1" required></label>
              <label class="field"><span>Descripción de tu experiencia</span><textarea name="bio" rows="3">${escapeHtml(u.bio || '')}</textarea></label>
            ` : ''}

            <div id="perfilMsg" class="admin-save-note" style="display:none;">¡Cambios guardados con éxito!</div>
            <button class="btn btn--accent btn--full btn--lg" type="submit" id="btnSubmitPerfil" style="margin-top:6px;">Guardar cambios</button>
          </form>
          <button class="btn btn--danger btn--full" style="margin-top:12px;" id="btnLogoutPerfil">Cerrar sesión</button>
        </div>
      </section>
    `;

    const avatarPicker = wireAvatarPicker('inputAvatarFile', 'avatarPreviewImg', 'avatarPreviewEmpty', 'btnAvatarRemove');

    if (esPrestador) {
      const sel = document.getElementById('selectCategoriaPerfil');
      const hint = document.getElementById('refRateHintPerfil');
      sel.addEventListener('change', () => {
        const c = getCat(sel.value);
        hint.textContent = `Referencia: ${fmtQ(c.refMin)}–${fmtQ(c.refMax)} por hora.`;
      });
    }

    document.getElementById('formPerfil').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      const btn = document.getElementById('btnSubmitPerfil');
      btn.disabled = true;
      btn.textContent = 'Guardando...';

      const cambios = {
        nombre: data.get('nombre'),
        ubicacion: data.get('ubicacion') || ''
      };
      if (esPrestador) {
        cambios.categoria = data.get('categoria');
        cambios.tarifa_hora = Math.max(1, parseFloat(data.get('tarifa_hora')) || u.tarifa_hora);
        cambios.bio = data.get('bio') || '';
      }

      const foto = avatarPicker.get();
      try {
        if (foto === 'REMOVE') {
          await borrarAvatar(u.id);
          cambios.avatar_url = null;
        } else if (foto && foto.blob) {
          cambios.avatar_url = await subirAvatar(u.id, foto.blob);
        }

        const { error } = await sb.from('profiles').update(cambios).eq('id', u.id);
        if (error) throw error;

        state.user = { ...u, ...cambios };
        const idx = state.users.findIndex(x => x.id === u.id);
        if (idx !== -1) state.users[idx] = state.user;
        updateTopbar();

        const msg = document.getElementById('perfilMsg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2600);
      } catch (err) {
        console.error(err);
        showToast('No se pudieron guardar los cambios.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
      }
    });

    document.getElementById('btnLogoutPerfil').addEventListener('click', cerrarSesion);
  }

  async function cerrarSesion() {
    await sb.auth.signOut();
    if (state.msgChannel) { sb.removeChannel(state.msgChannel); state.msgChannel = null; }
    state.user = null;
    state.activeChatUser = null;
    navigate('landing');
  }

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.getAttribute('data-route'), { tipo: btn.getAttribute('data-tipo') }));
    });
    const brandHome = document.getElementById('btnBrandHome');
    if (brandHome) brandHome.addEventListener('click', () => navigate(state.user ? 'dashboard' : 'landing'));
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

    const app = document.getElementById('app');
    if (app) app.innerHTML = '<p style="text-align:center;padding:80px 20px;opacity:.6;">Cargando Samazil...</p>';

    await cargarPerfiles();

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      state.user = await cargarPerfilPropio(session.user.id);
      suscribirMensajes();
    }

    navigate(state.user ? 'dashboard' : 'landing');
  });
})();
