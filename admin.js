import { supabase, publicUrl } from './supabase.js';

/* ══════════ CURSOR ══════════ */
(function cursor(){
  const dot = document.querySelector('.cursor-dot'), ring = document.querySelector('.cursor-ring');
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches || !dot || !ring){ dot?.remove(); ring?.remove(); return; }
  document.documentElement.classList.add('has-cursor');
  let x=innerWidth/2, y=innerHeight/2, rx=x, ry=y, raf=0;
  const place=(el,px,py)=>{el.style.transform=`translate3d(${px}px,${py}px,0) translate(-50%,-50%)`;};
  place(dot,x,y); place(ring,x,y); dot.style.opacity=ring.style.opacity=1;
  function loop(){
    rx+=(x-rx)*.22; ry+=(y-ry)*.22; place(ring,rx,ry);
    if (Math.abs(x-rx)>.25||Math.abs(y-ry)>.25) raf=requestAnimationFrame(loop); else { place(ring,x,y); raf=0; }
  }
  addEventListener('mousemove', e=>{x=e.clientX;y=e.clientY;place(dot,x,y);if(!raf)raf=requestAnimationFrame(loop);},{passive:true});
  addEventListener('pointerdown',()=>ring.classList.add('down'),{passive:true});
  addEventListener('pointerup',()=>ring.classList.remove('down'),{passive:true});
  document.addEventListener('mouseover', e=>{
    const el = e.target instanceof Element && e.target.closest('a,button,input,select,textarea,.drop-zone,.ag-item,.fm-stage');
    ring.classList.toggle('active', !!el);
  },{passive:true});
  document.addEventListener('mouseleave',()=>{dot.style.opacity=ring.style.opacity=0;});
  document.addEventListener('mouseenter',()=>{dot.style.opacity=ring.style.opacity=1;});
})();

/* ══════════ HELPERS ══════════ */
const $ = id => document.getElementById(id);
const CATS = ['Blanco y Negro','Retratos','Gothic','Urbano'];
const CAT_COLOR = { 'Blanco y Negro':'#E9EFE9','Retratos':'#00FF41','Gothic':'#FF2D95','Urbano':'#00E5FF' };
const HEAVY = 3*1024*1024;
const SQL_TEXT = $('schemaSql').textContent.trim();
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));

let locks = 0;
function lockScroll(){
  if (locks++) return;
  const sw = innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow='hidden';
  if (sw>0) document.body.style.paddingRight = sw+'px';
}
function unlockScroll(){ if (--locks>0) return; locks=0; document.body.style.overflow=''; document.body.style.paddingRight=''; }

function toast(msg, type='ok', ms=3600){
  const el = document.createElement('div');
  el.className = 'toast' + (type==='ok'?'':' '+type);
  el.innerHTML = `<i>${type==='err'?'✕':type==='warn'?'!':'✓'}</i><span></span>`;
  el.querySelector('span').textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}
function uiConfirm(title, text, okLabel='Eliminar'){
  return new Promise(res => {
    const box = $('confirmBox');
    $('confirmTitle').textContent = title; $('confirmText').textContent = text; $('confirmOk').textContent = okLabel;
    box.classList.add('open'); lockScroll();
    const done = v => { box.classList.remove('open'); unlockScroll(); $('confirmOk').onclick = $('confirmCancel').onclick = box.onclick = null; res(v); };
    $('confirmOk').onclick = () => done(true);
    $('confirmCancel').onclick = () => done(false);
    box.onclick = e => { if (e.target === box) done(false); };
  });
}
const fmtBytes = n => {
  if (!n && n !== 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n/1024).toLocaleString('es-AR',{maximumFractionDigits:0}) + ' KB';
  return (n/1048576).toLocaleString('es-AR',{maximumFractionDigits:1}) + ' MB';
};
const weightClass = n => !n ? 'w-unknown' : n >= HEAVY ? 'w-heavy' : n >= 1048576 ? 'w-mid' : 'w-light';
const fmtOf = (type, url='') => {
  const ty = (type||'').toLowerCase();
  if (ty.includes('jpeg')||ty.includes('jpg')) return 'JPG';
  if (ty.includes('png')) return 'PNG';
  if (ty.includes('webp')) return 'WEBP';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (['jpg','jpeg'].includes(ext)) return 'JPG';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'OTRO';
};
const storagePath = url => {
  if (!url) return null;
  const m = '/object/public/portfolio/'; const i = url.indexOf(m);
  return decodeURIComponent(i>=0 ? url.slice(i+m.length) : (url.split('/portfolio/')[1]||'')) || null;
};
async function pool(items, limit, worker){
  const q = [...items];
  await Promise.all(Array.from({length:Math.min(limit,q.length)}, async () => { while(q.length) await worker(q.shift()); }));
}
const missingColumn = err => !!err && (err.code === '42703' || /column|schema cache|does not exist/i.test(err.message||''));

