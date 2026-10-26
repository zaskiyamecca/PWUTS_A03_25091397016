/* ==========================================================
   denah.js - Denah meja interaktif (halaman 2.b)
   Status meja dihitung dari data reservasi pada tanggal & jam
   terpilih. Interaksi: filter, tab area, klik meja, lanjut
   ke form reservasi dengan data terisi otomatis.
   ========================================================== */
window.initDenah = function () {

  const $date = $('#fDate'), $time = $('#fTime'), $pax = $('#fPax');
  const state = { areaId: AREAS[0].id, selected: null };

  /* ---- inisialisasi filter ---- */
  const today = new Date();
  const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  $date.attr({ min: toYMD(today), max: toYMD(maxDate) });

  timeOptions().forEach(t => $time.append('<option value="' + t + '">' + t + '</option>'));

  const slot = nearestSlot();
  $date.val(slot.date);
  $time.val(slot.time);

  // Jika datang dari tombol lain dengan preferensi sebelumnya
  if (window.lastSearch) {
    $date.val(window.lastSearch.date);
    $time.val(window.lastSearch.time);
    $pax.val(window.lastSearch.pax);
  }

  /* ---- tab area ---- */
  const $tabs = $('#areaTabs');
  AREAS.forEach(a => {
    $tabs.append(
      '<button type="button" role="tab" class="tab' + (a.id === state.areaId ? ' active' : '') +
      '" data-area="' + a.id + '" aria-selected="' + (a.id === state.areaId) + '">' + a.name + '</button>'
    );
  });

  $tabs.on('click', '.tab', function () {
    state.areaId = +$(this).data('area');
    state.selected = null;
    $tabs.find('.tab').removeClass('active').attr('aria-selected', 'false');
    $(this).addClass('active').attr('aria-selected', 'true');
    render();
    resetPanel();
  });

  /* ---- render denah ---- */
  function filters() {
    let pax = parseInt($pax.val(), 10);
    if (isNaN(pax) || pax < 1) pax = 1;
    return { date: $date.val(), time: $time.val(), pax: pax };
  }

  function render() {
    const f = filters();
    window.lastSearch = f;

    if (!f.date) {
      $('#tableGrid').html('<p class="muted">Pilih tanggal terlebih dahulu.</p>');
      return;
    }

    $('#fSummary').text(
      formatTanggalID(f.date) + ', pukul ' + f.time + ' - ' + minToHHMM(toMin(f.time) + OUTLET.duration) +
      ' (durasi ' + (OUTLET.duration / 60) + ' jam), ' + f.pax + ' tamu'
    );

    const counts = { available: 0, reserved: 0, occupied: 0, small: 0 };
    let html = '';

    TABLES.filter(t => t.area_id === state.areaId).forEach(t => {
      const st = tableStatus(t.id, f.date, f.time);
      const tooSmall = st.status === 'available' && t.capacity < f.pax;
      let cls = st.status;
      if (tooSmall) { cls = 'too-small'; counts.small++; } else { counts[st.status]++; }
      const label = { available: 'Kosong', reserved: 'Direservasi', occupied: 'Terisi' }[st.status];
      html +=
        '<button type="button" class="tbl ' + cls + (state.selected === t.id ? ' selected' : '') +
        '" data-id="' + t.id + '" style="grid-column:' + t.pos_x + ';grid-row:' + t.pos_y + '"' +
        ' aria-label="Meja ' + t.table_number + ', kapasitas ' + t.capacity + ' orang, ' + (tooSmall ? 'kapasitas kurang' : label) + '">' +
        t.table_number + '<small>' + t.capacity + ' orang</small></button>';
    });

    $('#tableGrid').html(html);
    $('#areaStats').html(
      '<div class="stat"><b style="color:var(--ok)">' + counts.available + '</b>kosong</div>' +
      '<div class="stat"><b style="color:var(--warn)">' + counts.reserved + '</b>direservasi</div>' +
      '<div class="stat"><b style="color:var(--busy)">' + counts.occupied + '</b>terisi</div>' +
      (counts.small ? '<div class="stat"><b>' + counts.small + '</b>terlalu kecil</div>' : '')
    );
  }

  /* ---- panel detail meja ---- */
  function resetPanel() {
    $('#sidePanel').html(
      '<h3>Detail meja</h3><p class="muted">Pilih salah satu meja pada denah untuk melihat kapasitas dan jadwalnya.</p>'
    );
  }

  function showPanel(tableId) {
    const t = getTable(tableId), a = getArea(t.area_id), f = filters();
    const st = tableStatus(t.id, f.date, f.time);
    const label = { available: 'Kosong', reserved: 'Direservasi', occupied: 'Terisi' }[st.status];
    const slots = reservationsOfTable(t.id, f.date);
    const tooSmall = t.capacity < f.pax;

    let html = '<h3>Meja ' + t.table_number + '</h3>' +
      '<p class="muted small" style="margin-bottom:.6rem">' + a.name + ' · kapasitas ' + t.capacity + ' orang</p>' +
      '<p><span class="badge ' + st.status + '">' + label + '</span> ' +
      '<span class="muted small">pada ' + f.time + '</span></p>';

    html += '<strong class="small">Jadwal terisi ' + formatTanggalID(f.date) + '</strong>';
    if (slots.length) {
      html += '<ul class="slot-list">' + slots.map(s =>
        '<li><span>' + s.start_time + ' - ' + s.end_time + '</span><span class="muted">' + (s.status === 'checked_in' ? 'sedang dipakai' : 'direservasi') + '</span></li>'
      ).join('') + '</ul>';
    } else {
      html += '<p class="muted small" style="margin:.4rem 0 1rem">Belum ada reservasi pada tanggal ini.</p>';
    }

    if (st.status !== 'available') {
      html += '<div class="alert alert-danger">Meja ini tidak tersedia pada jam tersebut. Coba jam lain atau meja hijau lainnya.</div>';
    } else if (tooSmall) {
      html += '<div class="alert alert-danger">Kapasitas meja (' + t.capacity + ') kurang dari jumlah tamu (' + f.pax + '). Pilih meja yang lebih besar.</div>';
    } else {
      html += '<button type="button" class="btn btn-primary" id="btnReserve" style="width:100%">Reservasi meja ini</button>';
    }
    $('#sidePanel').html(html);
  }

  /* ---- event ---- */
  $('#tableGrid').on('click', '.tbl', function () {
    state.selected = +$(this).data('id');
    render();
    showPanel(state.selected);
    if (window.matchMedia('(max-width: 960px)').matches) {
      $('#sidePanel')[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  $('#fDate, #fTime, #fPax').on('input change', function () {
    render();
    if (state.selected) showPanel(state.selected);
  });

  $('#btnNow').on('click', function () {
    const s = nearestSlot();
    $date.val(s.date);
    $time.val(s.time);
    render();
    if (state.selected) showPanel(state.selected);
  });

  // Lanjut ke form reservasi dengan data terisi otomatis
  $('#sidePanel').on('click', '#btnReserve', function () {
    const f = filters(), t = getTable(state.selected);
    window.pendingReservation = {
      tableId: t.id, areaId: t.area_id, date: f.date, time: f.time, pax: f.pax
    };
    loadPage('reservasi');
  });

  render();
};
