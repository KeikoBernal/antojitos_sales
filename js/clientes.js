(function () {
  seedIfEmpty();
  var session = requireAuth('clientes');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function money(n) { return '$' + n.toFixed(2); }

  // Cédula y teléfono son solo dígitos: se filtra cualquier letra u otro
  // carácter a medida que el usuario escribe (o pega texto).
  function permitirSoloDigitos(input) {
    input.addEventListener('input', function () {
      var limpio = input.value.replace(/[^0-9]/g, '');
      if (limpio !== input.value) input.value = limpio;
    });
  }
  permitirSoloDigitos(document.getElementById('cedula'));
  permitirSoloDigitos(document.getElementById('telefono'));

  function statsCliente(clienteId) {
    var ventas = storeGet(STORE_KEYS.SALES, []).filter(function (v) { return v.clienteId === clienteId; });
    var total = ventas.reduce(function (s, v) { return s + v.total; }, 0);
    var ultima = ventas.length ? ventas.map(function (v) { return v.fecha; }).sort().slice(-1)[0] : null;
    return { compras: ventas.length, total: total, ultima: ultima, ventas: ventas };
  }

  function renderTabla(filterText) {
    var body = document.getElementById('clientesBody');
    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    var term = (filterText || '').trim().toLowerCase();

    var filtrados = clientes.filter(function (c) {
      if (!term) return true;
      return c.nombre.toLowerCase().indexOf(term) !== -1 ||
        c.telefono.indexOf(term) !== -1 ||
        (c.cedula || '').toLowerCase().indexOf(term) !== -1;
    });

    if (!filtrados.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty-state">No hay clientes registrados todavía.</td></tr>';
      return;
    }

    body.innerHTML = filtrados.map(function (c) {
      var stats = statsCliente(c.id);
      return '<tr>' +
        '<td>' + escapeHtml(c.nombre) + '</td>' +
        '<td>' + escapeHtml(c.cedula || '—') + '</td>' +
        '<td>' + escapeHtml(c.telefono) + '</td>' +
        '<td>' + stats.compras + '</td>' +
        '<td>' + money(stats.total) + '</td>' +
        '<td>' + (stats.ultima ? new Date(stats.ultima).toLocaleDateString('es-VE') : '—') + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button class="btn-small" data-edit="' + c.id + '">Editar</button> ' +
          '<button class="btn-danger" data-delete="' + c.id + '">Eliminar</button>' +
        '</td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cliente = storeGet(STORE_KEYS.CUSTOMERS, []).find(function (c) { return c.id === btn.getAttribute('data-edit'); });
        if (cliente) iniciarEdicion(cliente);
      });
    });
    body.querySelectorAll('[data-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        eliminarCliente(btn.getAttribute('data-delete'));
      });
    });
  }

  var form = document.getElementById('clienteForm');
  var formTitle = document.getElementById('clienteFormTitle');
  var submitBtn = document.getElementById('clienteSubmitBtn');
  var cancelBtn = document.getElementById('clienteCancelBtn');

  function iniciarEdicion(cliente) {
    document.getElementById('clienteId').value = cliente.id;
    document.getElementById('nombre').value = cliente.nombre;
    document.getElementById('cedula').value = cliente.cedula || '';
    document.getElementById('telefono').value = cliente.telefono;
    document.getElementById('email').value = cliente.email || '';

    formTitle.textContent = 'Editar comprador';
    submitBtn.textContent = 'Guardar cambios';
    cancelBtn.style.display = '';
    document.getElementById('clienteError').classList.remove('show');
    form.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function cancelarEdicion() {
    form.reset();
    document.getElementById('clienteId').value = '';
    formTitle.textContent = 'Registrar nuevo comprador';
    submitBtn.textContent = 'Registrar cliente';
    cancelBtn.style.display = 'none';
    document.getElementById('clienteError').classList.remove('show');
  }

  function eliminarCliente(id) {
    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    var cliente = clientes.find(function (c) { return c.id === id; });
    if (!cliente) return;

    var stats = statsCliente(id);
    var advertencia = stats.compras > 0
      ? '\n\nEste cliente tiene ' + stats.compras + ' venta(s) registrada(s). Las ventas no se borran, pero quedarán marcadas como "Sin registrar".'
      : '';
    var confirmado = window.confirm('¿Eliminar a "' + cliente.nombre + '" de la lista de clientes?' + advertencia);
    if (!confirmado) return;

    storeSet(STORE_KEYS.CUSTOMERS, clientes.filter(function (c) { return c.id !== id; }));
    registrarAuditoria('cliente_eliminado', 'Cliente "' + cliente.nombre + '" (cédula ' + (cliente.cedula || '—') + ') eliminado');

    if (document.getElementById('clienteId').value === id) cancelarEdicion();

    renderTabla(document.getElementById('searchInput').value);
    mostrarToast('Cliente eliminado');
  }

  cancelBtn.addEventListener('click', cancelarEdicion);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errorBox = document.getElementById('clienteError');
    errorBox.classList.remove('show');

    var editId = document.getElementById('clienteId').value;
    var nombre = document.getElementById('nombre').value.trim();
    var cedula = document.getElementById('cedula').value.trim();
    var telefono = document.getElementById('telefono').value.trim();
    var email = document.getElementById('email').value.trim();
    if (!nombre || !telefono || !cedula) return;

    if (!/^[0-9]+$/.test(cedula) || !/^[0-9]+$/.test(telefono)) {
      errorBox.textContent = 'La cédula y el teléfono solo pueden contener números.';
      errorBox.classList.add('show');
      return;
    }

    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    var yaExiste = clientes.some(function (c) {
      return c.id !== editId && (c.cedula || '').toLowerCase() === cedula.toLowerCase();
    });
    if (yaExiste) {
      errorBox.textContent = 'Ya existe un cliente registrado con esa cédula.';
      errorBox.classList.add('show');
      return;
    }

    if (editId) {
      var cliente = clientes.find(function (c) { return c.id === editId; });
      if (!cliente) return;
      cliente.nombre = nombre;
      cliente.cedula = cedula;
      cliente.telefono = telefono;
      cliente.email = email;
      storeSet(STORE_KEYS.CUSTOMERS, clientes);
      registrarAuditoria('cliente_editado', 'Cliente "' + nombre + '" (cédula ' + cedula + ') actualizado');
      cancelarEdicion();
      renderTabla(document.getElementById('searchInput').value);
      mostrarToast('Cliente actualizado');
    } else {
      clientes.push({ id:'c_' + Date.now(), nombre:nombre, cedula:cedula, telefono:telefono, email:email, fechaRegistro:new Date().toISOString() });
      storeSet(STORE_KEYS.CUSTOMERS, clientes);
      registrarAuditoria('cliente_creado', 'Cliente "' + nombre + '" (cédula ' + cedula + ') registrado');
      form.reset();
      renderTabla(document.getElementById('searchInput').value);
      mostrarToast('Cliente registrado');
    }
  });

  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderTabla(e.target.value);
  });

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  renderTabla('');
})();
