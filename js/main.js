/* ==========================================================
   main.js - Router sederhana berbasis Ajax (jQuery .load)
   - Menu/navigasi memuat halaman ke #content tanpa reload
   - Hash URL (#denah, #reservasi) agar tombol Back berfungsi
   ========================================================== */
$(function () {

  const PAGES = {
    beranda:   { url: null,                    init: null },
    denah:     { url: 'pages/denah.html',      init: function () { if (window.initDenah) initDenah(); } },
    reservasi: { url: 'pages/reservasi.html',  init: function () { if (window.initReservasi) initReservasi(); } }
  };

  const $content = $('#content');
  const homeHTML = $content.html();   // simpan konten Beranda awal

  /* Daftar menu di Beranda dibuat dari data MENUS (js/data.js),
     dikelompokkan per kategori sesuai urutan kemunculan. */
  function renderHomeMenu() {
    const cats = MENUS.map(function (m) { return m.cat; })
      .filter(function (c, i, arr) { return arr.indexOf(c) === i; });
    let html = '';
    cats.forEach(function (cat) {
      html += '<div class="menu-group"><h4>' + escapeHtml(cat) + '</h4><div class="menu-list">' +
        MENUS.filter(function (m) { return m.cat === cat; }).map(function (m) {
          return '<div class="menu-card"><div class="nm">' + escapeHtml(m.name) + '</div><div class="pr">' + rupiah(m.price) + '</div></div>';
        }).join('') + '</div></div>';
    });
    $('#homeMenu').html(html);
  }
  renderHomeMenu();
  let currentPage = 'beranda';

  function setActive(page) {
    $('.nav-menu a').removeClass('active').removeAttr('aria-current');
    $('.nav-menu a[data-page="' + page + '"]').addClass('active').attr('aria-current', 'page');
  }

  function closeMobileMenu() {
    $('#navMenu').removeClass('open');
    $('#navToggle').attr('aria-expanded', 'false').text('☰');
  }

  /* Memuat halaman. updateHash=false dipakai saat dipanggil dari event hashchange. */
  window.loadPage = function (page, updateHash) {
    const cfg = PAGES[page];
    if (!cfg) page = 'beranda';
    const conf = PAGES[page];
    currentPage = page;
    setActive(page);
    closeMobileMenu();
    if (updateHash !== false && location.hash !== '#' + page) {
      history.pushState(null, '', '#' + page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!conf.url) {                       // Beranda: pakai konten awal
      $content.html(homeHTML).addClass('fade-in');
      renderHomeMenu();
      return;
    }

    $content.html('<div class="loading"><div class="spinner"></div>Memuat halaman...</div>');

    // Teknik Ajax: $.load() mengambil fragmen HTML lalu menyisipkannya ke #content
    $content.load(conf.url, function (response, status, xhr) {
      if (status === 'error' && window.PAGE_FALLBACK && PAGE_FALLBACK[page]) {
        // Ajax gagal (mis. dibuka via file://): pakai salinan fragmen yang sudah disematkan
        console.info('[Ajax gagal] memakai salinan fallback untuk halaman "' + page + '". Gunakan web server untuk Ajax asli.');
        $content.html(PAGE_FALLBACK[page]).addClass('fade-in');
        if (conf.init) conf.init();
        return;
      }
      if (status === 'error') {
        $content.html(
          '<div class="container"><div class="error-box"><h2>Halaman tidak dapat dimuat</h2>' +
          '<p>(' + xhr.status + ' ' + xhr.statusText + ') Jika membuka lewat <code>file://</code>, ' +
          'jalankan lewat web server lokal (XAMPP/Laragon/Live Server) atau GitHub Pages ' +
          'karena Ajax tidak dapat membaca berkas lokal.</p>' +
          '<button class="btn btn-outline" id="retryLoad">Coba lagi</button></div></div>'
        );
        $('#retryLoad').on('click', function () { loadPage(page, false); });
        return;
      }
      $content.addClass('fade-in');
      if (conf.init) conf.init();
    });
  };

  /* Klik pada semua elemen ber-atribut data-page (menu, tombol hero, dll.) */
  $(document).on('click', '[data-page]', function (e) {
    e.preventDefault();
    loadPage($(this).data('page'));
  });

  /* Hamburger menu (mobile) */
  $('#navToggle').on('click', function () {
    const open = $('#navMenu').toggleClass('open').hasClass('open');
    $(this).attr('aria-expanded', open).text(open ? '✕' : '☰');
  });

  /* Tombol Back/Forward browser */
  $(window).on('popstate hashchange', function () {
    const page = (location.hash || '#beranda').replace('#', '');
    if (page !== currentPage) loadPage(page, false);
  });

  /* Halaman awal sesuai hash (mis. langsung ke #denah) */
  const first = (location.hash || '').replace('#', '');
  if (first && PAGES[first] && first !== 'beranda') loadPage(first, false);
});
