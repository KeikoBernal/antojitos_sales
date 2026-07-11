(async function () {
  seedIfEmpty();

  // Si ya hay sesión activa, saltar directo al módulo.
  var existing = getSession();
  if (existing) {
    window.location.href = puedeAcceder(existing.rol, 'ventas') ? 'ventas.html' : 'clientes.html';
    return;
  }

  var form = document.getElementById('loginForm');
  var errorBox = document.getElementById('loginError');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorBox.classList.remove('show');

    var username = document.getElementById('username').value.trim().toLowerCase();
    var password = document.getElementById('password').value;

    var users = storeGet(STORE_KEYS.USERS, []);
    var user = users.find(function (u) { return u.username === username; });

    if (!user) {
      registrarAuditoria('login_fallido', 'Intento de acceso con usuario "' + username + '" (no existe)');
      errorBox.textContent = 'Usuario o contraseña incorrectos.';
      errorBox.classList.add('show');
      return;
    }

    var hash = await hashPassword(password);
    if (hash !== user.passwordHash) {
      registrarAuditoria('login_fallido', 'Intento de acceso con usuario "' + username + '" (contraseña incorrecta)');
      errorBox.textContent = 'Usuario o contraseña incorrectos.';
      errorBox.classList.add('show');
      return;
    }

    setSession(user);
    registrarAuditoria('login', 'Inicio de sesión exitoso');
    window.location.href = puedeAcceder(user.rol, 'ventas') ? 'ventas.html' : 'clientes.html';
  });
})();