/* ══════════ ESQUEMA ══════════ */
let schemaOK = true;
async function checkSchema(){
  const { error } = await supabase.from('portfolio_images').select('id,is_featured,thumb_url,file_size,file_format,focus_x,focus_y,cover_zoom').limit(1);
  schemaOK = !error;
  $('schemaAlert').hidden = schemaOK;
  return schemaOK;
}
$('copySql').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(SQL_TEXT); toast('SQL copiado. Pegalo en Supabase → SQL Editor.'); }
  catch(e){
    const r = document.createRange(); r.selectNodeContents($('schemaSql'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    toast('Seleccionado: copiá con Ctrl+C.','warn');
  }
});
$('retrySchema').addEventListener('click', async () => {
  if (await checkSchema()){ toast('Esquema listo. Ya podés fijar y encuadrar la portada.'); await loadAdminGallery(); }
  else toast('Todavía falta ejecutar el SQL en Supabase.','err');
});

/* ══════════ IMAGEN ══════════ */
async function loadBitmap(file){
  if ('createImageBitmap' in window){ try { return await createImageBitmap(file); } catch(e){} }
  return await new Promise((res,rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { res(img); URL.revokeObjectURL(u); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
    img.src = u;
  });
}
async function makeThumb(file, max=900){
  try {
    const bmp = await loadBitmap(file);
    const w0 = bmp.width||bmp.naturalWidth, h0 = bmp.height||bmp.naturalHeight;
    if (!w0||!h0) return null;
    const s = Math.min(1, max/Math.max(w0,h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0*s); c.height = Math.round(h0*s);
    c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
    bmp.close?.();
    let blob = await new Promise(r => c.toBlob(r,'image/webp',.82));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => c.toBlob(r,'image/jpeg',.82));
    if (!blob || blob.size >= file.size) return null;
    return blob;
  } catch(e){ return null; }
}
const extOf = b => b.type==='image/webp'?'webp':b.type==='image/png'?'png':'jpg';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

/* ══════════ AUTH ══════════ */
const authWrap = $('authWrap'), dashboard = $('dashboard');
async function checkSession(){
  const { data } = await supabase.auth.getSession();
  if (data.session) showDashboard(data.session.user);
  else { authWrap.style.display='flex'; dashboard.hidden = true; }
}
async function showDashboard(user){
  authWrap.style.display='none'; dashboard.hidden=false;
  $('userEmail').textContent = user.email;
  await checkSchema();
  loadAdminGallery(); loadAdminProfile(); loadSettingsAdmin();
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('authMsg'), fd = new FormData(e.target);
  msg.className='auth-msg'; msg.textContent='Verificando…';
  const { data, error } = await supabase.auth.signInWithPassword({ email:fd.get('email'), password:fd.get('password') });
  if (error){ msg.className='auth-msg err'; msg.textContent='Credenciales incorrectas'; return; }
  msg.className='auth-msg ok'; msg.textContent='Acceso concedido';
  showDashboard(data.user);
});
$('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });

/* ══════════ TABS (sin re-render ni animación de entrada) ══════════ */
document.querySelectorAll('.dash-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-panel="${btn.dataset.tab}"]`).classList.add('active');
    $('dashTitle').textContent = btn.textContent.trim();
    if (btn.dataset.tab === 'stats') renderStats();
  });
});

/* ══════════ UPLOAD ══════════ */
const dropZone = $('dropZone'), fileInput = $('fileInput');
let pending = [], uploading = false;
dropZone.addEventListener('click', () => { if (!uploading) fileInput.click(); });
dropZone.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); } });
['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag'); }));
dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value=''; });

function handleFiles(list){
  const ok = ['image/jpeg','image/png','image/webp'];
  const files = [...list].filter(f => ok.includes(f.type));
  if (!files.length) return toast('Formato no admitido. Usá JPG, PNG o WEBP.','err');
  pending.forEach(p => URL.revokeObjectURL(p.url));
  pending = files.map(f => ({ file:f, url:URL.createObjectURL(f), state:'listo' }));
  renderQueue();
}
function renderQueue(){
  const q = $('uploadQueue'); q.replaceChildren();
  pending.forEach((p,i) => {
    const row = document.createElement('div'); row.className='uq-row'; row.dataset.i=i;
    const img = document.createElement('img'); img.className='uq-thumb'; img.src=p.url; img.alt='';
    const info = document.createElement('div');
    info.innerHTML = `<div class="uq-name"></div><div class="uq-sub">${fmtOf(p.file.type)} · ${fmtBytes(p.file.size)}</div>`;
    info.querySelector('.uq-name').textContent = p.file.name;
    const st = document.createElement('span');
    st.className = 'uq-state' + (p.state==='ok'?' ok':p.state==='error'?' err':p.state==='subiendo'?' work':'');
    st.textContent = p.state;
    row.append(img,info,st); q.appendChild(row);
  });
  const total = pending.reduce((a,p)=>a+p.file.size,0);
  $('uploadSummary').innerHTML = `<b>${pending.length}</b> archivos · ${fmtBytes(total)} · destino: ${$('uploadCategory').value}`;
  $('uploadOpts').hidden = pending.length === 0;
}
$('uploadCategory').addEventListener('change', () => { if (pending.length) renderQueue(); });
$('uploadClear').addEventListener('click', () => { pending.forEach(p=>URL.revokeObjectURL(p.url)); pending=[]; renderQueue(); $('uploadProgress').classList.remove('show'); });

