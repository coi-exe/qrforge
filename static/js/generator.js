/* ── STATE ────────────────────────────────────────────────────────────────── */
let currentMode = 'url';
let lastPayload = null;

/* ── TABS ─────────────────────────────────────────────────────────────────── */
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.tab;
    document.getElementById(`panel-${currentMode}`).classList.add('active');
  });
});

/* ── CHAR COUNTER ─────────────────────────────────────────────────────────── */
document.getElementById('input-text').addEventListener('input', function () {
  const len = this.value.length;
  const el = document.getElementById('char-count');
  el.textContent = `${len} / 500`;
  el.classList.toggle('warn', len > 400);
});

/* ── COLOR PICKERS ────────────────────────────────────────────────────────── */
function linkColor(pickerId, hexId) {
  const picker = document.getElementById(pickerId);
  const hex    = document.getElementById(hexId);
  picker.addEventListener('input', () => (hex.value = picker.value));
  hex.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) picker.value = hex.value;
  });
}
linkColor('qr-color', 'qr-color-hex');
linkColor('bg-color', 'bg-color-hex');

/* ── RANGE SLIDERS ────────────────────────────────────────────────────────── */
document.getElementById('qr-size').addEventListener('input', function () {
  document.getElementById('size-val').textContent = this.value;
});
document.getElementById('qr-margin').addEventListener('input', function () {
  document.getElementById('margin-val').textContent = this.value;
});

/* ── BUILD PAYLOAD ────────────────────────────────────────────────────────── */
function buildPayload() {
  const data = {};
  if (currentMode === 'url')  data.url  = document.getElementById('input-url').value.trim();
  if (currentMode === 'text') data.text = document.getElementById('input-text').value.trim();
  if (currentMode === 'wifi') {
    data.ssid       = document.getElementById('wifi-ssid').value.trim();
    data.password   = document.getElementById('wifi-pass').value;
    data.encryption = document.getElementById('wifi-enc').value;
  }
  if (currentMode === 'vcard') {
    data.first = document.getElementById('vc-first').value.trim();
    data.last  = document.getElementById('vc-last').value.trim();
    data.phone = document.getElementById('vc-phone').value.trim();
    data.email = document.getElementById('vc-email').value.trim();
    data.url   = document.getElementById('vc-url').value.trim();
  }
  return {
    mode:            currentMode,
    data,
    errorCorrection: document.getElementById('ec-level').value,
    size:            parseInt(document.getElementById('qr-size').value),
    margin:          parseInt(document.getElementById('qr-margin').value),
    fgColor:         document.getElementById('qr-color-hex').value,
    bgColor:         document.getElementById('bg-color-hex').value,
  };
}

/* ── TOAST ────────────────────────────────────────────────────────────────── */
function showToast(msg, type = 'ok') {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = `my-toast ${type}`;
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── GENERATE ─────────────────────────────────────────────────────────────── */
document.getElementById('generate-btn').addEventListener('click', async () => {
  const btn = document.getElementById('generate-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  const payload = buildPayload();
  lastPayload = payload;

  try {
    const res  = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!json.success) { showToast('⚠ ' + json.error, 'err'); return; }

    // Show result
    document.getElementById('output-placeholder').style.display = 'none';
    const resultEl = document.getElementById('qr-result');
    resultEl.style.display = 'flex';

    document.getElementById('qr-img').src = json.image;

    const str = json.dataString;
    document.getElementById('qr-meta-str').textContent =
      str.length > 48 ? str.slice(0, 45) + '…' : str;

    document.getElementById('stat-size').textContent  = payload.size;
    document.getElementById('stat-chars').textContent = json.charCount;
    document.getElementById('stat-ec').textContent    = json.errorCorrection;

  } catch {
    showToast('Network error — is Flask running?', 'err');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ── DOWNLOAD ─────────────────────────────────────────────────────────────── */
document.getElementById('dl-btn').addEventListener('click', async () => {
  if (!lastPayload) { showToast('Generate a QR code first.', 'err'); return; }
  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastPayload),
    });
    if (!res.ok) { showToast('Download failed.', 'err'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'qrforge.png'; a.click();
    URL.revokeObjectURL(url);
    showToast('✓ Downloaded!');
  } catch {
    showToast('Download error.', 'err');
  }
});

/* ── COPY TO CLIPBOARD ────────────────────────────────────────────────────── */
document.getElementById('copy-btn').addEventListener('click', async () => {
  const img = document.getElementById('qr-img');
  if (!img.src || img.src === window.location.href) {
    showToast('Generate a QR code first.', 'err'); return;
  }
  try {
    const res  = await fetch(img.src);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('✓ Copied to clipboard.');
  } catch {
    showToast('Copy not supported in this browser.', 'err');
  }
});
