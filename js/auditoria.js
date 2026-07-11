// ── AUDITORÍA: registro de acciones de los usuarios (solo admin) ────────────
// Lee STORE_KEYS.AUDIT_LOG, que registrarAuditoria() (js/store.js) va llenando
// desde cada punto de mutación del resto de los módulos. Es de solo lectura:
// esta página no crea ni borra entradas del log.

(function () {
  seedIfEmpty();
  var session = requireAuth('auditoria');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function poblarUsuarios() {
    var select = document.getElementById('aUsuario');
    var usuarios = Array.from(new Set(storeGet(STORE_KEYS.AUDIT_LOG, []).map(function (a) { return a.username; }))).sort();
    select.innerHTML = '<option value="">Todos</option>' + usuarios.map(function (u) {
      return '<option value="' + escapeHtml(u) + '">' + escapeHtml(u) + '</option>';
    }).join('');
  }

  function filtrarLog() {
    var desde = document.getElementById('aDesde').value;
    var hasta = document.getElementById('aHasta').value;
    var usuario = document.getElementById('aUsuario').value;
    var texto = document.getElementById('aTexto').value.trim().toLowerCase();

    return storeGet(STORE_KEYS.AUDIT_LOG, [])
      .slice()
      .sort(function (a, b) { return b.ts.localeCompare(a.ts); })
      .filter(function (a) {
        var fecha = a.ts.slice(0, 10);
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        if (usuario && a.username !== usuario) return false;
        if (texto && (a.accion + ' ' + a.detalle).toLowerCase().indexOf(texto) === -1) return false;
        return true;
      });
  }

  function render() {
    var entradas = filtrarLog();
    document.getElementById('resumenTexto').textContent = entradas.length + (entradas.length === 1 ? ' registro encontrado' : ' registros encontrados');

    var body = document.getElementById('auditoriaBody');
    if (!entradas.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">No hay registros con esos filtros.</td></tr>';
      return;
    }

    body.innerHTML = entradas.map(function (a) {
      return '<tr>' +
        '<td style="white-space:nowrap;">' + new Date(a.ts).toLocaleString('es-VE') + '</td>' +
        '<td>' + escapeHtml(a.username) + '</td>' +
        '<td>' + escapeHtml(a.rol) + '</td>' +
        '<td>' + escapeHtml(a.accion) + '</td>' +
        '<td style="font-size:12px;">' + escapeHtml(a.detalle) + '</td>' +
      '</tr>';
    }).join('');
  }

  document.getElementById('btnBuscar').addEventListener('click', render);
  document.getElementById('btnLimpiar').addEventListener('click', function () {
    document.getElementById('aDesde').value = '';
    document.getElementById('aHasta').value = '';
    document.getElementById('aUsuario').value = '';
    document.getElementById('aTexto').value = '';
    render();
  });
  ['aDesde', 'aHasta', 'aUsuario'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', render);
  });
  document.getElementById('aTexto').addEventListener('input', render);

  poblarUsuarios();
  render();
})();
