// ── ADMINISTRACIÓN DE PRECIOS (solo administrador) ──────────────────────────
// Permite sobrescribir el precio de cualquier presentación de PRODUCTOS sin
// tocar el código. Los overrides viven en STORE_KEYS.PRICE_OVERRIDES
// (localStorage), clave "productId_variantIdx" -> precio nuevo.

(function () {
  seedIfEmpty();
  var session = requireAuth('precios');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) { return '$' + n.toFixed(2); }

  function catLabel(cat) {
    var s = CATEGORIAS.find(function (c) { return c.cat === cat; });
    return s ? s.label.replace(/^\S+\s/, '') : cat;
  }

  function renderTabla(filterText) {
    var body = document.getElementById('preciosBody');
    var term = (filterText || '').trim().toLowerCase();
    var overrides = storeGet(STORE_KEYS.PRICE_OVERRIDES, {});
    var filas = [];

    getCatalogoCompleto().forEach(function (p) {
      if (term && p.name.toLowerCase().indexOf(term) === -1) return;
      p.variantes.forEach(function (v, idx) {
        var key = claveOverridePrecio(p.id, idx);
        var tieneOverride = typeof overrides[key] === 'number';
        var actual = tieneOverride ? overrides[key] : v.price;
        filas.push(
          '<tr>' +
            '<td>' + escapeHtml(p.name) + '</td>' +
            '<td>' + catLabel(p.cat) + '</td>' +
            '<td>' + escapeHtml(v.label) + '</td>' +
            '<td>' + money(v.price) + '</td>' +
            '<td><input type="number" step="0.01" min="0.01" class="precio-input" data-key="' + key + '" value="' + actual.toFixed(2) + '"></td>' +
            '<td style="white-space:nowrap;">' +
              '<button class="btn-small" data-save="' + key + '">Guardar</button> ' +
              (tieneOverride ? '<button class="btn-danger" data-reset="' + key + '">Restablecer</button>' : '') +
            '</td>' +
          '</tr>'
        );
      });
    });

    body.innerHTML = filas.length ? filas.join('') : '<tr><td colspan="6" class="empty-state">No hay productos que coincidan.</td></tr>';

    body.querySelectorAll('[data-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-save');
        var input = body.querySelector('input[data-key="' + key + '"]');
        var val = parseFloat(input.value);
        if (isNaN(val) || val <= 0) {
          mostrarToast('Ingresa un precio mayor a $0');
          return;
        }
        var celdas = btn.closest('tr').querySelectorAll('td');
        var overridesActuales = storeGet(STORE_KEYS.PRICE_OVERRIDES, {});
        overridesActuales[key] = Math.round(val * 100) / 100;
        storeSet(STORE_KEYS.PRICE_OVERRIDES, overridesActuales);
        registrarAuditoria('precio_editado', 'Precio de "' + celdas[0].textContent + ' — ' + celdas[2].textContent + '" cambiado a ' + money(val));
        mostrarToast('Precio actualizado');
        renderTabla(document.getElementById('searchInput').value);
      });
    });

    body.querySelectorAll('[data-reset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-reset');
        var celdas = btn.closest('tr').querySelectorAll('td');
        var overridesActuales = storeGet(STORE_KEYS.PRICE_OVERRIDES, {});
        delete overridesActuales[key];
        storeSet(STORE_KEYS.PRICE_OVERRIDES, overridesActuales);
        registrarAuditoria('precio_restablecido', 'Precio de "' + celdas[0].textContent + ' — ' + celdas[2].textContent + '" restablecido al original');
        mostrarToast('Precio restablecido al original');
        renderTabla(document.getElementById('searchInput').value);
      });
    });
  }

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderTabla(e.target.value);
  });

  renderTabla('');
})();
