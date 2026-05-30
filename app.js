import { supabase, publicUrl } from './supabase.js';

/* ============ COPYRIGHT — bloquear click derecho ============ */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart',   e => e.preventDefault());
document.addEventListener('keydown', e => {
  // Bloquear Ctrl+S, Ctrl+U, Ctrl+Shift+I
  if ((e.ctrlKey||e.metaKey) && ['s','u'].includes(e.key.toLowerCase())) e.preventDefault();
});

/* ============ CURSOR (GPU ACCELERATED) ============ */
const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
// Activar para mouse Y para stylus (pointer fino) en cualquier tamaño de pantalla
const hasFinePointer = window.matchMedia('(pointer:fine)').matches;
if (dot && ring && hasFinePointer) {
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  }, { passive: true });
  function animateRing() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  animateRing();
  document.querySelectorAll('a, button, .gallery-item, input, select, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'), { passive: true });
    el.addEventListener('mouseleave', () => ring.classList.remove('active'), { passive: true });
  });
} else if (dot && ring) { dot.style.display='none'; ring.style.display='none'; }

/* ============ SISTEMA DE IDIOMA ============ */
const T = {
  es: {
    nav: ['Inicio','Portfolio','Sobre Mí','Contacto'],
    hero_kicker: 'Santiago Fotografía — Est. 2015',
    hero_lines: ['CAPTURA','EL','INSTANTE'],
    hero_sub: 'Cada imagen cuenta una historia única. Momentos que perduran más allá del tiempo.',
    hero_btn: 'Ver Portfolio',
    gallery_kicker: '— Galería', gallery_title: 'Portfolio',
    cats: { 'Todo':'Todo','Blanco y Negro':'Blanco y Negro','Retratos':'Retratos','Gothic':'Gothic','Urbano':'Urbano' },
    about_kicker: '— Sobre mí', about_title: 'Detrás del lente',
    contact_kicker: '— Contacto',
    form_name: 'Nombre', form_email: 'Email', form_msg: 'Mensaje', form_send: 'Enviar mensaje',
    scroll: 'SCROLL', gallery_empty: '— No hay imágenes en esta categoría —',
  },
  en: {
    nav: ['Home','Portfolio','About Me','Contact'],
    hero_kicker: 'Santiago Photography — Est. 2015',
    hero_lines: ['CAPTURE','THE','MOMENT'],
    hero_sub: 'Every image tells a unique story. Moments that last beyond time.',
    hero_btn: 'View Portfolio',
    gallery_kicker: '— Gallery', gallery_title: 'Portfolio',
    cats: { 'Todo':'All','Blanco y Negro':'Black & White','Retratos':'Portraits','Gothic':'Gothic','Urbano':'Urban' },
    about_kicker: '— About me', about_title: 'Behind the lens',
    contact_kicker: '— Contact',
    form_name: 'Name', form_email: 'Email', form_msg: 'Message', form_send: 'Send message',
    scroll: 'SCROLL', gallery_empty: '— No images in this category —',
  }
};

