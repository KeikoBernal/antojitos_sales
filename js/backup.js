// ── RESPALDO Y RESTAURACIÓN DE LA BASE DE DATOS (localStorage) ─────────────
// El módulo no tiene backend: toda la "base de datos" vive en el localStorage
// del navegador. Este archivo permite exportarla a un .json descargable
// (para guardarlo donde el usuario quiera, p. ej. dentro de la carpeta del
// módulo) y restaurarla desde un archivo previamente exportado. Todo ocurre
// 100% en el cliente — nada se envía a ningún servidor.

var BACKUP_APP_ID = 'antojitos-ventas-promociones';
var BACKUP_VERSION = 1;

// Colecciones persistentes que forman parte del respaldo.
// (SESSION y CART quedan fuera: son estado temporal de una sesión, no datos del
// negocio. AUDIT_LOG también queda fuera a propósito: es un registro histórico
// independiente que no debería poder rebobinarse restaurando un respaldo viejo.)
var BACKUP_KEYS = ['USERS', 'CUSTOMERS', 'SALES', 'BANNER', 'PROMO_RULES', 'PRICE_OVERRIDES', 'PRODUCTOS_EXTRA', 'STOCK_LEVELS', 'ORDERS'];

function recopilarDatosRespaldo() {
  var data = {};
  BACKUP_KEYS.forEach(function (nombre) {
    data[nombre] = storeGet(STORE_KEYS[nombre], null);
  });
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportadoEn: new Date().toISOString(),
    data: data,
  };
}

function resumenRespaldo(payload) {
  var d = payload.data;
  return {
    usuarios: Array.isArray(d.USERS) ? d.USERS.length : 0,
    clientes: Array.isArray(d.CUSTOMERS) ? d.CUSTOMERS.length : 0,
    ventas: Array.isArray(d.SALES) ? d.SALES.length : 0,
    reglas: Array.isArray(d.PROMO_RULES) ? d.PROMO_RULES.length : 0,
    productosExtra: Array.isArray(d.PRODUCTOS_EXTRA) ? d.PRODUCTOS_EXTRA.length : 0,
    pedidos: Array.isArray(d.ORDERS) ? d.ORDERS.length : 0,
  };
}

function nombreArchivoRespaldo() {
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    '_' + pad(d.getHours()) + pad(d.getMinutes());
  return 'antojitos_ventas_backup_' + stamp + '.json';
}

// Genera el archivo y dispara la descarga del navegador. Devuelve el payload
// exportado (útil para mostrar un resumen en pantalla).
function exportarRespaldo() {
  var payload = recopilarDatosRespaldo();
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivoRespaldo();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  return payload;
}

// Colecciones que deben existir sí o sí para aceptar el respaldo. Las que se
// agregaron después de la primera versión se excluyen a propósito, para que
// los respaldos generados antes de esa fecha (que no las tienen) sigan siendo restaurables.
var BACKUP_KEYS_OPCIONALES = ['PRICE_OVERRIDES', 'PRODUCTOS_EXTRA', 'STOCK_LEVELS', 'ORDERS'];
var BACKUP_KEYS_REQUERIDAS = BACKUP_KEYS.filter(function (k) { return BACKUP_KEYS_OPCIONALES.indexOf(k) === -1; });

// Verifica que el objeto parseado tenga la forma de un respaldo válido de
// este módulo antes de intentar restaurarlo. Devuelve un mensaje de error,
// o null si todo está en orden.
function validarRespaldo(obj) {
  if (!obj || typeof obj !== 'object') return 'El archivo no contiene un JSON válido.';
  if (obj.app !== BACKUP_APP_ID) return 'Este archivo no es un respaldo del módulo de Ventas/Promociones.';
  if (!obj.data || typeof obj.data !== 'object') return 'El archivo no tiene la estructura esperada (falta "data").';
  for (var i = 0; i < BACKUP_KEYS_REQUERIDAS.length; i++) {
    if (!(BACKUP_KEYS_REQUERIDAS[i] in obj.data)) return 'Falta la colección "' + BACKUP_KEYS_REQUERIDAS[i] + '" dentro del respaldo.';
  }
  return null;
}

// Sobrescribe localStorage con los datos del respaldo ya validado.
function restaurarRespaldo(obj) {
  BACKUP_KEYS.forEach(function (nombre) {
    if (obj.data[nombre] !== null && obj.data[nombre] !== undefined) {
      storeSet(STORE_KEYS[nombre], obj.data[nombre]);
    }
  });
}

// Lee un File (de un <input type="file">) y devuelve una Promise con el
// contenido ya parseado como JSON. Rechaza con un Error legible si el
// archivo no es JSON válido.
function leerArchivoRespaldo(file) {
  return file.text().then(function (texto) {
    try {
      return JSON.parse(texto);
    } catch (e) {
      throw new Error('El archivo seleccionado no es un JSON válido.');
    }
  });
}
