function serializeInlineScriptValue(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

import type { ThemeMode } from './exportTheme'

export function buildEmbeddedScript(dataJson: string, isEncrypted: boolean, defaultTheme: ThemeMode = 'paper'): string {
  const plainData = isEncrypted ? 'null' : serializeInlineScriptValue(dataJson)
  const encryptedBlob = isEncrypted ? serializeInlineScriptValue(JSON.parse(dataJson)) : 'null'

  return `
(function() {
  'use strict';

  var DATA_JSON = ${plainData};
  var ENCRYPTED_BLOB = ${encryptedBlob};

  // --- Base64 helpers ---
  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // --- AES Decryption ---
  async function decryptPayload(blob, password) {
    var encoder = new TextEncoder();
    var salt = base64ToArrayBuffer(blob.salt);
    var iv = base64ToArrayBuffer(blob.iv);
    var data = base64ToArrayBuffer(blob.data);

    var keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  }

  // --- Relationship lookup ---
  function getRelationships(personId, families) {
    var parents = [], spouses = [], children = [];
    var keys = Object.keys(families);
    for (var i = 0; i < keys.length; i++) {
      var f = families[keys[i]];
      if (f.children && f.children.indexOf(personId) !== -1) {
        parents = parents.concat(f.adults || []);
      }
      if (f.adults && f.adults.indexOf(personId) !== -1) {
        spouses = spouses.concat((f.adults || []).filter(function(id) { return id !== personId; }));
        children = children.concat(f.children || []);
      }
    }
    return { parents: parents, spouses: spouses, children: children };
  }

  // --- Detail panel ---
  function showDetail(personId, data) {
    var person = data.publication.people[personId];
    if (!person) return;
    var rels = getRelationships(personId, data.publication.families);
    var panel = document.getElementById('detail-panel');
    var content = document.getElementById('detail-content');
    var html = '';

    function personChip(p, id) {
      var cls = p.gender === 'male' ? 'gm' : p.gender === 'female' ? 'gf' : '';
      return '<button class="rel-item ' + cls + '" data-pid="' + escapeAttr(id) + '"><span class="rel-avatar">' + escapeHtml(p.name ? p.name.charAt(0) : '?') + '</span><span class="rel-name">' + escapeHtml(p.name) + '</span></button>';
    }

    html += '<div class="detail-body"><div class="detail-left">';
    html += '<div class="detail-profile">';
    if (person.avatarUrl && person.avatarUrl.startsWith('data:')) {
      html += '<img class="detail-avatar" src="' + escapeAttr(person.avatarUrl) + '" alt="' + escapeAttr(person.name) + '">';
    } else {
      html += '<div class="detail-avatar detail-avatar--empty">' + escapeHtml(person.name ? person.name.charAt(0) : '?') + '</div>';
    }
    html += '<div class="detail-name">' + escapeHtml(person.name) + '</div><div class="detail-tags">';
    html += '<span>' + (person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知') + '</span>';
    html += '<span class="' + (person.deceased ? 'deceased' : 'alive') + '">' + (person.deceased ? '已故' : '在世') + '</span>';
    html += '</div></div>';
    html += '</div><div class="detail-right">';

    var lifeDetails = [];
    if (person.birth) lifeDetails.push({ label: '生年', value: person.birth });
    if (person.death) lifeDetails.push({ label: '卒年', value: person.death });
    if (person.age) lifeDetails.push({ label: person.death ? '享年' : '年龄', value: person.age });

    var extraDetails = [];
    if (person.clan) extraDetails.push({ label: '世系', value: person.clan });
    if (person.titleName) extraDetails.push({ label: '称号', value: person.titleName });
    if (person.note) extraDetails.push({ label: '注记', value: person.note });

    function appendDetailGroup(title, details) {
      if (!details.length) return;
      html += '<div class="detail-group"><div class="detail-group-title">' + title + '</div>';
      html += '<div class="detail-fields">';
      for (var i = 0; i < details.length; i++) {
        html += '<div class="detail-field"><span class="detail-label">' + escapeHtml(details[i].label) + '</span><span class="detail-value">' + escapeHtml(details[i].value) + '</span></div>';
      }
      html += '</div>';
      html += '</div>';
    }

    appendDetailGroup('生卒信息', lifeDetails);
    appendDetailGroup('补充信息', extraDetails);

    // Relationships
    var relHtml = '';
    if (rels.parents.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">父母</span><div class="rel-body">';
      for (var j = 0; j < rels.parents.length; j++) {
        var pp = data.publication.people[rels.parents[j]];
        if (pp) relHtml += personChip(pp, rels.parents[j]);
      }
      relHtml += '</div></div>';
    }
    if (rels.spouses.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">配偶</span><div class="rel-body">';
      for (var k = 0; k < rels.spouses.length; k++) {
        var sp = data.publication.people[rels.spouses[k]];
        if (sp) relHtml += personChip(sp, rels.spouses[k]);
      }
      relHtml += '</div></div>';
    }
    if (rels.children.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">子女</span><div class="rel-body">';
      for (var m = 0; m < rels.children.length; m++) {
        var cp = data.publication.people[rels.children[m]];
        if (cp) relHtml += personChip(cp, rels.children[m]);
      }
      relHtml += '</div></div>';
    }
    if (relHtml) {
      html += '<div class="detail-group"><div class="detail-group-title">亲属关系</div><div class="detail-relations">' + relHtml + '</div></div>';
    }

    html += '</div></div>';

    content.innerHTML = html;
    panel.classList.add('visible');

    // Click on relationship items
    var relItems = content.querySelectorAll('.rel-item');
    for (var n = 0; n < relItems.length; n++) {
      relItems[n].addEventListener('click', function() {
        showDetail(this.getAttribute('data-pid'), data);
      });
    }
  }

  function hideDetail() {
    document.getElementById('detail-panel').classList.remove('visible');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function renderPublicationMetadata(data) {
    var pub = data.publication || {};
    var info = pub.info || {};
    var parts = [];
    if (pub.title) parts.push('<h1>' + escapeHtml(pub.title) + '</h1>');
    if (pub.subtitle) parts.push('<h2>' + escapeHtml(pub.subtitle) + '</h2>');

    var infoItems = [];
    if (info.description) infoItems.push('<p class="info-desc">' + escapeHtml(info.description) + '</p>');
    if (info.ancestralOrigin) infoItems.push('<span class="info-tag">郡望/祖籍：' + escapeHtml(info.ancestralOrigin) + '</span>');
    if (info.hallName) infoItems.push('<span class="info-tag">堂号：' + escapeHtml(info.hallName) + '</span>');
    if (info.familyMotto) infoItems.push('<span class="info-tag">族训：' + escapeHtml(info.familyMotto) + '</span>');
    if (infoItems.length) parts.push('<div class="pub-info">' + infoItems.join('') + '</div>');
    document.getElementById('pub-header-content').innerHTML = parts.join('');

    var people = Object.values(pub.people || {});
    var deceased = people.filter(function(person) { return Boolean(person.deceased || person.death); }).length;
    var stats = ['共 ' + people.length + ' 人'];
    if (people.length - deceased > 0) stats.push('在世 ' + (people.length - deceased) + ' 人');
    if (deceased > 0) stats.push('已故 ' + deceased + ' 人');
    document.getElementById('pub-stats').textContent = stats.join(' · ');
    document.title = (pub.title || '未命名') + ' - 族谱分享';
  }

  // --- Pan / Zoom ---
  function setupInteraction(viewport, camera) {
    var zoom = 1, panX = 0, panY = 0;
    var svg = camera.querySelector('svg');
    var vb = svg ? svg.getAttribute('viewBox') : null;
    var vbW = 0, vbH = 0;
    if (vb) {
      var parts = vb.split(/[\\s,]+/);
      vbW = parseFloat(parts[2]) || 0;
      vbH = parseFloat(parts[3]) || 0;
    }

    function updateTransform() {
      camera.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
    }

    function fitToView() {
      var vw = viewport.clientWidth;
      var vh = viewport.clientHeight;
      if (vbW > 0 && vbH > 0) {
        zoom = Math.min(vw / vbW, vh / vbH) * 0.92;
        panX = (vw - vbW * zoom) / 2;
        panY = (vh - vbH * zoom) / 2;
      }
      updateTransform();
    }

    fitToView();

    // Mouse wheel zoom
    viewport.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      var newZoom = Math.min(5, Math.max(0.1, zoom * delta));
      var rect = viewport.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      panX = cx - (cx - panX) * (newZoom / zoom);
      panY = cy - (cy - panY) * (newZoom / zoom);
      zoom = newZoom;
      updateTransform();
    }, { passive: false });

    // Pointer drag
    var dragging = false, startX, startY, startPanX, startPanY;
    viewport.addEventListener('pointerdown', function(e) {
      if (e.target.closest('.person-card')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startPanX = panX; startPanY = panY;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      updateTransform();
    });
    viewport.addEventListener('pointerup', function() { dragging = false; });

    // Touch pinch
    var lastTouchDist = 0;
    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });
    viewport.addEventListener('touchmove', function(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        var dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        var scale = dist / lastTouchDist;
        zoom = Math.min(5, Math.max(0.1, zoom * scale));
        lastTouchDist = dist;
        updateTransform();
      }
    }, { passive: false });

    // Double-tap to zoom on a person card
    var lastTapTime = 0;
    camera.addEventListener('click', function(e) {
      var card = e.target.closest('[data-person-id]');
      if (!card) return;
      var now = Date.now();
      if (now - lastTapTime < 350) {
        // Double tap: zoom to this card
        e.preventDefault();
        e.stopPropagation();
        try {
          var bbox = card.getBBox();
          var cardCenterX = bbox.x + bbox.width / 2;
          var cardCenterY = bbox.y + bbox.height / 2;
          var targetZoom = 1.5;
          var viewW = viewport.clientWidth;
          var viewH = viewport.clientHeight;
          zoom = targetZoom;
          panX = viewW / 2 - cardCenterX * targetZoom;
          panY = viewH / 2 - cardCenterY * targetZoom;
          updateTransform();
        } catch(e) {}
      }
      lastTapTime = now;
    });
  }

  // --- Card click ---
  function setupCardClick(viewport, data) {
    viewport.addEventListener('click', function(e) {
      var card = e.target.closest('.person-card');
      if (!card) return;
      var personId = card.getAttribute('data-person-id');
      if (personId) showDetail(personId, data);
    });
  }

  // --- Close panel ---
  function setupClosePanel() {
    var panel = document.getElementById('detail-panel');
    document.getElementById('detail-close').addEventListener('click', hideDetail);
    panel.addEventListener('click', function(e) {
      if (e.target === panel) hideDetail();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') hideDetail();
    });
  }

  // --- Header toggle ---
  function setupHeaderToggle() {
    var btn = document.getElementById('header-toggle');
    var header = document.getElementById('pub-header');
    if (!btn || !header) return;
    btn.addEventListener('click', function() {
      header.classList.toggle('collapsed');
      btn.textContent = header.classList.contains('collapsed') ? '展开' : '收起';
    });
  }

  // --- Theme switcher ---
  function setupThemeSwitcher(initialTheme) {
    var themeBtn = document.getElementById('theme-btn');
    var themeMenu = document.getElementById('theme-menu');
    var nameEl = document.getElementById('current-theme-name');
    var dotEl = document.getElementById('current-theme-dot');
    var THEME_NAMES = {
      paper: '经典 · 宣纸',
      slate: '素白 · 黛蓝',
      pure: '纸白 · 徽墨',
      pine: '宣白 · 松绿',
      dark: '玄墨 · 霁蓝'
    };

    function applyTheme(themeId) {
      document.documentElement.setAttribute('data-theme', themeId);
      var svg = document.querySelector('#tree-camera svg');
      if (svg) {
        svg.setAttribute('data-theme', themeId);
        svg.setAttribute('class', 'publication-svg theme-' + themeId);
      }
      if (nameEl) nameEl.textContent = THEME_NAMES[themeId] || '配色';
      var option = document.querySelector('.theme-option[data-theme-id="' + themeId + '"]');
      if (dotEl && option) {
        var optDot = option.querySelector('.theme-dot');
        if (optDot) dotEl.style.background = optDot.style.background;
      }
      document.querySelectorAll('.theme-option').forEach(function(btn) {
        if (btn.getAttribute('data-theme-id') === themeId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      try {
        localStorage.setItem('guiyuan:share-theme', themeId);
      } catch (e) {}
    }

    var saved = null;
    try {
      saved = localStorage.getItem('guiyuan:share-theme');
    } catch (e) {}
    applyTheme(saved || initialTheme || 'paper');

    if (themeBtn && themeMenu) {
      themeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        themeMenu.classList.toggle('show');
      });
      document.addEventListener('click', function() {
        themeMenu.classList.remove('show');
      });
      document.querySelectorAll('.theme-option').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var tid = btn.getAttribute('data-theme-id');
          applyTheme(tid);
          themeMenu.classList.remove('show');
        });
      });
    }
  }

  // --- Init ---
  function init(data) {
    var app = document.getElementById('app');
    var camera = document.getElementById('tree-camera');
    var viewport = document.getElementById('tree-viewport');

    renderPublicationMetadata(data);

    // Inject SVG
    camera.innerHTML = data.svgMarkup;

    // Show app
    app.style.display = 'flex';

    setupThemeSwitcher(data.defaultTheme || '${defaultTheme}');
    setupInteraction(viewport, camera);
    setupCardClick(viewport, data);
    setupClosePanel();
    setupHeaderToggle();
  }

  // --- Entry ---
  if (${isEncrypted}) {
    // Encrypted mode
    var gate = document.getElementById('password-gate');
    gate.style.display = 'flex';
    document.getElementById('pwd-submit').addEventListener('click', async function() {
      var pwd = document.getElementById('pwd-input').value;
      var errEl = document.getElementById('pwd-error');
      if (!pwd) { errEl.textContent = '请输入密码'; return; }
      errEl.textContent = '解密中...';
      try {
        var json = await decryptPayload(ENCRYPTED_BLOB, pwd);
        var data = JSON.parse(json);
        gate.style.display = 'none';
        init(data);
      } catch (err) {
        errEl.textContent = '密码错误或文件已损坏';
      }
    });
    document.getElementById('pwd-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('pwd-submit').click();
    });
  } else {
    // Plain mode
    var data = JSON.parse(DATA_JSON);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { init(data); });
    } else {
      init(data);
    }
  }
})();`
}
