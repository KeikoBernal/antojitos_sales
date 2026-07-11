// ── AUTENTICACIÓN Y CONTROL DE ACCESO POR ROL ───────────────────────────────

var ROLES_PERMISOS = {
  administrador: { ventas:true, clientes:true, promociones:true,  promocionesEdit:true,  historial:true, reportes:true, respaldo:true,  precios:true,  inventario:true, pedidos:true, auditoria:true  },
  cajero:        { ventas:true, clientes:true, promociones:false, promocionesEdit:false, historial:false, reportes:false, respaldo:false, precios:false, inventario:false, pedidos:true, auditoria:false },
};

function getSession() {
  return sessionGet(STORE_KEYS.SESSION, null);
}

function setSession(user) {
  sessionSet(STORE_KEYS.SESSION, { username:user.username, nombre:user.nombre, rol:user.rol, ts:Date.now() });
}

function logout() {
  registrarAuditoria('logout', 'Cierre de sesión');
  sessionStorage.removeItem(STORE_KEYS.SESSION);
  sessionStorage.removeItem(STORE_KEYS.CART);
  window.location.href = 'login.html';
}

function puedeAcceder(rol, seccion) {
  var permisos = ROLES_PERMISOS[rol];
  return !!(permisos && permisos[seccion]);
}

// Protege una página: si no hay sesión, redirige a login.
// Si hay sesión pero el rol no tiene acceso a `seccion`, redirige a una sección permitida.
function requireAuth(seccion) {
  var session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  if (seccion && !puedeAcceder(session.rol, seccion)) {
    window.location.href = 'clientes.html';
    return null;
  }
  return session;
}

function renderHeaderUser(session) {
  var nameEl = document.getElementById('headerUserName');
  var roleEl = document.getElementById('headerUserRole');
  if (nameEl) nameEl.textContent = session.nombre;
  if (roleEl) roleEl.textContent = session.rol;
}

function renderNavForRole(rol) {
  document.querySelectorAll('[data-nav-section]').forEach(function (el) {
    var seccion = el.getAttribute('data-nav-section');
    if (!puedeAcceder(rol, seccion)) el.style.display = 'none';
  });
}
