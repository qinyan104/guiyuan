import type { PublicationData, PublicationLayout, PublicationSettings } from '../../types/family'
import {
  createStandalonePublicationSvg,
  escapeHtml,
  getSvgThemeMap,
  serializeSvg,
} from './publicationExport'
import { createPortablePublication } from '../persistence/draftPersistence'

export interface ShareHtmlOptions {
  publication: PublicationData
  settings: PublicationSettings
  layout: PublicationLayout
  svgElement: SVGSVGElement
  password?: string
  onProgress?: (stage: string, percent: number) => void
}

interface EncryptedPayload {
  v: number
  salt: string
  iv: string
  data: string
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function encryptPayload(jsonString: string, password: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonString),
  )

  return {
    v: 1,
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(new Uint8Array(encrypted)),
  }
}

export function buildInfoHeader(pub: PublicationData): string {
  const parts: string[] = []
  if (pub.title) {
    parts.push(`<h1>${escapeHtml(pub.title)}</h1>`)
  }
  if (pub.subtitle) {
    parts.push(`<h2>${escapeHtml(pub.subtitle)}</h2>`)
  }

  const infoItems: string[] = []
  if (pub.info?.description) {
    infoItems.push(`<p class="info-desc">${escapeHtml(pub.info.description)}</p>`)
  }
  if (pub.info?.ancestralOrigin) {
    infoItems.push(`<span class="info-tag">\u90e1\u671b/\u7956\u7c4d\uff1a${escapeHtml(pub.info.ancestralOrigin)}</span>`)
  }
  if (pub.info?.hallName) {
    infoItems.push(`<span class="info-tag">\u5802\u53f7\uff1a${escapeHtml(pub.info.hallName)}</span>`)
  }
  if (pub.info?.familyMotto) {
    infoItems.push(`<span class="info-tag">\u65cf\u8bad\uff1a${escapeHtml(pub.info.familyMotto)}</span>`)
  }
  if (infoItems.length) {
    parts.push(`<div class="pub-info">${infoItems.join('')}</div>`)
  }
  return parts.join('\n')
}

function buildThemeCss(themeVars: Record<string, string>): string {
  let css = ':root {\n'
  for (const [key, val] of Object.entries(themeVars)) {
    if (val) css += `  ${key}: ${val};\n`
  }
  css += '}\n'
  return css
}

function buildStatsHtml(pub: PublicationData): string {
  const people = Object.values(pub.people)
  const total = people.length
  const deceased = people.filter(p => p.deceased).length
  const alive = total - deceased

  const parts: string[] = [`<span>\u5171 ${total} \u4eba</span>`]
  if (alive > 0) parts.push(`<span>\u5728\u4e16 ${alive} \u4eba</span>`)
  if (deceased > 0) parts.push(`<span>\u5df2\u6545 ${deceased} \u4eba</span>`)
  return parts.join(' ? ')
}

