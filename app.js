import { supabase, publicUrl } from './supabase.js';

const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

/* ══════════ I18N ══════════ */
const I18N = {
  es:{
    'doc.title':'Santiago Fotografía — Captura el Instante',
    'nav.home':'Inicio','nav.portfolio':'Portfolio','nav.about':'Sobre mí','nav.contact':'Contacto',
    'hero.kicker':'Santiago Fotografía — Est. 2015','hero.t1':'CAPTURA','hero.t2':'EL','hero.t3':'INSTANTE',
    'hero.sub':'Cada imagen cuenta una historia única. Momentos que perduran más allá del tiempo.',
    'hero.cta':'Ver Portfolio','hero.works':'obras en archivo','hero.scroll':'SCROLL',
    'port.kicker':'— Galería','port.title':'Portfolio','port.note':'imágenes · click para ampliar',
    'lt.size':'Tamaño','lt.shuffle':'Aleatorio','lt.reset':'Reset','lt.read':'<b>{c}</b> por fila · {n} visibles',
    'cat.all':'Todo','cat.bn':'Blanco y Negro','cat.ret':'Retratos','cat.got':'Gothic','cat.urb':'Urbano',
    'gal.empty':'— Sin imágenes en esta categoría —','gal.error':'— No se pudo cargar el archivo —',
    'about.kicker':'— Sobre mí','about.title':'La historia detrás del lente','about.tag':'Retrato / 35mm',
    'about.bio':'Soy Santiago, fotógrafo profesional con más de una década documentando la vida a través del lente. Especializado en retratos, fotografía urbana y proyectos editoriales con una estética oscura y cinematográfica.',
    'about.years':'Años','about.projects':'Proyectos','about.awards':'Premios',
    'contact.kicker':'— Contacto','contact.title':'HABLEMOS',
    'contact.lead':'Retratos, editoriales, eventos y colaboraciones creativas. Elegí tu canal.',
    'contact.email':'Email','contact.write':'Escribir','contact.chat':'Chatear','contact.follow':'Seguir',
    'footer.legal':'Imágenes protegidas · prohibida su reproducción',
    'lb.hint':'← → navegar · ESC cerrar','guard.note':'© Santiago Fotografía — imágenes protegidas',
    'gate.pass':'Contraseña','gate.enter':'Entrar','gate.check':'Verificando…','gate.bad':'Credenciales incorrectas','gate.ok':'Acceso concedido'
  },
  en:{
    'doc.title':'Santiago Photography — Capture the Moment',
    'nav.home':'Home','nav.portfolio':'Portfolio','nav.about':'About','nav.contact':'Contact',
    'hero.kicker':'Santiago Photography — Est. 2015','hero.t1':'CAPTURE','hero.t2':'THE','hero.t3':'MOMENT',
    'hero.sub':'Every image tells a unique story. Moments that outlast time itself.',
    'hero.cta':'View Portfolio','hero.works':'works in archive','hero.scroll':'SCROLL',
    'port.kicker':'— Gallery','port.title':'Portfolio','port.note':'images · click to enlarge',
    'lt.size':'Size','lt.shuffle':'Shuffle','lt.reset':'Reset','lt.read':'<b>{c}</b> per row · {n} shown',
    'cat.all':'All','cat.bn':'Black & White','cat.ret':'Portraits','cat.got':'Gothic','cat.urb':'Urban',
    'gal.empty':'— No images in this category —','gal.error':'— The archive could not be loaded —',
    'about.kicker':'— About','about.title':'The story behind the lens','about.tag':'Portrait / 35mm',
    'about.bio':'I am Santiago, a professional photographer with over a decade documenting life through the lens. Specialised in portraits, urban photography and editorial work with a dark, cinematic aesthetic.',
    'about.years':'Years','about.projects':'Projects','about.awards':'Awards',
    'contact.kicker':'— Contact','contact.title':"LET'S TALK",
    'contact.lead':'Portraits, editorials, events and creative collaborations. Pick your channel.',
    'contact.email':'Email','contact.write':'Write','contact.chat':'Chat','contact.follow':'Follow',
    'footer.legal':'Protected images · reproduction prohibited',
    'lb.hint':'← → navigate · ESC close','guard.note':'© Santiago Photography — protected images',
    'gate.pass':'Password','gate.enter':'Enter','gate.check':'Verifying…','gate.bad':'Wrong credentials','gate.ok':'Access granted'
  },
  pt:{
    'doc.title':'Santiago Fotografia — Capture o Instante',
    'nav.home':'Início','nav.portfolio':'Portfólio','nav.about':'Sobre mim','nav.contact':'Contato',
    'hero.kicker':'Santiago Fotografia — Est. 2015','hero.t1':'CAPTURE','hero.t2':'O','hero.t3':'INSTANTE',
    'hero.sub':'Cada imagem conta uma história única. Momentos que duram além do tempo.',
    'hero.cta':'Ver Portfólio','hero.works':'obras no arquivo','hero.scroll':'SCROLL',
    'port.kicker':'— Galeria','port.title':'Portfólio','port.note':'imagens · clique para ampliar',
    'lt.size':'Tamanho','lt.shuffle':'Aleatório','lt.reset':'Restaurar','lt.read':'<b>{c}</b> por fileira · {n} visíveis',
    'cat.all':'Tudo','cat.bn':'Preto e Branco','cat.ret':'Retratos','cat.got':'Gótico','cat.urb':'Urbano',
    'gal.empty':'— Sem imagens nesta categoria —','gal.error':'— Não foi possível carregar o arquivo —',
    'about.kicker':'— Sobre mim','about.title':'A história por trás da lente','about.tag':'Retrato / 35mm',
    'about.bio':'Sou Santiago, fotógrafo profissional com mais de uma década documentando a vida através da lente. Especializado em retratos, fotografia urbana e projetos editoriais com uma estética escura e cinematográfica.',
    'about.years':'Anos','about.projects':'Projetos','about.awards':'Prêmios',
    'contact.kicker':'— Contato','contact.title':'VAMOS FALAR',
    'contact.lead':'Retratos, editoriais, eventos e colaborações criativas. Escolha seu canal.',
    'contact.email':'Email','contact.write':'Escrever','contact.chat':'Conversar','contact.follow':'Seguir',
    'footer.legal':'Imagens protegidas · reprodução proibida',
    'lb.hint':'← → navegar · ESC fechar','guard.note':'© Santiago Fotografia — imagens protegidas',
    'gate.pass':'Senha','gate.enter':'Entrar','gate.check':'Verificando…','gate.bad':'Credenciais incorretas','gate.ok':'Acesso liberado'
  }
};
const CAT_KEY = { 'Blanco y Negro':'cat.bn', 'Retratos':'cat.ret', 'Gothic':'cat.got', 'Urbano':'cat.urb' };
const LANG_KEY = 'sp_lang';
let lang = 'es';
try { const s = localStorage.getItem(LANG_KEY); if (s && I18N[s]) lang = s; } catch(e){}
const t = (k, vars) => {
  let s = (I18N[lang] && I18N[lang][k]) || I18N.es[k] || k;
  if (vars) for (const [a,b] of Object.entries(vars)) s = s.replace(new RegExp('\\{'+a+'\\}','g'), b);
  return s;
};
const catLabel = c => CAT_KEY[c] ? t(CAT_KEY[c]) : (c || '');