let currentLang = localStorage.getItem('sf_lang') || null;

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('sf_lang', lang);
  const t = T[lang];
  document.getElementById('langEs')?.classList.toggle('active', lang==='es');
  document.getElementById('langEn')?.classList.toggle('active', lang==='en');
  // Nav links
  document.querySelectorAll('.nav-links a').forEach((a,i) => { if(t.nav[i]) a.textContent = t.nav[i]; });
  document.querySelectorAll('.mobile-menu a').forEach((a,i) => { if(t.nav[i]) a.textContent = t.nav[i]; });
  // Hero
  document.querySelectorAll('.hero-title span').forEach((s,i) => { if(t.hero_lines[i]) s.textContent = t.hero_lines[i]; });
  const heroKicker = document.querySelector('.hero-kicker');         if(heroKicker) heroKicker.textContent = t.hero_kicker;
  const heroSub    = document.querySelector('.hero-subtitle');       if(heroSub)    heroSub.textContent    = t.hero_sub;
  const heroBtn    = document.querySelector('.hero .btn span');      if(heroBtn)    heroBtn.textContent    = t.hero_btn;
  const scrollEl   = document.querySelector('.scroll-indicator span'); if(scrollEl) scrollEl.textContent  = t.scroll;
  // Gallery
  const gKicker = document.querySelector('.portfolio .section-kicker'); if(gKicker) gKicker.textContent = t.gallery_kicker;
  const gTitle  = document.querySelector('.portfolio .section-title');  if(gTitle)  gTitle.textContent  = t.gallery_title;
  // About
  const aKicker = document.querySelector('.about .section-kicker'); if(aKicker) aKicker.textContent = t.about_kicker;
  const aTitle  = document.querySelector('.about .section-title');  if(aTitle)  aTitle.textContent  = t.about_title;
  // Contact
  const cKicker = document.querySelector('.contact .section-kicker'); if(cKicker) cKicker.textContent = t.contact_kicker;
  // Form
  const fName = document.querySelector('[name=name]');    if(fName) fName.placeholder = t.form_name;
  const fMsg  = document.querySelector('[name=message]'); if(fMsg)  fMsg.placeholder  = t.form_msg;
  const fBtn  = document.querySelector('.contact-form [type=submit] span'); if(fBtn) fBtn.textContent = t.form_send;
  document.querySelectorAll('.contact-form .field label').forEach((l,i) => {
    const map = [t.form_name, t.form_email, t.form_msg];
    if(map[i]) l.textContent = map[i];
  });
  // Re-render categories con nombres traducidos
  if(typeof renderCategories === 'function') renderCategories();
}

function chooseLang(lang) {
  document.getElementById('loaderLang')?.classList.remove('show');
  setLang(lang);
  setTimeout(() => {
    const l = document.getElementById('loader');
    if(l){ l.classList.add('hide'); setTimeout(()=>l.remove(),700); }
  }, 300);
}

// Exponer al scope global — necesario porque app.js es type="module"
window.setLang    = setLang;
window.chooseLang = chooseLang;

/* ============ LOADER ============ */
function hideLoader(){
  const l = document.getElementById('loader');
  if (!l) return;
  l.classList.add('hide');
  setTimeout(() => { if (l.parentNode) l.remove(); }, 700);
}
window.addEventListener('load', () => {
  if (localStorage.getItem('sf_lang')) {
    setTimeout(hideLoader, 1200); // ya eligió idioma
  } else {
    setTimeout(() => document.getElementById('loaderLang')?.classList.add('show'), 1300);
    setTimeout(() => { if(!localStorage.getItem('sf_lang')) chooseLang('es'); }, 15000);
  }
});
setTimeout(() => { if(localStorage.getItem('sf_lang')) hideLoader(); }, 3500);

/* ============ NAV & MOBILE ============ */
const nav = document.querySelector('.nav');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 50);
  // Si llegó al fondo de la página, activar último item
  const atBottom = window.scrollY + window.innerHeight >= document.body.offsetHeight - 60;
  if (atBottom) {
    navLinks.forEach(l => l.classList.remove('active'));
    navLinks[navLinks.length - 1]?.classList.add('active');
    return;
  }
  let current = '';
  sections.forEach(s => { if (window.scrollY + 200 >= s.offsetTop) current = s.id; });
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.section === current));
}, { passive: true });

const burger = document.getElementById('navBurger');
const mobMenu = document.getElementById('mobileMenu');
burger?.addEventListener('click', () => { burger.classList.toggle('open'); mobMenu?.classList.toggle('open'); });
mobMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { burger.classList.remove('open'); mobMenu.classList.remove('open'); }));
document.getElementById('year').textContent = new Date().getFullYear();

/* ============ PORTFOLIO ============ */
let allImages = [];
const categories = ['Todo','Blanco y Negro','Retratos','Gothic','Urbano'];
let activeCat = 'Todo';
const catsEl = document.getElementById('categories');
const galleryEl = document.getElementById('gallery');