export function buildEmbeddedScript(dataJson: string, isEncrypted: boolean): string {
  return `
(function() {
  'use strict';

  var DATA_JSON = ${isEncrypted ? 'null' : JSON.stringify(dataJson)};
  var ENCRYPTED_BLOB = ${isEncrypted ? dataJson : 'null'};

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

    html += '<div class="detail-header">';
    if (person.avatarUrl && person.avatarUrl.startsWith('data:')) {
      html += '<img class="detail-photo" src="' + person.avatarUrl + '" alt="' + escapeAttr(person.name) + '">';
    }
    html += '<h3>' + escapeHtml(person.name) + '</h3>';
    html += '<span class="detail-gender">' + (person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知') + '</span>';
    if (person.deceased) html += '<span class="detail-status deceased">已故</span>';
    else html += '<span class="detail-status alive">在世</span>';
    html += '</div>';

    var details = [];
    if (person.birth) details.push({ label: '出生', value: person.birth });
    if (person.death) details.push({ label: '逝世', value: person.death });
    if (person.age) details.push({ label: '享年', value: person.age });
    if (person.clan) details.push({ label: '世系', value: person.clan });
    if (person.titleName) details.push({ label: '称号', value: person.titleName });
    if (person.note) details.push({ label: '备注', value: person.note });

    if (details.length > 0) {
      html += '<div class="detail-fields">';
      for (var i = 0; i < details.length; i++) {
        html += '<div class="detail-field"><span class="detail-label">' + escapeHtml(details[i].label) + '</span><span class="detail-value">' + escapeHtml(details[i].value) + '</span></div>';
      }
      html += '</div>';
    }

    // Relationships
    var relHtml = '';
    if (rels.parents.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">父母</span>';
      for (var j = 0; j < rels.parents.length; j++) {
        var pp = data.publication.people[rels.parents[j]];
        if (pp) relHtml += '<span class="rel-item" data-pid="' + rels.parents[j] + '">' + escapeHtml(pp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.spouses.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">配偶</span>';
      for (var k = 0; k < rels.spouses.length; k++) {
        var sp = data.publication.people[rels.spouses[k]];
        if (sp) relHtml += '<span class="rel-item" data-pid="' + rels.spouses[k] + '">' + escapeHtml(sp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.children.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">子女</span>';
      for (var m = 0; m < rels.children.length; m++) {
        var cp = data.publication.people[rels.children[m]];
        if (cp) relHtml += '<span class="rel-item" data-pid="' + rels.children[m] + '">' + escapeHtml(cp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (relHtml) {
      html += '<div class="detail-relations">' + relHtml + '</div>';
    }

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

  // --- Pan / Zoom ---
  function setupInteraction(viewport, camera) {
    var zoom = 1, panX = 0, panY = 0;
    var svg = camera.querySelector('svg');
    var vb = svg ? svg.getAttribute('viewBox') : null;
    var vbW = 0, vbH = 0;
    if (vb) {
      var parts = vb.split(/[\s,]+/);
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
    document.getElementById('detail-close').addEventListener('click', hideDetail);
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

  // --- Init ---
  function init(data) {
    var app = document.getElementById('app');
    var camera = document.getElementById('tree-camera');
    var viewport = document.getElementById('tree-viewport');

    // Inject SVG
    camera.innerHTML = data.svgMarkup;

    // Show app
    app.style.display = 'flex';

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

export function buildHtmlTemplate(options: {
  title: string
  themeCss: string
  infoHeader: string
  statsHtml: string
  script: string
  isEncrypted: boolean
  generatedAt: string
}): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)} - 族谱分享</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

${options.themeCss}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Manrope', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  color: var(--text-main, #241a10);
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Password gate */
#password-gate {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  z-index: 9999;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
}
#password-gate .gate-box {
  background: var(--bg-paper, #fff9ef);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
  border-radius: 8px;
  padding: 48px;
  text-align: center;
  max-width: 380px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}
#password-gate h2 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.2rem;
  margin-bottom: 8px;
}
#password-gate p {
  font-size: 0.85rem;
  color: var(--text-soft, #8a8078);
  margin-bottom: 24px;
}
#pwd-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--card-panel-stroke, #e0ddd8);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #241a10);
  outline: none;
  margin-bottom: 12px;
}
#pwd-input:focus {
  border-color: var(--accent-signal, #b08d57);
}
#pwd-submit {
  width: 100%;
  padding: 14px;
  background: var(--accent-signal, #b08d57);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
#pwd-submit:hover { opacity: 0.9; }
#pwd-error {
  color: #c0392b;
  font-size: 0.8rem;
  min-height: 1.2em;
  margin-top: 4px;
}

/* App layout */
#app {
  display: none;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* Header */
#pub-header {
  padding: 20px 32px 16px;
  background: var(--bg-paper, #fff9ef);
  border-bottom: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
  position: relative;
  flex-shrink: 0;
  transition: max-height 0.3s ease, padding 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}
#pub-header.collapsed {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-bottom: none;
}
#pub-header h1 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}
#pub-header h2 {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: var(--text-soft, #8a8078);
  margin-bottom: 10px;
}
.pub-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.info-desc {
  font-size: 0.85rem;
  color: var(--text-soft, #8a8078);
  line-height: 1.6;
  width: 100%;
  margin-bottom: 4px;
}
.info-tag {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--bg-shell, #f5f0e8);
  border-radius: 3px;
  color: var(--text-main, #241a10);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.04));
}
#header-toggle {
  position: absolute;
  right: 32px;
  top: 20px;
  font-size: 0.7rem;
  padding: 4px 10px;
  background: var(--bg-shell, #f5f0e8);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-soft, #8a8078);
}
#header-toggle:hover { color: var(--text-main, #241a10); }

/* Tree viewport */
#tree-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--canvas-bg, var(--bg-paper, #fff9ef));
  cursor: grab;
}
#tree-viewport:active { cursor: grabbing; }
#tree-camera {
  position: absolute;
  transform-origin: 0 0;
  will-change: transform;
}
#tree-camera svg {
  display: block;
}

/* Detail panel */
#detail-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100%;
  width: 340px;
  max-width: 90vw;
  background: var(--bg-shell, #f9f8f5);
  border-left: 1px solid rgba(0,0,0,0.06);
  box-shadow: -4px 0 32px rgba(0,0,0,0.08);
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1000;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
#detail-panel.visible {
  transform: translateX(0);
}
#detail-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(0,0,0,0.03);
  color: #888;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.15s;
}
#detail-close:hover {
  background: #333;
  color: #fff;
  border-color: #333;
}

#detail-content {
  padding: 28px 24px;
}
.detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.detail-photo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0,0,0,0.06);
}
.detail-header h3 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  font-weight: 500;
  color: #24231f;
  margin: 0;
  flex: 1;
}
.detail-gender {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.04);
  border-radius: 4px;
  color: #787670;
}
.detail-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.detail-status.deceased { color: #787670; background: rgba(120,118,112,0.08); }
.detail-status.alive { color: #5e9f7e; background: rgba(94,159,126,0.08); }

.detail-fields {
  margin-bottom: 16px;
}
.detail-field {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}
.detail-label {
  color: #a8a69f;
  min-width: 40px;
  flex-shrink: 0;
}
.detail-value {
  color: #403f3a;
}

.detail-relations {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
}
.rel-group {
  margin-bottom: 10px;
}
.rel-label {
  font-size: 10px;
  font-weight: 600;
  color: #a8a69f;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 6px;
}
.rel-item {
  display: inline-block;
  font-size: 13px;
  padding: 4px 12px;
  margin: 2px 4px 2px 0;
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 6px;
  cursor: pointer;
  color: #403f3a;
  transition: all 0.15s;
}
.rel-item:hover {
  background: rgba(0,0,0,0.08);
  border-color: rgba(0,0,0,0.12);
}

/* Footer */
#pub-footer {
  padding: 10px 32px;
  background: var(--bg-paper, #fff9ef);
  border-top: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
  font-size: 0.75rem;
  color: var(--text-soft, #8a8078);
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  #pub-header { padding: 10px 14px; }
  #pub-header h1 { font-size: 1.1rem; }
  #detail-panel {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100vw; max-width: 100vw;
    height: 45vh;
    border-radius: 16px 16px 0 0;
    padding-top: 24px;
  }
  #detail-panel::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #ccc;
  }
  #tree-viewport { font-size: 16px; }
  .detail-close { width: 44px; height: 44px; font-size: 18px; }
  #pub-footer { padding: 8px 12px; flex-direction: column; gap: 4px; font-size: 0.78rem; }
  #password-gate input {
    font-size: 16px;
    padding: 12px 16px;
  }
  #password-gate button {
    padding: 12px 24px;
    font-size: 16px;
  }
}
</style>
</head>
<body>

<div id="password-gate">
  <div class="gate-box">
    <h2>\u65cf\u8c31\u5df2\u52a0\u5bc6</h2>
    <p>\u8bf7\u8f93\u5165\u5bc6\u7801\u4ee5\u67e5\u770b\u5185\u5bb9</p>
    <input type="password" id="pwd-input" placeholder="\u8bf7\u8f93\u5165\u5bc6\u7801" autocomplete="off">
    <button id="pwd-submit">解密</button>
    <div id="pwd-error"></div>
  </div>
</div>

<div id="app">
  <header id="pub-header">
    <button id="header-toggle">收起</button>
    ${options.infoHeader}
  </header>

  <main id="tree-viewport">
    <div id="tree-camera"></div>
  </main>

  <aside id="detail-panel">
    <button id="detail-close">&times;</button>
    <div id="detail-content"></div>
  </aside>

  <footer id="pub-footer">
    <span>${options.statsHtml}</span>
    <span>生成于：${escapeHtml(options.generatedAt)} · 族谱分享</span>
  </footer>
</div>

<script>
${options.script}
</script>
</body>
</html>`
}