function applyLang(){
  document.documentElement.lang = lang;
  document.title = t('doc.title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('.lang-switch button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  if (allImages.length || galleryEl.children.length){ renderCategories(); renderGallery(); }
  if (lb.classList.contains('open')) paintLbMeta();
  readColumns();
  if (bioFromDb) $('bioText').textContent = bioFromDb;
}
function setLang(l, persist = true){
  if (!I18N[l]) return;
  lang = l;
  if (persist){ try { localStorage.setItem(LANG_KEY, l); } catch(e){} }
  applyLang();
}
document.querySelectorAll('.lang-switch button').forEach(b => b.addEventListener('click', () => {
  setLang(b.dataset.lang);
  burger.classList.remove('open'); mob.classList.remove('open');
}));

/* ══════════ SCROLL LOCK (sin salto de layout) ══════════ */
let locks = 0;
function lockScroll(){
  if (locks++) return;
  const sw = innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (sw > 0){ document.body.style.paddingRight = sw + 'px'; const n = $('nav'); if (n) n.style.paddingRight = sw + 'px'; }
}
function unlockScroll(){
  if (--locks > 0) return;
  locks = 0;
  document.body.style.overflow = ''; document.body.style.paddingRight = '';
  const n = $('nav'); if (n) n.style.paddingRight = '';
}

/* ══════════ PROTECCIÓN ══════════ */
(function guard(){
  const note = $('guardNote'); let tm = null;
  const warn = () => { note.classList.add('show'); clearTimeout(tm); tm = setTimeout(() => note.classList.remove('show'), 1900); };
  document.addEventListener('contextmenu', e => {
    const el = e.target instanceof Element ? e.target : null;
    if (el && (el.tagName === 'IMG' || el.closest('.gallery-item,.hero,.about-photo,.lightbox'))){ e.preventDefault(); warn(); }
  });
  document.addEventListener('dragstart', e => {
    if (e.target instanceof Element && (e.target.tagName === 'IMG' || e.target.closest('.gallery-item,.hero-media'))) e.preventDefault();
  });
  document.addEventListener('selectstart', e => {
    if (e.target instanceof Element && e.target.closest('.gallery-item,.hero-media,.about-photo')) e.preventDefault();
  });
})();

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
    const el = e.target instanceof Element && e.target.closest('a,button,input,select,textarea,.gallery-item');
    ring.classList.toggle('active', !!el);
  }, { passive:true });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = 1; });
})();

