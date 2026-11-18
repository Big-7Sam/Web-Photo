import { supabase, publicUrl } from './supabase.js';

/* ══════════ CURSOR (1 solo loop, se apaga en reposo) ══════════ */
(function cursor(){
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!fine || !dot || !ring) { dot?.remove(); ring?.remove(); return; }
  document.documentElement.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0;
  const place = (el, px, py) => { el.style.transform = `translate3d(${px}px,${py}px,0) translate(-50%,-50%)`; };
  place(dot, x, y); place(ring, x, y);
  dot.style.opacity = ring.style.opacity = 1;
  function loop(){
    rx += (x - rx) * .22; ry += (y - ry) * .22;
    place(ring, rx, ry);
    if (Math.abs(x - rx) > .25 || Math.abs(y - ry) > .25) raf = requestAnimationFrame(loop);
    else { place(ring, x, y); raf = 0; }
  }
  addEventListener('mousemove', e => {
    x = e.clientX; y = e.clientY; place(dot, x, y);
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('down'), { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('down'), { passive: true });
  document.addEventListener('mouseover', e => {
    const t = e.target instanceof Element && e.target.closest('a,button,input,select,textarea,.gallery-item');
    ring.classList.toggle('active', !!t);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = 1; });
})();

/* ══════════ LOADER ══════════ */
const hideLoader = () => document.getElementById('loader')?.classList.add('hide');
addEventListener('load', () => setTimeout(hideLoader, 900));
setTimeout(hideLoader, 2600);

/* ══════════ NAV ══════════ */
const nav = document.getElementById('nav');
let navTick = false;
addEventListener('scroll', () => {
  if (navTick) return;
  navTick = true;
  requestAnimationFrame(() => { nav.classList.toggle('scrolled', scrollY > 40); navTick = false; });
}, { passive: true });

const links = [...document.querySelectorAll('.nav-links a')];
const secObserver = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    links.forEach(l => l.classList.toggle('active', l.dataset.section === en.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => secObserver.observe(s));

const burger = document.getElementById('navBurger');
const mob = document.getElementById('mobileMenu');
burger.addEventListener('click', () => { burger.classList.toggle('open'); mob.classList.toggle('open'); });
mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { burger.classList.remove('open'); mob.classList.remove('open'); }));
document.getElementById('year').textContent = new Date().getFullYear();

/* ══════════ REVEAL ══════════ */
const revealIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
}), { threshold: .06, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

/* ══════════ PORTFOLIO ══════════ */
const CATS = ['Todo', 'Blanco y Negro', 'Retratos', 'Gothic', 'Urbano'];
let allImages = [], activeCat = 'Todo', viewList = [];
const catsEl = document.getElementById('categories');
const galleryEl = document.getElementById('gallery');

function renderCategories(){
  const frag = document.createDocumentFragment();
  CATS.forEach(cat => {
    const n = cat === 'Todo' ? allImages.length : allImages.filter(i => i.category === cat).length;
    const b = document.createElement('button');
    b.className = 'cat-btn' + (cat === activeCat ? ' active' : '');
    b.innerHTML = `${cat}<span class="cat-count">${n}</span>`;
    b.addEventListener('click', () => { activeCat = cat; renderCategories(); renderGallery(); });
    frag.appendChild(b);
  });
  catsEl.replaceChildren(frag);
}

function renderGallery(){
  viewList = activeCat === 'Todo' ? allImages : allImages.filter(i => i.category === activeCat);
  document.getElementById('portfolioCount').textContent = viewList.length;
  if (!viewList.length){
    galleryEl.innerHTML = '<div class="gallery-empty">— Sin imágenes en esta categoría —</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  viewList.forEach((img, i) => {
    const d = document.createElement('div');
    d.className = 'gallery-item reveal';
    d.style.setProperty('--d', `${Math.min(i, 8) * 45}ms`);
    const im = document.createElement('img');
    im.src = img.thumb_url || img.image_url;
    im.alt = img.category || 'Fotografía';
    im.loading = 'lazy'; im.decoding = 'async';
    const ov = document.createElement('div');
    ov.className = 'gallery-overlay';
    ov.innerHTML = `<span>${img.category || ''}</span><i>⤢</i>`;
    d.append(im, ov);
    d.addEventListener('click', () => openLightbox(i));
    frag.appendChild(d);
    revealIO.observe(d);
  });
  galleryEl.replaceChildren(frag);
}

