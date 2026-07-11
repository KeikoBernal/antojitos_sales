(function () {
  seedIfEmpty();
  var session = requireAuth('reportes');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) { return '$' + n.toFixed(2); }

  // Convierte una fecha ISO "AAAA-MM-DD" a formato largo en español
  // "DD de MES de AAAA", para que el periodo se vea igual en pantalla y en el PDF.
  var NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function formatearFechaLarga(iso) {
    if (!iso) return '';
    var partes = iso.split('-');
    var anio = partes[0], mes = parseInt(partes[1], 10), dia = parseInt(partes[2], 10);
    return dia + ' de ' + NOMBRES_MES[mes - 1] + ' de ' + anio;
  }

  function fechaISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // La barra Desde/Hasta (igual que en historial.html) es la única fuente de
  // verdad del periodo — los botones Hoy/7/30/Todo solo la rellenan.
  function rangoFechas() {
    return {
      desde: document.getElementById('rDesde').value || null,
      hasta: document.getElementById('rHasta').value || null,
    };
  }

  function ventasEnPeriodo() {
    var rango = rangoFechas();
    return storeGet(STORE_KEYS.SALES, []).filter(function (v) {
      var fechaVenta = v.fecha.slice(0, 10);
      if (rango.desde && fechaVenta < rango.desde) return false;
      if (rango.hasta && fechaVenta > rango.hasta) return false;
      return true;
    });
  }

  // Ranking de TODOS los productos del catálogo de venta (aunque tengan 0 ventas),
  // para poder detectar los que de verdad no se están moviendo.
  function calcularRanking() {
    var ventas = ventasEnPeriodo();
    var stats = {}; // productId -> { qty, ingresos }

    getCatalogoCompleto().forEach(function (p) { stats[p.id] = { qty:0, ingresos:0 }; });

    ventas.forEach(function (v) {
      v.items.forEach(function (item) {
        if (item.gratis) return; // los regalos de promoción no cuentan como venta real
        if (!stats[item.productId]) stats[item.productId] = { qty:0, ingresos:0 };
        stats[item.productId].qty += item.qty;
        stats[item.productId].ingresos += item.precio * item.qty;
      });
    });

    return Object.keys(stats).map(function (productId) {
      var p = buscarProducto(productId);
      return {
        productId: productId,
        name: p ? p.name : productId,
        cat: p ? p.cat : '—',
        qty: stats[productId].qty,
        ingresos: stats[productId].ingresos,
      };
    });
  }

  function catLabel(cat) {
    var s = CATEGORIAS.find(function (c) { return c.cat === cat; });
    return s ? s.label.replace(/^\S+\s/, '') : cat;
  }

  function renderTabla(bodyId, lista) {
    var body = document.getElementById(bodyId);
    if (!lista.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">Sin datos suficientes en este periodo.</td></tr>';
      return;
    }
    body.innerHTML = lista.map(function (item, idx) {
      return '<tr>' +
        '<td>' + (idx + 1) + '</td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td>' + catLabel(item.cat) + '</td>' +
        '<td>' + item.qty + '</td>' +
        '<td>' + money(item.ingresos) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderSugerencias(masVendidos, menosVendidos) {
    var wrap = document.getElementById('sugerenciasWrap');
    var topSellers = masVendidos.filter(function (i) { return i.qty > 0; }).slice(0, 3);
    var worstSellers = menosVendidos.slice(0, 3);

    if (!topSellers.length) {
      wrap.innerHTML = '<div class="empty-state">Aún no hay suficientes ventas registradas en este periodo para generar sugerencias.</div>';
      return;
    }

    var cards = [];

    // Emparejar cada producto de baja rotación con el producto estrella del periodo,
    // reutilizando el mismo mecanismo de promoción "compra N, llévate M gratis".
    worstSellers.forEach(function (worst, idx) {
      var top = topSellers[idx % topSellers.length];
      if (worst.qty === top.qty) return; // no tiene sentido si todo vende igual (ej. periodo sin datos)

      var texto = worst.qty === 0
        ? 'El producto <b>' + escapeHtml(worst.name) + '</b> no registró ventas en este periodo. ' +
          'Combínalo como regalo de una promoción con <b>' + escapeHtml(top.name) + '</b> (tu producto más vendido, ' + top.qty + ' unidades) para que los clientes lo prueben.'
        : 'El producto <b>' + escapeHtml(worst.name) + '</b> tiene baja rotación (' + worst.qty + ' unidades). ' +
          'Úsalo como regalo en una promoción impulsada por <b>' + escapeHtml(top.name) + '</b> (' + top.qty + ' unidades vendidas) para aumentar su salida.';

      var url = 'promociones.html?trigger=' + encodeURIComponent(top.productId) +
        '&reward=' + encodeURIComponent(worst.productId) + '&buyQty=2&rewardQty=1';

      cards.push(
        '<div class="sugerencia-card">' +
          '<div class="sugerencia-text">💡 ' + texto + '</div>' +
          (puedeAcceder(session.rol, 'promocionesEdit')
            ? '<a href="' + url + '" class="btn-small">Configurar esta promoción</a>'
            : '') +
        '</div>'
      );
    });

    // Sugerencia adicional: destacar el producto más vendido en el banner.
    if (topSellers[0]) {
      cards.unshift(
        '<div class="sugerencia-card">' +
          '<div class="sugerencia-text">🌟 <b>' + escapeHtml(topSellers[0].name) + '</b> es el producto más vendido del periodo (' + topSellers[0].qty + ' unidades). ' +
          'Considera destacarlo en el banner promocional de la caja para reforzar su venta cruzada con otros productos.</div>' +
          (puedeAcceder(session.rol, 'promocionesEdit')
            ? '<a href="promociones.html" class="btn-small">Ir a Promociones</a>'
            : '') +
        '</div>'
      );
    }

    wrap.innerHTML = cards.length ? cards.join('') : '<div class="empty-state">No se detectaron oportunidades claras de promoción en este periodo.</div>';
  }

  function render() {
    var ranking = calcularRanking();

    var masVendidos = ranking.slice().sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    var menosVendidos = ranking.slice().sort(function (a, b) { return a.qty - b.qty; }).slice(0, 5);

    renderTabla('masVendidosBody', masVendidos);
    renderTabla('menosVendidosBody', menosVendidos);
    renderSugerencias(masVendidos, menosVendidos);

    document.getElementById('periodoResumen').textContent = etiquetaPeriodo().replace('Periodo: ', '') + '.';
  }

  // ── EXPORTAR A PDF (impresión nativa del navegador) ──
  function etiquetaPeriodo() {
    var rango = rangoFechas();
    if (!rango.desde && !rango.hasta) return 'Periodo: todo el historial registrado';
    var desdeTxt = rango.desde ? formatearFechaLarga(rango.desde) : 'el inicio del historial';
    var hastaTxt = rango.hasta ? formatearFechaLarga(rango.hasta) : 'hoy';
    return 'Periodo: del ' + desdeTxt + ' al ' + hastaTxt;
  }

  function filasReporte(lista) {
    if (!lista.length) return '<tr><td colspan="5">Sin datos suficientes en este periodo.</td></tr>';
    return lista.map(function (item, idx) {
      return '<tr>' +
        '<td>' + (idx + 1) + '</td>' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td>' + catLabel(item.cat) + '</td>' +
        '<td>' + item.qty + '</td>' +
        '<td>' + money(item.ingresos) + '</td>' +
        '</tr>';
    }).join('');
  }

  function descargarPDF() {
    var ranking = calcularRanking();
    var masVendidos = ranking.slice().sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
    var menosVendidos = ranking.slice().sort(function (a, b) { return a.qty - b.qty; }).slice(0, 5);

    document.getElementById('printArea').innerHTML =
      '<div class="print-header">' +
        '<div class="print-title">Antojito\'s Cakes — Reporte de Productos</div>' +
        '<div class="print-sub">' + escapeHtml(etiquetaPeriodo()) + '</div>' +
        '<div class="print-sub">Generado el ' + new Date().toLocaleString('es-VE') + '</div>' +
      '</div>' +
      '<div class="print-section-title">🏆 Productos más vendidos</div>' +
      '<table class="print-table"><thead><tr><th>#</th><th>Producto</th><th>Categoría</th><th>Unidades</th><th>Ingresos</th></tr></thead>' +
      '<tbody>' + filasReporte(masVendidos) + '</tbody></table>' +
      '<div class="print-section-title">📉 Productos menos vendidos</div>' +
      '<table class="print-table"><thead><tr><th>#</th><th>Producto</th><th>Categoría</th><th>Unidades</th><th>Ingresos</th></tr></thead>' +
      '<tbody>' + filasReporte(menosVendidos) + '</tbody></table>';

    window.print();
  }

  document.getElementById('btnPDF').addEventListener('click', descargarPDF);

  function marcarBotonActivo(tipo) {
    document.querySelectorAll('[data-periodo]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-periodo') === tipo);
    });
  }

  document.querySelectorAll('[data-periodo]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tipo = btn.getAttribute('data-periodo');
      var hoy = new Date();
      var hastaISO = fechaISO(hoy);
      var desdeISO = hastaISO;

      if (tipo === '7' || tipo === '30') {
        var dias = parseInt(tipo, 10);
        var d = new Date(hoy);
        d.setDate(d.getDate() - (dias - 1));
        desdeISO = fechaISO(d);
      } else if (tipo === 'todo') {
        desdeISO = '';
        hastaISO = '';
      }

      document.getElementById('rDesde').value = desdeISO;
      document.getElementById('rHasta').value = hastaISO;
      marcarBotonActivo(tipo);
      render();
    });
  });

  document.getElementById('btnBuscar').addEventListener('click', function () {
    marcarBotonActivo(null);
    render();
  });

  document.getElementById('btnLimpiar').addEventListener('click', function () {
    document.getElementById('rDesde').value = '';
    document.getElementById('rHasta').value = '';
    marcarBotonActivo('todo');
    render();
  });

  // Si se editan las fechas a mano, ningún botón preset queda "activo"
  // porque ya no reflejan necesariamente lo que se está mostrando.
  ['rDesde', 'rHasta'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () { marcarBotonActivo(null); });
  });

  // Estado inicial: hoy.
  (function inicializar() {
    var hoyISO = fechaISO(new Date());
    document.getElementById('rDesde').value = hoyISO;
    document.getElementById('rHasta').value = hoyISO;
    marcarBotonActivo('hoy');
  })();

  render();
})();
