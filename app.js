import { supabase, publicUrl } from './supabase.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

/* ══════════ CURSOR ══════════ */
(function cursor(){
  const dot = document.querySelector('.cursor-dot'), ring = document.querySelector('.cursor-ring');
  if (!finePointer || !dot || !ring){ dot?.remove(); ring?.remove(); return; }
  document.documentElement.classList.add('has-cursor');
  let x = innerWidth/2, y = innerHeight/2, rx = x, ry = y, raf = 0;
  const place = (el,px,py) => { el.style.transform = `translate3d(${px}px,${py}px,0) translate(-50%,-50%)`; };
  place(dot,x,y); place(ring,x,y); dot.style.opacity = ring.style.opacity = 1;
  function loop(){
    rx += (x-rx)*.22; ry += (y-ry)*.22; place(ring,rx,ry);
    if (Math.abs(x-rx)>.25 || Math.abs(y-ry)>.25) raf = requestAnimationFrame(loop);
    else { place(ring,x,y); raf = 0; }
  }
  addEventListener('mousemove', e => { x=e.clientX; y=e.clientY; place(dot,x,y); if(!raf) raf=requestAnimationFrame(loop); }, { passive:true });
  addEventListener('pointerdown', () => ring.classList.add('down'), { passive:true });
  addEventListener('pointerup', () => ring.classList.remove('down'), { passive:true });
  document.addEventListener('mouseover', e => {
    const t = e.target instanceof Element && e.target.closest('a,button,input,select,textarea,.gallery-item');
    ring.classList.toggle('active', !!t);
  }, { passive:true });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = 1; });
})();

/* ══════════ LOADER ══════════ */
const hideLoader = () => $('loader')?.classList.add('hide');
addEventListener('load', () => setTimeout(hideLoader, 900));
setTimeout(hideLoader, 2600);

/* ══════════ NAV ══════════ */
const nav = $('nav');
let navTick = false;
addEventListener('scroll', () => {
  if (navTick) return;
  navTick = true;
  requestAnimationFrame(() => { nav.classList.toggle('scrolled', scrollY > 40); navTick = false; });
}, { passive:true });

const links = [...document.querySelectorAll('.nav-links a')];
new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) links.forEach(l => l.classList.toggle('active', l.dataset.section === en.target.id));
}), { rootMargin:'-45% 0px -50% 0px' }).observe && document.querySelectorAll('section[id]').forEach(s => {
  new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) links.forEach(l => l.classList.toggle('active', l.dataset.section === en.target.id));
  }), { rootMargin:'-45% 0px -50% 0px' }).observe(s);
});

const burger = $('navBurger'), mob = $('mobileMenu');
burger.addEventListener('click', () => { burger.classList.toggle('open'); mob.classList.toggle('open'); });
mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { burger.classList.remove('open'); mob.classList.remove('open'); }));
$('year').textContent = new Date().getFullYear();

/* ══════════ REVEAL ══════════ */
const revealIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add('in'); revealIO.unobserve(e.target); }
}), { threshold:.06, rootMargin:'0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

/* ══════════ HERO: portada + parallax ══════════ */
const hero = $('hero'), heroMedia = $('heroMedia'), heroBase = $('heroBase'), heroFull = $('heroFull');
const heroGrid = $('heroGrid'), heroGlows = $('heroGlows'), heroContent = $('heroContent'), heroFeature = $('heroFeature');
let coverRow = null, coverIsManual = false;

function setCover(row, manual){
  coverRow = row; coverIsManual = manual;
  if (!row){
    hero.classList.remove('has-photo');
    heroMedia.hidden = true; heroFeature.hidden = true;
    heroBase.removeAttribute('src'); heroFull.removeAttribute('src'); heroFull.classList.remove('on');
    return;
  }
  hero.classList.add('has-photo');
  heroMedia.hidden = false;
  heroFull.classList.remove('on');
  heroBase.src = row.thumb_url || row.image_url;
  const full = new Image();
  full.decoding = 'async';
  full.onload = () => { heroFull.src = row.image_url; heroFull.classList.add('on'); };
  full.src = row.image_url;
  $('heroFeatLabel').textContent = manual ? 'Portada elegida' : 'Última captura';
  $('heroFeatCat').textContent = row.category || 'Archivo';
  heroFeature.hidden = false;
}
heroFeature.addEventListener('click', () => {
  if (!coverRow) return;
  const i = allImages.findIndex(r => r.id === coverRow.id);
  if (i >= 0) openFrom(allImages, i);
});

(function parallax(){
  if (!finePointer || reduced) return;
  let tx=0, ty=0, cx=0, cy=0, raf=0;
  function loop(){
    cx += (tx-cx)*.07; cy += (ty-cy)*.07;
    heroMedia.style.transform = `translate3d(${cx*16}px,${cy*12}px,0)`;
    heroGrid.style.transform  = `translate3d(${cx*-30}px,${cy*-22}px,0)`;
    heroGlows.style.transform = `translate3d(${cx*46}px,${cy*34}px,0)`;
    heroContent.style.transform = `translate3d(${cx*-7}px,${cy*-5}px,0)`;
    if (Math.abs(tx-cx)>.001 || Math.abs(ty-cy)>.001) raf = requestAnimationFrame(loop);
    else raf = 0;
  }
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left)/r.width - .5)*2;
    ty = ((e.clientY - r.top)/r.height - .5)*2;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive:true });
  hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); }, { passive:true });
})();

