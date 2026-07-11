(function () {
  seedIfEmpty();
  var session = requireAuth('ventas');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  // El carrito se guarda en sessionStorage para que sobreviva al navegar a
  // otra pestaña del menú (cada pestaña es una página distinta); se limpia
  // sola al cerrar sesión o cerrar el navegador (ver logout() en auth.js).
  var cart = sessionGet(STORE_KEYS.CART, []); // { productId, variantIdx, qty }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) {
    return '$' + n.toFixed(2);
  }

  // ── BANNER DE PROMOCIÓN ──
  function renderBanner() {
    var banner = getBanner();
    var wrap = document.getElementById('promoBanner');
    if (!banner.active || !banner.title) { wrap.innerHTML = ''; return; }
    wrap.innerHTML =
      '<div class="promo-banner theme-' + banner.theme + '">' +
        '<div class="promo-banner-icon">🎉</div>' +
        '<div>' +
          '<div class="promo-banner-title">' + escapeHtml(banner.title) + '</div>' +
          (banner.subtitle ? '<div class="promo-banner-sub">' + escapeHtml(banner.subtitle) + '</div>' : '') +
        '</div>' +
      '</div>';
  }

  // ── CATÁLOGO ──
  function renderCatalog(filterText) {
    var wrap = document.getElementById('catalogWrap');
    var term = (filterText || '').trim().toLowerCase();
    wrap.innerHTML = '';

    CATEGORIAS.forEach(function (section) {
      var productos = getCatalogoCompleto().filter(function (p) {
        if (p.cat !== section.cat) return false;
        if (!term) return true;
        return p.name.toLowerCase().indexOf(term) !== -1;
      });
      if (!productos.length) return;

      var sectionEl = document.createElement('div');
      sectionEl.innerHTML = '<div class="section-title">' + section.label + '</div>';

      var grid = document.createElement('div');
      grid.className = 'grid';

      productos.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'card';
        var imgHtml = p.img
          ? '<img src="' + p.img + '" alt="' + escapeHtml(p.name) + '" onerror="this.parentElement.style.display=\'none\'">'
          : '';
        var descuentoPct = getDescuentoProducto(p.id);
        var variantsHtml = p.variantes.map(function (v, idx) {
          var base = getPrecioEfectivo(p.id, idx);
          var priceHtml = descuentoPct
            ? '<div class="variant-price"><span class="variant-price-original">' + money(base) + '</span>' + money(aplicarDescuento(base, p.id)) + ' <span class="discount-badge">-' + descuentoPct + '%</span></div>'
            : '<div class="variant-price">' + money(base) + '</div>';
          var stock = getStock(p.id, idx);
          var agotado = stock !== null && stock <= 0;
          var stockHtml = stock !== null
            ? '<div class="variant-stock' + (agotado ? ' agotado' : stock <= 3 ? ' bajo' : '') + '">' + (agotado ? 'Agotado' : 'Quedan ' + stock) + '</div>'
            : '';
          return '<div class="variant-row">' +
            '<div><div class="variant-label">' + escapeHtml(v.label) + '</div>' + priceHtml + stockHtml + '</div>' +
            '<button class="variant-add-btn" data-product="' + p.id + '" data-variant="' + idx + '"' + (agotado ? ' disabled' : '') + '>+</button>' +
          '</div>';
        }).join('');

        card.innerHTML =
          '<div class="card-img-wrap">' + imgHtml +
            '<span class="card-badge" style="background:' + p.badgeColor + '">' + section.label.replace(/^\S+\s/, '') + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + escapeHtml(p.name) + '</div>' +
            '<div class="card-variants">' + variantsHtml + '</div>' +
          '</div>';
        grid.appendChild(card);
      });

      sectionEl.appendChild(grid);
      wrap.appendChild(sectionEl);
    });

    wrap.querySelectorAll('.variant-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        agregarAlCarrito(btn.getAttribute('data-product'), parseInt(btn.getAttribute('data-variant'), 10));
      });
    });
  }

  function agregarAlCarrito(productId, variantIdx) {
    var existing = cart.find(function (i) { return i.productId === productId && i.variantIdx === variantIdx; });
    var cantidadDeseada = (existing ? existing.qty : 0) + 1;
    if (!hayStockSuficiente(productId, variantIdx, cantidadDeseada)) {
      mostrarToast('No hay suficiente stock disponible');
      return;
    }
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ productId:productId, variantIdx:variantIdx, qty:1 });
    }
    renderCart();
    mostrarToast('Agregado al carrito');
  }

  function cambiarCantidad(productId, variantIdx, delta) {
    var item = cart.find(function (i) { return i.productId === productId && i.variantIdx === variantIdx; });
    if (!item) return;
    if (delta > 0 && !hayStockSuficiente(productId, variantIdx, item.qty + delta)) {
      mostrarToast('No hay suficiente stock disponible');
      return;
    }
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(function (i) { return i !== item; });
    renderCart();
  }

  // ── CARRITO + PROMOS ──
  function renderCart() {
    sessionSet(STORE_KEYS.CART, cart);

    var body = document.getElementById('cartBody');
    var countEl = document.getElementById('cartCount');
    var totalPreviewEl = document.getElementById('cartTotalPreview');
    var totalEl = document.getElementById('cartTotal');
    var panel = document.getElementById('cartPanel');

    var totalUnidades = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    countEl.textContent = totalUnidades;

    if (!cart.length) {
      body.innerHTML = '<div class="empty-cart">El carrito está vacío</div>';
      totalPreviewEl.textContent = money(0);
      totalEl.textContent = money(0);
      panel.classList.remove('open');
      return;
    }

    var lineasManualesParaPromo = cart.map(function (i) { return { productId:i.productId, qty:i.qty }; });
    var regalos = calcularRegalosPromos(lineasManualesParaPromo);

    var total = 0;
    var html = '';

    cart.forEach(function (item) {
      var p = buscarProducto(item.productId);
      var v = p.variantes[item.variantIdx];
      var descuentoPct = getDescuentoProducto(item.productId);
      var precio = aplicarDescuento(getPrecioEfectivo(item.productId, item.variantIdx), item.productId);
      var subtotal = precio * item.qty;
      total += subtotal;
      html +=
        '<div class="cart-item">' +
          '<div>' +
            '<div class="cart-item-name">' + escapeHtml(p.name) + (descuentoPct ? ' <span class="discount-badge">-' + descuentoPct + '%</span>' : '') + '</div>' +
            '<div class="cart-item-sub">' + escapeHtml(v.label) + '</div>' +
          '</div>' +
          '<div class="qty-controls">' +
            '<button class="qty-btn" data-action="dec" data-product="' + item.productId + '" data-variant="' + item.variantIdx + '">−</button>' +
            '<span>' + item.qty + '</span>' +
            '<button class="qty-btn" data-action="inc" data-product="' + item.productId + '" data-variant="' + item.variantIdx + '">+</button>' +
          '</div>' +
          '<div class="cart-item-price">' + money(subtotal) + '</div>' +
        '</div>';
    });

    regalos.forEach(function (regalo) {
      html +=
        '<div class="cart-item free">' +
          '<div>' +
            '<div class="cart-item-name">' + escapeHtml(regalo.productName) + ' ×' + regalo.qty + '</div>' +
            '<div class="cart-item-sub">' + escapeHtml(regalo.label) + '</div>' +
          '</div>' +
          '<div></div>' +
          '<div class="cart-item-price">GRATIS</div>' +
        '</div>';
    });

    body.innerHTML = html;
    totalPreviewEl.textContent = money(total);
    totalEl.textContent = money(total);

    body.querySelectorAll('.qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = btn.getAttribute('data-action') === 'inc' ? 1 : -1;
        cambiarCantidad(btn.getAttribute('data-product'), parseInt(btn.getAttribute('data-variant'), 10), delta);
      });
    });

    panel.classList.add('open');
  }

  // ── CLIENTE DE LA VENTA ──
  // No hay un <select> con todos los clientes: el único flujo es "+ Nuevo
  // cliente" (busca por cédula y autocompleta si ya existe, o registra uno).
  function actualizarResumenCliente(cliente) {
    document.getElementById('clienteSeleccionadoId').value = cliente ? cliente.id : '';
    document.getElementById('clienteResumenTexto').textContent = cliente
      ? cliente.nombre + ' — ' + cliente.telefono
      : 'Venta sin registrar cliente';
    document.getElementById('agregarClienteBtn').style.display = cliente ? 'none' : '';
    document.getElementById('quitarClienteBtn').style.display = cliente ? '' : 'none';
  }

  document.getElementById('quitarClienteBtn').addEventListener('click', function () {
    actualizarResumenCliente(null);
    mostrarToast('Cliente quitado de la venta');
  });

  // ── NUEVO CLIENTE DESDE EL CARRITO ──
  // Al escribir la cédula, si ya existe un cliente con esa cédula se
  // autocompletan sus datos (solo lectura); si no existe, se puede llenar
  // nombre y teléfono para registrarlo y usarlo de una vez en esta venta.
  function permitirSoloDigitos(input) {
    input.addEventListener('input', function () {
      var limpio = input.value.replace(/[^0-9]/g, '');
      if (limpio !== input.value) input.value = limpio;
    });
  }
  permitirSoloDigitos(document.getElementById('ventaClienteCedula'));
  permitirSoloDigitos(document.getElementById('ventaClienteTelefono'));

  var clienteEncontradoId = null;

  function buscarClientePorCedula() {
    var cedula = document.getElementById('ventaClienteCedula').value.trim();
    var estadoEl = document.getElementById('ventaClienteEstado');
    var nombreInput = document.getElementById('ventaClienteNombre');
    var telefonoInput = document.getElementById('ventaClienteTelefono');
    var guardarBtn = document.getElementById('guardarClienteVentaBtn');

    if (!cedula) {
      estadoEl.className = 'cliente-estado';
      clienteEncontradoId = null;
      nombreInput.readOnly = false;
      telefonoInput.readOnly = false;
      guardarBtn.textContent = 'Registrar y usar en esta venta';
      return;
    }

    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    var encontrado = clientes.find(function (c) { return (c.cedula || '') === cedula; });

    if (encontrado) {
      clienteEncontradoId = encontrado.id;
      nombreInput.value = encontrado.nombre;
      telefonoInput.value = encontrado.telefono;
      nombreInput.readOnly = true;
      telefonoInput.readOnly = true;
      estadoEl.textContent = '✓ Cliente encontrado: ' + encontrado.nombre;
      estadoEl.className = 'cliente-estado show encontrado';
      guardarBtn.textContent = 'Usar este cliente en la venta';
    } else {
      clienteEncontradoId = null;
      nombreInput.readOnly = false;
      telefonoInput.readOnly = false;
      estadoEl.textContent = 'Cliente nuevo — completa nombre y teléfono para registrarlo';
      estadoEl.className = 'cliente-estado show nuevo';
      guardarBtn.textContent = 'Registrar y usar en esta venta';
    }
  }

  document.getElementById('ventaClienteCedula').addEventListener('input', buscarClientePorCedula);

  document.getElementById('agregarClienteBtn').addEventListener('click', function () {
    document.getElementById('clienteOverlay').classList.add('open');
    document.getElementById('ventaClienteCedula').focus();
  });

  document.getElementById('cerrarClienteModalBtn').addEventListener('click', cerrarPanelNuevoCliente);

  document.getElementById('guardarClienteVentaBtn').addEventListener('click', function () {
    if (clienteEncontradoId) {
      var existente = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (c) { return c.id === clienteEncontradoId; });
      actualizarResumenCliente(existente);
      cerrarPanelNuevoCliente();
      mostrarToast('Cliente agregado a la venta');
      return;
    }

    var cedula = document.getElementById('ventaClienteCedula').value.trim();
    var nombre = document.getElementById('ventaClienteNombre').value.trim();
    var telefono = document.getElementById('ventaClienteTelefono').value.trim();

    if (!cedula || !nombre || !telefono) {
      mostrarToast('Completa cédula, nombre y teléfono');
      return;
    }
    if (!/^[0-9]+$/.test(cedula) || !/^[0-9]+$/.test(telefono)) {
      mostrarToast('Cédula y teléfono solo pueden tener números');
      return;
    }

    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    var nuevo = { id:'c_' + Date.now(), nombre:nombre, cedula:cedula, telefono:telefono, email:'', fechaRegistro:new Date().toISOString() };
    clientes.push(nuevo);
    storeSet(STORE_KEYS.CUSTOMERS, clientes);
    registrarAuditoria('cliente_creado', 'Cliente "' + nombre + '" (cédula ' + cedula + ') registrado desde el carrito de ventas');

    actualizarResumenCliente(nuevo);
    cerrarPanelNuevoCliente();
    mostrarToast('Cliente registrado y agregado a la venta');
  });

  function cerrarPanelNuevoCliente() {
    document.getElementById('clienteOverlay').classList.remove('open');
    document.getElementById('ventaClienteCedula').value = '';
    document.getElementById('ventaClienteNombre').value = '';
    document.getElementById('ventaClienteTelefono').value = '';
    document.getElementById('ventaClienteNombre').readOnly = false;
    document.getElementById('ventaClienteTelefono').readOnly = false;
    document.getElementById('ventaClienteEstado').className = 'cliente-estado';
    clienteEncontradoId = null;
  }

  // ── VACIAR CARRITO ──
  document.getElementById('vaciarCarritoBtn').addEventListener('click', function () {
    if (!cart.length) return;
    if (!window.confirm('¿Vaciar todos los productos del carrito?')) return;
    registrarAuditoria('carrito_vaciado', cart.length + ' línea(s) descartadas antes de finalizar la venta');
    cart = [];
    renderCart();
    mostrarToast('Carrito vaciado');
  });

  // ── CHECKOUT ──
  function finalizarVenta() {
    if (!cart.length) return;

    // Revalida el stock justo antes de comprometer la venta (por si cambió
    // desde que se armó el carrito). Los regalos de promoción no se validan
    // aquí porque las reglas no registran una presentación específica.
    for (var i = 0; i < cart.length; i++) {
      var itemCarrito = cart[i];
      if (!hayStockSuficiente(itemCarrito.productId, itemCarrito.variantIdx, itemCarrito.qty)) {
        var productoSinStock = buscarProducto(itemCarrito.productId);
        mostrarToast('No hay suficiente stock de "' + (productoSinStock ? productoSinStock.name : itemCarrito.productId) + '" para completar la venta');
        return;
      }
    }

    var lineasManualesParaPromo = cart.map(function (i) { return { productId:i.productId, qty:i.qty }; });
    var regalos = calcularRegalosPromos(lineasManualesParaPromo);

    var items = cart.map(function (item) {
      var p = buscarProducto(item.productId);
      var v = p.variantes[item.variantIdx];
      var precio = aplicarDescuento(getPrecioEfectivo(item.productId, item.variantIdx), item.productId);
      return { productId:item.productId, name:p.name, variante:v.label, precio:precio, qty:item.qty, gratis:false };
    });
    regalos.forEach(function (r) {
      items.push({ productId:r.productId, name:r.productName, variante:r.label, precio:0, qty:r.qty, gratis:true });
    });

    var total = items.reduce(function (s, i) { return s + i.precio * i.qty; }, 0);
    var clienteId = document.getElementById('clienteSeleccionadoId').value || null;

    var venta = {
      id: 'v_' + Date.now(),
      fecha: new Date().toISOString(),
      cajero: session.username,
      clienteId: clienteId,
      items: items,
      total: total,
    };

    var ventas = storeGet(STORE_KEYS.SALES, []);
    ventas.push(venta);
    storeSet(STORE_KEYS.SALES, ventas);
    registrarAuditoria('venta_registrada', 'Venta ' + venta.id + ' por ' + money(total) + ' (' + items.length + ' línea(s))' + (clienteId ? ' con cliente asociado' : ''));

    cart.forEach(function (item) { descontarStock(item.productId, item.variantIdx, item.qty); });

    mostrarRecibo(venta);
    cart = [];
    renderCart();
    actualizarResumenCliente(null);
  }

  function mostrarRecibo(venta) {
    document.getElementById('receiptSub').textContent = new Date(venta.fecha).toLocaleString('es-VE');
    document.getElementById('receiptList').innerHTML = venta.items.map(function (i) {
      return '<div class="receipt-line"><span>' + escapeHtml(i.name) + ' (' + escapeHtml(i.variante) + ') ×' + i.qty + '</span>' +
        '<span>' + (i.gratis ? 'GRATIS' : money(i.precio * i.qty)) + '</span></div>';
    }).join('');
    document.getElementById('receiptTotal').textContent = money(venta.total);
    document.getElementById('receiptOverlay').classList.add('open');
  }

  window.cerrarRecibo = function () {
    document.getElementById('receiptOverlay').classList.remove('open');
  };

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderCatalog(e.target.value);
  });
  document.getElementById('cartHandle').addEventListener('click', function () {
    document.getElementById('cartPanel').classList.toggle('open');
  });
  document.getElementById('checkoutBtn').addEventListener('click', finalizarVenta);

  renderBanner();
  renderCatalog('');
  renderCart();
})();
