// ── INVENTARIO: agregar productos nuevos + controlar stock (solo admin) ─────
// Los productos creados aquí se guardan en STORE_KEYS.PRODUCTOS_EXTRA y se
// combinan con el catálogo estático (js/productos.js, getCatalogoCompleto())
// para que aparezcan en Ventas, Reportes, Promociones y Precios como
// cualquier otro producto. El stock es opcional por presentación: mientras
// no se le ponga una cantidad, se muestra como "sin controlar" (no bloquea
// la venta — esta versión no descuenta stock automáticamente).

(function () {
  seedIfEmpty();
  var session = requireAuth('inventario');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  var BADGE_POR_CATEGORIA = { torta:'#E91E8C', racion:'#9B59B6', otro:'#27AE60', bebida:'#6D4C41' };

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

  function esProductoEstatico(productId) {
    return PRODUCTOS.some(function (p) { return p.id === productId; });
  }

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  // ── FORMULARIO: AGREGAR PRODUCTO ──
  function poblarCategorias() {
    var select = document.getElementById('nuevoCategoria');
    select.innerHTML = CATEGORIAS.map(function (c) {
      return '<option value="' + c.cat + '">' + escapeHtml(c.label) + '</option>';
    }).join('');
  }

  function crearFilaVariante() {
    var row = document.createElement('div');
    row.className = 'variante-row';
    row.innerHTML =
      '<input type="text" class="variante-label" placeholder="Ej: 15 porciones">' +
      '<input type="number" class="variante-price" step="0.01" min="0.01" placeholder="Precio">' +
      '<input type="number" class="variante-stock" min="0" placeholder="Stock (opcional)">' +
      '<button type="button" class="variante-remove-btn" title="Quitar presentación">✕</button>';
    row.querySelector('.variante-remove-btn').addEventListener('click', function () {
      var wrap = document.getElementById('variantesWrap');
      if (wrap.children.length > 1) row.remove();
    });
    return row;
  }

  document.getElementById('agregarVarianteBtn').addEventListener('click', function () {
    document.getElementById('variantesWrap').appendChild(crearFilaVariante());
  });

  function reiniciarFormularioProducto() {
    document.getElementById('productoForm').reset();
    var wrap = document.getElementById('variantesWrap');
    wrap.innerHTML = '';
    wrap.appendChild(crearFilaVariante());
    document.getElementById('productoError').classList.remove('show');
  }

  document.getElementById('productoForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var errorBox = document.getElementById('productoError');
    errorBox.classList.remove('show');

    var nombre = document.getElementById('nuevoNombre').value.trim();
    var categoria = document.getElementById('nuevoCategoria').value;
    var imagen = document.getElementById('nuevoImagen').value.trim();

    var filas = Array.from(document.querySelectorAll('#variantesWrap .variante-row'));
    var variantes = [];
    for (var i = 0; i < filas.length; i++) {
      var label = filas[i].querySelector('.variante-label').value.trim();
      var price = parseFloat(filas[i].querySelector('.variante-price').value);
      if (!label || isNaN(price) || price <= 0) continue;
      variantes.push({ label:label, price:Math.round(price * 100) / 100, stockInicial:filas[i].querySelector('.variante-stock').value });
    }

    if (!nombre || !categoria || !variantes.length) {
      errorBox.textContent = 'Completa el nombre y al menos una presentación con etiqueta y un precio mayor a $0.';
      errorBox.classList.add('show');
      return;
    }

    var nuevoProducto = {
      id: 'extra_' + Date.now(),
      cat: categoria,
      name: nombre,
      img: imagen || null,
      badgeColor: BADGE_POR_CATEGORIA[categoria] || '#E91E8C',
      variantes: variantes.map(function (v) { return { label:v.label, price:v.price }; }),
    };

    var extras = storeGet(STORE_KEYS.PRODUCTOS_EXTRA, []);
    extras.push(nuevoProducto);
    storeSet(STORE_KEYS.PRODUCTOS_EXTRA, extras);
    registrarAuditoria('producto_creado', 'Producto "' + nombre + '" agregado al catálogo (' + variantes.length + ' presentación(es))');

    variantes.forEach(function (v, idx) {
      if (v.stockInicial !== '' && !isNaN(parseInt(v.stockInicial, 10))) {
        setStock(nuevoProducto.id, idx, parseInt(v.stockInicial, 10));
      }
    });

    reiniciarFormularioProducto();
    renderInventario(document.getElementById('searchInput').value);
    mostrarToast('Producto agregado al catálogo');
  });

  // ── TABLA: CATÁLOGO COMPLETO + STOCK ──
  function renderInventario(filterText) {
    var body = document.getElementById('inventarioBody');
    var term = (filterText || '').trim().toLowerCase();
    var filas = [];

    getCatalogoCompleto().forEach(function (p) {
      if (term && p.name.toLowerCase().indexOf(term) === -1) return;
      var estatico = esProductoEstatico(p.id);

      p.variantes.forEach(function (v, idx) {
        var stockActual = getStock(p.id, idx);
        var key = claveOverridePrecio(p.id, idx);
        filas.push(
          '<tr>' +
            '<td>' + escapeHtml(p.name) + '</td>' +
            '<td>' + catLabel(p.cat) + '</td>' +
            '<td>' + escapeHtml(v.label) + '</td>' +
            '<td>' + money(getPrecioEfectivo(p.id, idx)) + '</td>' +
            '<td><input type="number" min="0" class="stock-input" data-key="' + key + '" value="' + (stockActual === null ? '' : stockActual) + '" placeholder="Sin controlar">' +
              ' <button class="btn-small" data-save-stock="' + key + '" data-product="' + p.id + '" data-variant="' + idx + '">Guardar</button></td>' +
            '<td>' + (estatico ? 'Catálogo base' : 'Agregado') + '</td>' +
            '<td><button class="btn-danger" data-delete-producto="' + p.id + '">Eliminar producto</button></td>' +
          '</tr>'
        );
      });
    });

    body.innerHTML = filas.length ? filas.join('') : '<tr><td colspan="7" class="empty-state">No hay productos que coincidan.</td></tr>';

    body.querySelectorAll('[data-save-stock]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var productId = btn.getAttribute('data-product');
        var variantIdx = parseInt(btn.getAttribute('data-variant'), 10);
        var input = body.querySelector('input[data-key="' + btn.getAttribute('data-save-stock') + '"]');
        var val = input.value.trim();
        if (val === '') {
          var niveles = storeGet(STORE_KEYS.STOCK_LEVELS, {});
          delete niveles[claveOverridePrecio(productId, variantIdx)];
          storeSet(STORE_KEYS.STOCK_LEVELS, niveles);
          mostrarToast('Stock sin controlar para esta presentación');
          return;
        }
        var cantidad = parseInt(val, 10);
        if (isNaN(cantidad) || cantidad < 0) {
          mostrarToast('Ingresa una cantidad válida');
          return;
        }
        setStock(productId, variantIdx, cantidad);
        var celdas = btn.closest('tr').querySelectorAll('td');
        registrarAuditoria('stock_actualizado', 'Stock de "' + celdas[0].textContent + ' — ' + celdas[2].textContent + '" cambiado a ' + cantidad);
        mostrarToast('Stock actualizado');
      });
    });

    body.querySelectorAll('[data-delete-producto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var productId = btn.getAttribute('data-delete-producto');
        var producto = getCatalogoCompleto().find(function (p) { return p.id === productId; });
        if (!producto) return;
        var estatico = esProductoEstatico(productId);

        var confirmado = window.confirm(
          estatico
            ? '¿Eliminar "' + producto.name + '" del catálogo? Es un producto del catálogo base: se ocultará de Ventas, Reportes, Promociones y Precios (no se borra del código).'
            : '¿Eliminar "' + producto.name + '" del catálogo? Esta acción no se puede deshacer.'
        );
        if (!confirmado) return;

        if (estatico) {
          var ocultos = storeGet(STORE_KEYS.PRODUCTOS_OCULTOS, []);
          if (ocultos.indexOf(productId) === -1) ocultos.push(productId);
          storeSet(STORE_KEYS.PRODUCTOS_OCULTOS, ocultos);
        } else {
          var extras = storeGet(STORE_KEYS.PRODUCTOS_EXTRA, []).filter(function (p) { return p.id !== productId; });
          storeSet(STORE_KEYS.PRODUCTOS_EXTRA, extras);
        }

        // Limpia overrides de precio y stock asociados a este producto.
        var overrides = storeGet(STORE_KEYS.PRICE_OVERRIDES, {});
        var niveles = storeGet(STORE_KEYS.STOCK_LEVELS, {});
        Object.keys(overrides).forEach(function (k) { if (k.indexOf(productId + '_') === 0) delete overrides[k]; });
        Object.keys(niveles).forEach(function (k) { if (k.indexOf(productId + '_') === 0) delete niveles[k]; });
        storeSet(STORE_KEYS.PRICE_OVERRIDES, overrides);
        storeSet(STORE_KEYS.STOCK_LEVELS, niveles);
        registrarAuditoria('producto_eliminado', 'Producto "' + producto.name + '" eliminado del catálogo' + (estatico ? ' (oculto — es del catálogo base)' : ''));

        renderInventario(document.getElementById('searchInput').value);
        mostrarToast('Producto eliminado');
      });
    });
  }

  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderInventario(e.target.value);
  });

  poblarCategorias();
  reiniciarFormularioProducto();
  renderInventario('');
})();