/* ══════════ LOADER + GATE ══════════ */
const gate = $('langGate');
let hasLang = false;
try { hasLang = !!localStorage.getItem(LANG_KEY); } catch(e){ hasLang = true; }
function openGate(){
  const nav = (navigator.language || 'es').slice(0,2).toLowerCase();
  const guess = I18N[nav] ? nav : 'es';
  gate.querySelectorAll('.lg-opt').forEach(b => b.classList.toggle('suggest', b.dataset.lang === guess));
  gate.hidden = false; lockScroll();
}
function closeGate(){ gate.classList.add('hide'); unlockScroll(); setTimeout(() => { gate.hidden = true; }, 520); }
gate.querySelectorAll('.lg-opt').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.lang); closeGate(); }));

const hideLoader = () => $('loader')?.classList.add('hide');
addEventListener('load', () => setTimeout(() => { hideLoader(); if (!hasLang) openGate(); }, 850));
setTimeout(() => { hideLoader(); if (!hasLang && gate.hidden) openGate(); }, 2500);

/* ══════════ NAV ══════════ */
const nav = $('nav');
let navTick = false;
addEventListener('scroll', () => {
  if (navTick) return; navTick = true;
  requestAnimationFrame(() => { nav.classList.toggle('scrolled', scrollY > 40); navTick = false; });
}, { passive:true });
const links = [...document.querySelectorAll('.nav-links a')];
const secIO = new IntersectionObserver(es => es.forEach(en => {
  if (en.isIntersecting) links.forEach(l => l.classList.toggle('active', l.dataset.section === en.target.id));
}), { rootMargin:'-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => secIO.observe(s));
const burger = $('navBurger'), mob = $('mobileMenu');
burger.addEventListener('click', () => { burger.classList.toggle('open'); mob.classList.toggle('open'); });
mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { burger.classList.remove('open'); mob.classList.remove('open'); }));
$('year').textContent = new Date().getFullYear();

/* ══════════ REVEAL ══════════ */
const revealIO = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add('in'); revealIO.unobserve(e.target); }
}), { threshold:.05, rootMargin:'0px 0px -6% 0px' });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