// Helper: obtener categorías reales de una foto
function getCats(img){
  return (img.categories && img.categories.length > 0) ? img.categories : [img.category];
}

function renderCategories(){
  catsEl.innerHTML = '';
  categories.forEach(cat => {
    // Contar usando todas las categorías de cada foto, no solo la primaria
    const count = cat === 'Todo'
      ? allImages.length
      : allImages.filter(i => getCats(i).includes(cat)).length;
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat === activeCat ? ' active' : '');
    const t = T[currentLang || 'es'];
    const displayName = (t && t.cats && t.cats[cat]) ? t.cats[cat] : cat;
    btn.innerHTML = `${displayName}<span class="cat-count">${count}</span>`;
    btn.addEventListener('click', () => { activeCat = cat; renderCategories(); renderGallery(); });
    catsEl.appendChild(btn);
  });
}

function renderGallery(){
  const items = activeCat === 'Todo'
    ? allImages
    : allImages.filter(i => getCats(i).includes(activeCat));

  lbFilteredImages = [...items]; // ← guardar lista filtrada para lightbox
  galleryEl.innerHTML = '';
  galleryEl.className = 'gallery';
  const wrap = document.querySelector('.gallery-wrap');
  if (wrap) wrap.scrollTop = 0;

  if (!items.length) {
    galleryEl.innerHTML = '<div class="gallery-empty">— No hay imágenes en esta categoría —</div>';
    return;
  }

  items.forEach((img, idx) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.style.animationDelay = `${Math.min(idx * 0.04, 0.6)}s`;
    // Sin tag de categoría en público
    div.innerHTML = `<img src="${img.image_url}" alt="" draggable="false">`;
    div.addEventListener('click', () => openLightbox(idx)); // índice filtrado
    galleryEl.appendChild(div);
  });
}

async function loadImages(){
  try {
    const { data } = await supabase
      .from('portfolio_images').select('*').order('created_at', { ascending: false });
    allImages = data || [];
    renderCategories(); renderGallery();
  } catch(err) { console.error('Error cargando imágenes:', err); }
}

/* ============ LIGHTBOX ============ */
const lightbox = document.getElementById('lightbox');
let lbIdx = 0;
let lbFilteredImages = []; // fotos actualmente visibles (respeta filtro)
function openLightbox(idx){
  lbIdx = idx;
  const img = lbFilteredImages[idx]; // usar lista filtrada
  if (!img) return;
  document.getElementById('lbImg').src = img.image_url;
  document.getElementById('lbCategory').textContent = '';
  document.getElementById('lbCounter').textContent = `${idx+1} / ${lbFilteredImages.length}`;
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox(){ lightbox.classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => openLightbox((lbIdx-1+lbFilteredImages.length)%lbFilteredImages.length));
document.getElementById('lbNext').addEventListener('click', () => openLightbox((lbIdx+1)%lbFilteredImages.length));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

// ── Swipe táctil en mobile ──────────────────────────────────
let _swipeX = 0;
lightbox.addEventListener('touchstart', e => {
  _swipeX = e.touches[0].clientX;
}, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - _swipeX;
  if (Math.abs(dx) < 40) return; // umbral mínimo
  if (dx < 0) openLightbox((lbIdx + 1) % lbFilteredImages.length);
  else         openLightbox((lbIdx - 1 + lbFilteredImages.length) % lbFilteredImages.length);
}, { passive: true });
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
});

