import { supabase, publicUrl } from './supabase.js';

/* ── CURSOR ────────────────────────────────────────────── */
const _dot  = document.querySelector('.cursor-dot');
const _ring = document.querySelector('.cursor-ring');
if (_dot && _ring && window.innerWidth > 900) {
  let mx=window.innerWidth/2, my=window.innerHeight/2, rx=mx, ry=my;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    _dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`;
  }, { passive:true });
  (function loop(){ rx+=(mx-rx)*.15; ry+=(my-ry)*.15;
    _ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop); })();
  document.querySelectorAll('a,button,input,select,textarea,.ag-item,.drop-zone').forEach(el=>{
    el.addEventListener('mouseenter',()=>_ring.classList.add('active'),{passive:true});
    el.addEventListener('mouseleave',()=>_ring.classList.remove('active'),{passive:true});
  });
} else if (_dot&&_ring){_dot.style.display='none';_ring.style.display='none';}

const authWrap = document.getElementById('authWrap');
const dashboard = document.getElementById('dashboard');

/* ============ AUTH ============ */
async function checkSession(){
  const { data } = await supabase.auth.getSession();
  if (data.session) showDashboard(data.session.user);
  else { authWrap.style.display = 'flex'; dashboard.style.display = 'none'; }
}
function showDashboard(user){
  authWrap.style.display = 'none'; dashboard.style.display = 'grid';
  document.getElementById('userEmail').textContent = user.email;
  loadAdminData();
}
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('authMsg');
  const fd = new FormData(e.target);
  msg.className = 'auth-msg'; msg.textContent = 'Verificando...';
  const { error } = await supabase.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
  if (error) { msg.className = 'auth-msg err'; msg.textContent = 'Credenciales incorrectas'; }
  else { msg.className = 'auth-msg ok'; msg.textContent = '¡Bienvenido!'; showDashboard((await supabase.auth.getSession()).data.session.user); }
});
document.getElementById('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });

/* ============ TABS ============ */
document.querySelectorAll('.dash-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelector(`[data-panel="${tab}"]`).classList.add('active');
    document.getElementById('dashTitle').textContent = btn.textContent.trim();
    if (tab === 'gallery') loadAdminGallery();
    if (tab === 'stats') loadStats();
  });
});

/* ============ UPLOAD ============ */
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadOpts = document.getElementById('uploadOpts');
const uploadQueue = document.getElementById('uploadQueue');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
let pendingFiles = [];

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag'); handleFiles(e.dataTransfer.files); });
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleFiles(files){
  const allowed = ['image/jpeg','image/png','image/webp'];
  pendingFiles = Array.from(files).filter(f => allowed.includes(f.type));
  if (!pendingFiles.length) return alert('Solo JPG, PNG o WEBP');
  uploadOpts.style.display = 'flex';
  uploadQueue.innerHTML = '';
  pendingFiles.forEach(f => {
    const div = document.createElement('div');
    div.className = 'uq-item';
    div.style.backgroundImage = `url(${URL.createObjectURL(f)})`;
    uploadQueue.appendChild(div);
  });
}

uploadBtn.addEventListener('click', async () => {
  if (!pendingFiles.length) return;
  const category = document.getElementById('uploadCategory').value;
  uploadProgress.classList.add('show');
  uploadProgress.innerHTML = '<div class="bar"></div>';
  const bar = uploadProgress.querySelector('.bar');
  let done = 0;
  for (const file of pendingFiles) {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    const { data, error } = await supabase.storage.from('portfolio').upload(fileName, file, { cacheControl: '3600' });
    if (error) { console.error(error); continue; }
    await supabase.from('portfolio_images').insert({ title: null, category, image_url: publicUrl(data.path) });
    done++; bar.style.width = (done/pendingFiles.length*100)+'%';
  }
  setTimeout(() => {
    uploadProgress.classList.remove('show');
    uploadOpts.style.display = 'none';
    pendingFiles = []; uploadQueue.innerHTML = '';
    alert('¡Subido con éxito!');
    loadAdminGallery(); loadStats();
  }, 600);
});

/* ============ GALERÍA + BORRADO MÚLTIPLE ============ */
let adminImages = [];
const CAT_LIST = ['Blanco y Negro','Retratos','Gothic','Urbano'];

async function loadAdminGallery(){
  const filter = document.getElementById('filterCategory').value;
  // Siempre cargar todo, filtrar en JS para soportar multi-categoría
  const { data } = await supabase
    .from('portfolio_images').select('*').order('created_at', { ascending: false });
  let all = data || [];

  // Deduplicar por ID
  all = all.filter((img,i,arr) => arr.findIndex(x=>x.id===img.id)===i);

  // Filtrar usando el array de categorías (no solo la primaria)
  if (filter) {
    all = all.filter(img => {
      const cats = (img.categories && img.categories.length > 0) ? img.categories : [img.category];
      return cats.includes(filter);
    });
  }

  adminImages = all;
  const gal = document.getElementById('adminGallery');
  gal.innerHTML = '';
  adminImages.forEach(img => {
    const cats = (img.categories && img.categories.length > 0) ? img.categories : [img.category];
    const catTags = cats.map(c=>`<span class="cat-tag">${c}</span>`).join('');
    const div = document.createElement('div');
    div.className = 'ag-item';
    div.dataset.id = img.id;
    div.innerHTML = `
      <img src="${img.image_url}" alt="">
      <div class="ag-cats">${catTags}</div>
      <button class="ag-select" type="button" title="Seleccionar" aria-label="Seleccionar imagen"></button>
      <button class="ag-del" title="Eliminar">✕</button>
      <div class="ag-cat-editor" style="display:none">
        ${CAT_LIST.map(c=>`
          <label class="cat-check">
            <input type="checkbox" value="${c}" ${cats.includes(c)?'checked':''}>
            ${c}
          </label>`).join('')}
        <button class="btn btn-primary btn-sm ag-save-cats" style="margin-top:8px">Guardar</button>
      </div>
    `;
    // Toggle cat editor on click
    div.addEventListener('click', e => {
      if (e.target.closest('.ag-del,.ag-select,.ag-save-cats,.cat-check')) return;
      const editor = div.querySelector('.ag-cat-editor');
      const isOpen = editor.style.display !== 'none';
      document.querySelectorAll('.ag-cat-editor').forEach(ed=>ed.style.display='none');
      editor.style.display = isOpen ? 'none' : 'flex';
    });
    div.querySelector('.ag-select').addEventListener('click', e => {
      e.stopPropagation();
      div.classList.toggle('selected');
      updateSelectedCount();
    });
    // Save categories
    div.querySelector('.ag-save-cats').addEventListener('click', async e => {
      e.stopPropagation();
      const selected = [...div.querySelectorAll('.cat-check input:checked')].map(i=>i.value);
      if (!selected.length) return alert('Seleccioná al menos una categoría');
      const btn = div.querySelector('.ag-save-cats');
      btn.textContent = 'Guardando...'; btn.disabled = true;
      const { error } = await supabase.from('portfolio_images')
        .update({ category: selected[0], categories: selected })
        .eq('id', img.id);
      btn.textContent = 'Guardar'; btn.disabled = false;
      if (error) { alert('Error: ' + error.message + '\n\nAsegurate de correr el SQL en Supabase'); return; }
      img.categories = selected; img.category = selected[0];
      div.querySelector('.ag-cats').innerHTML = selected.map(c=>`<span class="cat-tag">${c}</span>`).join('');
      div.querySelector('.ag-cat-editor').style.display = 'none';
      btn.textContent = '✓ Guardado';
    });
    div.querySelector('.ag-del').addEventListener('click', e => { e.stopPropagation(); deleteImg(img); });
    gal.appendChild(div);
  });
  updateSelectedCount();
}
document.getElementById('filterCategory').addEventListener('change', loadAdminGallery);

function updateSelectedCount(){
  const c = document.querySelectorAll('.ag-item.selected').length;
  const el = document.getElementById('selectedCount');
  if (el) el.textContent = c;
}

document.getElementById('deleteSelectedBtn')?.addEventListener('click', async e => {
  const selected = [...document.querySelectorAll('.ag-item.selected')];
  if (!selected.length) return alert('Selecciona imágenes para eliminar');
  if (!confirm(`¿Eliminar ${selected.length} imágenes?`)) return;
  const btn = e.currentTarget;
  btn.disabled = true;
  await Promise.all(selected.map(async el => {
    const id = parseInt(el.dataset.id);
    const img = adminImages.find(i => i.id === id);
    if (img) {
      const path = img.image_url.split('/portfolio/')[1];
      if (path) await supabase.storage.from('portfolio').remove([path]);
      await supabase.from('portfolio_images').delete().eq('id', img.id);
    }
  }));
  btn.disabled = false;
  loadAdminGallery();
  loadStats();
});

async function deleteImg(img){
  if (!confirm('¿Eliminar esta imagen?')) return;
  const path = img.image_url.split('/portfolio/')[1];
  if (path) await supabase.storage.from('portfolio').remove([path]);
  await supabase.from('portfolio_images').delete().eq('id', img.id);
  loadAdminGallery(); loadStats();
}

/* ============ PERFIL & SETTINGS ============ */
async function loadAdminProfile(){
  const { data } = await supabase.from('profile').select('*').limit(1).maybeSingle();
  if (data) {
    if (data.profile_image) document.getElementById('adminProfileImg').src = publicUrl(data.profile_image);
    if (data.bio) document.getElementById('adminBio').value = data.bio;
  }
}
document.getElementById('profileImgInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const fileName = `profile-${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage.from('portfolio').upload(fileName, file);
  if (error) return alert(error.message);
  const url = publicUrl(data.path);
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  if (existing.data) await supabase.from('profile').update({ profile_image: data.path }).eq('id', existing.data.id);
  else await supabase.from('profile').insert({ profile_image: data.path });
  document.getElementById('adminProfileImg').src = url;
});
document.getElementById('saveProfile').addEventListener('click', async () => {
  const bio      = document.getElementById('adminBio').value;
  const logoText = document.getElementById('setLogoText').value.trim();
  const existing = await supabase.from('profile').select('id').limit(1).maybeSingle();
  if (existing.data) await supabase.from('profile').update({ bio }).eq('id', existing.data.id);
  else await supabase.from('profile').insert({ bio });
  // Logo text goes to settings
  if (logoText) {
    const sExisting = await supabase.from('settings').select('id').limit(1).maybeSingle();
    let logoErr;
    if (sExisting.data) {
      const r = await supabase.from('settings').update({ logo_text: logoText }).eq('id', sExisting.data.id);
      logoErr = r.error;
    } else {
      const r = await supabase.from('settings').insert({ logo_text: logoText });
      logoErr = r.error;
    }
    if (logoErr) alert('Error guardando logo: ' + logoErr.message + '\nCorré el SQL en Supabase primero');
  }
  alert('✓ Perfil guardado');
});

