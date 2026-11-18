import { supabase, publicUrl } from './supabase.js';

/* ══════════ CURSOR ══════════ */
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
  addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; place(dot, x, y); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('down'), { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('down'), { passive: true });
  document.addEventListener('mouseover', e => {
    const t = e.target instanceof Element && e.target.closest('a,button,input,select,textarea,.drop-zone,.ag-item');
    ring.classList.toggle('active', !!t);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { dot.style.opacity = ring.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = ring.style.opacity = 1; });
})();

/* ══════════ HELPERS UI ══════════ */
const $ = id => document.getElementById(id);
const CATS = ['Blanco y Negro', 'Retratos', 'Gothic', 'Urbano'];
const CAT_COLOR = { 'Blanco y Negro': '#E9EFE9', 'Retratos': '#00FF41', 'Gothic': '#FF2D95', 'Urbano': '#00E5FF' };
const HEAVY = 3 * 1024 * 1024;

function toast(msg, type = 'ok', ms = 3400){
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'ok' ? '' : ' ' + type);
  t.innerHTML = `<i>${type === 'err' ? '✕' : type === 'warn' ? '!' : '✓'}</i><span></span>`;
  t.querySelector('span').textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}
function uiConfirm(title, text, okLabel = 'Eliminar'){
  return new Promise(res => {
    const box = $('confirmBox');
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    $('confirmOk').textContent = okLabel;
    box.classList.add('open');
    const done = v => { box.classList.remove('open'); $('confirmOk').onclick = $('confirmCancel').onclick = null; res(v); };
    $('confirmOk').onclick = () => done(true);
    $('confirmCancel').onclick = () => done(false);
    box.onclick = e => { if (e.target === box) done(false); };
  });
}
const fmtBytes = n => {
  if (!n && n !== 0) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + ' KB';
  return (n / 1048576).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' MB';
};
const weightClass = n => !n ? 'w-unknown' : n >= HEAVY ? 'w-heavy' : n >= 1048576 ? 'w-mid' : 'w-light';
const fmtOf = (type, url = '') => {
  const t = (type || '').toLowerCase();
  if (t.includes('jpeg') || t.includes('jpg')) return 'JPG';
  if (t.includes('png')) return 'PNG';
  if (t.includes('webp')) return 'WEBP';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (['jpg', 'jpeg'].includes(ext)) return 'JPG';
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'OTRO';
};
const storagePath = url => {
  if (!url) return null;
  const marker = '/object/public/portfolio/';
  const i = url.indexOf(marker);
  return decodeURIComponent(i >= 0 ? url.slice(i + marker.length) : (url.split('/portfolio/')[1] || '')) || null;
};
async function pool(items, limit, worker){
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
}

/* ══════════ IMAGEN: miniatura ══════════ */
async function loadBitmap(file){
  if ('createImageBitmap' in window){ try { return await createImageBitmap(file); } catch(e){} }
  return await new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { res(img); URL.revokeObjectURL(u); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('decode')); };
    img.src = u;
  });
}
async function makeThumb(file, max = 900){
  try {
    const bmp = await loadBitmap(file);
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    if (!w0 || !h0) return null;
    const s = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    let blob = await new Promise(r => c.toBlob(r, 'image/webp', .82));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .82));
    if (!blob || blob.size >= file.size) return null;
    return blob;
  } catch(e){ return null; }
}
const extOf = blob => blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ══════════ AUTH ══════════ */
const authWrap = $('authWrap'), dashboard = $('dashboard');
async function checkSession(){
  const { data } = await supabase.auth.getSession();
  if (data.session) showDashboard(data.session.user);
  else { authWrap.style.display = 'flex'; dashboard.hidden = true; }
}
function showDashboard(user){
  authWrap.style.display = 'none';
  dashboard.hidden = false;
  $('userEmail').textContent = user.email;
  loadAdminGallery(); loadAdminProfile(); loadSettingsAdmin();
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('authMsg'), fd = new FormData(e.target);
  msg.className = 'auth-msg'; msg.textContent = 'Verificando…';
  const { data, error } = await supabase.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  if (error){ msg.className = 'auth-msg err'; msg.textContent = 'Credenciales incorrectas'; return; }
  msg.className = 'auth-msg ok'; msg.textContent = 'Acceso concedido';
  showDashboard(data.user);
});
$('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });

/* ══════════ TABS ══════════ */
document.querySelectorAll('.dash-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
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
dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileInput.click(); } });
['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag'); }));
dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