/* ══════════ ESTADO DE VISTA ══════════ */
const VIEW_KEY = 'sp_view_v2';
const DEFAULT_VIEW = { size:380, gap:5, con:100, ratio:'1/1', order:'recent', bw:false, zoom:true, tags:false };
let view = { ...DEFAULT_VIEW };
try { const s = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null'); if (s && typeof s === 'object') view = { ...view, ...s }; } catch(e){}
const saveView = () => { try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch(e){} };

const CATS = ['Todo','Blanco y Negro','Retratos','Gothic','Urbano'];
let allImages = [], activeCat = 'Todo', viewList = [], shuffleSeed = [];
const catsEl = $('categories'), galleryEl = $('gallery');

function ratioH(){ const [a,b] = view.ratio.split('/').map(Number); return (b/a) || 1; }

function applyCss(){
  const g = galleryEl.style;
  g.setProperty('--tile', view.size + 'px');
  g.setProperty('--gap', view.gap + 'px');
  g.setProperty('--ratio', view.ratio);
  g.setProperty('--cis', Math.round(view.size * ratioH()) + 'px');
  g.setProperty('--f-gray', view.bw ? 1 : 0);
  g.setProperty('--f-con', (view.con/100).toFixed(2));
  g.setProperty('--zoom', view.zoom ? 1.07 : 1);
  galleryEl.classList.toggle('tags-on', view.tags);
  $('vSizeOut').textContent = view.size;
  $('vGapOut').textContent = view.gap;
  $('vConOut').textContent = view.con;
  $('vBW').setAttribute('aria-pressed', String(view.bw));
  $('vZoom').setAttribute('aria-pressed', String(view.zoom));
  $('vTags').setAttribute('aria-pressed', String(view.tags));
  readColumns();
}
function syncInputs(){
  $('vSize').value = view.size; $('vGap').value = view.gap; $('vCon').value = view.con;
  $('vRatio').value = view.ratio; $('vOrder').value = view.order;
}
let readRaf = 0;
function readColumns(){
  if (readRaf) return;
  readRaf = requestAnimationFrame(() => {
    readRaf = 0;
    const cols = getComputedStyle(galleryEl).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    $('ltRead').innerHTML = `<b>${cols}</b> por fila · ${viewList.length} visibles`;
  });
}
new ResizeObserver(readColumns).observe(galleryEl);

function orderList(list){
  const arr = [...list];
  if (view.order === 'old') arr.reverse();
  else if (view.order === 'cat') arr.sort((a,b) => (a.category||'').localeCompare(b.category||''));
  else if (view.order === 'cover') arr.sort((a,b) => (b.is_featured?1:0) - (a.is_featured?1:0));
  else if (view.order === 'shuffle'){
    const rank = new Map(shuffleSeed.map((id,i) => [id,i]));
    arr.sort((a,b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }
  return arr;
}
function reshuffle(){ shuffleSeed = allImages.map(r => r.id).sort(() => Math.random() - .5); }

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
  const base = activeCat === 'Todo' ? allImages : allImages.filter(i => i.category === activeCat);
  viewList = orderList(base);
  $('portfolioCount').textContent = viewList.length;
  if (!viewList.length){
    galleryEl.innerHTML = '<div class="gallery-empty">— Sin imágenes en esta categoría —</div>';
    readColumns(); return;
  }
  const frag = document.createDocumentFragment();
  viewList.forEach((img,i) => {
    const d = document.createElement('div');
    d.className = 'gallery-item reveal';
    d.style.setProperty('--d', `${Math.min(i,8)*45}ms`);
    const im = document.createElement('img');
    im.src = img.thumb_url || img.image_url;
    im.alt = img.category || 'Fotografía';
    im.loading = 'lazy'; im.decoding = 'async';
    const ov = document.createElement('div');
    ov.className = 'gallery-overlay';
    ov.innerHTML = `<span>${img.category || ''}</span><i>⤢</i>`;
    d.append(im, ov);
    if (img.is_featured){ const s = document.createElement('span'); s.className = 'gi-star'; s.textContent = '★'; d.appendChild(s); }
    d.addEventListener('click', () => openFrom(viewList, i));
    frag.appendChild(d);
    revealIO.observe(d);
  });
  galleryEl.replaceChildren(frag);
  readColumns();
}

async function loadImages(){
  const { data, error } = await supabase.from('portfolio_images').select('*').order('created_at', { ascending:false });
  if (error){ console.error(error); galleryEl.innerHTML = '<div class="gallery-empty">— No se pudo cargar el archivo —</div>'; return; }
  allImages = data || [];
  $('heroCount').textContent = allImages.length;
  const manual = allImages.find(r => r.is_featured);
  setCover(manual || allImages[0] || null, !!manual);
  reshuffle();
  renderCategories(); renderGallery();
}

/* ══════════ CONTROLES DE VISTA ══════════ */
$('vSize').addEventListener('input', e => { view.size = +e.target.value; applyCss(); saveView(); });
$('vGap').addEventListener('input',  e => { view.gap  = +e.target.value; applyCss(); saveView(); });
$('vCon').addEventListener('input',  e => { view.con  = +e.target.value; applyCss(); saveView(); });
$('vRatio').addEventListener('change', e => { view.ratio = e.target.value; applyCss(); saveView(); });
$('vOrder').addEventListener('change', e => { view.order = e.target.value; if (view.order === 'shuffle') reshuffle(); renderGallery(); saveView(); });
$('vBW').addEventListener('click',   () => { view.bw = !view.bw; applyCss(); saveView(); });
$('vZoom').addEventListener('click', () => { view.zoom = !view.zoom; applyCss(); saveView(); });
$('vTags').addEventListener('click', () => { view.tags = !view.tags; applyCss(); saveView(); });
$('vShuffle').addEventListener('click', () => { view.order = 'shuffle'; $('vOrder').value = 'shuffle'; reshuffle(); renderGallery(); saveView(); });
$('vReset').addEventListener('click', () => { view = { ...DEFAULT_VIEW }; syncInputs(); applyCss(); renderGallery(); saveView(); });
syncInputs(); applyCss();

/* ══════════ LIGHTBOX ══════════ */
const lb = $('lightbox'), lbImg = $('lbImg');
let lbList = [], lbIdx = 0;
function openFrom(list, i){
  if (!list.length) return;
  lbList = list;
  lbIdx = (i + list.length) % list.length;
  const img = lbList[lbIdx];
  lbImg.src = img.image_url;
  lbImg.alt = img.category || 'Fotografía';
  $('lbCategory').textContent = (img.is_featured ? '★ ' : '') + (img.category || '');
  $('lbCounter').textContent = `${lbIdx+1} / ${lbList.length}`;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  [1,-1].forEach(d => { const n = lbList[(lbIdx+d+lbList.length)%lbList.length]; if (n) new Image().src = n.image_url; });
}
function closeLightbox(){ lb.classList.remove('open'); document.body.style.overflow=''; lbImg.removeAttribute('src'); }
$('lbClose').addEventListener('click', closeLightbox);
$('lbPrev').addEventListener('click', () => openFrom(lbList, lbIdx-1));
$('lbNext').addEventListener('click', () => openFrom(lbList, lbIdx+1));
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') openFrom(lbList, lbIdx-1);
  if (e.key === 'ArrowRight') openFrom(lbList, lbIdx+1);
});
let touchX = null;
lb.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, { passive:true });
lb.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 55) openFrom(lbList, lbIdx + (dx < 0 ? 1 : -1));
  touchX = null;
}, { passive:true });

