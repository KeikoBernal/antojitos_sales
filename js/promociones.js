(function () {
  seedIfEmpty();
  var session = requireAuth('promociones');
  if (!session) return;
  renderHeaderUser(session);
  renderNavForRole(session.rol);

  var puedeEditar = puedeAcceder(session.rol, 'promocionesEdit');

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function poblarSelectProductos(select) {
    select.innerHTML = CATEGORIAS.map(function (section) {
      var opciones = getCatalogoCompleto().filter(function (p) { return p.cat === section.cat; })
        .map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>'; })
        .join('');
      return '<optgroup label="' + section.label + '">' + opciones + '</optgroup>';
    }).join('');
  }

  function cargarBanner() {
    var banner = getBanner();
    document.getElementById('bannerActive').checked = banner.active;
    document.getElementById('bannerTitle').value = banner.title || '';
    document.getElementById('bannerSubtitle').value = banner.subtitle || '';
    document.getElementById('bannerTheme').value = banner.theme || 'rosa';
  }

  function renderListaReglas(tipo, listId, refrescar) {
    var rules = getPromoRules().filter(function (r) { return tipoRegla(r) === tipo; });
    var list = document.getElementById(listId);
    if (!rules.length) {
      list.innerHTML = '<div class="empty-state">' +
        (tipo === 'descuento' ? 'No hay descuentos configurados.' : 'No hay reglas de promoción configuradas.') +
        '</div>';
      return;
    }
    list.innerHTML = rules.map(function (rule) {
      return '<div class="promo-rule-row">' +
        '<div class="promo-rule-text">' + describirRegla(rule) +
          (rule.active ? '' : ' <span class="badge-role">Inactiva</span>') + '</div>' +
        (puedeEditar ?
          '<div style="display:flex; gap:8px; flex-shrink:0;">' +
            '<button class="btn-small" data-action="toggle" data-id="' + rule.id + '">' + (rule.active ? 'Desactivar' : 'Activar') + '</button>' +
            '<button class="btn-danger" data-action="delete" data-id="' + rule.id + '">Eliminar</button>' +
          '</div>' : '') +
      '</div>';
    }).join('');

    if (puedeEditar) {
      list.querySelectorAll('[data-action="toggle"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var rules = getPromoRules();
          var rule = rules.find(function (r) { return r.id === btn.getAttribute('data-id'); });
          if (rule) {
            rule.active = !rule.active;
            registrarAuditoria(tipo === 'descuento' ? 'descuento_' + (rule.active ? 'activado' : 'desactivado') : 'regla_promocion_' + (rule.active ? 'activada' : 'desactivada'), describirRegla(rule).replace(/<[^>]+>/g, ''));
          }
          savePromoRules(rules);
          refrescar();
        });
      });
      list.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var rules = getPromoRules();
          var rule = rules.find(function (r) { return r.id === btn.getAttribute('data-id'); });
          if (rule) registrarAuditoria(tipo === 'descuento' ? 'descuento_eliminado' : 'regla_promocion_eliminada', describirRegla(rule).replace(/<[^>]+>/g, ''));
          savePromoRules(rules.filter(function (r) { return r.id !== btn.getAttribute('data-id'); }));
          refrescar();
        });
      });
    }
  }

  function renderReglas() { renderListaReglas('regalo', 'rulesList', renderReglas); }
  function renderDescuentos() { renderListaReglas('descuento', 'descuentosList', renderDescuentos); }

  function mostrarToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 1600);
  }

  if (!puedeEditar) {
    document.querySelectorAll('#bannerPanel input, #bannerPanel select, #bannerPanel button, #ruleForm, #descuentoForm').forEach(function (el) {
      el.disabled = true;
      el.style.display = el.tagName === 'FORM' ? 'none' : el.style.display;
    });
    document.getElementById('saveBannerBtn').style.display = 'none';
  } else {
    document.getElementById('saveBannerBtn').addEventListener('click', function () {
      var banner = {
        active: document.getElementById('bannerActive').checked,
        title: document.getElementById('bannerTitle').value.trim(),
        subtitle: document.getElementById('bannerSubtitle').value.trim(),
        theme: document.getElementById('bannerTheme').value,
      };
      saveBanner(banner);
      registrarAuditoria('banner_actualizado', banner.active ? 'Banner activado: "' + banner.title + '"' : 'Banner desactivado');
      mostrarToast('Banner guardado');
    });

    document.getElementById('ruleForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var triggerId = document.getElementById('triggerProduct').value;
      var rewardId = document.getElementById('rewardProduct').value;
      var triggerProduct = buscarProducto(triggerId);

      var rules = getPromoRules();
      var nuevaRegla = {
        id: 'r_' + Date.now(),
        active: true,
        tipo: 'regalo',
        triggerProductId: triggerId,
        triggerProductName: triggerProduct ? triggerProduct.name : triggerId,
        buyQty: parseInt(document.getElementById('buyQty').value, 10),
        rewardProductId: rewardId,
        rewardQty: parseInt(document.getElementById('rewardQty').value, 10),
      };
      rules.push(nuevaRegla);
      savePromoRules(rules);
      registrarAuditoria('regla_promocion_creada', describirRegla(nuevaRegla).replace(/<[^>]+>/g, ''));
      e.target.reset();
      document.getElementById('buyQty').value = 2;
      document.getElementById('rewardQty').value = 1;
      renderReglas();
      mostrarToast('Regla agregada');
    });

    document.getElementById('descuentoForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var productId = document.getElementById('descuentoProduct').value;
      var producto = buscarProducto(productId);
      var porcentaje = parseInt(document.getElementById('descuentoPct').value, 10);
      if (!porcentaje || porcentaje < 1 || porcentaje > 90) {
        mostrarToast('El porcentaje debe estar entre 1 y 90');
        return;
      }

      var rules = getPromoRules();
      var nuevoDescuento = {
        id: 'r_' + Date.now(),
        active: true,
        tipo: 'descuento',
        productId: productId,
        productName: producto ? producto.name : productId,
        porcentaje: porcentaje,
      };
      rules.push(nuevoDescuento);
      savePromoRules(rules);
      registrarAuditoria('descuento_creado', describirRegla(nuevoDescuento).replace(/<[^>]+>/g, ''));
      e.target.reset();
      document.getElementById('descuentoPct').value = 10;
      renderDescuentos();
      mostrarToast('Descuento agregado');
    });
  }

  function prellenarDesdeQueryParams() {
    if (!puedeEditar) return;
    var params = new URLSearchParams(window.location.search);
    var trigger = params.get('trigger');
    var reward = params.get('reward');
    if (!trigger && !reward) return;

    if (trigger) document.getElementById('triggerProduct').value = trigger;
    if (reward) document.getElementById('rewardProduct').value = reward;
    if (params.get('buyQty')) document.getElementById('buyQty').value = params.get('buyQty');
    if (params.get('rewardQty')) document.getElementById('rewardQty').value = params.get('rewardQty');

    document.getElementById('ruleForm').scrollIntoView({ behavior:'smooth', block:'center' });
    mostrarToast('Regla precargada desde Reportes — revisa y presiona "Agregar regla"');
  }

  poblarSelectProductos(document.getElementById('triggerProduct'));
  poblarSelectProductos(document.getElementById('rewardProduct'));
  poblarSelectProductos(document.getElementById('descuentoProduct'));
  cargarBanner();
  renderReglas();
  renderDescuentos();
  prellenarDesdeQueryParams();
})();