function handleFiles(list){
  const ok = ['image/jpeg', 'image/png', 'image/webp'];
  const files = [...list].filter(f => ok.includes(f.type));
  if (!files.length) return toast('Formato no admitido. Usá JPG, PNG o WEBP.', 'err');
  pending = files.map(f => ({ file: f, url: URL.createObjectURL(f), state: 'listo' }));
  renderQueue();
}
function renderQueue(){
  const q = $('uploadQueue');
  q.replaceChildren();
  pending.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'uq-row'; row.dataset.i = i;
    const img = document.createElement('img'); img.className = 'uq-thumb'; img.src = p.url; img.alt = '';
    const info = document.createElement('div');
    info.innerHTML = `<div class="uq-name"></div><div class="uq-sub">${fmtOf(p.file.type)} · ${fmtBytes(p.file.size)}</div>`;
    info.querySelector('.uq-name').textContent = p.file.name;
    const st = document.createElement('span');
    st.className = 'uq-state' + (p.state === 'ok' ? ' ok' : p.state === 'error' ? ' err' : p.state === 'subiendo' ? ' work' : '');
    st.textContent = p.state;
    row.append(img, info, st);
    q.appendChild(row);
  });
  const total = pending.reduce((a, p) => a + p.file.size, 0);
  $('uploadSummary').innerHTML = `<b>${pending.length}</b> archivos · ${fmtBytes(total)} · destino: ${$('uploadCategory').value}`;
  $('uploadOpts').hidden = pending.length === 0;
}
$('uploadCategory').addEventListener('change', () => { if (pending.length) renderQueue(); });
$('uploadClear').addEventListener('click', () => { pending.forEach(p => URL.revokeObjectURL(p.url)); pending = []; renderQueue(); $('uploadProgress').classList.remove('show'); });

$('uploadBtn').addEventListener('click', async () => {
  if (!pending.length || uploading) return;
  uploading = true;
  $('uploadBtn').setAttribute('disabled', '');
  const category = $('uploadCategory').value;
  const prog = $('uploadProgress'), bar = prog.querySelector('.bar');
  prog.classList.add('show'); bar.style.width = '0%';
  let done = 0, failed = 0, savedBytes = 0;

  for (let i = 0; i < pending.length; i++){
    const p = pending[i];
    p.state = 'subiendo';
    const st = document.querySelector(`.uq-row[data-i="${i}"] .uq-state`);
    if (st){ st.className = 'uq-state work'; st.textContent = 'subiendo'; }
    try {
      const id = uid();
      const ext = p.file.name.split('.').pop().toLowerCase();
      const origPath = `img/${id}.${ext}`;
      const up = await supabase.storage.from('portfolio').upload(origPath, p.file, { cacheControl: '31536000', upsert: false });
      if (up.error) throw up.error;

      let thumbUrl = null;
      const thumb = await makeThumb(p.file);
      if (thumb){
        const tp = `thumb/${id}.${extOf(thumb)}`;
        const tu = await supabase.storage.from('portfolio').upload(tp, thumb, { cacheControl: '31536000', upsert: false });
        if (!tu.error){ thumbUrl = publicUrl(tu.data.path); savedBytes += p.file.size - thumb.size; }
      }
      const ins = await supabase.from('portfolio_images').insert({
        title: null, category,
        image_url: publicUrl(up.data.path),
        thumb_url: thumbUrl,
        file_size: p.file.size,
        file_format: fmtOf(p.file.type, p.file.name)
      });
      if (ins.error) throw ins.error;
      p.state = 'ok';
      if (st){ st.className = 'uq-state ok'; st.textContent = 'listo'; }
    } catch(err){
      console.error(err); failed++; p.state = 'error';
      if (st){ st.className = 'uq-state err'; st.textContent = 'error'; }
    }
    done++;
    bar.style.width = (done / pending.length * 100) + '%';
  }

  uploading = false;
  $('uploadBtn').removeAttribute('disabled');
  if (failed) toast(`${done - failed} subidas, ${failed} con error.`, 'warn', 5000);
  else toast(`${done} foto${done > 1 ? 's' : ''} subida${done > 1 ? 's' : ''}${savedBytes > 0 ? ' · miniaturas ahorran ' + fmtBytes(savedBytes) : ''}.`);
  setTimeout(() => {
    pending.forEach(p => URL.revokeObjectURL(p.url));
    pending = []; renderQueue(); prog.classList.remove('show');
  }, 1400);
  await loadAdminGallery();
});