$('uploadBtn').addEventListener('click', async () => {
  if (!pending.length || uploading) return;
  uploading = true; $('uploadBtn').setAttribute('disabled','');
  const category = $('uploadCategory').value;
  const prog = $('uploadProgress'), bar = prog.querySelector('.bar');
  prog.classList.add('show'); bar.style.width='0%';
  let done=0, failed=0, saved=0;
  for (let i=0;i<pending.length;i++){
    const p = pending[i]; p.state='subiendo';
    const st = document.querySelector(`.uq-row[data-i="${i}"] .uq-state`);
    if (st){ st.className='uq-state work'; st.textContent='subiendo'; }
    try {
      const id = uid(), ext = p.file.name.split('.').pop().toLowerCase();
      const up = await supabase.storage.from('portfolio').upload(`img/${id}.${ext}`, p.file, { cacheControl:'31536000' });
      if (up.error) throw up.error;
      let thumbUrl = null;
      const thumb = await makeThumb(p.file);
      if (thumb){
        const tu = await supabase.storage.from('portfolio').upload(`thumb/${id}.${extOf(thumb)}`, thumb, { cacheControl:'31536000' });
        if (!tu.error){ thumbUrl = publicUrl(tu.data.path); saved += p.file.size - thumb.size; }
      }
      const row = { title:null, category, image_url:publicUrl(up.data.path) };
      if (schemaOK){ row.thumb_url=thumbUrl; row.file_size=p.file.size; row.file_format=fmtOf(p.file.type,p.file.name); row.is_featured=false; }
      const ins = await supabase.from('portfolio_images').insert(row);
      if (ins.error) throw ins.error;
      p.state='ok'; if (st){ st.className='uq-state ok'; st.textContent='listo'; }
    } catch(err){
      console.error(err); failed++; p.state='error';
      if (st){ st.className='uq-state err'; st.textContent='error'; }
    }
    done++; bar.style.width = (done/pending.length*100)+'%';
  }
  uploading=false; $('uploadBtn').removeAttribute('disabled');
  if (failed) toast(`${done-failed} subidas, ${failed} con error.`,'warn',5000);
  else toast(`${done} foto${done>1?'s':''} subida${done>1?'s':''}${saved>0?' · miniaturas ahorran '+fmtBytes(saved):''}.`);
  setTimeout(() => { pending.forEach(p=>URL.revokeObjectURL(p.url)); pending=[]; renderQueue(); prog.classList.remove('show'); }, 1400);
  await loadAdminGallery();
});

/* ══════════ GALERÍA ══════════ */
let rows = [], selected = new Set(), metaRunning = false, heavyOnly = false;
const cards = new Map();

