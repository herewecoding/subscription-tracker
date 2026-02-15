'use strict';

const STORAGE_KEY = 'herewecoding_subscriptions_v1';

const el = {
  form: document.getElementById('subForm'),
  name: document.getElementById('name'),
  price: document.getElementById('price'),
  category: document.getElementById('category'),
  editId: document.getElementById('editId'),
  submitBtn: document.getElementById('submitBtn'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  list: document.getElementById('list'),
  emptyState: document.getElementById('emptyState'),
  monthlyTotal: document.getElementById('monthlyTotal'),
  yearlyTotal: document.getElementById('yearlyTotal'),
  filterCategory: document.getElementById('filterCategory'),
  sortBy: document.getElementById('sortBy'),
  clearAllBtn: document.getElementById('clearAllBtn'),
};

function loadSubs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubs(subs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

function formatTRY(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₺0.00';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function sanitizeName(name) {
  return String(name).trim().replace(/\s+/g, ' ');
}

function getFormData() {
  const name = sanitizeName(el.name.value);
  const price = Number(el.price.value);
  const category = el.category.value;

  if (name.length < 2) throw new Error('Ad en az 2 karakter olmalı.');
  if (!Number.isFinite(price) || price < 0) throw new Error('Ücret geçerli olmalı.');
  if (!category) throw new Error('Kategori seçmelisin.');

  return { name, price, category };
}

function setEditMode(on, id = '') {
  el.editId.value = on ? id : '';
  el.submitBtn.textContent = on ? 'Güncelle' : 'Ekle';
  el.cancelEditBtn.classList.toggle('hidden', !on);
}

function resetForm() {
  el.form.reset();
  setEditMode(false);
  el.name.focus();
}

function applyFilterAndSort(subs) {
  const filter = el.filterCategory.value;
  let out = subs.slice();

  if (filter !== 'ALL') out = out.filter(s => s.category === filter);

  const sort = el.sortBy.value;
  if (sort === 'PRICE_ASC') out.sort((a, b) => a.price - b.price);
  if (sort === 'PRICE_DESC') out.sort((a, b) => b.price - a.price);
  if (sort === 'NAME_ASC') out.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  if (sort === 'NEWEST') out.sort((a, b) => b.createdAt - a.createdAt);

  return out;
}

function render(subs) {
  const visible = applyFilterAndSort(subs);

  el.list.innerHTML = visible.map(s => `
    <li class="item" data-id="${s.id}">
      <div>
        <strong>${s.name}</strong><br/>
        <span class="badge">${s.category}</span>
      </div>
      <div class="muted">Aylık</div>
      <div><strong>${formatTRY(s.price)}</strong></div>
      <div class="btns">
        <button class="edit">Düzenle</button>
        <button class="danger del">Sil</button>
      </div>
    </li>
  `).join('');

  el.emptyState.classList.toggle('hidden', subs.length !== 0);

  const monthly = subs.reduce((acc, s) => acc + s.price, 0);
  el.monthlyTotal.textContent = formatTRY(monthly);
  el.yearlyTotal.textContent = formatTRY(monthly * 12);
}

let subs = loadSubs();
render(subs);

el.form.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    const data = getFormData();
    const editingId = el.editId.value;

    if (editingId) {
      subs = subs.map(s => s.id === editingId ? { ...s, ...data } : s);
    } else {
      subs = [{ id: uid(), createdAt: Date.now(), ...data }, ...subs];
    }

    saveSubs(subs);
    render(subs);
    resetForm();
  } catch (err) {
    alert(err.message || 'Bir hata oluştu.');
  }
});

el.cancelEditBtn.addEventListener('click', () => resetForm());

el.list.addEventListener('click', (e) => {
  const li = e.target.closest('.item');
  if (!li) return;

  const id = li.dataset.id;
  const sub = subs.find(s => s.id === id);
  if (!sub) return;

  if (e.target.classList.contains('edit')) {
    el.name.value = sub.name;
    el.price.value = sub.price;
    el.category.value = sub.category;
    setEditMode(true, sub.id);
    el.name.focus();
  }

  if (e.target.classList.contains('del')) {
    const ok = confirm(`"${sub.name}" silinsin mi?`);
    if (!ok) return;
    subs = subs.filter(s => s.id !== id);
    saveSubs(subs);
    render(subs);
    if (el.editId.value === id) resetForm();
  }
});

el.filterCategory.addEventListener('change', () => render(subs));
el.sortBy.addEventListener('change', () => render(subs));

el.clearAllBtn.addEventListener('click', () => {
  if (subs.length === 0) return;
  const ok = confirm('Tüm abonelikler silinsin mi?');
  if (!ok) return;
  subs = [];
  saveSubs(subs);
  render(subs);
  resetForm();
});
