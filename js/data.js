/* ==========================================================
   data.js - Data simulasi + fungsi bantu bersama
   Mengacu pada struktur tabel proposal: areas, dining_tables,
   reservations, menus, outlets (service_rate, tax_rate).
   ========================================================== */

const OUTLET = {
  name: 'Teman Setia Surabaya',
  open: 10 * 60,          // 10:00 (open_time)
  close: 22 * 60,         // 22:00 (close_time)
  service_rate: 3.0,      // outlets.service_rate (%)
  tax_rate: 10.0,         // outlets.tax_rate (%)
  duration: 120,          // durasi standar reservasi (menit) - aturan bisnis #1
  lateLimit: 15           // batas no_show (menit)
};

/* ---------- areas ---------- */
const AREAS = [
  { id: 1, name: 'Lt 1 Indoor',  desc: 'Lantai dasar, dekat kasir' },
  { id: 2, name: 'Lt 2 Indoor',  desc: 'Ruang ber-AC lantai 2' },
  { id: 3, name: 'Lt 2 Outdoor', desc: 'Teras terbuka lantai 2' },
  { id: 4, name: 'Lt 2 VIP',     desc: 'Ruang privat untuk grup' }
];

/* ---------- dining_tables ---------- */
const TABLES = [];
(function buildTables() {
  const spec = {
    1: { count: 12, caps: [2, 2, 4, 4, 4, 4, 6, 6, 2, 2, 4, 8] },
    2: { count: 12, caps: [2, 2, 4, 4, 4, 4, 6, 6, 2, 4, 4, 8] },
    3: { count: 8,  caps: [2, 2, 4, 4, 4, 4, 6, 6] },
    4: { count: 4,  caps: [8, 8, 10, 12] }
  };
  let id = 1;
  AREAS.forEach(a => {
    const s = spec[a.id];
    for (let i = 0; i < s.count; i++) {
      TABLES.push({
        id: id++,
        area_id: a.id,
        table_number: String(i + 1).padStart(2, '0'),
        capacity: s.caps[i],
        pos_x: (i % 4) + 1,
        pos_y: Math.floor(i / 4) + 1
      });
    }
  });
})();

/* ---------- menus (kategori: Makanan, Minuman, Camilan) ---------- */
const MENUS = [
  { id: 1,  code: 'MKN-01', cat: 'Makanan', type: 'food',     name: 'Ayam Bakar Madu',     price: 38000 },
  { id: 2,  code: 'MKN-02', cat: 'Makanan', type: 'food',     name: 'Mie Goreng Seafood',  price: 34000 },
  { id: 3,  code: 'MKN-03', cat: 'Makanan', type: 'food',     name: 'Nasi Goreng Spesial', price: 32000 },
  { id: 4,  code: 'MKN-04', cat: 'Makanan', type: 'food',     name: 'Soto Ayam',           price: 28000 },
  { id: 5,  code: 'MNM-01', cat: 'Minuman', type: 'beverage', name: 'Air Mineral',         price: 6000 },
  { id: 6,  code: 'MNM-02', cat: 'Minuman', type: 'beverage', name: 'Es Teh Manis',        price: 8000 },
  { id: 7,  code: 'MNM-03', cat: 'Minuman', type: 'beverage', name: 'Jus Jeruk',           price: 16000 },
  { id: 8,  code: 'MNM-04', cat: 'Minuman', type: 'beverage', name: 'Kopi Susu Gula Aren', price: 18000 },
  { id: 9,  code: 'CML-01', cat: 'Camilan', type: 'food',     name: 'Kentang Goreng',      price: 20000 },
  { id: 10, code: 'CML-02', cat: 'Camilan', type: 'food',     name: 'Pisang Goreng Keju',  price: 18000 }
];

/* ---------- helper umum ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }

function toYMD(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function toMin(hhmm) {
  const p = hhmm.split(':');
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

function minToHHMM(m) {
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

function rupiah(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatTanggalID(ymd) {
  const p = ymd.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getArea(id) { return AREAS.find(a => a.id === +id); }
function getTable(id) { return TABLES.find(t => t.id === +id); }

/* Perhitungan tagihan (aturan bisnis #4): service dari subtotal,
   pajak dari (subtotal + service), total dibulatkan ke Rp100. */