async function loadAdminGallery(){
  const { data, error } = await supabase.from('portfolio_images').select('*').order('created_at',{ascending:false});
  if (error){ toast('No se pudo leer la galería: '+error.message,'err'); return; }
  rows = data || [];
  const ids = new Set(rows.map(r=>r.id));
  [...cards.keys()].forEach(id => { if (!ids.has(id)) cards.delete(id); });
  renderAdminGallery(); renderStats();
  if (schemaOK) backfillMeta();
}
function filteredRows(){
  const cat = $('filterCategory').value, fmt = $('filterFormat').value, sort = $('sortBy').value;
  let list = rows.filter(r =>
    (!cat || r.category === cat) &&
    (!fmt || (r.file_format || fmtOf(null,r.image_url)) === fmt) &&
    (!heavyOnly || (r.file_size||0) >= HEAVY)
  );
  const w = r => r.file_size||0;
  if (sort==='heavy') list.sort((a,b)=>w(b)-w(a));
  else if (sort==='light') list.sort((a,b)=>w(a)-w(b));
  else if (sort==='cat') list.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||w(b)-w(a));
  return list;
}
function renderCover(){
  const manual = rows.find(r => r.is_featured);
  const row = manual || rows[0];
  const thumb = $('ccThumb');
  if (row){
    const src = row.thumb_url || row.image_url;
    if ($('coverImg').getAttribute('src') !== src) $('coverImg').src = src;
    thumb.classList.add('has-img');
    $('coverImg').style.objectPosition = `${row.focus_x ?? 50}% ${row.focus_y ?? 50}%`;
  } else { $('coverImg').removeAttribute('src'); thumb.classList.remove('has-img'); }
  $('coverTitle').textContent = row ? (manual ? 'Portada fija' : 'Portada automática') : 'Sin fotos todavía';
  const zoom = row ? Math.round((row.cover_zoom ?? 1) * 100) : 100;
  $('coverMeta').textContent = row
    ? `${row.category || '—'} · ${fmtBytes(row.file_size)} · zoom ${zoom}% · ${manual ? 'encuadre guardado' : 'se usa la más reciente'}`
    : 'Subí tu primera foto y ocupará el inicio automáticamente.';
  $('coverClear').hidden = !manual;
  $('coverFrame').hidden = !row;
}
function cardFor(r, max){
  let card = cards.get(r.id);
  if (!card){
    card = document.createElement('article');
    card.className = 'ag-item';
    const thumb = document.createElement('div'); thumb.className='ag-thumb';
    const im = document.createElement('img'); im.loading='lazy'; im.decoding='async';
    const cat = document.createElement('span'); cat.className='ag-cat';
    const check = document.createElement('button'); check.className='ag-check'; check.type='button'; check.textContent='✓'; check.setAttribute('aria-label','Seleccionar');
    const fav = document.createElement('button'); fav.className='ag-fav'; fav.type='button'; fav.textContent='★';
    const del = document.createElement('button'); del.className='ag-del'; del.type='button'; del.textContent='✕'; del.setAttribute('aria-label','Eliminar');
    const cv = document.createElement('span'); cv.className='ag-cover'; cv.textContent='Portada';
    thumb.append(im,cat,check,fav,del,cv);
    const meta = document.createElement('div'); meta.className='ag-meta';
    meta.innerHTML = `<span class="chip fmt"></span><span class="chip size"></span>`;
    const bar = document.createElement('div'); bar.className='ag-bar'; bar.innerHTML = '<i></i>';
    card.append(thumb,meta,bar);
    card.addEventListener('click', e => {
      if (e.target.closest('.ag-del') || e.target.closest('.ag-fav')) return;
      const row = card._row;
      selected.has(row.id) ? selected.delete(row.id) : selected.add(row.id);
      card.classList.toggle('selected', selected.has(row.id));
      syncBulk();
    });
    fav.addEventListener('click', e => { e.stopPropagation(); openFrame(card._row); });
    del.addEventListener('click', async e => { e.stopPropagation(); await deleteRows([card._row]); });
    cards.set(r.id, card);
  }
  card._row = r;
  card.dataset.id = r.id;
  card.classList.toggle('selected', selected.has(r.id));
  card.classList.toggle('is-cover', !!r.is_featured);
  const im = card.querySelector('img');
  const src = r.thumb_url || r.image_url;
  if (im.getAttribute('src') !== src) im.src = src;
  im.alt = r.category || 'Foto';
  im.style.objectPosition = `${r.focus_x ?? 50}% ${r.focus_y ?? 50}%`;
  card.querySelector('.ag-cat').textContent = r.category || '—';
  card.querySelector('.ag-cover').hidden = !r.is_featured;
  const fav = card.querySelector('.ag-fav');
  fav.classList.toggle('on', !!r.is_featured);
  fav.title = r.is_featured ? 'Reencuadrar portada' : 'Elegir como portada';
  const fmt = r.file_format || fmtOf(null, r.image_url);
  const fchip = card.querySelector('.chip.fmt');
  fchip.className = 'chip fmt f-' + (['JPG','PNG','WEBP'].includes(fmt)?fmt:'OTHER');
  fchip.textContent = fmt;
  const wc = weightClass(r.file_size);
  const schip = card.querySelector('.chip.size');
  schip.className = 'chip size ' + wc;
  schip.textContent = r.file_size ? fmtBytes(r.file_size) : (schemaOK ? 'analizando…' : '—');
  const bi = card.querySelector('.ag-bar i');
  bi.className = wc;
  bi.style.width = (r.file_size ? Math.max(4,(r.file_size/max)*100) : 0) + '%';
  return card;
}
function renderAdminGallery(){
  renderCover();
  const list = filteredRows();
  const gal = $('adminGallery');
  const max = Math.max(1, ...list.map(r => r.file_size||0));
  if (!list.length){
    gal.innerHTML = '<div class="ag-empty">— Sin resultados con estos filtros —</div>';
  } else {
    const frag = document.createDocumentFragment();
    list.forEach(r => frag.appendChild(cardFor(r, max)));
    gal.replaceChildren(frag);
  }
  const uniq = new Map();
  list.forEach(r => { if (!uniq.has(r.image_url)) uniq.set(r.image_url, r.file_size||0); });
  const total = [...uniq.values()].reduce((a,b)=>a+b,0);
  const heaviest = list.reduce((a,r)=>(r.file_size||0)>(a?.file_size||0)?r:a,null);
  const heavyCount = list.filter(r => (r.file_size||0) >= HEAVY).length;
  $('galSummary').innerHTML =
    `<span><b>${list.length}</b> de ${rows.length} fotos</span>
     <span>Peso <b class="hl">${fmtBytes(total)}</b></span>
     <span>Más pesada <b>${heaviest?.file_size?fmtBytes(heaviest.file_size):'—'}</b></span>
     <span class="${heavyCount?'warn':''}">Sobre 3 MB <b>${heavyCount}</b></span>`;
  const noThumb = schemaOK ? rows.filter(r => !r.thumb_url).length : 0;
  $('optimizeBtn').hidden = noThumb === 0;
  $('optCount').textContent = noThumb;
  syncBulk();
}
function syncBulk(){
  $('bulkBar').hidden = selected.size === 0;
  $('bulkCount').textContent = selected.size;
  const visible = filteredRows();
  const allSel = visible.length>0 && visible.every(r => selected.has(r.id));
  $('selectAllBtn').textContent = allSel ? 'Quitar selección' : 'Seleccionar todo';
  $('bulkFeature').disabled = selected.size !== 1;
}
['filterCategory','filterFormat','sortBy'].forEach(id => $(id).addEventListener('change', renderAdminGallery));
$('heavyToggle').addEventListener('click', () => {
  heavyOnly = !heavyOnly;
  $('heavyToggle').setAttribute('aria-pressed', String(heavyOnly));
  renderAdminGallery();
});
$('selectAllBtn').addEventListener('click', () => {
  const visible = filteredRows();
  const allSel = visible.length>0 && visible.every(r => selected.has(r.id));
  visible.forEach(r => allSel ? selected.delete(r.id) : selected.add(r.id));
  visible.forEach(r => cards.get(r.id)?.classList.toggle('selected', selected.has(r.id)));
  syncBulk();
});
$('bulkClear').addEventListener('click', () => {
  selected.forEach(id => cards.get(id)?.classList.remove('selected'));
  selected.clear(); syncBulk();
});