async function loadSettings(){
  const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
  if (data) {
    document.getElementById('setContactTitle').value    = data.contact_title    || '';
    document.getElementById('setContactSubtitle').value = data.contact_subtitle || '';
    document.getElementById('setEmail').value           = data.email            || '';
    document.getElementById('setWhatsapp').value        = data.whatsapp         || '';
    document.getElementById('setLocation').value        = data.location         || '';
    document.getElementById('setInstagram').value       = data.instagram        || '';
    document.getElementById('setLogoText').value        = data.logo_text        || '';
  }
}
document.getElementById('saveSettings').addEventListener('click', async () => {
  const obj = {
    contact_title:    document.getElementById('setContactTitle').value,
    contact_subtitle: document.getElementById('setContactSubtitle').value,
    email:            document.getElementById('setEmail').value,
    whatsapp:         document.getElementById('setWhatsapp').value,
    location:         document.getElementById('setLocation').value,
    instagram:        document.getElementById('setInstagram').value,
  };
  const existing = await supabase.from('settings').select('id').limit(1).maybeSingle();
  if (existing.data) await supabase.from('settings').update(obj).eq('id', existing.data.id);
  else await supabase.from('settings').insert(obj);
  alert('✓ Contacto guardado');
});

/* ============ STATS ============ */
async function loadStats(){
  const { data } = await supabase.from('portfolio_images').select('*');
  const imgs = data || [];
  const getCats = img => (img.categories && img.categories.length > 0) ? img.categories : [img.category];
  const countCat = cat => imgs.filter(i => getCats(i).includes(cat)).length;
  const el = id => document.getElementById(id);
  if(el('sTotal')) el('sTotal').textContent = imgs.length;
  if(el('sBN'))    el('sBN').textContent    = countCat('Blanco y Negro');
  if(el('sRet'))   el('sRet').textContent   = countCat('Retratos');
  if(el('sGot'))   el('sGot').textContent   = countCat('Gothic');
  if(el('sUrb'))   el('sUrb').textContent   = countCat('Urbano');
}

function loadAdminData(){ loadAdminGallery(); loadAdminProfile(); loadSettings(); loadStats(); }

/* ============ INIT ============ */
checkSession();
supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.reload(); });
