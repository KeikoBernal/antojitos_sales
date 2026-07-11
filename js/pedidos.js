// ── MÓDULO DE PEDIDOS: calendario + alertas de entrega próxima ─────────────
// Un "pedido" es un encargo especial (torta personalizada, etc.) con fecha de
// entrega — distinto de una "venta" (POS, cobro inmediato en ventas.html).
// La fecha de "ahora" siempre se toma de new Date() (reloj del equipo), tanto
// para resaltar "hoy" en el calendario como para calcular las alertas.

(function () {
  seedIfEmpty();
  var session = requireAuth('pedidos');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  var UMBRAL_ALERTA_HORAS = 48;
  var NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) { return '$' + (n || 0).toFixed(2); }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function fechaISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  function fechaEntregaLegible(pedido) {
    var partes = pedido.fechaEntrega.split('-');
    var fecha = partes[2] + '/' + partes[1] + '/' + partes[0];
    return pedido.horaEntrega ? fecha + ' · ' + pedido.horaEntrega : fecha;
  }

  // Momento exacto de entrega: si no hay hora, se asume fin del día (23:59)
  // para que un pedido "de hoy" no aparezca vencido apenas amanece.
  function momentoEntrega(pedido) {
    return new Date(pedido.fechaEntrega + 'T' + (pedido.horaEntrega || '23:59') + ':00');
  }

  function horasRestantes(pedido) {
    return (momentoEntrega(pedido).getTime() - Date.now()) / 3600000;
  }

  // Cuántas unidades de un pedido de catálogo no se pudieron reservar del
  // stock disponible al guardarlo (0 si no aplica o si se cubrió por completo).
  function faltanPorProducir(pedido) {
    if (!pedido.productoId || pedido.cantidadReservada === null || pedido.cantidadReservada === undefined) return 0;
    return Math.max(0, pedido.cantidadProducto - pedido.cantidadReservada);
  }

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  // ── CLIENTE: buscar por cédula y autocompletar ──
  // Igual que en ventas.html: al escribir la cédula, si ya existe un cliente
  // con esa cédula se autocompletan nombre y teléfono (solo lectura); si no
  // existe, quedan libres para escribir los datos de un cliente no registrado.
  function permitirSoloDigitos(input) {
    input.addEventListener('input', function () {
      var limpio = input.value.replace(/[^0-9]/g, '');
      if (limpio !== input.value) input.value = limpio;
    });
  }
  permitirSoloDigitos(document.getElementById('pedidoClienteCedula'));
  permitirSoloDigitos(document.getElementById('pedidoClienteTelefono'));

  function buscarClientePorCedula() {
    var cedula = document.getElementById('pedidoClienteCedula').value.trim();
    var estadoEl = document.getElementById('pedidoClienteEstado');
    var nombreInput = document.getElementById('pedidoClienteNombre');
    var telefonoInput = document.getElementById('pedidoClienteTelefono');

    if (!cedula) {
      estadoEl.className = 'cliente-estado';
      nombreInput.readOnly = false;
      telefonoInput.readOnly = false;
      return;
    }

    var encontrado = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (c) { return (c.cedula || '') === cedula; });

    if (encontrado) {
      nombreInput.value = encontrado.nombre;
      telefonoInput.value = encontrado.telefono;
      nombreInput.readOnly = true;
      telefonoInput.readOnly = true;
      estadoEl.textContent = '✓ Cliente encontrado: ' + encontrado.nombre;
      estadoEl.className = 'cliente-estado show encontrado';
    } else {
      nombreInput.readOnly = false;
      telefonoInput.readOnly = false;
      estadoEl.textContent = 'Cliente nuevo — no está registrado, completa nombre y teléfono manualmente';
      estadoEl.className = 'cliente-estado show nuevo';
    }
  }

  document.getElementById('pedidoClienteCedula').addEventListener('input', buscarClientePorCedula);

  // ── PRODUCTO DEL CATÁLOGO (reserva stock) o PERSONALIZADO (fuera de catálogo) ──
  function poblarProductoSelect() {
    var select = document.getElementById('pedidoProductoSelect');
    select.innerHTML = CATEGORIAS.map(function (section) {
      var opciones = getCatalogoCompleto().filter(function (p) { return p.cat === section.cat; }).map(function (p) {
        return p.variantes.map(function (v, idx) {
          return '<option value="' + p.id + '::' + idx + '">' + escapeHtml(p.name) + ' — ' + escapeHtml(v.label) + ' (' + money(getPrecioEfectivo(p.id, idx)) + ')</option>';
        }).join('');
      }).join('');
      return '<optgroup label="' + escapeHtml(section.label) + '">' + opciones + '</optgroup>';
    }).join('');
  }

  // Muestra si el stock actual alcanza para la cantidad pedida. No bloquea el
  // envío del formulario — solo avisa; si no alcanza, se tomará lo que haya
  // disponible y se marcará el pedido como "hay que producir" el resto.
  function mostrarInfoStock() {
    var valor = document.getElementById('pedidoProductoSelect').value;
    var infoEl = document.getElementById('pedidoStockInfo');
    if (!valor) { infoEl.className = 'cliente-estado'; return; }
    var partes = valor.split('::');
    var stock = getStock(partes[0], parseInt(partes[1], 10));
    var cantidadPedida = parseInt(document.getElementById('pedidoCantidadProducto').value, 10) || 1;

    if (stock === null) {
      infoEl.textContent = 'Esta presentación no tiene control de stock.';
      infoEl.className = 'cliente-estado show encontrado';
    } else if (stock >= cantidadPedida) {
      infoEl.textContent = 'Disponibles actualmente: ' + stock + ' — alcanza para este pedido.';
      infoEl.className = 'cliente-estado show encontrado';
    } else {
      infoEl.textContent = 'Disponibles actualmente: ' + stock + ' — faltarían ' + (cantidadPedida - stock) + ' por producir para este pedido.';
      infoEl.className = 'cliente-estado show nuevo';
    }
  }

  document.getElementById('pedidoProductoSelect').addEventListener('change', mostrarInfoStock);
  document.getElementById('pedidoCantidadProducto').addEventListener('input', mostrarInfoStock);

  function actualizarVisibilidadCatalogo() {
    var esCatalogo = document.getElementById('pedidoTipoCatalogo').checked;
    document.getElementById('pedidoCatalogoWrap').style.display = esCatalogo ? 'block' : 'none';
    if (esCatalogo) mostrarInfoStock();
  }
  document.querySelectorAll('input[name="pedidoTipoProducto"]').forEach(function (r) {
    r.addEventListener('change', actualizarVisibilidadCatalogo);
  });

  // ── FORMULARIO: CREAR / EDITAR ──
  var form = document.getElementById('pedidoForm');
  var formTitle = document.getElementById('pedidoFormTitle');
  var submitBtn = document.getElementById('pedidoSubmitBtn');
  var cancelBtn = document.getElementById('pedidoCancelBtn');

  function iniciarEdicion(pedido) {
    document.getElementById('pedidoId').value = pedido.id;
    document.getElementById('pedidoClienteCedula').value = '';
    document.getElementById('pedidoClienteNombre').value = pedido.clienteNombre;
    document.getElementById('pedidoClienteNombre').readOnly = false;
    document.getElementById('pedidoClienteTelefono').value = pedido.clienteTelefono || '';
    document.getElementById('pedidoClienteTelefono').readOnly = false;
    document.getElementById('pedidoClienteEstado').className = 'cliente-estado';
    document.getElementById('pedidoDescripcion').value = pedido.descripcion;
    document.getElementById('pedidoFecha').value = pedido.fechaEntrega;
    document.getElementById('pedidoHora').value = pedido.horaEntrega || '';
    document.getElementById('pedidoMonto').value = pedido.monto || '';
    document.getElementById('pedidoAbono').value = pedido.abono || '';
    document.getElementById('pedidoNotas').value = pedido.notas || '';

    if (pedido.productoId) {
      document.getElementById('pedidoTipoCatalogo').checked = true;
      document.getElementById('pedidoProductoSelect').value = pedido.productoId + '::' + pedido.varianteIdx;
      document.getElementById('pedidoCantidadProducto').value = pedido.cantidadProducto;
    } else {
      document.getElementById('pedidoTipoPersonalizado').checked = true;
      document.getElementById('pedidoProductoSelect').value = '';
      document.getElementById('pedidoCantidadProducto').value = 1;
    }
    actualizarVisibilidadCatalogo();

    formTitle.textContent = 'Editar pedido';
    submitBtn.textContent = 'Guardar cambios';
    cancelBtn.style.display = '';
    document.getElementById('pedidoError').classList.remove('show');
    form.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function cancelarEdicion() {
    form.reset();
    document.getElementById('pedidoId').value = '';
    document.getElementById('pedidoClienteNombre').readOnly = false;
    document.getElementById('pedidoClienteTelefono').readOnly = false;
    document.getElementById('pedidoClienteEstado').className = 'cliente-estado';
    document.getElementById('pedidoTipoPersonalizado').checked = true;
    document.getElementById('pedidoProductoSelect').value = '';
    document.getElementById('pedidoStockInfo').className = 'cliente-estado';
    actualizarVisibilidadCatalogo();
    formTitle.textContent = 'Nuevo pedido';
    submitBtn.textContent = 'Guardar pedido';
    cancelBtn.style.display = 'none';
    document.getElementById('pedidoError').classList.remove('show');
  }

  cancelBtn.addEventListener('click', cancelarEdicion);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errorBox = document.getElementById('pedidoError');
    errorBox.classList.remove('show');

    var editId = document.getElementById('pedidoId').value;
    var clienteNombre = document.getElementById('pedidoClienteNombre').value.trim();
    var clienteTelefono = document.getElementById('pedidoClienteTelefono').value.trim();
    var descripcion = document.getElementById('pedidoDescripcion').value.trim();
    var fechaEntrega = document.getElementById('pedidoFecha').value;
    var horaEntrega = document.getElementById('pedidoHora').value;
    var monto = parseFloat(document.getElementById('pedidoMonto').value) || 0;
    var abono = parseFloat(document.getElementById('pedidoAbono').value) || 0;
    var notas = document.getElementById('pedidoNotas').value.trim();

    if (!clienteNombre || !descripcion || !fechaEntrega) {
      errorBox.textContent = 'Completa al menos el nombre del cliente, la descripción y la fecha de entrega.';
      errorBox.classList.add('show');
      return;
    }

    // Producto del catálogo (reserva stock) o pedido personalizado (fuera de catálogo, sin tocar stock).
    var esCatalogo = document.getElementById('pedidoTipoCatalogo').checked;
    var nuevoProductoId = null, nuevaVarianteIdx = null, nuevaCantidadProducto = null;

    if (esCatalogo) {
      var valorSelect = document.getElementById('pedidoProductoSelect').value;
      if (!valorSelect) {
        errorBox.textContent = 'Selecciona un producto del catálogo, o cambia a "Personalizado".';
        errorBox.classList.add('show');
        return;
      }
      var partesSelect = valorSelect.split('::');
      nuevoProductoId = partesSelect[0];
      nuevaVarianteIdx = parseInt(partesSelect[1], 10);
      nuevaCantidadProducto = parseInt(document.getElementById('pedidoCantidadProducto').value, 10);
      if (!nuevaCantidadProducto || nuevaCantidadProducto < 1) {
        errorBox.textContent = 'La cantidad del producto debe ser al menos 1.';
        errorBox.classList.add('show');
        return;
      }
    }

    var pedidos = storeGet(STORE_KEYS.ORDERS, []);
    var pedidoExistente = editId ? pedidos.find(function (p) { return p.id === editId; }) : null;

    // Si se está editando y ya tenía una reserva, se libera primero (lo que
    // realmente se había descontado, no necesariamente lo que se pidió) para
    // recalcular la reserva desde cero contra el stock actual.
    if (pedidoExistente && pedidoExistente.productoId && pedidoExistente.cantidadReservada) {
      restaurarStock(pedidoExistente.productoId, pedidoExistente.varianteIdx, pedidoExistente.cantidadReservada);
    }

    // No se bloquea el pedido si no alcanza el stock: se reserva lo que haya
    // disponible y se marca la diferencia como "hay que producir", para que
    // se pueda tomar el pedido igual y avisar en la tabla/alertas.
    var nuevaCantidadReservada = null;
    var faltantePorProducir = 0;
    if (esCatalogo) {
      var disponible = getStock(nuevoProductoId, nuevaVarianteIdx);
      if (disponible === null) {
        nuevaCantidadReservada = null; // sin control de stock, no hay nada que reservar
      } else {
        nuevaCantidadReservada = Math.min(disponible, nuevaCantidadProducto);
        faltantePorProducir = nuevaCantidadProducto - nuevaCantidadReservada;
        descontarStock(nuevoProductoId, nuevaVarianteIdx, nuevaCantidadReservada);
      }
    }

    if (editId) {
      var pedido = pedidoExistente;
      if (!pedido) return;
      pedido.clienteNombre = clienteNombre;
      pedido.clienteTelefono = clienteTelefono;
      pedido.descripcion = descripcion;
      pedido.fechaEntrega = fechaEntrega;
      pedido.horaEntrega = horaEntrega;
      pedido.monto = monto;
      pedido.abono = abono;
      pedido.notas = notas;
      pedido.productoId = nuevoProductoId;
      pedido.varianteIdx = nuevaVarianteIdx;
      pedido.cantidadProducto = nuevaCantidadProducto;
      pedido.cantidadReservada = nuevaCantidadReservada;
      storeSet(STORE_KEYS.ORDERS, pedidos);
      registrarAuditoria('pedido_editado', 'Pedido de "' + clienteNombre + '" (' + descripcion + ') actualizado — entrega ' + fechaEntrega + (faltantePorProducir > 0 ? ' — faltan ' + faltantePorProducir + ' por producir' : ''));
      mostrarToast(faltantePorProducir > 0 ? 'Pedido actualizado — faltan ' + faltantePorProducir + ' por producir' : 'Pedido actualizado');
    } else {
      pedidos.push({
        id: 'p_' + Date.now(),
        clienteNombre: clienteNombre,
        clienteTelefono: clienteTelefono,
        descripcion: descripcion,
        fechaEntrega: fechaEntrega,
        horaEntrega: horaEntrega,
        monto: monto,
        abono: abono,
        estado: 'pendiente',
        notas: notas,
        productoId: nuevoProductoId,
        varianteIdx: nuevaVarianteIdx,
        cantidadProducto: nuevaCantidadProducto,
        cantidadReservada: nuevaCantidadReservada,
        fechaCreacion: new Date().toISOString(),
        creadoPor: session.username,
      });
      storeSet(STORE_KEYS.ORDERS, pedidos);
      registrarAuditoria('pedido_creado', 'Pedido de "' + clienteNombre + '" (' + descripcion + ') registrado — entrega ' + fechaEntrega + (esCatalogo ? (faltantePorProducir > 0 ? ' — faltan ' + faltantePorProducir + ' por producir' : ' — reserva stock') : ' — personalizado'));
      mostrarToast(faltantePorProducir > 0 ? '⚠️ Pedido registrado — faltan ' + faltantePorProducir + ' unidad(es) por producir' : 'Pedido registrado');
    }

    cancelarEdicion();
    renderTodo();
  });

  // ── ALERTAS: PEDIDOS PRÓXIMOS (48h) ──
  function renderAlertas() {
    var pedidos = storeGet(STORE_KEYS.ORDERS, [])
      .filter(function (p) { return p.estado === 'pendiente' && horasRestantes(p) <= UMBRAL_ALERTA_HORAS; })
      .sort(function (a, b) { return horasRestantes(a) - horasRestantes(b); });

    var wrap = document.getElementById('alertasWrap');
    if (!pedidos.length) {
      wrap.innerHTML = '<div class="empty-state">No hay pedidos pendientes en las próximas 48 horas.</div>';
      return;
    }

    wrap.innerHTML = pedidos.map(function (p) {
      var horas = horasRestantes(p);
      var vencido = horas < 0;
      var tag = vencido ? '¡Vencido!' : (horas <= 24 ? 'Urgente' : 'Próximo');
      var faltan = faltanPorProducir(p);
      return '<div class="alerta-card ' + (vencido ? 'vencido' : 'urgente') + '">' +
        '<div>' +
          '<div class="alerta-titulo">' + escapeHtml(p.clienteNombre) + ' — ' + escapeHtml(p.descripcion) + '</div>' +
          '<div class="alerta-sub">Entrega: ' + fechaEntregaLegible(p) + (p.clienteTelefono ? ' · ' + escapeHtml(p.clienteTelefono) : '') + '</div>' +
        '</div>' +
        '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
          (faltan > 0 ? '<span class="produccion-badge">⚠️ Producir ' + faltan + '</span>' : '') +
          '<span class="alerta-tag">' + tag + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── CALENDARIO MENSUAL ──
  var calYear, calMonth; // calMonth: 0-11

  function inicializarCalendarioEnHoy() {
    var hoy = new Date();
    calYear = hoy.getFullYear();
    calMonth = hoy.getMonth();
  }

  function renderCalendario() {
    document.getElementById('calendarioTitulo').textContent = NOMBRES_MES[calMonth] + ' ' + calYear;

    var pedidos = storeGet(STORE_KEYS.ORDERS, []);
    var hoyStr = fechaISO(new Date());

    var primerDiaSemana = new Date(calYear, calMonth, 1).getDay();
    var diasEnMes = new Date(calYear, calMonth + 1, 0).getDate();

    var celdas = [];
    for (var i = 0; i < primerDiaSemana; i++) celdas.push(null);
    for (var d = 1; d <= diasEnMes; d++) celdas.push(d);

    var html = NOMBRES_DIA.map(function (n) { return '<div class="calendario-dow">' + n + '</div>'; }).join('');

    celdas.forEach(function (d) {
      if (!d) { html += '<div class="calendario-dia vacio"></div>'; return; }
      var iso = calYear + '-' + pad2(calMonth + 1) + '-' + pad2(d);
      var pedidosDelDia = pedidos.filter(function (p) { return p.fechaEntrega === iso; });
      var dots = pedidosDelDia.slice(0, 6).map(function (p) {
        var clase = p.estado === 'pendiente' && horasRestantes(p) < 0 ? 'vencido' : p.estado;
        var faltan = faltanPorProducir(p);
        var titulo = escapeHtml(p.clienteNombre) + ' — ' + escapeHtml(p.descripcion) + (faltan > 0 ? ' (⚠️ producir ' + faltan + ')' : '');
        return '<span class="calendario-dot ' + clase + '" title="' + titulo + '"></span>';
      }).join('');
      html += '<div class="calendario-dia' + (iso === hoyStr ? ' hoy' : '') + '">' +
        '<div class="calendario-dia-num">' + d + '</div>' +
        (dots ? '<div class="calendario-dot-row">' + dots + '</div>' : '') +
      '</div>';
    });

    document.getElementById('calendarioGrid').innerHTML = html;
  }

  document.getElementById('calMesAnteriorBtn').addEventListener('click', function () {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendario();
  });
  document.getElementById('calMesSiguienteBtn').addEventListener('click', function () {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendario();
  });
  document.getElementById('calHoyBtn').addEventListener('click', function () {
    inicializarCalendarioEnHoy();
    renderCalendario();
  });

  // ── TABLA: TODOS LOS PEDIDOS ──
  function renderTabla(filterText) {
    var term = (filterText || '').trim().toLowerCase();
    var pedidos = storeGet(STORE_KEYS.ORDERS, [])
      .filter(function (p) {
        if (!term) return true;
        return p.clienteNombre.toLowerCase().indexOf(term) !== -1 || p.descripcion.toLowerCase().indexOf(term) !== -1;
      })
      .sort(function (a, b) { return a.fechaEntrega.localeCompare(b.fechaEntrega) || (a.horaEntrega || '').localeCompare(b.horaEntrega || ''); });

    var body = document.getElementById('pedidosBody');
    if (!pedidos.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty-state">No hay pedidos registrados todavía.</td></tr>';
      return;
    }

    body.innerHTML = pedidos.map(function (p) {
      var productoTxt = '—';
      if (p.productoId) {
        var prod = buscarProducto(p.productoId);
        var variante = prod && prod.variantes[p.varianteIdx];
        productoTxt = '🔗 ' + escapeHtml(prod ? prod.name : p.productoId) + (variante ? ' (' + escapeHtml(variante.label) + ')' : '') + ' ×' + p.cantidadProducto;
        var faltan = faltanPorProducir(p);
        if (faltan > 0) productoTxt += '<br><span class="produccion-badge">⚠️ Producir ' + faltan + '</span>';
      }
      return '<tr>' +
        '<td>' + fechaEntregaLegible(p) + '</td>' +
        '<td>' + escapeHtml(p.clienteNombre) + (p.clienteTelefono ? '<br><span style="color:var(--gray); font-size:11px;">' + escapeHtml(p.clienteTelefono) + '</span>' : '') + '</td>' +
        '<td>' + escapeHtml(p.descripcion) + '</td>' +
        '<td style="font-size:11.5px;">' + productoTxt + '</td>' +
        '<td>' + money(p.monto) + (p.abono ? '<br><span style="color:var(--gray); font-size:11px;">Abono: ' + money(p.abono) + '</span>' : '') + '</td>' +
        '<td><span class="estado-badge ' + p.estado + '">' + p.estado + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn-small" data-edit="' + p.id + '">Editar</button> ' +
          (p.estado === 'pendiente' ? '<button class="btn-small" data-completar="' + p.id + '">Completar</button> ' : '') +
          '<button class="btn-danger" data-delete="' + p.id + '">Eliminar</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    body.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pedido = storeGet(STORE_KEYS.ORDERS, []).find(function (p) { return p.id === btn.getAttribute('data-edit'); });
        if (pedido) iniciarEdicion(pedido);
      });
    });
    body.querySelectorAll('[data-completar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pedidos = storeGet(STORE_KEYS.ORDERS, []);
        var pedido = pedidos.find(function (p) { return p.id === btn.getAttribute('data-completar'); });
        if (pedido) {
          pedido.estado = 'completado';
          registrarAuditoria('pedido_completado', 'Pedido de "' + pedido.clienteNombre + '" (' + pedido.descripcion + ') marcado como completado');
        }
        storeSet(STORE_KEYS.ORDERS, pedidos);
        mostrarToast('Pedido marcado como completado');
        renderTodo();
      });
    });
    body.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-delete');
        var pedidos = storeGet(STORE_KEYS.ORDERS, []);
        var pedido = pedidos.find(function (p) { return p.id === id; });
        if (!pedido) return;
        var advertencia = pedido.productoId ? '\n\nSe liberará la reserva de stock de este pedido.' : '';
        if (!window.confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.' + advertencia)) return;
        if (pedido.productoId && pedido.cantidadReservada) restaurarStock(pedido.productoId, pedido.varianteIdx, pedido.cantidadReservada);
        storeSet(STORE_KEYS.ORDERS, pedidos.filter(function (p) { return p.id !== id; }));
        registrarAuditoria('pedido_eliminado', 'Pedido de "' + pedido.clienteNombre + '" (' + pedido.descripcion + ') eliminado');
        if (document.getElementById('pedidoId').value === id) cancelarEdicion();
        mostrarToast('Pedido eliminado');
        renderTodo();
      });
    });
  }

  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderTabla(e.target.value);
  });

  function renderTodo() {
    renderAlertas();
    renderCalendario();
    renderTabla(document.getElementById('searchInput').value);
  }

  poblarProductoSelect();
  inicializarCalendarioEnHoy();
  renderTodo();
})();
