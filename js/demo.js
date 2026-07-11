// ════════════════════════════════════════════════════════════════════════
// BLOQUE DE DATOS DE DEMOSTRACIÓN — pensado para quitarse fácil antes de
// producción. Para eliminarlo del proyecto:
//   1. Borra este archivo.
//   2. Borra <script src="js/demo.js"></script> en respaldo.html.
//   3. Borra el panel #demoPanel en respaldo.html.
// Ningún otro archivo del módulo depende de este. Solo se ejecuta dentro de
// respaldo.html (ya protegido por requireAuth('respaldo') en js/respaldo.js).
// ════════════════════════════════════════════════════════════════════════

(function () {
  var btnCargar = document.getElementById('btnCargarDemo');
  var btnQuitar = document.getElementById('btnQuitarDemo');
  if (!btnCargar || !btnQuitar) return;

  // Clave propia (no en STORE_KEYS a propósito): guarda una copia de
  // STOCK_LEVELS de antes de tocar nada, para poder devolverlo tal cual
  // estaba al quitar los datos de ejemplo — sin adivinar qué cambió.
  var BACKUP_STOCK_KEY = 'anto_ventas_demo_stock_backup';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fechaISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

  var CLIENTES_DEMO = [
    { id:'demo_c1', nombre:'María Demo', cedula:'00000001', telefono:'04120000001', email:'' },
    { id:'demo_c2', nombre:'Carlos Demo', cedula:'00000002', telefono:'04120000002', email:'' },
  ];

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  btnCargar.addEventListener('click', function () {
    if (!window.confirm('¿Ponerle 5 unidades de stock a TODAS las presentaciones del catálogo, y agregar 2 clientes y 2 pedidos de ejemplo? No afecta los datos reales — se puede deshacer con "Quitar datos de ejemplo".')) return;

    // Respalda el stock actual una sola vez (si ya hay un respaldo pendiente
    // de una carga anterior sin "quitar", no lo pisa — así no se pierde el
    // valor original).
    if (!localStorage.getItem(BACKUP_STOCK_KEY)) {
      localStorage.setItem(BACKUP_STOCK_KEY, JSON.stringify(storeGet(STORE_KEYS.STOCK_LEVELS, {})));
    }

    // 5 unidades de stock a cada presentación de cada producto que ya existe
    // en el catálogo (base + agregados desde Inventario).
    getCatalogoCompleto().forEach(function (p) {
      p.variantes.forEach(function (v, idx) { setStock(p.id, idx, 5); });
    });

    // 2 clientes de ejemplo (idempotente: no duplica si ya se cargaron antes).
    var clientes = storeGet(STORE_KEYS.CUSTOMERS, []);
    CLIENTES_DEMO.forEach(function (c) {
      if (!clientes.some(function (x) { return x.id === c.id; })) {
        clientes.push({ id:c.id, nombre:c.nombre, cedula:c.cedula, telefono:c.telefono, email:c.email, fechaRegistro:new Date().toISOString() });
      }
    });
    storeSet(STORE_KEYS.CUSTOMERS, clientes);

    // 2 pedidos de ejemplo sobre productos reales del catálogo: uno a un día
    // (para mostrar la alerta de 48h y la reserva de stock) y uno
    // personalizado a una semana.
    var pedidos = storeGet(STORE_KEYS.ORDERS, []);
    var sesion = typeof getSession === 'function' ? getSession() : null;
    var hoy = new Date();
    var manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
    var enUnaSemana = new Date(hoy); enUnaSemana.setDate(enUnaSemana.getDate() + 7);
    var productoDemo = buscarProducto('torta_imposible');

    if (!pedidos.some(function (p) { return p.id === 'demo_p1'; }) && productoDemo) {
      pedidos.push({
        id:'demo_p1', clienteNombre:'María Demo', clienteTelefono:'04120000001',
        descripcion:'Torta ' + productoDemo.name + ' para cumpleaños (demo)', fechaEntrega:fechaISO(manana), horaEntrega:'15:00',
        monto:productoDemo.variantes[0].price, abono:20, estado:'pendiente', notas:'Pedido de ejemplo',
        productoId:'torta_imposible', varianteIdx:0, cantidadProducto:2, cantidadReservada:2,
        fechaCreacion:new Date().toISOString(), creadoPor: sesion ? sesion.username : 'demo',
      });
      descontarStock('torta_imposible', 0, 2);
    }
    if (!pedidos.some(function (p) { return p.id === 'demo_p2'; })) {
      pedidos.push({
        id:'demo_p2', clienteNombre:'Carlos Demo', clienteTelefono:'04120000002',
        descripcion:'Torta personalizada temática fútbol (demo)', fechaEntrega:fechaISO(enUnaSemana), horaEntrega:'',
        monto:60, abono:0, estado:'pendiente', notas:'Pedido de ejemplo, fuera de catálogo',
        productoId:null, varianteIdx:null, cantidadProducto:null, cantidadReservada:null,
        fechaCreacion:new Date().toISOString(), creadoPor: sesion ? sesion.username : 'demo',
      });
    }
    storeSet(STORE_KEYS.ORDERS, pedidos);

    if (typeof registrarAuditoria === 'function') {
      registrarAuditoria('datos_demo_cargados', 'Stock=5 aplicado a todo el catálogo, más 2 clientes y 2 pedidos de ejemplo');
    }
    mostrarToast('Datos de ejemplo cargados');
  });

  btnQuitar.addEventListener('click', function () {
    if (!window.confirm('¿Quitar los datos de ejemplo? Esto devuelve el stock a como estaba antes de cargarlos y borra los clientes/pedidos marcados "demo". No afecta el resto de los datos reales.')) return;

    // Pedidos y clientes de ejemplo.
    storeSet(STORE_KEYS.ORDERS, storeGet(STORE_KEYS.ORDERS, []).filter(function (p) { return p.id !== 'demo_p1' && p.id !== 'demo_p2'; }));
    var idsClientesDemo = CLIENTES_DEMO.map(function (c) { return c.id; });
    storeSet(STORE_KEYS.CUSTOMERS, storeGet(STORE_KEYS.CUSTOMERS, []).filter(function (c) { return idsClientesDemo.indexOf(c.id) === -1; }));

    // Stock: se restaura tal cual estaba antes de cargar los datos de
    // ejemplo (deshace tanto el "5 a todo" como lo reservado por demo_p1).
    var backup = localStorage.getItem(BACKUP_STOCK_KEY);
    if (backup) {
      storeSet(STORE_KEYS.STOCK_LEVELS, JSON.parse(backup));
      localStorage.removeItem(BACKUP_STOCK_KEY);
    }

    if (typeof registrarAuditoria === 'function') {
      registrarAuditoria('datos_demo_eliminados', 'Stock restaurado y clientes/pedidos de ejemplo eliminados');
    }
    mostrarToast('Datos de ejemplo eliminados');
  });
})();