/* ══════════ HERO ══════════ */
const hero = $('hero'), heroMedia = $('heroMedia'), heroBase = $('heroBase'), heroFull = $('heroFull');
const heroGrid = $('heroGrid'), heroGlows = $('heroGlows'), heroContent = $('heroContent');
let coverRow = null;
function frameStyle(img, row){
  const fx = Number.isFinite(row.focus_x) ? row.focus_x : 50;
  const fy = Number.isFinite(row.focus_y) ? row.focus_y : 50;
  const z  = Number.isFinite(row.cover_zoom) ? Math.max(1, row.cover_zoom) : 1;
  img.style.objectPosition = `${fx}% ${fy}%`;
  img.style.transform = `scale(${z})`;
}
function setCover(row){
  coverRow = row;
  if (!row){
    hero.classList.remove('has-photo'); heroMedia.hidden = true;
    heroBase.removeAttribute('src'); heroFull.removeAttribute('src'); heroFull.classList.remove('on');
    return;
  }
  hero.classList.add('has-photo'); heroMedia.hidden = false;
  heroFull.classList.remove('on');
  heroBase.src = row.thumb_url || row.image_url;
  frameStyle(heroBase, row); frameStyle(heroFull, row);
  const full = new Image();
  full.onload = () => { heroFull.src = row.image_url; frameStyle(heroFull, row); heroFull.classList.add('on'); };
  full.src = row.image_url;
}
(function parallax(){
  if (!finePointer || reduced) return;
  let tx=0, ty=0, cx=0, cy=0, raf=0;
  function loop(){
    cx += (tx-cx)*.07; cy += (ty-cy)*.07;
    heroMedia.style.transform   = `translate3d(${cx*15}px,${cy*11}px,0)`;
    heroGrid.style.transform    = `translate3d(${cx*-30}px,${cy*-22}px,0)`;
    heroGlows.style.transform   = `translate3d(${cx*46}px,${cy*34}px,0)`;
    heroContent.style.transform = `translate3d(${cx*-7}px,${cy*-5}px,0)`;
    if (Math.abs(tx-cx)>.001 || Math.abs(ty-cy)>.001) raf = requestAnimationFrame(loop); else raf = 0;
  }
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX-r.left)/r.width - .5)*2; ty = ((e.clientY-r.top)/r.height - .5)*2;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive:true });
  hero.addEventListener('mouseleave', () => { tx=0; ty=0; if(!raf) raf=requestAnimationFrame(loop); }, { passive:true });
})();

/* ══════════ GALERÍA ══════════ */
const SIZE_KEY = 'sp_size_v4';
const DEFAULT_SIZE = 250;
let size = DEFAULT_SIZE;
try { const s = +localStorage.getItem(SIZE_KEY); if (s >= 150 && s <= 620) size = s; } catch(e){}

const CATS = ['Todo','Blanco y Negro','Retratos','Gothic','Urbano'];
let allImages = [], activeCat = 'Todo', viewList = [], shuffled = null, bioFromDb = '';
const catsEl = $('categories'), galleryEl = $('gallery');
const tiles = new Map();

function applySize(){
  galleryEl.style.gridTemplateColumns = `repeat(auto-fill,minmax(min(${size}px,100%),1fr))`;
  galleryEl.style.setProperty('--cis', size + 'px');
  $('vSizeOut').textContent = size;
  $('vSize').value = size;
  readColumns();
}
let readRaf = 0;
function readColumns(){
  if (readRaf) return;
  readRaf = requestAnimationFrame(() => {
    readRaf = 0;
    const cols = getComputedStyle(galleryEl).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    $('ltRead').innerHTML = t('lt.read', { c: cols, n: viewList.length });
  });
}
new ResizeObserver(readColumns).observe(galleryEl);

