import { readPreferences, writePreferences } from './preferences.js';
import { loadScene } from './loader.js';
import { metrics } from './diagnostics.js';
import { createSession } from './session.js';

const root = document.getElementById('bd938-root');
const byId = id => document.getElementById(`bd938-${id}`);
const dialog = byId('dialog');
const preferences = readPreferences();
const labOptions = { vesselType: 'light', scenarioId: 'harbor' };
const names = { H01: 'Người dẫn thuyền', H02: 'Người giữ trận', H03: 'Người dựng lũy', H04: 'Người giữ bến' };
let session = null, loadController = null, generation = 0, dialogMode = '', dialogActions = {};
let lastDisposed = null;
const pauseReasons = new Set();

function setState(state) { root.dataset.state = state; }
function showScreen(name) {
  for (const screen of ['setup', 'loading', 'play']) byId(screen).hidden = screen !== name;
}
function savePreference() {
  byId('preference-status').textContent = writePreferences(preferences)
    ? 'Đã ghi nhớ lựa chọn trên trình duyệt này.'
    : 'Trình duyệt không cho lưu cài đặt. Lựa chọn vẫn dùng được trong lượt này.';
}
function syncChoices() {
  for (const button of root.querySelectorAll('[data-hero]')) {
    const selected = button.dataset.hero === preferences.hero;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.bd938-choice').textContent = selected ? 'Đã chọn' : 'Chọn nhân vật';
  }
  for (const button of root.querySelectorAll('[data-quality]')) button.setAttribute('aria-pressed', String(button.dataset.quality === preferences.quality));
  byId('selected').textContent = `Đã chọn: ${names[preferences.hero]}`;
}
function closeDialog() { if (dialog.open) dialog.close(); dialogMode = ''; dialogActions = {}; }
function openDialog(mode, title, paragraphs, actions) {
  dialogMode = mode;
  byId('dialog-title').textContent = title;
  byId('dialog-content').replaceChildren(...paragraphs.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  byId('dialog-actions').replaceChildren(); dialogActions = {};
  for (const [index, action] of actions.entries()) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `bd938-button${index === 0 ? ' bd938-primary' : ''}`;
    button.dataset.dialogAction = String(index); button.textContent = action.label;
    dialogActions[index] = action.run; byId('dialog-actions').append(button);
  }
  byId('dialog-close').hidden = mode === 'error';
  if (!dialog.open) dialog.showModal();
  byId('dialog-actions').querySelector('button')?.focus();
}
function disposeSession() {
  if (session) { session.dispose(); lastDisposed = session.snapshot(); session = null; }
  pauseReasons.clear();
}
function cancelLoad() { generation++; loadController?.abort(); loadController = null; }
function returnToSetup({ focus = true } = {}) {
  cancelLoad(); disposeSession(); closeDialog(); showScreen('setup'); setState('SHELL');
  byId('characters').hidden = false; byId('quality').hidden = true;
  byId('camera').textContent = 'Góc nhìn: Toàn cảnh';
  syncChoices(); if (focus) byId('next').focus({ preventScroll: true });
}
function exit() { cancelLoad(); disposeSession(); closeDialog(); setState('DISPOSED'); }
function resume() {
  if (!session) return;
  if (document.hidden || pauseReasons.has('contextLost')) return;
  pauseReasons.clear(); closeDialog(); setState('RUNNING'); session.start();
}
function pause(reason = 'user') {
  if (!session || !['RUNNING', 'PAUSED'].includes(root.dataset.state)) return;
  pauseReasons.add(reason); session.pause(); setState('PAUSED');
  openDialog('pause', 'Tạm dừng tại bến sông', [
    reason === 'user' ? 'Cảnh và đồng hồ lượt thử đã dừng.' : 'Lượt thử đã tự dừng khi bạn rời cửa sổ hoặc chuyển ứng dụng.',
    'Bạn có thể tiếp tục, bắt đầu lượt thử mới hoặc chọn lại nhân vật và đồ họa. Lượt thử này chưa lưu tiến độ chiến dịch.',
  ], [
    { label: 'Tiếp tục', run: resume },
    { label: 'Chơi lại', run: beginLoad },
    { label: 'Chọn lại', run: () => returnToSetup() },
    { label: 'Về Sa Bàn', run: navigateHome },
  ]);
}
function navigateHome() { exit(); location.assign('../trang-chinh.html#khu-vuc'); }
function toggleCamera() {
  if (!session || root.dataset.state !== 'RUNNING') return;
  const mode = session.toggleCamera();
  byId('camera').textContent = `Góc nhìn: ${mode === 'tactical' ? 'Toàn cảnh' : 'Theo thuyền'}`;
}
function formatTime(second) { return `${Math.floor(second / 60).toString().padStart(2, '0')}:${(second % 60).toString().padStart(2, '0')}`; }
function setText(id, text) { const element = byId(id); if (element.textContent !== text) element.textContent = text; }
function updateRiverHUD(state, backlogMs) {
  const f = value => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2).replace('.', ',');
  const r = state.readings;
  setText('tide', `${r.waterY >= 0 ? '+' : ''}${f(r.waterY)} m ${r.tideRate < 0 ? '↓' : r.tideRate > 0 ? '↑' : '—'}`);
  setText('depth', `${f(r.depth)} m`); setText('draft', `${f(r.draft)} m`);
  setText('speed', `${f(r.speedMps)} m/s`);
  setText('current', `${r.current.z >= 0 ? '↓' : '↑'} ${f(Math.hypot(r.current.x, r.current.z))} m/s`);
  setText('clearance', `${f(r.clearance)} m`);
  const parts = state.components;
  setText('condition', `Thân ${Math.round(parts.hull)}% · Lái ${Math.round(parts.rudder)}%${state.stuck ? ' · ĐANG MẮC' : ''}`);
  setText('components', `Thân: ${Math.round(parts.hull)}% · Bánh lái: ${Math.round(parts.rudder)}% · Mái chèo: ${Math.round(parts.oars)}% · Dây giằng: ${Math.round(parts.rigging)}%`);
  setText('stores', `Hàng: ${Math.round(state.cargoKg)} kg · Nước trong thuyền: ${Math.round(state.floodKg)} kg · Gỗ sửa: ${state.timber}`);
  const warning = state.stuck ? state.warnings.find(text => text.startsWith('MẮC')) : state.warnings[0];
  setText('river-alert', backlogMs > 250 ? 'Thiết bị đang chậm mô phỏng; các bước va chạm vẫn được giữ. Có thể giảm đồ họa.' : warning || 'Luồng sâu ở giữa sông. Cọc và tải nặng đều ảnh hưởng đường đi.');
  setText('all-warnings', state.warnings.join(' '));
  const work = state.repairJob ? `Đang sửa ${({hull:'thân',rudder:'bánh lái',oars:'mái chèo',rigging:'dây giằng'})[state.repairJob.target]}: ${f(state.repairJob.workS)} s. Cần neo, đứng yên trong bến; mỗi lượt sửa dùng gỗ.` : state.recovering && state.stuck ? `Gỡ mắc: ${f(state.stuck.workS)} s chuẩn bị; đã kéo ${f(state.stuck.distanceM)} m. Kẹt quá sâu cần giảm tải hoặc chờ nước lên.` : 'Bỏ bớt hàng là bỏ hàng thật trong lượt thử. Sửa từng bộ phận có thời gian và tốn gỗ.';
  setText('work', work);
  for (const [type, active, label] of [['anchor', state.anchor, state.anchor ? 'Nhả neo' : 'Neo'], ['recover', state.recovering, state.recovering ? 'Dừng gỡ' : 'Gỡ mắc'], ['pump', state.pumping, state.pumping ? 'Tắt bơm' : 'Bơm nước']]) {
    const button = root.querySelector(`[data-river-action="${type}"]`);
    button.setAttribute('aria-pressed', String(active)); if (button.textContent !== label) button.textContent = label;
  }
}
function finish() {
  if (!session || root.dataset.state !== 'RUNNING') return;
  session.pause(); setState('RESULTS');
  const seconds = session.snapshot().seconds;
  openDialog('results', 'Hoàn tất lượt thử khung', [
    `${names[preferences.hero]} · Thời gian khám phá: ${formatTime(seconds)}.`,
    'Bạn đã trải nghiệm cảnh và điều khiển ban đầu. Đây chưa phải chiến thắng hoặc kết quả của chương chiến đấu.',
  ], [ { label: 'Chơi lại', run: beginLoad }, { label: 'Chọn lại nhân vật', run: () => returnToSetup() }, { label: 'Về Sa Bàn', run: navigateHome } ]);
}
async function beginLoad() {
  if (root.dataset.state === 'LOAD') return;
  cancelLoad(); disposeSession(); closeDialog();
  savePreference();
  const current = generation; const controller = new AbortController(); loadController = controller;
  showScreen('loading'); setState('LOAD');
  byId('systems').open = false;
  byId('camera').textContent = 'Góc nhìn: Toàn cảnh'; byId('clock').textContent = '00:00';
  const progress = (done, text) => {
    if (generation !== current) return;
    byId('progress').value = done; byId('loading-text').textContent = text;
    byId('loading-count').textContent = `${done} / 3 bước hoàn tất`;
  };
  let scene = null;
  try {
    const loaded = await loadScene({ signal: controller.signal, onProgress: progress });
    if (generation !== current) return;
    // The scene owns a fresh controller, independently of the cancellable load.
    const sceneScope = new AbortController();
    scene = loaded.createScene({
      host: byId('viewport'), data: loaded.data, quality: preferences.quality, heroId: preferences.hero, vesselType: labOptions.vesselType, scope: sceneScope,
      onContextLost() {
        if (!session) return;
        pauseReasons.add('contextLost'); session.pause(); setState('ERROR');
        openDialog('error', 'Cảnh 3D đã bị gián đoạn', ['Thiết bị đã ngắt bộ dựng hình. Hãy thử tải lại cảnh, hoặc chọn mức Tiết kiệm.'], [ { label: 'Tải lại cảnh', run: beginLoad }, { label: 'Chọn lại đồ họa', run: () => returnToSetup() }, { label: 'Về Sa Bàn', run: navigateHome } ]);
      },
    });
    if (generation !== current) { scene.dispose(); return; }
    session = createSession({ root, scene, data: loaded.data, heroId: preferences.hero, ...labOptions, onPause: pause, onCamera: toggleCamera, onStatus: updateRiverHUD, onClock: second => { byId('clock').textContent = formatTime(second); } });
    progress(3, 'Cảnh đã dựng xong. Sẵn sàng khám phá.');
    showScreen('play'); scene.resize();
    const role = loaded.data.roles.find(item => item.id === preferences.hero);
    byId('actor').textContent = `${role.name} · ${loaded.data.riverConfig.vessels[labOptions.vesselType].name}`;
    setState('BRIEFING'); loadController = null;
    openDialog('briefing', 'Sẵn sàng khám phá bến sông?', [
      'Thuyền mang vòng sáng là thuyền bạn điều khiển. Bốn màu cờ và trang bị phân biệt thủy quân, cung thủ, công binh và quân nhu.',
      'W/S tăng hoặc giảm tốc, A/D lái; thuyền có quán tính và trôi theo dòng. Dùng các nút mũi tên khi chơi cảm ứng. C đổi camera, Esc tạm dừng.',
      `Tình huống: ${loaded.data.riverConfig.scenarios[labOptions.scenarioId].name}. Vòng vàng đánh dấu bãi cọc, vòng xanh là bến sửa. Tình huống nước rút bắt đầu từ phút thứ 7 của con nước, không phải tua nhanh thời gian.`,
      'Mở “Thuyền & xử lý nguy hiểm” để neo, gỡ, sửa, bơm hoặc bỏ hàng. Thủy triều dùng thời gian mô phỏng; pause dừng cả nước và công việc. Hư hại/vật tư chỉ thuộc lượt thử, chơi lại sẽ tạo lượt mới; chưa lưu chiến dịch.',
    ], [ { label: 'Bắt đầu lượt thử', run: resume }, { label: 'Chọn lại', run: () => returnToSetup() } ]);
  } catch (error) {
    scene?.dispose();
    if (controller.signal.aborted || generation !== current) return;
    disposeSession(); showScreen('setup'); setState('ERROR');
    const message = error instanceof TypeError ? 'Không tải được tài nguyên. Hãy kiểm tra kết nối và thử lại.' : error.message || 'Đã có lỗi khi tải cảnh.';
    openDialog('error', 'Chưa mở được cảnh 3D', [message, 'Bạn có thể thử lại hoặc chọn mức đồ họa thấp hơn.'], [ { label: 'Thử lại', run: beginLoad }, { label: 'Về lựa chọn', run: () => returnToSetup() }, { label: 'Về Sa Bàn', run: navigateHome } ]);
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.matches('[data-exit]')) { exit(); return; }
  if (target.dataset.riverAction) { session?.action(target.dataset.riverAction); return; }
  if (target.dataset.dialogAction !== undefined) { dialogActions[target.dataset.dialogAction]?.(); return; }
  if (target.dataset.hero) { preferences.hero = target.dataset.hero; syncChoices(); savePreference(); return; }
  if (target.dataset.quality) { preferences.quality = target.dataset.quality; syncChoices(); savePreference(); return; }
  const actions = {
    'bd938-next': () => { byId('characters').hidden = true; byId('quality').hidden = false; byId('load').focus({ preventScroll: true }); },
    'bd938-previous': () => { byId('characters').hidden = false; byId('quality').hidden = true; byId('next').focus({ preventScroll: true }); },
    'bd938-load': beginLoad, 'bd938-cancel-load': () => returnToSetup(),
    'bd938-camera': toggleCamera, 'bd938-pause': () => pause(), 'bd938-finish': finish,
    'bd938-dialog-close': () => { if (dialogMode === 'pause') resume(); else if (dialogMode === 'briefing' || dialogMode === 'results') returnToSetup(); },
  };
  actions[target.id]?.();
});
root.addEventListener('change', event => {
  if (event.target.id === 'bd938-vessel') labOptions.vesselType = event.target.value;
  if (event.target.id === 'bd938-scenario') labOptions.scenarioId = event.target.value;
});
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (dialogMode === 'pause') resume();
  else if (dialogMode === 'briefing' || dialogMode === 'results') returnToSetup();
});
window.addEventListener('pagehide', exit);
window.addEventListener('pageshow', event => { if (event.persisted) returnToSetup({ focus: false }); });
syncChoices();

// Test/inspection API stays in module scope; no global gameplay handlers or keys.
export function getDiagnostics() {
  return { ...metrics, state: root.dataset.state, preferences: { ...preferences }, pauseReasons: [...pauseReasons], session: session?.snapshot() ?? null, lastDisposed, canvases: root.querySelectorAll('canvas').length, dialogOpen: dialog.open };
}