/* ============ PERFIL / CONTACTO ============ */
async function loadProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (data) {
    if (data.profile_image) document.getElementById('profileImg').src = publicUrl(data.profile_image);
    if (data.bio) document.getElementById('bioText').textContent = data.bio;
  }
}
async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  const map = { cEmail:'email', cWhatsapp:'whatsapp', cLocation:'location', cInstagram:'instagram' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id); if (!data[key]) return;
    el.textContent = data[key];
    if (id === 'cEmail') el.href = 'mailto:'+data[key];
    if (id === 'cWhatsapp') el.href = 'https://wa.me/' + data[key].replace(/\D/g,'');
    if (id === 'cInstagram') el.href = data[key].startsWith('http') ? data[key] : 'https://instagram.com/'+data[key].replace('@','');
  });
  // Título y subtítulo del contacto desde Supabase
  const titleEl = document.getElementById('contactTitle');
  const subEl   = document.getElementById('contactSubtitle');
  if (titleEl && data.contact_title)    titleEl.textContent = data.contact_title;
  if (subEl   && data.contact_subtitle) subEl.textContent   = data.contact_subtitle;
  // Logo personalizable
  if (data.logo_text) {
    document.querySelectorAll('.nav-logo, .footer-logo').forEach(el => {
      if (el.firstChild) el.firstChild.textContent = data.logo_text;
    });
    document.title = data.logo_text + ' — Fotografía';
  }
}

/* ============ FORMULARIO ============ */
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault(); let valid = true;
  e.target.querySelectorAll('.field').forEach(f => {
    const input = f.querySelector('input,select,textarea'); if (!input) return;
    const ok = input.checkValidity() && input.value.trim() !== '';
    f.classList.toggle('invalid', !ok); if (!ok) valid = false;
  });
  if (!valid) return;

  const btn  = e.target.querySelector('[type=submit]');
  const fd   = new FormData(e.target);
  const data = {
    from_name:  fd.get('name')    || '',
    from_email: fd.get('email')   || '',
    message:    fd.get('message') || '',
  };

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Enviando...';

  try {
    // Requiere configurar EmailJS — ver instrucciones abajo
    await emailjs.send(
      window.EMAILJS_SERVICE_ID   || 'TU_SERVICE_ID',
      window.EMAILJS_TEMPLATE_ID  || 'TU_TEMPLATE_ID',
      data
    );
    document.getElementById('formSuccess').classList.add('show');
    e.target.reset();
    setTimeout(() => document.getElementById('formSuccess').classList.remove('show'), 5000);
  } catch(err) {
    alert('Error al enviar: ' + (err.text || err.message || JSON.stringify(err)));
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Enviar mensaje';
  }
});

/* ============ GRID TRAIL (página completa, sutil) ============ */
function initGridTrail(){
  const canvas = document.createElement('canvas');
  // fixed = sigue toda la página, no solo el hero
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;mix-blend-mode:screen;';
  document.body.appendChild(canvas);

  const ctx  = canvas.getContext('2d');
  const CELL = 80;
  const FADE = 1000;

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const trail = new Map();
  document.addEventListener('mousemove', e => {
    const col = Math.floor(e.clientX / CELL);
    const row = Math.floor(e.clientY / CELL);
    trail.set(`${col},${row}`, { col, row, t: Date.now() });
  }, { passive: true });

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    trail.forEach((cell, key) => {
      const age   = now - cell.t;
      if (age > FADE) { trail.delete(key); return; }
      const alpha = (1 - age / FADE);
      const x = cell.col * CELL;
      const y = cell.row * CELL;
      // Relleno muy sutil
      ctx.fillStyle = `rgba(0,255,65,${alpha * 0.018})`;
      ctx.fillRect(x, y, CELL, CELL);
      // Borde — efecto principal
      ctx.strokeStyle = `rgba(0,255,65,${alpha * 0.45})`;
      ctx.lineWidth   = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ============ ACCESO OCULTO ============ */
let clickCount = 0, clickTimer = null;
const logo = document.querySelector('.nav-logo');
if (logo) {
  logo.addEventListener('click', (e) => {
    e.preventDefault(); clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    if (clickCount >= 5) {
      clickCount = 0;
      supabase.auth.getSession().then(({data}) => {
        window.location.href = data.session ? 'admin.html' : '#';
      });
    }
  });
}

/* ============ INIT ============ */
loadImages(); loadProfile(); loadSettings(); initGridTrail();
// Aplicar idioma guardado (si existe)
if (currentLang) setLang(currentLang);