function tileFor(row){
  let d = tiles.get(row.id);
  if (!d){
    d = document.createElement('div');
    d.className = 'gallery-item reveal';
    const im = document.createElement('img');
    im.loading = 'lazy'; im.decoding = 'async'; im.draggable = false;
    const ov = document.createElement('div'); ov.className = 'gallery-overlay';
    const lb = document.createElement('span'); const ic = document.createElement('i'); ic.textContent = '⤢';
    ov.append(lb, ic);
    const st = document.createElement('span'); st.className = 'gi-star'; st.textContent = '★';
    d.append(im, ov, st);
    d.addEventListener('click', () => { const i = viewList.indexOf(d._row); if (i >= 0) openFrom(viewList, i); });
    tiles.set(row.id, d);
    revealIO.observe(d);
  }
  d._row = row;
  const im = d.querySelector('img'), lb = d.querySelector('.gallery-overlay span'), st = d.querySelector('.gi-star');
  const src = row.thumb_url || row.image_url;
  if (im.getAttribute('src') !== src) im.src = src;
  im.alt = catLabel(row.category);
  lb.textContent = catLabel(row.category);
  st.hidden = !row.is_featured;
  return d;
}
function renderCategories(){
  const frag = document.createDocumentFragment();
  CATS.forEach(cat => {
    const n = cat === 'Todo' ? allImages.length : allImages.filter(i => i.category === cat).length;
    const b = document.createElement('button');
    b.className = 'cat-btn' + (cat === activeCat ? ' active' : '');
    const label = cat === 'Todo' ? t('cat.all') : catLabel(cat);
    b.innerHTML = `${label}<span class="cat-count">${n}</span>`;
    b.addEventListener('click', () => { activeCat = cat; renderCategories(); renderGallery(); });
    frag.appendChild(b);
  });
  catsEl.replaceChildren(frag);
}
function renderGallery(){
  let base = activeCat === 'Todo' ? [...allImages] : allImages.filter(i => i.category === activeCat);
  if (shuffled){
    const rank = new Map(shuffled.map((id,i) => [id,i]));
    base.sort((a,b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999));
  }
  viewList = base;
  $('portfolioCount').textContent = viewList.length;
  if (!viewList.length){
    galleryEl.innerHTML = `<div class="gallery-empty">${t('gal.empty')}</div>`;
    readColumns(); return;
  }
  const frag = document.createDocumentFragment();
  viewList.forEach((row,i) => {
    const d = tileFor(row);
    d.style.setProperty('--d', `${Math.min(i,10)*35}ms`);
    frag.appendChild(d);
  });
  galleryEl.replaceChildren(frag);
  readColumns();
}
async function loadImages(){
  const { data, error } = await supabase.from('portfolio_images').select('*').order('created_at',{ascending:false});
  if (error){ console.error(error); galleryEl.innerHTML = `<div class="gallery-empty">${t('gal.error')}</div>`; return; }
  allImages = data || [];
  const ids = new Set(allImages.map(r => r.id));
  [...tiles.keys()].forEach(id => { if (!ids.has(id)) tiles.delete(id); });
  $('heroCount').textContent = allImages.length;
  setCover(allImages.find(r => r.is_featured) || allImages[0] || null);
  renderCategories(); renderGallery();
}

$('vSize').addEventListener('input', e => {
  size = +e.target.value; applySize();
  try { localStorage.setItem(SIZE_KEY, size); } catch(err){}
});
$('vShuffle').addEventListener('click', () => {
  shuffled = allImages.map(r => r.id);
  for (let i = shuffled.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]] = [shuffled[j],shuffled[i]]; }
  renderGallery();
});
$('vReset').addEventListener('click', () => {
  size = DEFAULT_SIZE; shuffled = null; activeCat = 'Todo';
  applySize(); renderCategories(); renderGallery();
  try { localStorage.setItem(SIZE_KEY, size); } catch(err){}
});
applySize();