/* ══════════ ENCUADRE DE PORTADA ══════════ */
const fm = $('frameModal'), fmStage = $('fmStage'), fmImg = $('fmImg');
let fmRow = null, fx = 50, fy = 50, fz = 1, fmOpen = false;

function paintFrame(){
  fmImg.style.objectPosition = `${fx}% ${fy}%`;
  fmImg.style.transform = `scale(${fz})`;
  $('fmZoom').value = Math.round(fz*100);
  $('fmZoomOut').textContent = Math.round(fz*100) + '%';
  $('fmRead').textContent = `X ${Math.round(fx)} · Y ${Math.round(fy)}`;
}
function openFrame(row){
  if (!row) return;
  if (!schemaOK){
    $('schemaAlert').hidden = false;
    $('schemaAlert').scrollIntoView({ behavior:'smooth', block:'center' });
    return toast('Faltan columnas en la base. Ejecutá el SQL del cartel rojo.','err',5200);
  }
  fmRow = row;
  fx = Number.isFinite(row.focus_x) ? row.focus_x : 50;
  fy = Number.isFinite(row.focus_y) ? row.focus_y : 50;
  fz = Number.isFinite(row.cover_zoom) ? clamp(row.cover_zoom,1,2.6) : 1;
  fmImg.src = row.image_url;
  fm.classList.add('open'); fmOpen = true; lockScroll();
  paintFrame();
}
function closeFrame(){ if (!fmOpen) return; fmOpen = false; fm.classList.remove('open'); unlockScroll(); fmRow = null; }
$('fmClose').addEventListener('click', closeFrame);
$('fmCancel').addEventListener('click', closeFrame);
fm.addEventListener('click', e => { if (e.target === fm) closeFrame(); });
$('coverFrame').addEventListener('click', () => openFrame(rows.find(r=>r.is_featured) || rows[0]));
$('bulkFeature').addEventListener('click', () => { const l = selectedRows(); if (l.length===1) openFrame(l[0]); });

$('fmZoom').addEventListener('input', e => { fz = clamp(+e.target.value/100, 1, 2.6); paintFrame(); });
document.querySelectorAll('.fm-presets button').forEach(b => b.addEventListener('click', () => {
  fx = +b.dataset.fx; fy = +b.dataset.fy; paintFrame();
}));
$('fmReset').addEventListener('click', () => { fx = 50; fy = 50; fz = 1; paintFrame(); });
$('fmTextBtn').addEventListener('click', () => {
  const on = $('fmTextBtn').getAttribute('aria-pressed') !== 'true';
  $('fmTextBtn').setAttribute('aria-pressed', String(on));
  $('fmGhost').hidden = !on;
});
$('fmGridBtn').addEventListener('click', () => {
  const on = $('fmGridBtn').getAttribute('aria-pressed') !== 'true';
  $('fmGridBtn').setAttribute('aria-pressed', String(on));
  $('fmThirds').hidden = !on;
});
$('fmDesktop').addEventListener('click', () => {
  fmStage.classList.remove('mobile');
  $('fmDesktop').setAttribute('aria-pressed','true'); $('fmMobile').setAttribute('aria-pressed','false');
});
$('fmMobile').addEventListener('click', () => {
  fmStage.classList.add('mobile');
  $('fmMobile').setAttribute('aria-pressed','true'); $('fmDesktop').setAttribute('aria-pressed','false');
});

