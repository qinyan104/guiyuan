import type { PublicationData, PublicationLayout, PublicationSettings } from '../../types/family'
import {
  createStandalonePublicationSvg,
  escapeHtml,
  getSvgThemeMap,
  serializeSvg,
} from './publicationExport'
import { createPortablePublication } from '../persistence/draftPersistence'
import { isPersonDeceased } from '../../lib/personStatus'

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
  const deceased = people.filter(p => isPersonDeceased(p)).length
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
  inset: 0;
  background: rgba(20,19,18,0.22);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 1000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
#detail-panel.visible {
  opacity: 1;
  pointer-events: auto;
}
.detail-card {
  width: 860px;
  max-width: calc(100vw - 20px);
  max-height: 88vh;
  background: rgba(249,248,245,0.95);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border-radius: var(--radius-xl, 24px);
  border: 1px solid rgba(255,255,255,0.45);
  box-shadow: 0 24px 64px rgba(20,19,18,0.12), inset 0 1px 0 rgba(255,255,255,0.66);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(18px) scale(0.98);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
#detail-panel.visible .detail-card {
  transform: translateY(0) scale(1);
}
.detail-bar {
  display: flex;
  align-items: center;
  padding: 16px 22px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
}
.detail-bar > span:first-child,
#detail-close {
  min-width: 44px;
}
.detail-bar-title {
  flex: 1;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-neutral-10, #241a10);
}
#detail-close {
  border: 0;
  background: none;
  color: var(--color-accent, var(--accent-signal, #9a4d36));
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-align: right;
}
#detail-close:hover {
  opacity: 0.72;
}

#detail-content {
  padding: 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
}
.detail-body {
  display: flex;
  gap: 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.detail-left,
.detail-right {
  overflow-y: auto;
}
.detail-left::-webkit-scrollbar,
.detail-right::-webkit-scrollbar { width: 3px; }
.detail-left::-webkit-scrollbar-thumb,
.detail-right::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color-neutral-7, #8a8078) 18%, transparent); border-radius: 3px; }
.detail-left {
  width: 220px;
  flex-shrink: 0;
  padding: 24px 20px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border-right: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  background: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0));
}
.detail-right {
  flex: 1;
  padding: 24px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.detail-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.detail-avatar {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-lg, 14px);
  object-fit: contain;
  border: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  background: var(--color-neutral-2, #f1eee7);
}
.detail-avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-7, #8a8078);
  font-size: 32px;
  font-weight: 700;
}
.detail-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--color-neutral-9, #241a10);
  padding: 4px 0;
  text-align: center;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.detail-tags span {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full, 999px);
  background: rgba(255,255,255,0.86);
  border: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  color: var(--color-neutral-8, #6f6254);
  font-size: 11px;
  font-weight: 600;
}
.detail-tags .alive { color: #416f57; }
.detail-tags .deceased { color: var(--color-neutral-7, #746b61); }

.detail-group {
  background: var(--color-neutral-1, rgba(255,255,255,0.72));
  border: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  border-radius: var(--radius-lg, 14px);
  padding: 16px;
}
.detail-group-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-neutral-9, #241a10);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-card-stroke, rgba(120,118,112,0.14));
}
.detail-fields {
  display: grid;
  gap: 1px;
}
.detail-field {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
}
.detail-field + .detail-field {
  border-top: 1px solid var(--color-card-stroke, rgba(120,118,112,0.12));
}
.detail-label {
  color: var(--color-neutral-7, #8a8078);
  font-size: 12px;
  font-weight: 500;
}
.detail-value {
  color: var(--color-neutral-9, #241a10);
  line-height: 1.6;
  word-break: break-word;
  font-weight: 500;
}

.detail-relations {
  display: grid;
  gap: 10px;
}
.rel-group {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
}
.rel-group + .rel-group {
  border-top: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
}
.rel-label {
  width: 36px;
  flex-shrink: 0;
  padding-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-neutral-9, #241a10);
}
.rel-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.rel-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 6px 12px 6px 6px;
  background: var(--color-neutral-1, rgba(255,255,255,0.86));
  border: 1px solid var(--color-card-stroke, rgba(120,118,112,0.16));
  border-radius: var(--radius-md, 10px);
  cursor: pointer;
  color: var(--color-neutral-9, #241a10);
  font-weight: 500;
  transition: all 0.15s;
}
.rel-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-neutral-7, #8a8078) 10%, transparent);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-neutral-7, #8a8078);
  flex-shrink: 0;
}
.rel-name {
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rel-item.gm { background: color-mix(in srgb, var(--color-accent, #9a4d36) 6%, transparent); }
.rel-item.gf { background: color-mix(in srgb, var(--color-error, #c43a31) 6%, transparent); }
.rel-item:hover {
  border-color: var(--color-accent, var(--accent-signal, #9a4d36));
  background: color-mix(in srgb, var(--color-accent, #9a4d36) 4%, transparent);
  color: var(--color-accent, var(--accent-signal, #9a4d36));
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

@media (max-width: 900px) {
  #pub-header { padding: 10px 14px; }
  #pub-header h1 { font-size: 1.1rem; }
  #detail-panel {
    padding: 12px;
  }
  .detail-card {
    max-height: 88vh;
    border-radius: 18px;
  }
  .detail-body { flex-direction: column; }
  .detail-left {
    width: auto;
    border-right: none;
    border-bottom: 1px solid rgba(120,118,112,0.16);
  }
  .detail-right { padding: 18px 16px 20px; }
  #tree-viewport { font-size: 16px; }
  #detail-close { width: auto; height: auto; font-size: 15px; }
  .detail-field { grid-template-columns: 48px 1fr; }
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
    <div class="detail-card">
      <div class="detail-bar">
        <span></span>
        <span class="detail-bar-title">人物信息</span>
        <button id="detail-close">关闭</button>
      </div>
      <div id="detail-content"></div>
    </div>
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