/* ══════════ GALERÍA ADMIN ══════════ */
let rows = [], selected = new Set(), metaRunning = false;

async function loadAdminGallery(){
  const { data, error } = await supabase.from('portfolio_images').select('*').order('created_at', { ascending: false });
  if (error){ toast('No se pudo leer la galería: ' + error.message, 'err'); return; }
  rows = data || [];
  renderAdminGallery();
  renderStats();
  backfillMeta();
}

function filteredRows(){
  const cat = $('filterCategory').value, fmt = $('filterFormat').value, sort = $('sortBy').value;
  let list = rows.filter(r =>
    (!cat || r.category === cat) &&
    (!fmt || (r.file_format || fmtOf(null, r.image_url)) === fmt) &&
    (!heavyOnly || (r.file_size || 0) >= HEAVY)
  );
  const w = r => r.file_size || 0;
  if (sort === 'heavy') list.sort((a, b) => w(b) - w(a));
  else if (sort === 'light') list.sort((a, b) => w(a) - w(b));
  else if (sort === 'cat') list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || w(b) - w(a));
  return list;
}
let heavyOnly = false;

function renderAdminGallery(){
  const list = filteredRows();
  const gal = $('adminGallery');
  const max = Math.max(1, ...list.map(r => r.file_size || 0));
  gal.replaceChildren();

  if (!list.length){
    gal.innerHTML = '<div class="ag-empty">— Sin resultados con estos filtros —</div>';
  } else {
    const frag = document.createDocumentFragment();
    list.forEach(r => {
      const fmt = r.file_format || fmtOf(null, r.image_url);
      const wc = weightClass(r.file_size);
      const card = document.createElement('article');
      card.className = 'ag-item' + (selected.has(r.id) ? ' selected' : '');
      card.dataset.id = r.id;
      const thumb = document.createElement('div'); thumb.className = 'ag-thumb';
      const im = document.createElement('img');
      im.src = r.thumb_url || r.image_url; im.alt = r.category || 'Foto'; im.loading = 'lazy'; im.decoding = 'async';
      const cat = document.createElement('span'); cat.className = 'ag-cat'; cat.textContent = r.category || '—';
      const check = document.createElement('button'); check.className = 'ag-check'; check.type = 'button'; check.textContent = '✓'; check.setAttribute('aria-label', 'Seleccionar');
      const del = document.createElement('button'); del.className = 'ag-del'; del.type = 'button'; del.textContent = '✕'; del.setAttribute('aria-label', 'Eliminar');
      thumb.append(im, cat, check, del);
      const meta = document.createElement('div'); meta.className = 'ag-meta';
      meta.innerHTML = `<span class="chip f-${['JPG','PNG','WEBP'].includes(fmt) ? fmt : 'OTHER'}">${fmt}</span>
        <span class="chip size ${wc}">${r.file_size ? fmtBytes(r.file_size) : 'analizando…'}</span>`;
      const bar = document.createElement('div'); bar.className = 'ag-bar';
      bar.innerHTML = `<i class="${wc}" style="width:${r.file_size ? Math.max(4, (r.file_size / max) * 100) : 0}%"></i>`;
      card.append(thumb, meta, bar);

      card.addEventListener('click', e => {
        if (e.target.closest('.ag-del')) return;
        selected.has(r.id) ? selected.delete(r.id) : selected.add(r.id);
        card.classList.toggle('selected', selected.has(r.id));
        syncBulk();
      });
      del.addEventListener('click', async e => { e.stopPropagation(); await deleteRows([r]); });
      frag.appendChild(card);
    });
    gal.appendChild(frag);
  }

  const uniq = new Map();
  list.forEach(r => { if (!uniq.has(r.image_url)) uniq.set(r.image_url, r.file_size || 0); });
  const total = [...uniq.values()].reduce((a, b) => a + b, 0);
  const heaviest = list.reduce((a, r) => (r.file_size || 0) > (a?.file_size || 0) ? r : a, null);
  const heavyCount = list.filter(r => (r.file_size || 0) >= HEAVY).length;
  $('galSummary').innerHTML =
    `<span><b>${list.length}</b> de ${rows.length} fotos</span>
     <span>Peso <b class="hl">${fmtBytes(total)}</b></span>
     <span>Más pesada <b>${heaviest?.file_size ? fmtBytes(heaviest.file_size) : '—'}</b></span>
     <span class="${heavyCount ? 'warn' : ''}">Sobre 3 MB <b>${heavyCount}</b></span>`;

  const noThumb = rows.filter(r => !r.thumb_url).length;
  $('optimizeBtn').hidden = noThumb === 0;
  $('optCount').textContent = noThumb;
  syncBulk();
}

