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
if (dot && ring && window.innerWidth > 900) {
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

/* ============ LOADER ============ */
function hideLoader(){
  const l = document.getElementById('loader');
  if (!l) return;
  l.classList.add('hide');
  setTimeout(() => { if (l.parentNode) l.remove(); }, 700);
}
window.addEventListener('load', () => setTimeout(hideLoader, 1200));
setTimeout(hideLoader, 3500);

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
    btn.innerHTML = `${cat}<span class="cat-count">${count}</span>`;
    btn.addEventListener('click', () => { activeCat = cat; renderCategories(); renderGallery(); });
    catsEl.appendChild(btn);
  });
}

function renderGallery(){
  const items = activeCat === 'Todo'
    ? allImages
    : allImages.filter(i => getCats(i).includes(activeCat)); // usa helper

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
    div.addEventListener('click', () => openLightbox(allImages.indexOf(img)));
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
function openLightbox(idx){
  lbIdx = idx; const img = allImages[idx];
  document.getElementById('lbImg').src = img.image_url;
  document.getElementById('lbCategory').textContent = img.category;
  document.getElementById('lbCounter').textContent = `${idx+1} / ${allImages.length}`;
  lightbox.classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeLightbox(){ lightbox.classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => openLightbox((lbIdx-1+allImages.length)%allImages.length));
document.getElementById('lbNext').addEventListener('click', () => openLightbox((lbIdx+1)%allImages.length));
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
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
  document.getElementById('formSuccess').classList.add('show');
  e.target.reset(); setTimeout(() => document.getElementById('formSuccess').classList.remove('show'), 5000);
});

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
loadImages(); loadProfile(); loadSettings();