let dragging = false, sx = 0, sy = 0, sfx = 50, sfy = 50;
fmStage.addEventListener('pointerdown', e => {
  dragging = true; sx = e.clientX; sy = e.clientY; sfx = fx; sfy = fy;
  fmStage.classList.add('grabbing');
  fmStage.setPointerCapture(e.pointerId);
});
fmStage.addEventListener('pointermove', e => {
  if (!dragging) return;
  const r = fmStage.getBoundingClientRect();
  fx = clamp(sfx - ((e.clientX - sx)/r.width)*100, 0, 100);
  fy = clamp(sfy - ((e.clientY - sy)/r.height)*100, 0, 100);
  paintFrame();
});
const endDrag = e => {
  if (!dragging) return;
  dragging = false; fmStage.classList.remove('grabbing');
  try { fmStage.releasePointerCapture(e.pointerId); } catch(err){}
};
fmStage.addEventListener('pointerup', endDrag);
fmStage.addEventListener('pointercancel', endDrag);
fmStage.addEventListener('wheel', e => {
  e.preventDefault();
  fz = clamp(fz - e.deltaY*0.0016, 1, 2.6);
  paintFrame();
}, { passive:false });

addEventListener('keydown', e => {
  if (!fmOpen) return;
  if (e.key === 'Escape'){ closeFrame(); return; }
  const step = e.shiftKey ? 8 : 2;
  if (e.key === 'ArrowLeft'){ fx = clamp(fx-step,0,100); paintFrame(); e.preventDefault(); }
  if (e.key === 'ArrowRight'){ fx = clamp(fx+step,0,100); paintFrame(); e.preventDefault(); }
  if (e.key === 'ArrowUp'){ fy = clamp(fy-step,0,100); paintFrame(); e.preventDefault(); }
  if (e.key === 'ArrowDown'){ fy = clamp(fy+step,0,100); paintFrame(); e.preventDefault(); }
  if (e.key === '+' || e.key === '='){ fz = clamp(fz+.05,1,2.6); paintFrame(); }
  if (e.key === '-'){ fz = clamp(fz-.05,1,2.6); paintFrame(); }
});

$('fmSave').addEventListener('click', async () => {
  if (!fmRow) return;
  const row = fmRow;
  const btn = $('fmSave'); btn.setAttribute('disabled','');
  const patch = { is_featured:true, focus_x:Math.round(fx*10)/10, focus_y:Math.round(fy*10)/10, cover_zoom:Math.round(fz*100)/100 };
  const clear = await supabase.from('portfolio_images').update({ is_featured:false }).eq('is_featured', true).select();
  if (clear.error){
    btn.removeAttribute('disabled');
    if (missingColumn(clear.error)){ $('schemaAlert').hidden = false; closeFrame(); return toast('Falta la columna is_featured en Supabase.','err',5200); }
    return toast('No se pudo guardar: '+clear.error.message,'err',5200);
  }
  const res = await supabase.from('portfolio_images').update(patch).eq('id', row.id).select();
  btn.removeAttribute('disabled');
  if (res.error || !res.data?.length){
    if (missingColumn(res.error)){ $('schemaAlert').hidden = false; closeFrame(); return toast('Faltan columnas de encuadre. Ejecutá el SQL.','err',5200); }
    return toast('La base no confirmó el guardado. Revisá las políticas RLS de UPDATE.','err',6000);
  }
  rows.forEach(r => r.is_featured = (r.id === row.id));
  Object.assign(row, res.data[0]);
  closeFrame();
  renderAdminGallery();
  toast('★ Portada guardada con su encuadre.');
});
$('coverClear').addEventListener('click', async () => {
  const m = rows.find(r => r.is_featured); if (!m) return;
  const { error } = await supabase.from('portfolio_images').update({ is_featured:false }).eq('id', m.id).select();
  if (error) return toast('No se pudo quitar: '+error.message,'err');
  m.is_featured = false;
  renderAdminGallery();
  toast('Portada liberada: el inicio usa la más reciente.');
});

/* ══════════ METADATA ══════════ */
async function backfillMeta(){
  if (metaRunning || !schemaOK) return;
  const missing = rows.filter(r => !r.file_size || !r.file_format).slice(0,80);
  if (!missing.length) return;
  metaRunning = true;
  await pool(missing, 4, async r => {
    let size=null, type=null;
    try {
      const h = await fetch(r.image_url,{method:'HEAD'});
      if (h.ok){ size = +(h.headers.get('content-length')||0)||null; type = h.headers.get('content-type'); }
    } catch(e){}
    if (!size){
      try {
        const g = await fetch(r.image_url,{headers:{Range:'bytes=0-0'}});
        const cr = g.headers.get('content-range');
        if (cr) size = +cr.split('/')[1]||null;
        type = type || g.headers.get('content-type');
        g.body?.cancel?.();
      } catch(e){}
    }
    const patch = { file_format: fmtOf(type, r.image_url) };
    if (size) patch.file_size = size;
    Object.assign(r, patch);
    await supabase.from('portfolio_images').update(patch).eq('id', r.id);
    const card = cards.get(r.id);
    if (card && card.isConnected){
      const wc = weightClass(r.file_size);
      const chip = card.querySelector('.chip.size');
      chip.className = 'chip size ' + wc;
      chip.textContent = r.file_size ? fmtBytes(r.file_size) : '—';
      const max = Math.max(1, ...filteredRows().map(x=>x.file_size||0));
      const bi = card.querySelector('.ag-bar i');
      bi.className = wc; bi.style.width = (r.file_size?Math.max(4,(r.file_size/max)*100):0)+'%';
    }
  });
  metaRunning = false;
  renderCover(); renderStats();
}

