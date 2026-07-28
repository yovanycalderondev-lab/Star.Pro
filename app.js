// app.js — Samazil · Plataforma de servicios y oficios en Guatemala
// Backend real: Supabase (Auth + Postgres + Storage). Ver config.js y supabase/schema.sql.

(function () {
  'use strict';

  const CATS = window.CATEGORIAS || [];
  const getCat = (id) => window.getCategoria ? window.getCategoria(id) : CATS.find(c => c.id === id);

  const CFG = window.SAMAZIL_CONFIG || {};
  const CONFIGURADO = CFG.SUPABASE_URL && !CFG.SUPABASE_URL.includes('TU-PROYECTO') &&
                       CFG.SUPABASE_ANON_KEY && !CFG.SUPABASE_ANON_KEY.includes('TU-CLAVE');

  const supabase = CONFIGURADO && window.supabase
    ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY)
    : null;

  // ---------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------
  const state = {
    route: 'landing',
    routeParams: {},
    session: null,
    profile: null,       // perfil de la persona logueada (tabla profiles)
    activeChatUser: null
  };

  function fmtQ(n) {
    const num = Number(n) || 0;
    return 'Q' + num.toLocaleString('es-GT', { maximumFractionDigits: 0 });
  }

  function stars(avg, count) {
    if (!avg) return '<span style="opacity:.5;font-size:12px;">Sin calificaciones aún</span>';
    const full = Math.round(avg);
    return `★`.repeat(full) + `☆`.repeat(5 - full) + ` <span style="opacity:.6;font-weight:400;">${Number(avg).toFixed(1)}${count ? ` (${count})` : ''}</span>`;
  }

  function initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function avatarHtml(profile) {
    if (profile && profile.avatar_url) {
      return `<img src="${profile.avatar_url}" alt="${escapeHtml(profile.nombre || '')}" style="width:100%;height:100%;object-fit:cover;">`;
    }
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:400;color:#fff;">${initials(profile ? profile.nombre : '')}</div>`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ---------------------------------------------------------------------
  // Fotos de perfil → Supabase Storage (bucket "avatars")
  // ---------------------------------------------------------------------
  function fileToCompressedBlob(file, maxSize) {
    maxSize = maxSize || 480;
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
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.')), 'image/jpeg', 0.86);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function subirAvatar(userId, file) {
    const blob = await fileToCompressedBlob(file);
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  function wireAvatarPicker(inputId, previewImgId, previewEmptyId, removeBtnId) {
    const input = document.getElementById(inputId);
    const previewImg = document.getElementById(previewImgId);
    const previewEmpty = document.getElementById(previewEmptyId);
    const removeBtn = document.getElementById(removeBtnId);
    let pendingFile = null;
    let removed = false;

    if (input) {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        pendingFile = file;
        removed = false;
        const url = URL.createObjectURL(file);
        if (previewImg) { previewImg.src = url; previewImg.hidden = false; }
        if (previewEmpty) previewEmpty.hidden = true;
        if (removeBtn) removeBtn.hidden = false;
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        pendingFile = null;
        removed = true;
        input.value = '';
        if (previewImg) previewImg.hidden = true;
        if (previewEmpty) previewEmpty.hidden = false;
        removeBtn.hidden = true;
      });
    }
    return { getFile: () => pendingFile, wasRemoved: () => removed };
  }

  // ---------------------------------------------------------------------
  // DPI — validación básica de formato (13 dígitos)
  // ---------------------------------------------------------------------
  function dpiValido(valor) {
    return /^\d{13}$/.test((valor || '').replace(/\s+/g, ''));
  }

  // ---------------------------------------------------------------------
  // Calificaciones (1 a 5 estrellas)
  // ---------------------------------------------------------------------
  async function obtenerRatingsPara(ids) {
    if (!ids || ids.length === 0) return {};
    const { data, error } = await supabase.from('profile_ratings').select('*').in('profile_id', ids);
    if (error) { console.error(error); return {}; }
    const map = {};
    (data || []).forEach(r => { map[r.profile_id] = r; });
    return map;
  }

  function abrirModalCalificar(profesionalId, profesionalNombre) {
    if (!state.profile) { navigate('login'); return; }
    if (state.profile.id === profesionalId) { showToast('No podés calificarte a vos mismo.'); return; }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" type="button" aria-label="Cerrar">✕</button>
        <p class="modal-title">Calificar a ${escapeHtml(profesionalNombre)}</p>
        <p class="modal-sub">Tu opinión ayuda a otros usuarios de Samazil a elegir con confianza.</p>
        <div class="star-picker" id="starPicker">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}">★</button>`).join('')}
        </div>
        <textarea id="comentarioRating" rows="3" placeholder="Comentario opcional sobre el servicio..."></textarea>
        <button class="btn btn--accent btn--full" id="btnEnviarRating">Enviar calificación</button>
      </div>`;
    document.body.appendChild(overlay);

    let seleccion = 0;
    const botones = overlay.querySelectorAll('[data-star]');
    function pintar(n) {
      botones.forEach(b => b.classList.toggle('is-filled', Number(b.getAttribute('data-star')) <= n));
    }
    botones.forEach(b => {
      b.addEventListener('click', () => { seleccion = Number(b.getAttribute('data-star')); pintar(seleccion); });
      b.addEventListener('mouseenter', () => pintar(Number(b.getAttribute('data-star'))));
    });
    overlay.querySelector('.star-picker').addEventListener('mouseleave', () => pintar(seleccion));

    function cerrar() { overlay.remove(); }
    overlay.querySelector('.modal-close').addEventListener('click', cerrar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });

    overlay.querySelector('#btnEnviarRating').addEventListener('click', async () => {
      if (seleccion < 1) { showToast('Elegí de 1 a 5 estrellas.'); return; }
      const comentario = overlay.querySelector('#comentarioRating').value.trim();
      const { error } = await supabase.from('ratings').upsert(
        { de: state.profile.id, para: profesionalId, estrellas: seleccion, comentario },
        { onConflict: 'de,para' }
      );
      if (error) { console.error(error); showToast('No se pudo guardar tu calificación.'); return; }
      showToast('¡Gracias por tu calificación!');
      cerrar();
      renderApp();
    });
  }
  window.abrirModalCalificar = abrirModalCalificar;

  // ---------------------------------------------------------------------
  // Enrutador
  // ---------------------------------------------------------------------
  function navigate(route, params) {
    state.route = route;
    state.routeParams = params || {};
    window.scrollTo(0, 0);
    renderApp();
  }
  window.routerNavigate = navigate;

  function updateTopbar() {
    const guestNav = document.getElementById('topbarGuest');
    const userNav = document.getElementById('topbarNav');
    const topbarInner = document.querySelector('.topbar-inner');
    let chip = document.getElementById('topbarUserProfile');
    const footerYear = document.getElementById('footerYear');
    if (footerYear && !footerYear.textContent) footerYear.textContent = new Date().getFullYear();

    if (state.profile) {
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
          <div class="topbar-user-avatar">${avatarHtml(state.profile)}</div>
          <div class="topbar-user-info">
            <span class="topbar-welcome-text">¡Bienvenido!</span>
            <span class="topbar-user-name">${escapeHtml(state.profile.nombre)}</span>
          </div>`;
      }
    } else {
      if (guestNav) guestNav.style.display = 'flex';
      if (userNav) userNav.hidden = true;
      if (chip) chip.style.display = 'none';
    }
  }

  function renderLoading(app, msg) {
    app.innerHTML = `<div style="padding:90px 0;text-align:center;color:rgba(251,246,236,0.6);font-family:var(--font-data);">${msg || 'Cargando…'}</div>`;
  }

  function renderConfigWarning(app) {
    app.innerHTML = `
      <section style="max-width:640px;margin:60px auto;">
        <div class="ticket" style="--ticket-top-color:var(--chicken-red);">
          <p class="ticket-title">⚠ Falta configurar Supabase</p>
          <h2 class="ticket-heading">Conectá tu backend</h2>
          <p class="ticket-desc">Abrí <code>config.js</code> y pegá la URL y la clave <strong>anon public</strong> de tu proyecto de Supabase (Project Settings → API). También corré <code>supabase/schema.sql</code> en el SQL Editor de Supabase antes de usar la app. Revisá el <code>README.md</code> para el paso a paso.</p>
        </div>
      </section>`;
  }

  async function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;
    updateTopbar();

    if (!CONFIGURADO) return renderConfigWarning(app);

    const p = state.routeParams || {};
    try {
      switch (state.route) {
        case 'landing': return await renderLanding(app);
        case 'registro': return renderRegistro(app, p.tipo || 'consumidor');
        case 'login': return renderLogin(app);
        case 'dashboard': return renderDashboard(app);
        case 'catalogo': return await renderCatalogo(app);
        case 'categoria': return await renderCategoria(app, p.id);
        case 'mensajes': return await renderMensajes(app);
        case 'perfil': return renderPerfil(app);
        case 'terminos': return renderTerminos(app);
        default: return await renderLanding(app);
      }
    } catch (err) {
      console.error(err);
      showToast('Ocurrió un error al conectar con el servidor. Intenta de nuevo.');
    }
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
  // Landing
  // ---------------------------------------------------------------------
  async function renderLanding(app) {
    renderLoading(app, 'Cargando Samazil…');
    const destacados = CATS.slice(0, 6);
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tipo', 'emprendedor');

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
            <div><span class="hero-stat-num">${count || 0}</span><span class="hero-stat-label">profesionales activos</span></div>
            <div><span class="hero-stat-num">Q / hora</span><span class="hero-stat-label">tarifas 100% transparentes</span></div>
          </div>
        </div>
      </section>

      <section class="cat-strip">
        <h2 class="section-title">Oficios destacados</h2>
        <p class="section-sub">Cada categoría tiene una tarifa de referencia por hora en quetzales. Los profesionales fijan su propio precio final.</p>
        <div class="cat-grid-home">${destacados.map(catTileHtml).join('')}</div>
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
              <label class="field"><span>Número de DPI</span><input type="text" name="dpi" id="inputDpi" placeholder="13 dígitos, sin espacios" inputmode="numeric" maxlength="13"></label>
              <p class="field-hint" id="dpiHint">Requerido para publicar servicios: usamos tu DPI para confirmar que sos mayor de edad.</p>
              <div class="terms-check">
                <input type="checkbox" id="checkMayorEdad">
                <label for="checkMayorEdad">Confirmo que soy mayor de 18 años y que el número de DPI ingresado es válido y me pertenece.</label>
              </div>

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

            <div class="terms-check">
              <input type="checkbox" id="checkTerminos" required>
              <label for="checkTerminos">He leído y acepto los <button type="button" class="link-inline" id="linkTerminosRegistro">Términos y condiciones</button>, incluyendo que Samazil es un intermediario y no se hace responsable por estafas o incumplimientos entre usuarios.</label>
            </div>

            <div id="regError" class="form-error" style="display:none;"></div>
            <button class="btn btn--accent btn--full btn--lg" type="submit">Crear cuenta</button>
          </form>

          <p class="auth-switch">¿Ya tenés cuenta? <button class="link-inline" data-nav="login">Iniciar sesión</button></p>
        </div>
      </section>
    `;
    wireNavButtons(app);

    document.getElementById('linkTerminosRegistro').addEventListener('click', () => navigate('terminos'));

    let currentTipo = tipoInicial;
    const btnC = document.getElementById('btnTipoConsumidor');
    const btnE = document.getElementById('btnTipoEmprendedor');
    const camposP = document.getElementById('camposPrestador');
    const selectCat = document.getElementById('selectCategoria');
    const refHint = document.getElementById('refRateHint');
    const inputTarifa = document.getElementById('inputTarifa');

    function updateRefHint() {
      const c = getCat(selectCat.value);
      if (!c) return;
      refHint.textContent = `Referencia del oficio: ${fmtQ(c.refMin)}–${fmtQ(c.refMax)} por hora. ${c.nota}`;
      if (!inputTarifa.dataset.touched) inputTarifa.value = c.refMin;
    }
    updateRefHint();
    selectCat.addEventListener('change', updateRefHint);
    inputTarifa.addEventListener('input', () => { inputTarifa.dataset.touched = '1'; });

    btnC.addEventListener('click', () => {
      currentTipo = 'consumidor';
      btnC.classList.add('is-active'); btnE.classList.remove('is-active');
      camposP.style.display = 'none';
    });
    btnE.addEventListener('click', () => {
      currentTipo = 'emprendedor';
      btnE.classList.add('is-active'); btnC.classList.remove('is-active');
      camposP.style.display = 'block';
    });

    const avatarPicker = wireAvatarPicker('inputAvatarFile', 'avatarPreviewImg', 'avatarPreviewEmpty', 'btnAvatarRemove');

    document.getElementById('formRegistro').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const errBox = document.getElementById('regError');
      errBox.style.display = 'none';

      const data = new FormData(e.target);
      const email = (data.get('email') || '').trim().toLowerCase();
      const password = data.get('password');

      if (!document.getElementById('checkTerminos').checked) {
        errBox.textContent = 'Debés aceptar los Términos y condiciones para continuar.';
        errBox.style.display = 'block';
        return;
      }

      let dpi = '';
      if (currentTipo === 'emprendedor') {
        dpi = (data.get('dpi') || '').replace(/\s+/g, '');
        if (!dpiValido(dpi)) {
          errBox.textContent = 'Ingresá un número de DPI válido (13 dígitos) para poder ofrecer servicios.';
          errBox.style.display = 'block';
          return;
        }
        if (!document.getElementById('checkMayorEdad').checked) {
          errBox.textContent = 'Debés confirmar que sos mayor de edad y que el DPI te pertenece.';
          errBox.style.display = 'block';
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando cuenta…';

      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (!signUpData.session) {
          showToast('Cuenta creada. Revisá tu correo para confirmarla y luego iniciá sesión.');
          navigate('login');
          return;
        }

        const userId = signUpData.user.id;
        let avatarUrl = null;
        const file = avatarPicker.getFile();
        if (file) {
          try { avatarUrl = await subirAvatar(userId, file); }
          catch (upErr) { console.error(upErr); showToast('La cuenta se creó pero la foto no se pudo subir. Podés agregarla luego en Mi cuenta.'); }
        }

        const perfilNuevo = {
          id: userId,
          nombre: data.get('nombre'),
          email,
          ubicacion: data.get('ubicacion') || '',
          tipo: currentTipo,
          avatar_url: avatarUrl,
          terminos_aceptados: true,
          terminos_aceptados_at: new Date().toISOString()
        };
        if (currentTipo === 'emprendedor') {
          perfilNuevo.categoria = data.get('categoria');
          perfilNuevo.tarifa_hora = Math.max(1, parseFloat(data.get('tarifa_hora')) || 50);
          perfilNuevo.bio = data.get('bio') || '';
          perfilNuevo.dpi = dpi;
        }

        const { error: insertError } = await supabase.from('profiles').insert(perfilNuevo);
        if (insertError) throw insertError;

        state.session = signUpData.session;
        state.profile = perfilNuevo;
        navigate('dashboard');
        showToast('¡Cuenta creada con éxito! Bienvenido a Samazil.');
      } catch (err) {
        console.error(err);
        errBox.textContent = traducirErrorSupabase(err);
        errBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Crear cuenta';
      }
    });
  }

  function traducirErrorSupabase(err) {
    const msg = (err && err.message) || 'Ocurrió un error inesperado.';
    if (/already registered|already exists/i.test(msg)) return 'Ese correo electrónico ya está registrado.';
    if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
    if (/password/i.test(msg) && /short|least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
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
            <button class="btn btn--accent btn--full btn--lg" type="submit">Entrar</button>
          </form>
          <p class="auth-switch">¿Todavía no tenés cuenta? <button class="link-inline" data-nav="registro">Crear cuenta</button></p>
        </div>
      </section>
    `;
    wireNavButtons(app);
    document.getElementById('formLogin').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const errBox = document.getElementById('loginError');
      errBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando…';

      const data = new FormData(e.target);
      const email = (data.get('email') || '').trim().toLowerCase();
      const password = data.get('password');

      try {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        state.session = signInData.session;
        await cargarPerfilActual();
        navigate('dashboard');
      } catch (err) {
        errBox.textContent = traducirErrorSupabase(err);
        errBox.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
      }
    });
  }

  async function cargarPerfilActual() {
    if (!state.session) { state.profile = null; return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', state.session.user.id).single();
    if (error) { console.error(error); state.profile = null; return; }
    state.profile = data;
  }

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------
  function renderDashboard(app) {
    if (!state.profile) return navigate('login');
    const u = state.profile;
    const esPrestador = u.tipo === 'emprendedor';
    app.innerHTML = `
      <section class="dash-head">
        <p class="eyebrow">Panel principal</p>
        <h1 class="dash-title">¡Hola, ${escapeHtml(u.nombre.split(' ')[0])}!</h1>
        <p class="dash-sub">${esPrestador ? `Estás ofreciendo ${getCat(u.categoria) ? getCat(u.categoria).nombre : 'tu servicio'} a ${fmtQ(u.tarifa_hora)} por hora.` : 'Encontrá profesionales listos para ayudarte, con tarifas claras por hora.'}</p>
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
  // Catálogo
  // ---------------------------------------------------------------------
  async function renderCatalogo(app) {
    app.innerHTML = `
      <section style="padding-top:34px;">
        <p class="eyebrow">Catálogo oficial</p>
        <h1 class="section-title">Servicios disponibles</h1>
        <p class="section-sub">Tarifas de referencia por hora, en quetzales. Elegí un oficio para ver a los profesionales disponibles, su tarifa personal y su calificación.</p>
        <div class="cat-grid-home">${CATS.map(catTileHtml).join('')}</div>
      </section>
    `;
    wireNavButtons(app);
  }

  async function renderCategoria(app, id) {
    renderLoading(app, 'Buscando profesionales…');
    const cat = getCat(id) || CATS[0];
    const { data: pros, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('tipo', 'emprendedor')
      .eq('categoria', cat.id);

    if (error) console.error(error);
    const listaPros = pros || [];
    const ratingsMap = await obtenerRatingsPara(listaPros.map(p => p.id));
    listaPros.sort((a, b) => (ratingsMap[b.id]?.rating_avg || 0) - (ratingsMap[a.id]?.rating_avg || 0));

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
            <h3 class="pro-list-title">${listaPros.length} profesional${listaPros.length === 1 ? '' : 'es'} disponible${listaPros.length === 1 ? '' : 's'}</h3>
            ${listaPros.length === 0 ? '<p class="empty-note">Todavía no hay profesionales registrados en este oficio. ¡Sé el primero!</p>' : listaPros.map(p => proCardHtml(p, ratingsMap[p.id])).join('')}
            <button class="btn btn--ghost-light btn--full" style="margin-top:8px;" data-nav="registro" data-tipo="emprendedor">Ofrecer este oficio</button>
          </div>
        </div>
      </section>
    `;
    wireNavButtons(app);
    app.querySelectorAll('[data-contact]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.profile) { navigate('login'); return; }
        state.activeChatUser = btn.getAttribute('data-contact');
        navigate('mensajes');
      });
    });
    app.querySelectorAll('[data-rate]').forEach(btn => {
      btn.addEventListener('click', () => abrirModalCalificar(btn.getAttribute('data-rate'), btn.getAttribute('data-rate-name')));
    });
  }

  function proCardHtml(p, ratingInfo) {
    const cat = getCat(p.categoria);
    const puedeCalificar = state.profile && state.profile.id !== p.id;
    return `
      <div class="pro-card">
        <div class="pro-avatar" style="background:${cat ? cat.color : 'var(--marigold)'}">${avatarHtml(p)}</div>
        <div class="pro-info">
          <div class="pro-name">${escapeHtml(p.nombre)}</div>
          <div class="pro-meta">${escapeHtml(p.ubicacion || 'Guatemala')}</div>
          <div class="pro-rating-line">
            ${stars(ratingInfo && ratingInfo.rating_avg, ratingInfo && ratingInfo.rating_count)}
            ${puedeCalificar ? `<button class="btn-rate-link" data-rate="${p.id}" data-rate-name="${escapeHtml(p.nombre)}">Calificar</button>` : ''}
          </div>
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
    if (!state.profile) return navigate('login');
    renderLoading(app, 'Cargando mensajes…');

    const myId = state.profile.id;

    const { data: msgsPropios } = await supabase.from('messages').select('de, para').or(`de.eq.${myId},para.eq.${myId}`);
    const idsContacto = new Set();
    (msgsPropios || []).forEach(m => { idsContacto.add(m.de === myId ? m.para : m.de); });
    idsContacto.delete(myId);

    if (!state.activeChatUser && idsContacto.size > 0) state.activeChatUser = [...idsContacto][0];
    if (state.activeChatUser) idsContacto.add(state.activeChatUser);

    let contactos = [];
    if (idsContacto.size > 0) {
      const { data } = await supabase.from('profiles').select('*').in('id', [...idsContacto]);
      contactos = data || [];
    }

    const activo = contactos.find(c => c.id === state.activeChatUser);
    let hilo = [];
    if (state.activeChatUser) {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(de.eq.${myId},para.eq.${state.activeChatUser}),and(de.eq.${state.activeChatUser},para.eq.${myId})`)
        .order('created_at', { ascending: true });
      hilo = data || [];
    }

    const puedeCalificarActivo = activo && activo.tipo === 'emprendedor' && activo.id !== myId;

    app.innerHTML = `
      <section class="msg-shell">
        <div class="msg-list">
          <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-data);color:var(--marigold);">Contactos</h3>
          ${contactos.length === 0 ? '<p class="msg-empty" style="font-size:13px;">Aún no tenés conversaciones. Contactá a un profesional desde el catálogo.</p>' : contactos.map(c => `
            <button class="msg-thread-item ${c.id === state.activeChatUser ? 'is-active' : ''}" data-chat="${c.id}">
              <div class="msg-thread-avatar">${avatarHtml(c)}</div>
              <div>
                <div style="font-weight:700;">${escapeHtml(c.nombre)}</div>
                <div style="font-size:11.5px;opacity:.6;">${c.categoria && getCat(c.categoria) ? escapeHtml(getCat(c.categoria).nombre) : (c.tipo === 'consumidor' ? 'Cliente' : '')}</div>
              </div>
            </button>`).join('')}
        </div>
        <div class="msg-thread">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;font-size:17px;font-family:var(--font-display);font-weight:400;text-transform:uppercase;">${activo ? escapeHtml(activo.nombre) : 'Selecciona un chat'}</h3>
            ${puedeCalificarActivo ? `<button class="btn btn--ghost-light btn--small" id="btnCalificarActivo">★ Calificar</button>` : ''}
          </div>
          <div id="msgBubbles" class="msg-bubbles">
            ${hilo.length === 0 ? '<div class="msg-empty">No hay mensajes aún. ¡Escribí el primero!</div>' : hilo.map(m => `<div class="bubble ${m.de === myId ? 'bubble--me' : 'bubble--them'}">${escapeHtml(m.texto)}</div>`).join('')}
          </div>
          <form id="formChat" class="msg-form">
            <input type="text" id="chatInput" placeholder="Escribe un mensaje..." required autocomplete="off" ${activo ? '' : 'disabled'}>
            <button type="submit" class="btn btn--accent" ${activo ? '' : 'disabled'}>Enviar</button>
          </form>
        </div>
      </section>
    `;

    app.querySelectorAll('[data-chat]').forEach(btn => {
      btn.addEventListener('click', () => { state.activeChatUser = btn.getAttribute('data-chat'); renderMensajes(app); });
    });

    const btnCalificarActivo = document.getElementById('btnCalificarActivo');
    if (btnCalificarActivo) btnCalificarActivo.addEventListener('click', () => abrirModalCalificar(activo.id, activo.nombre));

    const bubbles = document.getElementById('msgBubbles');
    if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;

    const formChat = document.getElementById('formChat');
    if (formChat) {
      formChat.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInput');
        const texto = input.value.trim();
        if (!texto || !state.activeChatUser) return;
        const { error } = await supabase.from('messages').insert({ de: myId, para: state.activeChatUser, texto });
        if (error) { console.error(error); showToast('No se pudo enviar el mensaje.'); return; }
        renderMensajes(app);
      });
    }
  }

  // ---------------------------------------------------------------------
  // Perfil
  // ---------------------------------------------------------------------
  function renderPerfil(app) {
    if (!state.profile) return navigate('login');
    const u = state.profile;
    const esPrestador = u.tipo === 'emprendedor';
    const cat = esPrestador ? getCat(u.categoria) : null;

    app.innerHTML = `
      <section class="profile-shell">
        <div class="auth-card" style="max-width:100%;">
          <div class="profile-head">
            <div class="profile-head-avatar">${avatarHtml(u)}</div>
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
            <label class="field"><span>Correo electrónico</span><input type="email" value="${escapeHtml(u.email)}" disabled title="El correo se administra en el proveedor de autenticación"></label>
            <label class="field"><span>Ubicación</span><input type="text" name="ubicacion" value="${escapeHtml(u.ubicacion || '')}"></label>

            ${esPrestador ? `
              <label class="field"><span>Número de DPI</span><input type="text" name="dpi" value="${escapeHtml(u.dpi || '')}" inputmode="numeric" maxlength="13"></label>
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
            <button class="btn btn--accent btn--full btn--lg" type="submit" style="margin-top:6px;">Guardar cambios</button>
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
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const data = new FormData(e.target);

      if (esPrestador) {
        const dpi = (data.get('dpi') || '').replace(/\s+/g, '');
        if (!dpiValido(dpi)) { showToast('Ingresá un DPI válido de 13 dígitos.'); return; }
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando…';

      try {
        const cambios = {
          nombre: data.get('nombre'),
          ubicacion: data.get('ubicacion') || ''
        };

        if (avatarPicker.wasRemoved()) cambios.avatar_url = null;
        const file = avatarPicker.getFile();
        if (file) cambios.avatar_url = await subirAvatar(u.id, file);

        if (esPrestador) {
          cambios.categoria = data.get('categoria');
          cambios.tarifa_hora = Math.max(1, parseFloat(data.get('tarifa_hora')) || u.tarifa_hora);
          cambios.bio = data.get('bio') || '';
          cambios.dpi = (data.get('dpi') || '').replace(/\s+/g, '');
        }

        const { error } = await supabase.from('profiles').update(cambios).eq('id', u.id);
        if (error) throw error;

        state.profile = { ...u, ...cambios };
        updateTopbar();

        const msg = document.getElementById('perfilMsg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 2600);
      } catch (err) {
        console.error(err);
        showToast('No se pudieron guardar los cambios.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar cambios';
      }
    });

    document.getElementById('btnLogoutPerfil').addEventListener('click', cerrarSesion);
  }

  async function cerrarSesion() {
    if (supabase) await supabase.auth.signOut();
    state.session = null;
    state.profile = null;
    state.activeChatUser = null;
    navigate('landing');
  }

  // ---------------------------------------------------------------------
  // Términos y condiciones
  // ---------------------------------------------------------------------
  function renderTerminos(app) {
    app.innerHTML = `
      <div class="terms-page">
        <p class="eyebrow" style="margin-bottom:2px;">Samazil</p>
        <h2>Términos y condiciones</h2>
        <p style="color:#8a8065;font-size:12.5px;">Última actualización: julio 2026</p>

        <div class="callout">
          <strong>Aviso importante:</strong> Samazil es únicamente un espacio de intermediación que conecta a personas que ofrecen oficios y servicios con personas que desean contratarlos. Samazil no evalúa, certifica ni garantiza la identidad, calidad, legalidad, puntualidad ni honestidad de ningún usuario. <strong>Samazil no se hace responsable por estafas, fraudes, robos, daños, pérdidas económicas, incumplimientos de acuerdos ni cualquier otro perjuicio</strong> que resulte de la relación entre un cliente y un profesional contactados a través de la plataforma.
        </div>

        <h3>1. Qué es Samazil</h3>
        <p>Samazil es una plataforma que permite a las personas publicar y encontrar servicios de oficios en Guatemala, con tarifas de referencia por hora en quetzales. Cada profesional define su propia tarifa final.</p>

        <h3>2. Verificación de identidad</h3>
        <p>A las personas que se registran como "Emprendedor / Profesional" se les solicita su número de DPI para confirmar que son mayores de edad. Esta verificación es declarativa: Samazil no consulta bases de datos gubernamentales para confirmar la validez del documento. La persona registrada es responsable de que la información proporcionada sea verídica.</p>

        <h3>3. Responsabilidad entre usuarios</h3>
        <ul>
          <li>El acuerdo sobre precio, alcance, forma de pago y condiciones del servicio es exclusivamente entre el cliente y el profesional.</li>
          <li>Samazil no interviene en el pago, no retiene fondos ni actúa como garante de ninguna transacción.</li>
          <li>Recomendamos verificar identidad, pedir referencias, acordar todo por escrito dentro del chat de la plataforma, y usar el sentido común antes de entregar dinero, llaves o acceso a un domicilio.</li>
        </ul>

        <h3>4. Calificaciones</h3>
        <p>El sistema de calificación de 1 a 5 estrellas refleja la opinión de otros usuarios y no constituye una garantía ni una verificación por parte de Samazil sobre la calidad del servicio prestado.</p>

        <h3>5. Conducta y uso de la plataforma</h3>
        <p>Está prohibido publicar información falsa, suplantar identidad, acosar a otros usuarios o utilizar la plataforma para actividades ilegales. Samazil puede suspender cuentas que incumplan estos términos.</p>

        <h3>6. Limitación de responsabilidad</h3>
        <p>En la máxima medida permitida por la ley, Samazil, sus creadores y colaboradores no serán responsables por daños directos, indirectos, incidentales o consecuentes derivados del uso de la plataforma o de las interacciones entre usuarios.</p>

        <h3>7. Cambios a estos términos</h3>
        <p>Estos términos pueden actualizarse en cualquier momento. El uso continuado de Samazil después de un cambio implica la aceptación de los nuevos términos.</p>

        <div style="margin-top:26px;">
          <button class="btn btn--ghost-dark" data-nav="${state.profile ? 'dashboard' : 'landing'}">← Volver</button>
        </div>
      </div>
    `;
    wireNavButtons(app);
  }

  // ---------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.getAttribute('data-route'), { tipo: btn.getAttribute('data-tipo') }));
    });
    const brandHome = document.getElementById('btnBrandHome');
    if (brandHome) brandHome.addEventListener('click', () => navigate(state.profile ? 'dashboard' : 'landing'));
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

    if (!CONFIGURADO) { navigate('landing'); return; }

    const { data: { session } } = await supabase.auth.getSession();
    state.session = session;
    if (session) await cargarPerfilActual();

    supabase.auth.onAuthStateChange((_event, session) => { state.session = session; });

    navigate(state.profile ? 'dashboard' : 'landing');
  });
})();
