(function () {
  seedIfEmpty();
  var session = requireAuth('historial');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) { return '$' + n.toFixed(2); }

  function nombreCliente(clienteId) {
    if (!clienteId) return 'Sin registrar';
    var c = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (x) { return x.id === clienteId; });
    return c ? c.nombre : 'Sin registrar';
  }

  function telefonoCliente(clienteId) {
    if (!clienteId) return '';
    var c = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (x) { return x.id === clienteId; });
    return c ? c.telefono : '';
  }

  function cedulaCliente(clienteId) {
    if (!clienteId) return '—';
    var c = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (x) { return x.id === clienteId; });
    return c && c.cedula ? c.cedula : '—';
  }

  function normalizar(str) {
    return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function filtrarVentas() {
    var desde = document.getElementById('fDesde').value;
    var hasta = document.getElementById('fHasta').value;
    var clienteTerm = normalizar(document.getElementById('fCliente').value.trim());

    var ventas = storeGet(STORE_KEYS.SALES, []).slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });

    return ventas.filter(function (v) {
      var fechaVenta = v.fecha.slice(0, 10); // YYYY-MM-DD
      if (desde && fechaVenta < desde) return false;
      if (hasta && fechaVenta > hasta) return false;
      if (clienteTerm) {
        var nombre = normalizar(nombreCliente(v.clienteId));
        var telefono = normalizar(telefonoCliente(v.clienteId));
        if (nombre.indexOf(clienteTerm) === -1 && telefono.indexOf(clienteTerm) === -1) return false;
      }
      return true;
    });
  }

  function render() {
    var ventas = filtrarVentas();
    var body = document.getElementById('ventasBody');
    var total = ventas.reduce(function (s, v) { return s + v.total; }, 0);

    document.getElementById('resumenTexto').textContent = ventas.length + (ventas.length === 1 ? ' venta encontrada' : ' ventas encontradas');
    document.getElementById('resumenTotal').textContent = money(total);

    if (!ventas.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron ventas con esos filtros.</td></tr>';
      return;
    }

    body.innerHTML = ventas.map(function (v) {
      var cantidadItems = v.items.reduce(function (s, i) { return s + i.qty; }, 0);
      return '<tr>' +
        '<td>' + new Date(v.fecha).toLocaleString('es-VE') + '</td>' +
        '<td>' + escapeHtml(v.cajero) + '</td>' +
        '<td>' + escapeHtml(nombreCliente(v.clienteId)) + '</td>' +
        '<td>' + cantidadItems + '</td>' +
        '<td>' + money(v.total) + '</td>' +
        '<td><button class="btn-small" data-id="' + v.id + '">Ver</button></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var venta = ventas.find(function (v) { return v.id === btn.getAttribute('data-id'); });
        mostrarDetalle(venta);
      });
    });
  }

  function mostrarDetalle(venta) {
    document.getElementById('detalleSub').textContent =
      new Date(venta.fecha).toLocaleString('es-VE') + ' · ' + nombreCliente(venta.clienteId) + ' · Cajero: ' + venta.cajero;
    document.getElementById('detalleList').innerHTML = venta.items.map(function (i) {
      return '<div class="receipt-line"><span>' + escapeHtml(i.name) + ' (' + escapeHtml(i.variante) + ') ×' + i.qty + '</span>' +
        '<span>' + (i.gratis ? 'GRATIS' : money(i.precio * i.qty)) + '</span></div>';
    }).join('');
    document.getElementById('detalleTotal').textContent = money(venta.total);
    document.getElementById('detalleOverlay').classList.add('open');
  }

  // ── EXPORTAR A PDF (impresión nativa del navegador) ──
  function etiquetaPeriodo() {
    var desde = document.getElementById('fDesde').value;
    var hasta = document.getElementById('fHasta').value;
    if (!desde && !hasta) return 'Periodo: todo el historial registrado';
    return 'Periodo: del ' + (desde || 'inicio del historial') + ' al ' + (hasta || 'hoy');
  }

  function descargarPDF() {
    var ventas = filtrarVentas();
    var total = ventas.reduce(function (s, v) { return s + v.total; }, 0);

    var filas = ventas.map(function (v) {
      var cantidadItems = v.items.reduce(function (s, i) { return s + i.qty; }, 0);
      return '<tr>' +
        '<td>' + new Date(v.fecha).toLocaleString('es-VE') + '</td>' +
        '<td>' + escapeHtml(v.cajero) + '</td>' +
        '<td>' + escapeHtml(nombreCliente(v.clienteId)) + '</td>' +
        '<td>' + escapeHtml(cedulaCliente(v.clienteId)) + '</td>' +
        '<td>' + cantidadItems + '</td>' +
        '<td>' + money(v.total) + '</td>' +
        '</tr>';
    }).join('');

    document.getElementById('printArea').innerHTML =
      '<div class="print-header">' +
        '<div class="print-title">Antojito\'s Cakes — Reporte de Ventas</div>' +
        '<div class="print-sub">' + escapeHtml(etiquetaPeriodo()) + '</div>' +
        '<div class="print-sub">Generado el ' + new Date().toLocaleString('es-VE') + '</div>' +
      '</div>' +
      '<table class="print-table"><thead><tr><th>Fecha</th><th>Cajero</th><th>Cliente</th><th>Cédula</th><th>Items</th><th>Total</th></tr></thead>' +
      '<tbody>' + (filas || '<tr><td colspan="6">Sin ventas registradas en este periodo.</td></tr>') + '</tbody></table>' +
      '<div class="print-total">Total del periodo: ' + money(total) + ' · ' + ventas.length + (ventas.length === 1 ? ' venta' : ' ventas') + '</div>';

    window.print();
  }

  document.getElementById('btnPDF').addEventListener('click', descargarPDF);
  document.getElementById('btnBuscar').addEventListener('click', render);
  document.getElementById('btnLimpiar').addEventListener('click', function () {
    document.getElementById('fDesde').value = '';
    document.getElementById('fHasta').value = '';
    document.getElementById('fCliente').value = '';
    render();
  });
  ['fDesde', 'fHasta'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('fCliente').addEventListener('input', render);

  render();
})();
