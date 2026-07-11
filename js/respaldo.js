(function () {
  seedIfEmpty();
  var session = requireAuth('respaldo');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  var archivoSeleccionado = null;

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  function fechaLegible(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      return d.toLocaleString('es-VE', { dateStyle:'medium', timeStyle:'short' });
    } catch (e) {
      return iso;
    }
  }

  function renderEstadoActual() {
    var payload = recopilarDatosRespaldo();
    var resumen = resumenRespaldo(payload);
    var banner = getBanner();
    document.getElementById('estadoActual').innerHTML =
      '👤 Usuarios registrados: <b>' + resumen.usuarios + '</b><br>' +
      '👥 Clientes registrados: <b>' + resumen.clientes + '</b><br>' +
      '🧾 Ventas registradas: <b>' + resumen.ventas + '</b><br>' +
      '🎁 Reglas de promoción: <b>' + resumen.reglas + '</b><br>' +
      '📦 Productos agregados (Inventario): <b>' + resumen.productosExtra + '</b><br>' +
      '📅 Pedidos registrados: <b>' + resumen.pedidos + '</b><br>' +
      '🖼️ Banner promocional: <b>' + (banner && banner.active ? 'Activo' : 'Inactivo') + '</b><br>' +
      '🕒 Consultado: <b>' + fechaLegible(new Date().toISOString()) + '</b>';
  }

  document.getElementById('btnExportar').addEventListener('click', function () {
    exportarRespaldo();
    registrarAuditoria('respaldo_exportado', 'Respaldo .json descargado');
    mostrarToast('⬇️ Respaldo descargado');
  });

  var inputRestaurar = document.getElementById('inputRestaurar');
  var btnRestaurar = document.getElementById('btnRestaurar');
  var restaurarInfo = document.getElementById('restaurarInfo');

  inputRestaurar.addEventListener('change', function () {
    archivoSeleccionado = inputRestaurar.files && inputRestaurar.files[0] ? inputRestaurar.files[0] : null;
    btnRestaurar.disabled = !archivoSeleccionado;
    restaurarInfo.textContent = '';
    restaurarInfo.style.color = '';
  });

  btnRestaurar.addEventListener('click', function () {
    if (!archivoSeleccionado) return;

    leerArchivoRespaldo(archivoSeleccionado).then(function (obj) {
      var error = validarRespaldo(obj);
      if (error) {
        restaurarInfo.style.color = 'var(--danger, #c0392b)';
        restaurarInfo.textContent = '⚠️ ' + error;
        return;
      }

      var resumen = resumenRespaldo(obj);
      var confirmado = window.confirm(
        'Vas a reemplazar TODOS los datos actuales por los de este archivo:\n\n' +
        '• Usuarios: ' + resumen.usuarios + '\n' +
        '• Clientes: ' + resumen.clientes + '\n' +
        '• Ventas: ' + resumen.ventas + '\n' +
        '• Reglas de promoción: ' + resumen.reglas + '\n' +
        '• Productos agregados: ' + resumen.productosExtra + '\n' +
        '• Pedidos: ' + resumen.pedidos + '\n' +
        (obj.exportadoEn ? '• Exportado el: ' + fechaLegible(obj.exportadoEn) + '\n' : '') +
        '\nEsta acción no se puede deshacer. ¿Deseas continuar?'
      );
      if (!confirmado) return;

      restaurarRespaldo(obj);
      registrarAuditoria('respaldo_restaurado', 'Datos restaurados desde archivo' + (obj.exportadoEn ? ' exportado el ' + fechaLegible(obj.exportadoEn) : ''));
      mostrarToast('✅ Datos restaurados — recargando…');
      setTimeout(function () { window.location.reload(); }, 1200);
    }).catch(function (err) {
      restaurarInfo.style.color = 'var(--danger, #c0392b)';
      restaurarInfo.textContent = '⚠️ ' + err.message;
    });
  });

  renderEstadoActual();
})();