/* ══════════ OPTIMIZAR ══════════ */
$('optimizeBtn').addEventListener('click', async () => {
  const targets = rows.filter(r => !r.thumb_url);
  if (!targets.length) return;
  const btn = $('optimizeBtn'); btn.setAttribute('disabled','');
  toast(`Generando ${targets.length} miniaturas…`,'warn',2600);
  let ok=0, fail=0;
  await pool(targets, 2, async r => {
    try {
      const res = await fetch(r.image_url);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const thumb = await makeThumb(blob);
      if (!thumb) throw new Error('encode');
      const up = await supabase.storage.from('portfolio').upload(`thumb/${uid()}.${extOf(thumb)}`, thumb, { cacheControl:'31536000' });
      if (up.error) throw up.error;
      const url = publicUrl(up.data.path);
      const { error } = await supabase.from('portfolio_images').update({ thumb_url:url, file_size:r.file_size||blob.size, file_format:r.file_format||fmtOf(blob.type,r.image_url) }).eq('id', r.id);
      if (error) throw error;
      r.thumb_url = url; ok++;
      const card = cards.get(r.id);
      if (card) card.querySelector('img').src = url;
    } catch(e){ console.error(e); fail++; }
    $('optCount').textContent = targets.length - (ok+fail);
  });
  btn.removeAttribute('disabled');
  toast(fail ? `${ok} miniaturas listas, ${fail} no se pudieron generar.` : `${ok} miniaturas listas. La web pública carga mucho más rápido.`, fail?'warn':'ok', 5200);
  renderAdminGallery(); renderStats();
});

/* ══════════ MASIVAS ══════════ */
const selectedRows = () => rows.filter(r => selected.has(r.id));
$('bulkApply').addEventListener('click', async () => {
  const list = selectedRows(); if (!list.length) return;
  const category = $('bulkCategory').value;
  const { data, error } = await supabase.from('portfolio_images').update({ category }).in('id', list.map(r=>r.id)).select();
  if (error || !data?.length) return toast('No se pudo mover: '+(error?.message||'sin confirmar'),'err');
  list.forEach(r => r.category = category);
  renderAdminGallery(); renderStats();
  toast(`${list.length} foto${list.length>1?'s':''} → ${category}`);
});
$('bulkDuplicate').addEventListener('click', async () => {
  const list = selectedRows(); if (!list.length) return;
  const category = $('bulkCategory').value;
  const copies = list.map(r => {
    const c = { title:null, category, image_url:r.image_url };
    if (schemaOK){ c.thumb_url=r.thumb_url; c.file_size=r.file_size; c.file_format=r.file_format; c.is_featured=false; c.focus_x=r.focus_x??50; c.focus_y=r.focus_y??50; c.cover_zoom=r.cover_zoom??1; }
    return c;
  });
  const { data, error } = await supabase.from('portfolio_images').insert(copies).select();
  if (error) return toast('No se pudo duplicar: '+error.message,'err');
  rows = [...(data||[]), ...rows];
  selected.clear();
  renderAdminGallery(); renderStats();
  toast(`${copies.length} copia${copies.length>1?'s':''} en ${category} (sin ocupar espacio extra)`);
});
$('bulkDelete').addEventListener('click', async () => { const l = selectedRows(); if (l.length) await deleteRows(l); });

async function deleteRows(list){
  const ok = await uiConfirm(`Eliminar ${list.length} foto${list.length>1?'s':''}`, 'Se borran del archivo y del servidor. Las copias que compartan el mismo archivo se conservan.');
  if (!ok) return;
  const ids = list.map(r=>r.id);
  const urls = [...new Set(list.map(r=>r.image_url))];
  const { data:refs } = await supabase.from('portfolio_images').select('id,image_url').in('image_url', urls);
  const idSet = new Set(ids);
  const keep = new Set((refs||[]).filter(r => !idSet.has(r.id)).map(r=>r.image_url));
  const { error } = await supabase.from('portfolio_images').delete().in('id', ids);
  if (error) return toast('No se pudo eliminar: '+error.message,'err');
  const paths = [];
  list.forEach(r => {
    if (keep.has(r.image_url)) return;
    const p = storagePath(r.image_url); if (p) paths.push(p);
    const th = storagePath(r.thumb_url); if (th) paths.push(th);
  });
  for (let i=0;i<paths.length;i+=100){
    const { error:se } = await supabase.storage.from('portfolio').remove(paths.slice(i,i+100));
    if (se) console.warn(se);
  }
  ids.forEach(id => { selected.delete(id); cards.delete(id); });
  rows = rows.filter(r => !idSet.has(r.id));
  renderAdminGallery(); renderStats();
  toast(`${list.length} foto${list.length>1?'s':''} eliminada${list.length>1?'s':''}.`);
}