/* ══════════ PERFIL + CONTACTO ══════════ */
async function loadProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.profile_image) $('profileImg').src = publicUrl(data.profile_image);
  if (data.bio) $('bioText').textContent = data.bio;
}
async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.email){ $('cEmail').href = 'mailto:' + data.email; $('cEmailVal').textContent = data.email; }
  if (data.whatsapp){ $('cWhatsapp').href = 'https://wa.me/' + data.whatsapp.replace(/\D/g,''); $('cWhatsappVal').textContent = data.whatsapp; }
  if (data.instagram){
    const raw = data.instagram.trim();
    $('cInstagram').href = raw.startsWith('http') ? raw : 'https://instagram.com/' + raw.replace(/^@/,'');
    $('cInstagramVal').textContent = raw.startsWith('http') ? '@' + raw.replace(/\/+$/,'').split('/').pop() : (raw.startsWith('@') ? raw : '@' + raw);
  }
  if (data.location) $('footLocation').textContent = data.location;
}

/* ══════════ ACCESO OCULTO ══════════ */
const modal = $('secretModal'), smMsg = $('smMsg');
let clicks = 0, clickTimer = null;
$('navLogo').addEventListener('click', e => {
  e.preventDefault();
  clicks++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { clicks = 0; }, 2200);
  if (clicks < 5) return;
  clicks = 0;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'admin.html';
    else { modal.classList.add('open'); smMsg.textContent=''; smMsg.className='sm-msg'; setTimeout(() => $('smEmail').focus(), 60); }
  });
});
const closeModal = () => modal.classList.remove('open');
$('smClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
$('secretForm').addEventListener('submit', async e => {
  e.preventDefault();
  smMsg.className = 'sm-msg'; smMsg.textContent = 'Verificando…';
  const { error } = await supabase.auth.signInWithPassword({ email: $('smEmail').value.trim(), password: $('smPass').value });
  if (error){ smMsg.className = 'sm-msg err'; smMsg.textContent = 'Credenciales incorrectas'; return; }
  smMsg.className = 'sm-msg ok'; smMsg.textContent = 'Acceso concedido';
  location.href = 'admin.html';
});

/* ══════════ INIT ══════════ */
loadImages(); loadProfile(); loadSettings();