async function loadImages(){
  const { data, error } = await supabase.from('portfolio_images').select('*').order('created_at', { ascending: false });
  if (error){ console.error(error); galleryEl.innerHTML = '<div class="gallery-empty">— No se pudo cargar el archivo —</div>'; return; }
  allImages = data || [];
  document.getElementById('heroCount').textContent = allImages.length;
  renderCategories(); renderGallery();
}

/* ══════════ LIGHTBOX ══════════ */
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
let lbIdx = 0;

function openLightbox(i){
  if (!viewList.length) return;
  lbIdx = (i + viewList.length) % viewList.length;
  const img = viewList[lbIdx];
  lbImg.src = img.image_url;
  lbImg.alt = img.category || 'Fotografía';
  document.getElementById('lbCategory').textContent = img.category || '';
  document.getElementById('lbCounter').textContent = `${lbIdx + 1} / ${viewList.length}`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  [1, -1].forEach(d => { const n = viewList[(lbIdx + d + viewList.length) % viewList.length]; if (n) new Image().src = n.image_url; });
}
function closeLightbox(){ lb.classList.remove('open'); document.body.style.overflow = ''; lbImg.removeAttribute('src'); }
document.getElementById('lbClose').addEventListener('click', closeLightbox);
document.getElementById('lbPrev').addEventListener('click', () => openLightbox(lbIdx - 1));
document.getElementById('lbNext').addEventListener('click', () => openLightbox(lbIdx + 1));
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') openLightbox(lbIdx - 1);
  if (e.key === 'ArrowRight') openLightbox(lbIdx + 1);
});
let touchX = null;
lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 55) openLightbox(lbIdx + (dx < 0 ? 1 : -1));
  touchX = null;
}, { passive: true });

/* ══════════ PERFIL + CONTACTO ══════════ */
async function loadProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.profile_image) document.getElementById('profileImg').src = publicUrl(data.profile_image);
  if (data.bio) document.getElementById('bioText').textContent = data.bio;
}

async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.email){
    document.getElementById('cEmail').href = 'mailto:' + data.email;
    document.getElementById('cEmailVal').textContent = data.email;
  }
  if (data.whatsapp){
    document.getElementById('cWhatsapp').href = 'https://wa.me/' + data.whatsapp.replace(/\D/g, '');
    document.getElementById('cWhatsappVal').textContent = data.whatsapp;
  }
  if (data.instagram){
    const raw = data.instagram.trim();
    const url = raw.startsWith('http') ? raw : 'https://instagram.com/' + raw.replace(/^@/, '');
    document.getElementById('cInstagram').href = url;
    document.getElementById('cInstagramVal').textContent = raw.startsWith('http') ? '@' + raw.replace(/\/+$/, '').split('/').pop() : (raw.startsWith('@') ? raw : '@' + raw);
  }
  if (data.location) document.getElementById('footLocation').textContent = data.location;
}

/* ══════════ ACCESO OCULTO: 5 clicks en el logo ══════════ */
const modal = document.getElementById('secretModal');
const smMsg = document.getElementById('smMsg');
let clicks = 0, clickTimer = null;

document.getElementById('navLogo').addEventListener('click', e => {
  e.preventDefault();
  clicks++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { clicks = 0; }, 2200);
  if (clicks < 5) return;
  clicks = 0;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'admin.html';
    else { modal.classList.add('open'); smMsg.textContent = ''; smMsg.className = 'sm-msg'; setTimeout(() => document.getElementById('smEmail').focus(), 60); }
  });
});
const closeModal = () => modal.classList.remove('open');
document.getElementById('smClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

document.getElementById('secretForm').addEventListener('submit', async e => {
  e.preventDefault();
  smMsg.className = 'sm-msg'; smMsg.textContent = 'Verificando…';
  const { error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('smEmail').value.trim(),
    password: document.getElementById('smPass').value
  });
  if (error){ smMsg.className = 'sm-msg err'; smMsg.textContent = 'Credenciales incorrectas'; return; }
  smMsg.className = 'sm-msg ok'; smMsg.textContent = 'Acceso concedido';
  location.href = 'admin.html';
});

/* ══════════ INIT ══════════ */
loadImages(); loadProfile(); loadSettings();