export async function generateShareHtml(options: ShareHtmlOptions): Promise<string> {
  const { publication, settings, layout, svgElement, password, onProgress } = options

  onProgress?.('capturing', 10)

  // Phase 1: Capture SVG with embedded images
  const standaloneSvg = await createStandalonePublicationSvg({
    svgElement,
    layout,
    title: publication.title.trim() || '未命名族谱',
    embedImages: true,
  })
  onProgress?.('capturing', 25)

  // Phase 2: Capture theme variables
  const themeVars = getSvgThemeMap()
  onProgress?.('capturing', 30)

  // Phase 3: Serialize SVG
  const svgMarkup = serializeSvg(standaloneSvg, false)
  onProgress?.('building', 40)

  // Phase 4: Create portable publication (inline photos)
  const portablePub = await createPortablePublication(publication)
  onProgress?.('building', 60)

  // Phase 5: Build data payload
  const payload = JSON.stringify({
    publication: portablePub,
    settings,
    themeVars,
    svgMarkup,
  })
  onProgress?.('building', 70)

  // Phase 6: Optional encryption
  let dataJson: string
  let isEncrypted = false

  if (password) {
    onProgress?.('encrypting', 75)
    const encrypted = await encryptPayload(payload, password)
    dataJson = JSON.stringify(encrypted)
    isEncrypted = true
    onProgress?.('encrypting', 85)
  } else {
    dataJson = payload
    onProgress?.('assembling', 85)
  }

  // Phase 7: Build HTML
  onProgress?.('assembling', 90)
  const themeCss = buildThemeCss(themeVars)
  const infoHeader = buildInfoHeader(publication)
  const statsHtml = buildStatsHtml(publication)
  const generatedAt = new Date().toLocaleString('zh-CN')
  const script = buildEmbeddedScript(dataJson, isEncrypted)

  const html = buildHtmlTemplate({
    title: publication.title.trim() || '未命名',
    themeCss,
    infoHeader,
    statsHtml,
    script,
    isEncrypted,
    generatedAt,
  })

  onProgress?.('done', 100)
  return html
}