/* ══════════ LIGHTBOX ══════════ */
const lb = $('lightbox'), lbImg = $('lbImg'), lbThumb = $('lbThumb'), lbLoad = $('lbLoad');
let lbList = [], lbIdx = 0, lbToken = 0;
function paintLbMeta(){
  const row = lbList[lbIdx]; if (!row) return;
  $('lbCategory').textContent = (row.is_featured ? '★ ' : '') + catLabel(row.category);
  $('lbCounter').textContent = `${lbIdx+1} / ${lbList.length}`;
}
function openFrom(list, i){
  if (!list.length) return;
  const first = !lb.classList.contains('open');
  lbList = list; lbIdx = (i + list.length) % list.length;
  const row = lbList[lbIdx];
  paintLbMeta();
  const thumbSrc = row.thumb_url || row.image_url;
  if (lbThumb.getAttribute('src') !== thumbSrc) lbThumb.src = thumbSrc;
  const token = ++lbToken;
  if (lbImg.getAttribute('src') === row.image_url && lbImg.complete && lbImg.naturalWidth){
    lbImg.classList.add('on'); lbLoad.classList.remove('on');
  } else {
    lbImg.classList.remove('on'); lbLoad.classList.add('on');
    lbImg.src = row.image_url;
    const done = () => { if (token !== lbToken) return; lbImg.classList.add('on'); lbLoad.classList.remove('on'); };
    if (lbImg.decode) lbImg.decode().then(done).catch(() => { if (lbImg.complete) done(); });
    lbImg.onload = done;
    lbImg.onerror = () => { if (token === lbToken) lbLoad.classList.remove('on'); };
  }
  if (first){ lb.classList.add('open'); lockScroll(); }
  [1,-1].forEach(d => { const n = lbList[(lbIdx+d+lbList.length)%lbList.length]; if (n){ const p = new Image(); p.src = n.image_url; } });
}
function closeLightbox(){ if (!lb.classList.contains('open')) return; lb.classList.remove('open'); unlockScroll(); }
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
  if (Math.abs(dx) > 55) openFrom(lbList, lbIdx + (dx<0?1:-1));
  touchX = null;
}, { passive:true });

/* ══════════ PERFIL + CONTACTO ══════════ */
async function loadProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.profile_image) $('profileImg').src = publicUrl(data.profile_image);
  if (data.bio){ bioFromDb = data.bio; $('bioText').textContent = data.bio; }
}
async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.email){ $('cEmail').href='mailto:'+data.email; $('cEmailVal').textContent=data.email; }
  if (data.whatsapp){ $('cWhatsapp').href='https://wa.me/'+data.whatsapp.replace(/\D/g,''); $('cWhatsappVal').textContent=data.whatsapp; }
  if (data.instagram){
    const raw = data.instagram.trim();
    $('cInstagram').href = raw.startsWith('http') ? raw : 'https://instagram.com/'+raw.replace(/^@/,'');
    $('cInstagramVal').textContent = raw.startsWith('http') ? '@'+raw.replace(/\/+$/,'').split('/').pop() : (raw.startsWith('@')?raw:'@'+raw);
  }
  if (data.location) $('footLocation').textContent = data.location;
}

/* ══════════ ACCESO OCULTO ══════════ */
const modal = $('secretModal'), smMsg = $('smMsg');
let clicks = 0, clickTimer = null, modalOpen = false;
$('navLogo').addEventListener('click', e => {
  e.preventDefault();
  clicks++; clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { clicks = 0; }, 2200);
  if (clicks < 5) return;
  clicks = 0;
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) location.href = 'admin.html';
    else { modal.classList.add('open'); modalOpen = true; lockScroll(); smMsg.textContent=''; smMsg.className='sm-msg'; setTimeout(() => $('smEmail').focus(), 60); }
  });
});
function closeModal(){ if (!modalOpen) return; modalOpen = false; modal.classList.remove('open'); unlockScroll(); }
$('smClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('secretForm').addEventListener('submit', async e => {
  e.preventDefault();
  smMsg.className='sm-msg'; smMsg.textContent=t('gate.check');
  const { error } = await supabase.auth.signInWithPassword({ email:$('smEmail').value.trim(), password:$('smPass').value });
  if (error){ smMsg.className='sm-msg err'; smMsg.textContent=t('gate.bad'); return; }
  smMsg.className='sm-msg ok'; smMsg.textContent=t('gate.ok');
  location.href = 'admin.html';
});

/* ══════════ INIT ══════════ */
applyLang();
loadImages(); loadProfile(); loadSettings();