function syncBulk(){
  const n = selected.size;
  $('bulkBar').hidden = n === 0;
  $('bulkCount').textContent = n;
  const visible = filteredRows();
  const allSel = visible.length > 0 && visible.every(r => selected.has(r.id));
  $('selectAllBtn').textContent = allSel ? 'Quitar selección' : 'Seleccionar todo';
}

['filterCategory', 'filterFormat', 'sortBy'].forEach(id => $(id).addEventListener('change', renderAdminGallery));
$('heavyToggle').addEventListener('click', () => {
  heavyOnly = !heavyOnly;
  $('heavyToggle').setAttribute('aria-pressed', String(heavyOnly));
  renderAdminGallery();
});
$('selectAllBtn').addEventListener('click', () => {
  const visible = filteredRows();
  const allSel = visible.length > 0 && visible.every(r => selected.has(r.id));
  visible.forEach(r => allSel ? selected.delete(r.id) : selected.add(r.id));
  renderAdminGallery();
});
$('bulkClear').addEventListener('click', () => { selected.clear(); renderAdminGallery(); });

/* ── metadata faltante (fotos viejas) ── */
async function backfillMeta(){
  if (metaRunning) return;
  const missing = rows.filter(r => !r.file_size || !r.file_format).slice(0, 80);
  if (!missing.length) return;
  metaRunning = true;
  await pool(missing, 4, async r => {
    let size = null, type = null;
    try {
      const h = await fetch(r.image_url, { method: 'HEAD' });
      if (h.ok){ size = +(h.headers.get('content-length') || 0) || null; type = h.headers.get('content-type'); }
    } catch(e){}
    if (!size){
      try {
        const g = await fetch(r.image_url, { headers: { Range: 'bytes=0-0' } });
        const cr = g.headers.get('content-range');
        if (cr) size = +cr.split('/')[1] || null;
        type = type || g.headers.get('content-type');
        g.body?.cancel?.();
      } catch(e){}
    }
    const patch = {};
    if (size) patch.file_size = size;
    patch.file_format = fmtOf(type, r.image_url);
    Object.assign(r, patch);
    if (patch.file_size || patch.file_format) await supabase.from('portfolio_images').update(patch).eq('id', r.id);
    const card = document.querySelector(`.ag-item[data-id="${r.id}"]`);
    if (card){
      const chip = card.querySelector('.chip.size');
      const wc = weightClass(r.file_size);
      if (chip){ chip.className = 'chip size ' + wc; chip.textContent = r.file_size ? fmtBytes(r.file_size) : '—'; }
      const fchip = card.querySelector('.ag-meta .chip');
      if (fchip){ const f = r.file_format; fchip.className = 'chip f-' + (['JPG','PNG','WEBP'].includes(f) ? f : 'OTHER'); fchip.textContent = f; }
    }
  });
  metaRunning = false;
  renderAdminGallery();
}

