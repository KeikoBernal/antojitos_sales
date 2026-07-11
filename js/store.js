// ── CAPA DE PERSISTENCIA (localStorage) ─────────────────────────────────────
// Prototipo académico: no hay backend, todo vive en el navegador del equipo
// donde se ejecuta el módulo (igual que el resto del sistema Antojito's).

var STORE_KEYS = {
  USERS: 'anto_ventas_users',
  CUSTOMERS: 'anto_ventas_clientes',
  SALES: 'anto_ventas_ventas',
  BANNER: 'anto_ventas_banner',
  PROMO_RULES: 'anto_ventas_promo_rules',
  PRICE_OVERRIDES: 'anto_ventas_price_overrides',
  SESSION: 'anto_ventas_session',
  CART: 'anto_ventas_carrito_actual',
  PRODUCTOS_EXTRA: 'anto_ventas_productos_extra',
  STOCK_LEVELS: 'anto_ventas_stock',
  ORDERS: 'anto_ventas_pedidos',
  AUDIT_LOG: 'anto_ventas_auditoria',
  PRODUCTOS_OCULTOS: 'anto_ventas_productos_ocultos',
};

function storeGet(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function storeSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// La sesión vive en sessionStorage: se cierra sola al cerrar la pestaña/navegador,
// razonable para un equipo de caja compartido.
function sessionGet(key, fallback) {
  try {
    var raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function sessionSet(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

// ── Hash simple para no guardar contraseñas en texto plano ──
// No es criptográficamente fuerte: es suficiente para un prototipo 100% cliente
// sin backend. Usa SubtleCrypto (SHA-256) cuando el navegador lo permite y cae
// a un hash FNV-1a si se abre el archivo directamente (file://) sin contexto seguro.
async function hashPassword(password) {
  try {
    if (window.crypto && window.crypto.subtle) {
      var enc = new TextEncoder().encode(password);
      var digest = await window.crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
  } catch (e) { /* fall through to fallback hash */ }
  var h = 0x811c9dc5;
  for (var i = 0; i < password.length; i++) {
    h ^= password.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'fnv1a_' + (h >>> 0).toString(16);
}

function seedIfEmpty() {
  if (!localStorage.getItem(STORE_KEYS.USERS)) {
    // Se generan de forma asíncrona la primera vez que corre el módulo.
    seedUsers();
  } else {
    // Migración: el rol "logistica" fue eliminado del sistema; se limpia
    // cualquier usuario remanente de instalaciones previas.
    var users = storeGet(STORE_KEYS.USERS, []);
    var filtrados = users.filter(function (u) { return u.rol !== 'logistica'; });
    if (filtrados.length !== users.length) storeSet(STORE_KEYS.USERS, filtrados);
  }
  if (!localStorage.getItem(STORE_KEYS.CUSTOMERS)) storeSet(STORE_KEYS.CUSTOMERS, []);
  if (!localStorage.getItem(STORE_KEYS.SALES)) storeSet(STORE_KEYS.SALES, []);
  if (!localStorage.getItem(STORE_KEYS.BANNER)) {
    storeSet(STORE_KEYS.BANNER, { active:false, theme:'rosa', title:'', subtitle:'' });
  }
  if (!localStorage.getItem(STORE_KEYS.PROMO_RULES)) storeSet(STORE_KEYS.PROMO_RULES, []);
  if (!localStorage.getItem(STORE_KEYS.PRICE_OVERRIDES)) storeSet(STORE_KEYS.PRICE_OVERRIDES, {});
  if (!localStorage.getItem(STORE_KEYS.PRODUCTOS_EXTRA)) storeSet(STORE_KEYS.PRODUCTOS_EXTRA, []);
  if (!localStorage.getItem(STORE_KEYS.STOCK_LEVELS)) storeSet(STORE_KEYS.STOCK_LEVELS, {});
  if (!localStorage.getItem(STORE_KEYS.ORDERS)) storeSet(STORE_KEYS.ORDERS, []);
  if (!localStorage.getItem(STORE_KEYS.AUDIT_LOG)) storeSet(STORE_KEYS.AUDIT_LOG, []);
  if (!localStorage.getItem(STORE_KEYS.PRODUCTOS_OCULTOS)) storeSet(STORE_KEYS.PRODUCTOS_OCULTOS, []);
}

// ── AUDITORÍA ────────────────────────────────────────────────────────────────
// Registra una acción de un usuario (quién, cuándo, qué). Se llama desde cada
// punto de mutación de datos en el resto de los módulos (ver auditoria.html).
// No depende de un módulo particular: usa getSession() de auth.js si ya está
// cargado, o "—" si no hay sesión (ej. un intento de login fallido).
function registrarAuditoria(accion, detalle) {
  var session = (typeof getSession === 'function') ? getSession() : null;
  var log = storeGet(STORE_KEYS.AUDIT_LOG, []);
  log.push({
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ts: new Date().toISOString(),
    username: session ? session.username : '—',
    rol: session ? session.rol : '—',
    accion: accion,
    detalle: detalle || '',
  });
  storeSet(STORE_KEYS.AUDIT_LOG, log);
}

async function seedUsers() {
  var defaultUsers = [
    { username:'admin',      nombre:'Administrador General', rol:'administrador', password:'admin123' },
    { username:'cajero',     nombre:'Encargado de Caja/Ventas', rol:'cajero',      password:'cajero123' },
  ];
  var users = [];
  for (var i = 0; i < defaultUsers.length; i++) {
    var u = defaultUsers[i];
    users.push({ username:u.username, nombre:u.nombre, rol:u.rol, passwordHash: await hashPassword(u.password) });
  }
  storeSet(STORE_KEYS.USERS, users);
}
