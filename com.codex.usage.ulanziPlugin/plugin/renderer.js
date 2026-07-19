const SIZE = 200;
const BG = '#1f1f23';
const TRACK = '#2c2c33';
const TEXT = '#ffffff';
const SHADOW = 'rgba(0,0,0,0.85)';
const MIN_BAR_RATIO = 0.04;

const COLORS = {
  ok:    { fill: '#3ecf6b' },
  warn:  { fill: '#e3b341' },
  high:  { fill: '#e8893c' },
  crit:  { fill: '#e3434c' },
  muted: { fill: '#4a4a52' },
};

function thresholdColor(util) {
  if (util >= 0.95) return COLORS.crit;
  if (util >= 0.85) return COLORS.high;
  if (util >= 0.60) return COLORS.warn;
  return COLORS.ok;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function svgDoc(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${body}</svg>`;
}

function toDataUrl(svg) {
  const b64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

function textWithShadow(text, x, y, fontSize, weight = '700', anchor = 'middle') {
  const t = escapeXml(text);
  return (
    `<text x="${x + 1}" y="${y + 1}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" fill="${SHADOW}">${t}</text>` +
    `<text x="${x}" y="${y}" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" fill="${TEXT}">${t}</text>`
  );
}

function staleDot(staleSec) {
  if (!staleSec || staleSec < 90) return '';
  return `<circle cx="${SIZE - 16}" cy="16" r="6" fill="#e3b341" stroke="#1f1f23" stroke-width="2"/>`;
}

const STRIPE_HEIGHT = 8;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function colorStripe(color) {
  if (!color || !HEX_COLOR_RE.test(color)) return '';
  return `<rect x="0" y="0" width="${SIZE}" height="${STRIPE_HEIGHT}" fill="${color}"/>`;
}

// Codex product mark from openai/agents.md public/logos/codex.svg (viewBox 0 0 10 11).
const CODEX_MARK_PATH = 'M8.33301 5.79411C8.33301 3.95316 6.84062 2.46077 4.99967 2.46077C3.15873 2.46077 1.66634 3.95316 1.66634 5.79411C1.66634 7.63506 3.15873 9.12744 4.99967 9.12744C6.84062 9.12744 8.33301 7.63506 8.33301 5.79411ZM6.66634 6.41911C6.89646 6.41911 7.08301 6.60566 7.08301 6.83577C7.08301 7.06589 6.89646 7.25244 6.66634 7.25244H5.41634C5.18622 7.25244 4.99967 7.06589 4.99967 6.83577C4.99967 6.60566 5.18622 6.41911 5.41634 6.41911H6.66634ZM3.3269 4.39518C3.51191 4.28418 3.74861 4.33339 3.875 4.5026L3.8986 4.538L4.5236 5.57967L4.54964 5.63053C4.59421 5.73493 4.59421 5.85328 4.54964 5.95768L4.5236 6.00855L3.8986 7.05021C3.78019 7.24749 3.52421 7.31142 3.3269 7.19303C3.12963 7.07462 3.0657 6.81864 3.18408 6.62134L3.68009 5.79411L3.18408 4.96688L3.16414 4.92904C3.07439 4.73792 3.14197 4.50618 3.3269 4.39518ZM9.16634 5.79411C9.16634 8.09529 7.30086 9.96078 4.99967 9.96078C2.69849 9.96078 0.833008 8.09529 0.833008 5.79411C0.833008 3.49292 2.69849 1.62744 4.99967 1.62744C7.30086 1.62744 9.16634 3.49292 9.16634 5.79411Z';
const CODEX_MARK_VB_W = 10;
const CODEX_MARK_VB_H = 11;
const CODEX_WHITE = '#ffffff';

function codexIcon(centerX, centerY, width) {
  const height = width * (CODEX_MARK_VB_H / CODEX_MARK_VB_W);
  const x = centerX - width / 2;
  const y = centerY - height / 2;
  const sx = width / CODEX_MARK_VB_W;
  const sy = height / CODEX_MARK_VB_H;
  return `<g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${sx.toFixed(4)},${sy.toFixed(4)})"><path d="${CODEX_MARK_PATH}" fill="${CODEX_WHITE}"/></g>`;
}

function topLabelWithIcon(label, y, fontSize) {
  const iconHeight = Math.round(fontSize * 0.85);
  const iconWidth = iconHeight * (CODEX_MARK_VB_W / CODEX_MARK_VB_H);
  const gap = 10;
  const textW = label.length * fontSize * 0.58;
  const groupW = iconWidth + gap + textW;
  const startX = (SIZE - groupW) / 2;
  const iconCx = startX + iconWidth / 2;
  const iconCy = y - fontSize * 0.35;
  const textX = startX + iconWidth + gap;
  return codexIcon(iconCx, iconCy, iconWidth) + textWithShadow(label, textX, y, fontSize, '700', 'start');
}

export function renderUsage({ label, util, reset, stale, color }) {
  const threshold = thresholdColor(util);
  const fillRatio = Math.max(util, MIN_BAR_RATIO);
  const barW = Math.round(SIZE * fillRatio);
  const pctText = `${Math.round(util * 100)}%`;
  const resetText = reset || '';

  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${TRACK}"/>`,
    `<rect x="0" y="0" width="${barW}" height="${SIZE}" fill="${threshold.fill}"/>`,
    topLabelWithIcon(label, 50, 38),
    textWithShadow(pctText, SIZE / 2, 122, 52),
    resetText ? textWithShadow(`Reset in ${resetText}`, SIZE / 2, 178, 28, '600') : '',
    staleDot(stale),
    colorStripe(color),
  ].join('');

  return toDataUrl(svgDoc(body));
}

export function renderStopped({ label, reset, color }) {
  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.crit.fill}"/>`,
    topLabelWithIcon(label, 50, 38),
    textWithShadow('100%', SIZE / 2, 118, 52),
    textWithShadow('stopped', SIZE / 2, 152, 22, '600'),
    reset ? textWithShadow(`Reset in ${reset}`, SIZE / 2, 184, 26, '600') : '',
    colorStripe(color),
  ].join('');
  return toDataUrl(svgDoc(body));
}

function renderNeutral({ icon, line1, line2, accent, color }) {
  const accentColor = accent || COLORS.muted.fill;
  const body = [
    `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${BG}"/>`,
    icon ? `<text x="${SIZE / 2}" y="92" font-size="68" text-anchor="middle" fill="${accentColor}">${escapeXml(icon)}</text>` : '',
    line1 ? textWithShadow(line1, SIZE / 2, 140, 28, '700') : '',
    line2 ? textWithShadow(line2, SIZE / 2, 174, 22, '600') : '',
    colorStripe(color),
  ].join('');
  return toDataUrl(svgDoc(body));
}

export function renderUnavailable({ label, color }) {
  return renderNeutral({ icon: '—', line1: label, line2: 'n/a', color });
}

export function renderNoToken({ label, color }) {
  return renderNeutral({ icon: '\u{1F512}', line1: label, line2: 'Login Codex', color });
}

export function renderReauth({ label, color }) {
  return renderNeutral({ icon: '↻', line1: label, line2: 'Reauth', accent: '#e3b341', color });
}

export function renderLoading({ label, color }) {
  return renderNeutral({ icon: '…', line1: label, line2: '', color });
}

export function renderError({ label, msg, color }) {
  return renderNeutral({ icon: '⚠', line1: label, line2: msg || 'error', accent: '#e3b341', color });
}