/* ══════════ PERFIL ══════════ */
async function loadAdminProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (!data) return;
  if (data.profile_image) $('adminProfileImg').src = publicUrl(data.profile_image);
  if (data.bio) $('adminBio').value = data.bio;
}
$('profilePick').addEventListener('click', () => $('profileImgInput').click());
$('profileImgInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  e.target.value = '';
  toast('Procesando foto de perfil…','warn',2000);
  const optimized = (await makeThumb(file,1200)) || file;
  const { data, error } = await supabase.storage.from('portfolio').upload(`profile/${uid()}.${extOf(optimized)}`, optimized, { cacheControl:'31536000' });
  if (error) return toast('Error al subir: '+error.message,'err');
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  const { error:de } = existing.data
    ? await supabase.from('profile').update({ profile_image:data.path }).eq('id', existing.data.id)
    : await supabase.from('profile').insert({ profile_image:data.path });
  if (de) return toast('Error al guardar: '+de.message,'err');
  $('adminProfileImg').src = publicUrl(data.path);
  toast(`Foto de perfil actualizada · ${fmtBytes(optimized.size)}`);
});
$('saveProfile').addEventListener('click', async () => {
  const bio = $('adminBio').value.trim();
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  const { error } = existing.data
    ? await supabase.from('profile').update({ bio }).eq('id', existing.data.id)
    : await supabase.from('profile').insert({ bio });
  if (error) return toast('No se pudo guardar: '+error.message,'err');
  toast('Biografía guardada.');
});

/* ══════════ SETTINGS ══════════ */
async function loadSettingsAdmin(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  $('setEmail').value = data.email||'';
  $('setWhatsapp').value = data.whatsapp||'';
  $('setInstagram').value = data.instagram||'';
  $('setLocation').value = data.location||'';
}
$('saveSettings').addEventListener('click', async () => {
  const email = $('setEmail').value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('El email no es válido.','err');
  const obj = { email, whatsapp:$('setWhatsapp').value.trim(), instagram:$('setInstagram').value.trim(), location:$('setLocation').value.trim() };
  const existing = await supabase.from('settings').select('id').limit(1).maybeSingle();
  const { error } = existing.data
    ? await supabase.from('settings').update(obj).eq('id', existing.data.id)
    : await supabase.from('settings').insert(obj);
  if (error) return toast('No se pudo guardar: '+error.message,'err');
  toast('Canales de contacto actualizados.');
});

/* ══════════ STATS ══════════ */
function renderStats(){
  const uniq = new Map();
  rows.forEach(r => { if (!uniq.has(r.image_url)) uniq.set(r.image_url, r.file_size||0); });
  const total = [...uniq.values()].reduce((a,b)=>a+b,0);
  const heaviest = rows.reduce((m,r)=>Math.max(m,r.file_size||0),0);
  $('sTotal').textContent = rows.length;
  $('sWeight').textContent = fmtBytes(total);
  $('sHeavy').textContent = heaviest ? fmtBytes(heaviest) : '—';
  $('sThumbs').textContent = `${rows.filter(r=>r.thumb_url).length}/${rows.length}`;
  const maxCount = Math.max(1, ...CATS.map(c => rows.filter(r=>r.category===c).length));
  $('chartCats').innerHTML = CATS.map(c => {
    const items = rows.filter(r=>r.category===c);
    const w = items.reduce((a,r)=>a+(r.file_size||0),0);
    const col = CAT_COLOR[c];
    return `<div class="chart-row">
      <span class="chart-lbl">${c}</span>
      <span class="chart-track"><i style="width:${(items.length/maxCount)*100}%;background:${col};box-shadow:0 0 12px -2px ${col}"></i></span>
      <span class="chart-val">${items.length} <small>· ${fmtBytes(w)}</small></span>
    </div>`;
  }).join('');
  const colors = { JPG:'#00E5FF', PNG:'#FF2D95', WEBP:'#00FF41', OTRO:'#FFB020' };
  $('formatBreakdown').innerHTML = ['JPG','PNG','WEBP','OTRO'].map(f => {
    const items = rows.filter(r => (r.file_format||fmtOf(null,r.image_url)) === f);
    if (!items.length) return '';
    const w = items.reduce((a,r)=>a+(r.file_size||0),0);
    return `<div class="fmt-pill" style="border-color:${colors[f]}44"><b style="color:${colors[f]}">${items.length}</b><span>${f} · ${fmtBytes(w)}</span></div>`;
  }).join('') || '<p class="pe-note center">Todavía no hay fotos cargadas.</p>';
}

/* ══════════ INIT ══════════ */
checkSession();