/* ── optimizar miniaturas de fotos viejas ── */
$('optimizeBtn').addEventListener('click', async () => {
  const targets = rows.filter(r => !r.thumb_url);
  if (!targets.length) return;
  const btn = $('optimizeBtn');
  btn.setAttribute('disabled', '');
  toast(`Generando ${targets.length} miniaturas…`, 'warn', 2600);
  let ok = 0, fail = 0;
  await pool(targets, 2, async r => {
    try {
      const res = await fetch(r.image_url);
      if (!res.ok) throw new Error('fetch');
      const blob = await res.blob();
      const thumb = await makeThumb(blob);
      if (!thumb) throw new Error('encode');
      const path = `thumb/${uid()}.${extOf(thumb)}`;
      const up = await supabase.storage.from('portfolio').upload(path, thumb, { cacheControl: '31536000' });
      if (up.error) throw up.error;
      const url = publicUrl(up.data.path);
      const { error } = await supabase.from('portfolio_images').update({ thumb_url: url, file_size: r.file_size || blob.size, file_format: r.file_format || fmtOf(blob.type, r.image_url) }).eq('id', r.id);
      if (error) throw error;
      r.thumb_url = url; ok++;
    } catch(e){ console.error(e); fail++; }
    $('optCount').textContent = targets.length - (ok + fail);
  });
  btn.removeAttribute('disabled');
  toast(fail ? `${ok} miniaturas listas, ${fail} no se pudieron generar.` : `${ok} miniaturas listas. La web pública ahora carga mucho más rápido.`, fail ? 'warn' : 'ok', 5200);
  renderAdminGallery(); renderStats();
});

/* ── acciones masivas ── */
const selectedRows = () => rows.filter(r => selected.has(r.id));

$('bulkApply').addEventListener('click', async () => {
  const list = selectedRows(); if (!list.length) return;
  const category = $('bulkCategory').value;
  const { error } = await supabase.from('portfolio_images').update({ category }).in('id', list.map(r => r.id));
  if (error) return toast('No se pudo mover: ' + error.message, 'err');
  list.forEach(r => r.category = category);
  toast(`${list.length} foto${list.length > 1 ? 's' : ''} → ${category}`);
  renderAdminGallery(); renderStats();
});

$('bulkDuplicate').addEventListener('click', async () => {
  const list = selectedRows(); if (!list.length) return;
  const category = $('bulkCategory').value;
  const copies = list.map(r => ({ title: null, category, image_url: r.image_url, thumb_url: r.thumb_url, file_size: r.file_size, file_format: r.file_format }));
  const { data, error } = await supabase.from('portfolio_images').insert(copies).select();
  if (error) return toast('No se pudo duplicar: ' + error.message, 'err');
  rows = [...(data || []), ...rows];
  selected.clear();
  toast(`${copies.length} copia${copies.length > 1 ? 's' : ''} en ${category} (sin ocupar espacio extra)`);
  renderAdminGallery(); renderStats();
});

$('bulkDelete').addEventListener('click', async () => {
  const list = selectedRows(); if (!list.length) return;
  await deleteRows(list);
});

async function deleteRows(list){
  const ok = await uiConfirm(
    `Eliminar ${list.length} foto${list.length > 1 ? 's' : ''}`,
    'Se borran del archivo y del servidor. Las copias que compartan el mismo archivo se conservan.'
  );
  if (!ok) return;
  const ids = list.map(r => r.id);
  const urls = [...new Set(list.map(r => r.image_url))];
  const { data: refs } = await supabase.from('portfolio_images').select('id,image_url').in('image_url', urls);
  const idSet = new Set(ids);
  const keep = new Set((refs || []).filter(r => !idSet.has(r.id)).map(r => r.image_url));

  const { error } = await supabase.from('portfolio_images').delete().in('id', ids);
  if (error) return toast('No se pudo eliminar: ' + error.message, 'err');

  const paths = [];
  list.forEach(r => {
    if (keep.has(r.image_url)) return;
    const p = storagePath(r.image_url); if (p) paths.push(p);
    const t = storagePath(r.thumb_url); if (t) paths.push(t);
  });
  for (let i = 0; i < paths.length; i += 100){
    const chunk = paths.slice(i, i + 100);
    const { error: se } = await supabase.storage.from('portfolio').remove(chunk);
    if (se) console.warn(se);
  }
  ids.forEach(id => selected.delete(id));
  rows = rows.filter(r => !idSet.has(r.id));
  toast(`${list.length} foto${list.length > 1 ? 's' : ''} eliminada${list.length > 1 ? 's' : ''}.`);
  renderAdminGallery(); renderStats();
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
  toast('Procesando foto de perfil…', 'warn', 2000);
  const optimized = (await makeThumb(file, 1200)) || file;
  const path = `profile/${uid()}.${extOf(optimized)}`;
  const { data, error } = await supabase.storage.from('portfolio').upload(path, optimized, { cacheControl: '31536000' });
  if (error) return toast('Error al subir: ' + error.message, 'err');
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  const q = existing.data
    ? supabase.from('profile').update({ profile_image: data.path }).eq('id', existing.data.id)
    : supabase.from('profile').insert({ profile_image: data.path });
  const { error: de } = await q;
  if (de) return toast('Error al guardar: ' + de.message, 'err');
  $('adminProfileImg').src = publicUrl(data.path);
  toast(`Foto de perfil actualizada · ${fmtBytes(optimized.size)}`);
});
$('saveProfile').addEventListener('click', async () => {
  const bio = $('adminBio').value.trim();
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  const { error } = existing.data
    ? await supabase.from('profile').update({ bio }).eq('id', existing.data.id)
    : await supabase.from('profile').insert({ bio });
  if (error) return toast('No se pudo guardar: ' + error.message, 'err');
  toast('Biografía guardada.');
});