function hitungTagihan(subtotal) {
  const service = subtotal * OUTLET.service_rate / 100;
  const tax = (subtotal + service) * OUTLET.tax_rate / 100;
  const total = Math.round((subtotal + service + tax) / 100) * 100;
  return { subtotal, service, tax, total };
}

/* ---------- reservations: data awal (seed) + localStorage ---------- */
const LS_KEY = 'tsRezervasiPelanggan';

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/* Membuat reservasi contoh yang relatif terhadap hari ini,
   supaya denah selalu terlihat "hidup" saat didemokan. */
function buildSeedReservations() {
  const list = [];
  const slots = ['11:00', '13:00', '15:00', '17:00', '19:00'];
  const names = ['Budi S.', 'Sari W.', 'Andi P.', 'Dewi L.', 'Rina K.', 'Fajar M.', 'Nadia R.', 'Hendra T.'];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let uid = 1;
  for (let day = 0; day < 4; day++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    const ymd = toYMD(d);
    const rnd = seededRandom(1000 + day * 77 + d.getDate());
    TABLES.forEach(t => {
      slots.forEach(sl => {
        if (rnd() < 0.22) {
          const start = toMin(sl);
          let status = 'confirmed';
          // Meja yang sedang dipakai saat ini (tamu sudah check-in)
          if (day === 0 && nowMin >= start && nowMin < start + OUTLET.duration) status = 'checked_in';
          list.push({
            id: 's' + uid++,
            code: 'SEED-' + uid,
            dining_table_id: t.id,
            guest_name: names[Math.floor(rnd() * names.length)],
            pax: Math.max(1, t.capacity - Math.floor(rnd() * 2)),
            reservation_date: ymd,
            start_time: sl,
            end_time: minToHHMM(start + OUTLET.duration),
            status: status,
            seed: true
          });
        }
      });
    });
  }
  return list;
}

let SEED_CACHE = null;

function loadUserReservations() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch (e) { return []; }
}

function saveUserReservations(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
  catch (e) { /* penyimpanan tidak tersedia: abaikan */ }
}

function getAllReservations() {
  if (!SEED_CACHE) SEED_CACHE = buildSeedReservations();
  return SEED_CACHE.concat(loadUserReservations());
}

/* Status yang dianggap "aktif" menghalangi meja (aturan bisnis #1) */
const ACTIVE_STATUS = ['pending', 'confirmed', 'checked_in'];

/* Cek tumpang tindih waktu: dua rentang bertabrakan jika
   mulaiA < selesaiB DAN mulaiB < selesaiA. */
function findConflict(tableId, ymd, startHHMM) {
  const s = toMin(startHHMM);
  const e = s + OUTLET.duration;
  return getAllReservations().find(r =>
    r.dining_table_id === +tableId &&
    r.reservation_date === ymd &&
    ACTIVE_STATUS.indexOf(r.status) !== -1 &&
    s < toMin(r.end_time) && toMin(r.start_time) < e
  ) || null;
}

/* Status meja untuk tanggal & jam tertentu */
function tableStatus(tableId, ymd, startHHMM) {
  const c = findConflict(tableId, ymd, startHHMM);
  if (!c) return { status: 'available', res: null };
  return { status: c.status === 'checked_in' ? 'occupied' : 'reserved', res: c };
}

function reservationsOfTable(tableId, ymd) {
  return getAllReservations()
    .filter(r => r.dining_table_id === +tableId && r.reservation_date === ymd && ACTIVE_STATUS.indexOf(r.status) !== -1)
    .sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
}

/* Opsi jam mulai: tiap 30 menit, harus selesai sebelum jam tutup */
function timeOptions() {
  const out = [];
  for (let m = OUTLET.open; m + OUTLET.duration <= OUTLET.close; m += 30) out.push(minToHHMM(m));
  return out;
}

/* Jam terdekat berikutnya (pembulatan ke atas 30 menit) untuk "Sekarang" */
function nearestSlot() {
  const now = new Date();
  // minimal 30 menit dari sekarang (sama dengan aturan validasi jam di form)
  let m = Math.ceil((now.getHours() * 60 + now.getMinutes() + 30) / 30) * 30;
  const opts = timeOptions().map(toMin);
  if (m < opts[0]) m = opts[0];
  if (m > opts[opts.length - 1]) return { date: toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)), time: minToHHMM(opts[0]) };
  return { date: toYMD(now), time: minToHHMM(m) };
}
