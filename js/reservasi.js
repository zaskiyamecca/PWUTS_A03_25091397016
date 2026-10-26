/* ==========================================================
   reservasi.js - Form reservasi + pre-order (halaman 2.c)
   Validasi sisi klien dengan jQuery SEBELUM data dikirim ke
   server (proses_reservasi.php pada tahap implementasi lanjut).
   Struktur data mengikuti tabel reservations, orders, order_items.
   ========================================================== */
window.initReservasi = function () {

  const $form = $('#formReservasi');
  const qty = {};                       // { menu_id: jumlah }
  let activeCat = 'Semua';

  /* ------------------------------------------------------
     1. Inisialisasi isian
     ------------------------------------------------------ */
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  $('#reservation_date').attr({ min: toYMD(today), max: toYMD(maxDate) });

  timeOptions().forEach(t => $('#start_time').append('<option value="' + t + '">' + t + '</option>'));
  AREAS.forEach(a => $('#area_id').append('<option value="' + a.id + '">' + a.name + ' - ' + a.desc + '</option>'));
  $('#sSvcRate').text(OUTLET.service_rate);
  $('#sTaxRate').text(OUTLET.tax_rate);

  // Nilai awal: dari denah (pendingReservation), pencarian terakhir, atau slot terdekat
  const pre = window.pendingReservation, last = window.lastSearch, near = nearestSlot();
  if (pre) {
    $('#reservation_date').val(pre.date);
    $('#start_time').val(pre.time);
    $('#pax').val(pre.pax);
    $('#area_id').val(pre.areaId);
  } else {
    $('#reservation_date').val(last ? last.date : near.date);
    $('#start_time').val(last ? last.time : near.time);
    $('#pax').val(last ? last.pax : 2);
    $('#area_id').val(AREAS[0].id);
  }
  refreshTables(pre ? pre.tableId : null);
  window.pendingReservation = null;

  renderMenuCats();
  renderMenuGrid();
  renderSummary();
  renderHistory();

  /* ------------------------------------------------------
     2. Daftar meja dinamis (hanya yang tersedia & cukup)
     ------------------------------------------------------ */
  function refreshTables(preselectId) {
    const ymd = $('#reservation_date').val();
    const time = $('#start_time').val();
    const pax = parseInt($('#pax').val(), 10) || 1;
    const areaId = +$('#area_id').val();
    const keep = preselectId || +$('#dining_table_id').val() || null;
    const $sel = $('#dining_table_id').empty();

    if (!ymd || !time) {
      $sel.append('<option value="">-- Isi tanggal & jam dulu --</option>');
      return;
    }

    const options = TABLES.filter(t =>
      t.area_id === areaId && t.capacity >= pax && tableStatus(t.id, ymd, time).status === 'available'
    );

    if (!options.length) {
      $sel.append('<option value="">Tidak ada meja tersedia di area ini</option>');
      $('#tableHint').text('Coba ubah jam, area, atau jumlah tamu.');
      return;
    }
    $sel.append('<option value="">-- Pilih meja --</option>');
    options.forEach(t => $sel.append(
      '<option value="' + t.id + '">Meja ' + t.table_number + ' (kapasitas ' + t.capacity + ' orang)</option>'
    ));
    $('#tableHint').text(options.length + ' meja tersedia pada waktu tersebut.');
    if (keep && options.some(t => t.id === keep)) $sel.val(keep);
  }

  function updateEndHint() {
    const t = $('#start_time').val();
    $('#endHint').text(t ? 'Selesai perkiraan ' + minToHHMM(toMin(t) + OUTLET.duration) + ' (durasi 2 jam)' : '');
  }
  updateEndHint();

  /* ------------------------------------------------------
     3. Validasi
        Tiap aturan mengembalikan pesan error ('' = valid)
     ------------------------------------------------------ */
  const RULES = {
    guest_name: function () {
      const v = ($('#guest_name').val()).trim();
      if (!v) return 'Nama tamu wajib diisi.';
      if (v.length < 3) return 'Nama minimal 3 karakter.';
      if (!/^[A-Za-zÀ-ÿ .,'\-]+$/.test(v)) return 'Nama hanya boleh berisi huruf, spasi, titik, atau tanda hubung.';
      return '';
    },
    phone: function () {
      const v = $('#phone').val().replace(/[\s\-]/g, '');
      if (!v) return 'Nomor telepon wajib diisi.';
      if (!/^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(v)) return 'Format tidak valid. Contoh: 081234567890 atau +6281234567890.';
      return '';
    },
    email: function () {
      const v = ($('#email').val()).trim();
      if (!v) return 'Email wajib diisi.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format email tidak valid. Contoh: nama@email.com.';
      return '';
    },
    reservation_date: function () {
      const v = $('#reservation_date').val();
      if (!v) return 'Tanggal wajib dipilih.';
      if (v < toYMD(today)) return 'Tanggal tidak boleh sebelum hari ini.';
      if (v > toYMD(maxDate)) return 'Reservasi maksimal 30 hari ke depan.';
      return '';
    },
    start_time: function () {
      const v = $('#start_time').val(), d = $('#reservation_date').val();
      if (!v) return 'Jam mulai wajib dipilih.';
      if (toMin(v) < OUTLET.open || toMin(v) + OUTLET.duration > OUTLET.close)
        return 'Reservasi harus selesai sebelum jam tutup (22:00).';
      if (d === toYMD(new Date())) {
        const n = new Date();
        if (toMin(v) < n.getHours() * 60 + n.getMinutes() + 30) return 'Untuk hari ini, pilih jam minimal 30 menit dari sekarang.';
      }
      return '';
    },
    pax: function () {
      const raw = $('#pax').val();
      const v = parseInt(raw, 10);
      if (raw === '') return 'Jumlah tamu wajib diisi.';
      if (isNaN(v) || String(v) !== String(raw).trim()) return 'Jumlah tamu harus berupa bilangan bulat.';
      if (v < 1) return 'Minimal 1 tamu.';
      if (v > 12) return 'Maksimal 12 tamu per reservasi. Hubungi outlet untuk rombongan lebih besar.';
      const tid = +$('#dining_table_id').val();
      if (tid && v > getTable(tid).capacity) return 'Jumlah tamu melebihi kapasitas meja (' + getTable(tid).capacity + ').';
      return '';
    },
    area_id: function () {
      return $('#area_id').val() ? '' : 'Area wajib dipilih.';
    },
    dining_table_id: function () {
      const tid = $('#dining_table_id').val();
      if (!tid) return 'Silakan pilih meja yang tersedia.';
      const c = findConflict(tid, $('#reservation_date').val(), $('#start_time').val());
      if (c) return 'Meja ini baru saja terpesan pada jam yang bertumpuk. Pilih meja atau jam lain.';
      return '';
    },
    notes: function () {
      return $('#notes').val().length > 200 ? 'Catatan maksimal 200 karakter.' : '';
    },
    agree: function () {
      return $('#agree').is(':checked') ? '' : 'Anda harus menyetujui ketentuan reservasi.';
    }
  };

  function showError(name, msg) {
    const $f = $form.find('[data-field="' + name + '"]');
    $f.removeClass('valid invalid').addClass(msg ? 'invalid' : 'valid');
    $f.find('.err').text(msg);
    $f.find('input,select,textarea').attr('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function validateField(name) { return showError(name, RULES[name]()); }

  function validateAll() {
    let firstBad = null;
    Object.keys(RULES).forEach(name => {
      if (!validateField(name) && !firstBad) firstBad = name;
    });
    return firstBad;
  }

  // Validasi saat meninggalkan field / mengubah nilai
  $form.on('blur change', 'input, select, textarea', function () {
    const name = $(this).closest('[data-field]').data('field');
    if (name && RULES[name]) validateField(name);
  });
  // Saat mengetik: hanya perbarui kalau field sebelumnya sudah ditandai salah
  $form.on('input', 'input, textarea', function () {
    const $f = $(this).closest('[data-field]');
    if ($f.hasClass('invalid')) validateField($f.data('field'));
  });

  $('#notes').on('input', function () { $('#noteCount').text(this.value.length); });

  // Perubahan yang memengaruhi ketersediaan meja
  $('#reservation_date, #start_time, #pax, #area_id').on('change', function () {
    updateEndHint();
    refreshTables();
    // validasi ulang field yang saling bergantung
    ['start_time', 'pax', 'dining_table_id'].forEach(n => {
      if ($form.find('[data-field="' + n + '"]').is('.valid,.invalid')) validateField(n);
    });
    renderSummary();
  });
  $('#pax').on('input', function () { refreshTables(); renderSummary(); });
  $('#dining_table_id').on('change', renderSummary);

  /* ------------------------------------------------------
     4. Pre-order menu
     ------------------------------------------------------ */
  function renderMenuCats() {
    const cats = ['Semua'].concat(MENUS.map(m => m.cat).filter((c, i, a) => a.indexOf(c) === i));
    $('#menuCats').html(cats.map(c =>
      '<button type="button" class="chip' + (c === activeCat ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>'
    ).join(''));
  }

  function menuItemHTML(m) {
    const q = qty[m.id] || 0;
    return '<div class="menu-item' + (q ? ' has-qty' : '') + '" data-id="' + m.id + '">' +
      '<div><div class="nm">' + escapeHtml(m.name) + '</div><div class="muted small">' + m.cat + '</div></div>' +
      '<div class="pr">' + rupiah(m.price) + '</div>' +
      '<div class="stepper">' +
      '<button type="button" class="minus" aria-label="Kurangi ' + escapeHtml(m.name) + '">−</button>' +
      '<span class="q" aria-live="polite">' + q + '</span>' +
      '<button type="button" class="plus" aria-label="Tambah ' + escapeHtml(m.name) + '">+</button></div></div>';
  }

  function renderMenuGrid() {
    const list = MENUS.filter(m => activeCat === 'Semua' || m.cat === activeCat);
    $('#menuGrid').html(list.map(menuItemHTML).join(''));
  }

  $('#menuCats').on('click', '.chip', function () {
    activeCat = $(this).data('cat');
    renderMenuCats();
    renderMenuGrid();
  });

  $('#menuGrid').on('click', '.plus, .minus', function () {
    const $item = $(this).closest('.menu-item');
    const id = +$item.data('id');
    let n = qty[id] || 0;
    n += $(this).hasClass('plus') ? 1 : -1;
    n = Math.max(0, Math.min(20, n));
    if (n) qty[id] = n; else delete qty[id];
    $item.toggleClass('has-qty', n > 0).find('.q').text(n);
    renderSummary();
  });

  function preorderItems() {
    return Object.keys(qty).map(id => {
      const m = MENUS.find(x => x.id === +id);
      return { menu_id: m.id, code: m.code, name: m.name, quantity: qty[id], unit_price: m.price, line_total: m.price * qty[id] };
    });
  }

  /* ------------------------------------------------------
     5. Ringkasan & estimasi tagihan
     ------------------------------------------------------ */
  function renderSummary() {
    const d = $('#reservation_date').val(), t = $('#start_time').val();
    const tid = +$('#dining_table_id').val(), pax = $('#pax').val();
    let info = '';
    if (d) info += '<div><strong>Tanggal:</strong> ' + formatTanggalID(d) + '</div>';
    if (t) info += '<div><strong>Jam:</strong> ' + t + ' - ' + minToHHMM(toMin(t) + OUTLET.duration) + '</div>';
    if (pax) info += '<div><strong>Tamu:</strong> ' + escapeHtml(pax) + ' orang</div>';
    if (tid) { const tb = getTable(tid); info += '<div><strong>Meja:</strong> ' + tb.table_number + ', ' + getArea(tb.area_id).name + '</div>'; }
    $('#sumInfo').html(info || 'Lengkapi data reservasi.');

    const items = preorderItems();
    $('#sumItems').html(items.length
      ? items.map(i => '<li><span>' + i.quantity + '× ' + escapeHtml(i.name) + '</span><span>' + rupiah(i.line_total) + '</span></li>').join('')
      : '<li class="muted">Belum ada menu dipilih.</li>');

    const sub = items.reduce((s, i) => s + i.line_total, 0);
    const b = hitungTagihan(sub);
    $('#sSub').text(rupiah(b.subtotal));
    $('#sSvc').text(rupiah(b.service));
    $('#sTax').text(rupiah(b.tax));
    $('#sTotal').text(rupiah(b.total));
    $('#preorder_json').val(JSON.stringify(items));
  }

  /* ------------------------------------------------------
     6. Submit
     ------------------------------------------------------ */
  $form.on('submit', function (e) {
    e.preventDefault();                       // tahan pengiriman sampai validasi lolos
    $('#formAlert').empty();

    const bad = validateAll();
    if (bad) {
      $('#formAlert').html('<div class="alert alert-danger" role="alert">Mohon periksa kembali isian yang ditandai merah.</div>');
      const $first = $form.find('[data-field="' + bad + '"]').find('input,select,textarea').first();
      $first.trigger('focus');
      $first[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const t = getTable($('#dining_table_id').val());
    const start = $('#start_time').val();
    const items = preorderItems();
    const bill = hitungTagihan(items.reduce((s, i) => s + i.line_total, 0));

    const rec = {
      id: 'u' + Date.now(),
      code: genCode(),
      dining_table_id: t.id,
      guest_name: ($('#guest_name').val()).trim(),
      phone: $('#phone').val().replace(/[\s\-]/g, ''),
      email: ($('#email').val()).trim(),
      pax: parseInt($('#pax').val(), 10),
      reservation_date: $('#reservation_date').val(),
      start_time: start,
      end_time: minToHHMM(toMin(start) + OUTLET.duration),
      status: 'pending',
      notes: ($('#notes').val()).trim(),
      preorder: items,
      estimated_total: bill.total
    };

    /* Pada implementasi lanjut, $.post('proses_reservasi.php', payload)
       dijalankan di sini. Untuk sementara data disimpan di localStorage. */
    const all = loadUserReservations();
    all.push(rec);
    saveUserReservations(all);
    console.log('[Payload ke server]', rec);

    showResult(rec, t, bill);
    renderHistory();
  });

  function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code, tries = 0;
    do {
      code = 'RSV-';
      for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
      tries++;
    } while (getAllReservations().some(r => r.code === code) && tries < 20);
    return code;
  }

  function showResult(rec, t, bill) {
    const items = rec.preorder.length
      ? rec.preorder.map(i => i.quantity + '× ' + escapeHtml(i.name)).join(', ')
      : 'Tanpa pre-order';
    $('#resultBox').html(
      '<div class="tick" aria-hidden="true">✓</div>' +
      '<h2>Reservasi terkirim</h2>' +
      '<p class="muted">Status: <span class="st pending">pending</span> - menunggu verifikasi kasir.</p>' +
      '<div class="code-box">' + rec.code + '</div>' +
      '<div class="detail-list">' +
      '<div class="sum-row"><span>Nama</span><span>' + escapeHtml(rec.guest_name) + '</span></div>' +
      '<div class="sum-row"><span>Tanggal</span><span>' + formatTanggalID(rec.reservation_date) + '</span></div>' +
      '<div class="sum-row"><span>Jam</span><span>' + rec.start_time + ' - ' + rec.end_time + '</span></div>' +
      '<div class="sum-row"><span>Meja</span><span>' + t.table_number + ' (' + getArea(t.area_id).name + ')</span></div>' +
      '<div class="sum-row"><span>Tamu</span><span>' + rec.pax + ' orang</span></div>' +
      '<div class="sum-row"><span>Pre-order</span><span style="text-align:right;max-width:60%">' + items + '</span></div>' +
      '<div class="sum-row"><span>Estimasi total</span><span>' + rupiah(bill.total) + '</span></div></div>' +
      '<details style="margin-bottom:1.2rem"><summary class="small" style="cursor:pointer">Lihat data yang dikirim ke server (simulasi)</summary>' +
      '<pre class="payload">' + escapeHtml(JSON.stringify(rec, null, 2)) + '</pre></details>' +
      '<div class="form-actions" style="justify-content:center">' +
      '<button type="button" class="btn btn-primary" id="btnAgain">Buat reservasi lain</button>' +
      '<button type="button" class="btn btn-outline" data-page="denah">Lihat denah</button></div>'
    ).prop('hidden', false);
    $form.prop('hidden', true);
    $('#resultBox')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#resultBox').on('click', '#btnAgain', function () {
    $('#resultBox').prop('hidden', true).empty();
    $form.prop('hidden', false);
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ------------------------------------------------------
     7. Reset
     ------------------------------------------------------ */
  let resetting = false;
  function resetForm() {
    resetting = true;
    $form[0].reset();
    resetting = false;
    Object.keys(qty).forEach(k => delete qty[k]);
    $form.find('.field').removeClass('valid invalid').find('.err').text('');
    $form.find('[aria-invalid]').removeAttr('aria-invalid');
    $('#formAlert').empty();
    $('#noteCount').text('0');
    const n = nearestSlot();
    $('#reservation_date').val(n.date);
    $('#start_time').val(n.time);
    $('#pax').val(2);
    $('#area_id').val(AREAS[0].id);
    activeCat = 'Semua';
    renderMenuCats();
    renderMenuGrid();
    updateEndHint();
    refreshTables();
    renderSummary();
  }

  $form.on('reset', function (e) {
    if (resetting) return;     // reset bawaan dipicu dari resetForm()
    e.preventDefault();
    resetForm();
  });

  /* ------------------------------------------------------
     8. Riwayat + pembatalan (FR-06)
     ------------------------------------------------------ */
  function renderHistory() {
    const list = loadUserReservations().slice().reverse();
    if (!list.length) {
      $('#historyBox').html('<p class="muted small">Belum ada reservasi dari perangkat ini.</p>');
      return;
    }
    const rows = list.map(r => {
      const tb = getTable(r.dining_table_id);
      return '<tr><td><strong>' + r.code + '</strong></td>' +
        '<td>' + r.reservation_date + '<br><span class="muted">' + r.start_time + ' - ' + r.end_time + '</span></td>' +
        '<td>Meja ' + tb.table_number + '<br><span class="muted">' + getArea(tb.area_id).name + '</span></td>' +
        '<td><span class="st ' + r.status + '">' + r.status + '</span></td>' +
        '<td>' + (r.status === 'pending' ? '<button type="button" class="btn btn-outline btn-sm btn-cancel" data-id="' + r.id + '">Batalkan</button>' : '') + '</td></tr>';
    }).join('');
    $('#historyBox').html('<div class="table-wrap"><table><thead><tr><th>Kode</th><th>Jadwal</th><th>Meja</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
  }

  $('#historyBox').on('click', '.btn-cancel', function () {
    const id = $(this).data('id');
    if (!window.confirm('Batalkan reservasi ini?')) return;
    const all = loadUserReservations();
    all.forEach(r => { if (r.id === id) r.status = 'cancelled'; });
    saveUserReservations(all);
    renderHistory();
    refreshTables();
  });
};