/* ══════════ SETTINGS ══════════ */
async function loadSettingsAdmin(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (!data) return;
  $('setEmail').value = data.email || '';
  $('setWhatsapp').value = data.whatsapp || '';
  $('setInstagram').value = data.instagram || '';
  $('setLocation').value = data.location || '';
}
$('saveSettings').addEventListener('click', async () => {
  const email = $('setEmail').value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('El email no es válido.', 'err');
  const obj = { email, whatsapp: $('setWhatsapp').value.trim(), instagram: $('setInstagram').value.trim(), location: $('setLocation').value.trim() };
  const existing = await supabase.from('settings').select('id').limit(1).maybeSingle();
  const { error } = existing.data
    ? await supabase.from('settings').update(obj).eq('id', existing.data.id)
    : await supabase.from('settings').insert(obj);
  if (error) return toast('No se pudo guardar: ' + error.message, 'err');
  toast('Canales de contacto actualizados.');
});

/* ══════════ STATS ══════════ */
function renderStats(){
  const uniq = new Map();
  rows.forEach(r => { if (!uniq.has(r.image_url)) uniq.set(r.image_url, r.file_size || 0); });
  const total = [...uniq.values()].reduce((a, b) => a + b, 0);
  const heaviest = rows.reduce((m, r) => Math.max(m, r.file_size || 0), 0);
  $('sTotal').textContent = rows.length;
  $('sWeight').textContent = fmtBytes(total);
  $('sHeavy').textContent = heaviest ? fmtBytes(heaviest) : '—';
  $('sThumbs').textContent = `${rows.filter(r => r.thumb_url).length}/${rows.length}`;

  const maxCount = Math.max(1, ...CATS.map(c => rows.filter(r => r.category === c).length));
  $('chartCats').innerHTML = CATS.map(c => {
    const items = rows.filter(r => r.category === c);
    const w = items.reduce((a, r) => a + (r.file_size || 0), 0);
    const col = CAT_COLOR[c];
    return `<div class="chart-row">
      <span class="chart-lbl">${c}</span>
      <span class="chart-track"><i style="width:${(items.length / maxCount) * 100}%;background:${col};box-shadow:0 0 12px -2px ${col}"></i></span>
      <span class="chart-val">${items.length} <small>· ${fmtBytes(w)}</small></span>
    </div>`;
  }).join('');

  const formats = ['JPG', 'PNG', 'WEBP', 'OTRO'];
  const colors = { JPG: '#00E5FF', PNG: '#FF2D95', WEBP: '#00FF41', OTRO: '#FFB020' };
  $('formatBreakdown').innerHTML = formats.map(f => {
    const items = rows.filter(r => (r.file_format || fmtOf(null, r.image_url)) === f);
    if (!items.length) return '';
    const w = items.reduce((a, r) => a + (r.file_size || 0), 0);
    return `<div class="fmt-pill" style="border-color:${colors[f]}44">
      <b style="color:${colors[f]}">${items.length}</b><span>${f} · ${fmtBytes(w)}</span>
    </div>`;
  }).join('') || '<p class="pe-note">Todavía no hay fotos cargadas.</p>';
}

/* ══════════ INIT ══════════ */
checkSession();