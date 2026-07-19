let settings = {};
let loaded = false;
let lastSent = null;

const form = document.getElementById('property-inspector');
const colorModeEl = document.getElementById('colorMode');
const colorRow = document.getElementById('colorRow');
const colorEl = document.getElementById('color');

function readInitialSettings() {
  const raw = Utils.getQueryParams('param');
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return p && ('color' in p) ? p : null;
  } catch (e) {
    return null;
  }
}

function toggleColorRow() {
  colorRow.style.display = colorModeEl.value === 'custom' ? '' : 'none';
}

function populate() {
  const color = (settings.color || '').trim();
  const active = document.activeElement;
  if (active !== colorModeEl) colorModeEl.value = color ? 'custom' : 'none';
  if (active !== colorEl) colorEl.value = color || '#10a37f';
  toggleColorRow();
}

function save() {
  if (!loaded) return;
  const hasColor = colorModeEl.value === 'custom';
  settings = {
    ...settings,
    color: hasColor ? colorEl.value : '',
  };
  lastSent = { color: settings.color };
  $UD.setSettings(settings);
}

const debouncedSave = Utils.debounce(save, 300);

$UD.connect();

$UD.onConnected(() => {
  const fromUrl = readInitialSettings();
  if (fromUrl) {
    settings = fromUrl;
    loaded = true;
    populate();
  }
  $UD.getSettings();
  setTimeout(() => { loaded = true; }, 600);
  document.querySelector('.udpi-wrapper').classList.remove('hidden');
});

$UD.onDidReceiveSettings((msg) => {
  const p = msg && (msg.param || msg.settings);
  if (p && ('color' in p)) {
    const isSelfEcho = loaded && lastSent
      && (p.color || '') === lastSent.color;
    settings = p;
    loaded = true;
    if (!isSelfEcho) populate();
  } else {
    loaded = true;
  }
});

colorModeEl.addEventListener('change', () => {
  toggleColorRow();
  save();
});
colorEl.addEventListener('input', debouncedSave);
