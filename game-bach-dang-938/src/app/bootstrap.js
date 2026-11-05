import { readPreferences, writePreferences } from './preferences.js';
import { loadScene } from './loader.js';
import { metrics } from './diagnostics.js';
import { createSession } from './session.js';
import { lineOfSight } from '../sim/encounter.js';
import { armyDefaults } from '../sim/army-config.js';
import { openSaveRepository,encodeSave } from '../save/repository.js';
import { preparePersistedSession } from '../save/prepare-session.js';
import { connectFirebaseSave } from '../save/firebase-bridge.js';

const root = document.getElementById('bd938-root');
const byId = id => document.getElementById(`bd938-${id}`);
const dialog = byId('dialog');
const preferences = readPreferences();
const labOptions = { vesselType: 'light', scenarioId: 'combat' };
const names = { H01: 'Người dẫn thuyền', H02: 'Người giữ trận', H03: 'Người dựng lũy', H04: 'Người giữ bến' };
let session = null, loadController = null, generation = 0, dialogMode = '', dialogActions = {};
let lastDisposed = null;
let lastMapOpen=false,activeMapConfig=null,lastFault=null;
let saveHandle=null,saveRepository=null,closingSave=Promise.resolve();
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
  session?.pause();
  const waiting=session?.whenSaved();
  if (session) { session.dispose(); lastDisposed = session.snapshot(); session = null; }
  if(saveHandle){const handle=saveHandle,repository=saveRepository;saveHandle=null;saveRepository=null;closingSave=closingSave.catch(()=>{}).then(async()=>{try{await waiting;}catch{}await handle.close();}).finally(()=>repository.close());}
  pauseReasons.clear();
}
function cancelLoad() { generation++; loadController?.abort(); loadController = null; }
async function returnToSetup({ focus = true } = {}) {
  cancelLoad();if(session){session.pause();try{await session.whenSaved();}catch{}}disposeSession();try{await closingSave;}catch{}closeDialog();showScreen('setup');setState('SHELL');
  root.classList.remove('bd938-hud-collapsed');
  const hudBtn = byId('hud-toggle'); if (hudBtn) hudBtn.textContent = '👁️ Thu gọn HUD';
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
    saveHandle?'Bạn có thể tiếp tục hoặc tải mốc đã lưu. Khi thất bại, việc trở lại chặng sẽ kết toán thương vong và vật tư trước.':'Bạn có thể tiếp tục, bắt đầu lượt thử mới hoặc chọn lại nhân vật và đồ họa. Lượt thử này không lưu tiến độ.',
  ], [
    { label: 'Tiếp tục', run: resume },
    { label: saveHandle?'Tải mốc đã lưu':'Chơi lại', run: beginLoad },
    { label: 'Chọn lại', run: () => returnToSetup() },
    { label: 'Về Sa Bàn', run: navigateHome },
    ...(saveHandle?[{label:'Xuất bản lưu cục bộ',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())}]:[]),
  ]);
}
async function navigateHome() { if(session){session.pause();try{await session.whenSaved();}catch{}}exit();try{await closingSave;}catch{}location.assign('../trang-chinh.html#khu-vuc'); }
function toggleCamera() {
  if (!session || root.dataset.state !== 'RUNNING') return;
  const mode = session.toggleCamera();
  byId('camera').textContent = `Góc nhìn: ${mode === 'tactical' ? 'Toàn cảnh' : 'Theo nhân vật'}`;
}
function formatTime(second) { return `${Math.floor(second / 60).toString().padStart(2, '0')}:${(second % 60).toString().padStart(2, '0')}`; }
function setText(id, text) { const element = byId(id); if (element.textContent !== text) element.textContent = text; }
function downloadSaveBackup(payload){const url=URL.createObjectURL(new Blob([payload],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='bach-dang-938-ban-luu-cuc-bo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function updateRiverHUD(state, backlogMs, combat, army = null) {
  const f = value => (Math.abs(value) < 0.005 ? 0 : value).toFixed(2).replace('.', ',');
  const r = state.readings;
  setText('river-details',`Triều ${f(r.waterY)} m · Độ sâu ${f(r.depth)} m · Mớn ${f(r.draft)} m · Tốc độ ${f(r.speedMps)} m/s · Dòng ${f(Math.hypot(r.current.x,r.current.z))} m/s · Dưới đáy ${f(r.clearance)} m.`);
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
  if(combat){
    const actor=combat.actors.find(a=>a.id===combat.controlledId),target=combat.actors.find(a=>a.id===combat.selectedId);
    byId('play').dataset.control=combat.helm?'helm':actor.mode;
    byId('play').dataset.hasTarget=String(!!combat.selectedId);
    setText('character-name',actor.name);
    const modes={foot:'Trên bờ / boong',air:'Đang nhảy / rơi',swim:'Đang bơi',wounded:'Bị thương',downed:'Đã gục',dead:'Tử trận'};
    const stance=actor.stunUntil>combat.tick?'CHOÁNG':actor.rescue?'Đang được cứu':actor.guard?'Đang đỡ':actor.action?.kind==='bow'?'Giương cung':actor.action?.kind==='melee'?'Ra đòn':actor.action?.kind==='dodge'?'Đang né':'';
    setText('character-state',`${combat.helm?'Đang lái':modes[actor.mode]} · ${actor.weapon==='bow'?'Cung':'Cận chiến'} · Tên ${actor.ammo}${stance?' · '+stance:''}`);
    byId('health').value=actor.health;byId('stamina').value=actor.stamina;
    setText('health-text',String(Math.ceil(actor.health)));setText('stamina-text',String(Math.floor(actor.stamina)));
    setText('target-name',target?`Khóa: ${target.name} (${Math.ceil(target.health)})`:combat.selectedId?`Khóa quân địch ${combat.selectedId}`:'L · Khóa hoặc chạm chọn địch');
    const interact=root.querySelector('[data-combat-action="interact"]');interact.textContent=combat.helm?'E · Rời lái':actor.mode==='swim'?'E · Cứu tôi':'E · Tương tác';
    const follow=root.querySelector('[data-combat-action="follow"]'),companion=combat.actors.find(a=>a.kind==='companion');
    follow.setAttribute('aria-pressed',String(!!companion?.follows));follow.textContent=companion?.follows?'Đồng đội: Đang theo':'Đồng đội: Giữ vị trí';
    if(combat.message)setText('river-alert',combat.message);
    else if(actor.mode==='swim')setText('river-alert',`Đang bơi, sức bền ${Math.floor(actor.stamina)}. Đến cạnh thuyền ta đủ chậm, bấm E để đồng đội kéo lên. Không có hồi vị trí miễn phí.`);
    else if(!combat.helm)setText('river-alert','Đi theo hướng camera · G áp mạn khi đủ gần/chậm · E ở đuôi thuyền ta để nhận lái.');
    if(combat.mapOpen!==lastMapOpen){byId('map').hidden=!combat.mapOpen;lastMapOpen=combat.mapOpen;if(combat.mapOpen)byId('map').querySelector('button').focus();else session?.focus();}
    for(const button of root.querySelectorAll('[data-combat-action],[data-combat-held]'))button.disabled=(actor.health<=0||combat.mapOpen)&&!['map','lock'].includes(button.dataset.combatAction);
    if(combat.mapOpen)updateMap(combat,state,army);
  }
}
function updateMap(combat,riverState,army){
  const svg=byId('map-view'),ns='http://www.w3.org/2000/svg',map=activeMapConfig.map;
  svg.setAttribute('viewBox',`${-map.halfWidthM-14} ${-map.halfLengthM} ${map.halfWidthM*2+28} ${map.halfLengthM*2}`);
  if(!svg.firstChild){const background=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:-map.halfWidthM,y:-map.halfLengthM,width:map.halfWidthM*2,height:map.halfLengthM*2,fill:'#367575'}))background.setAttribute(k,String(v));svg.append(background);}
  const commander=combat.actors.find(a=>a.id===combat.controlledId),knownActors=combat.actors.filter(a=>a.team!=='enemy'||(Math.hypot(a.x-commander.x,a.z-commander.z)<=armyDefaults.sight&&lineOfSight(combat,{config:activeMapConfig},commander,a)));
  const knownIds=new Set(knownActors.map(a=>a.id));
  for(const marker of svg.querySelectorAll('[data-id]'))if(!knownIds.has(marker.dataset.id))marker.remove();
  for(const actor of knownActors){
    let marker=svg.querySelector(`[data-id="${actor.id}"]`);
    if(!marker){marker=document.createElementNS(ns,'circle');marker.dataset.id=actor.id;marker.setAttribute('r',actor.id===combat.controlledId?'1.5':'1');svg.append(marker);}
    marker.setAttribute('cx',String(actor.x));marker.setAttribute('cy',String(actor.z));marker.setAttribute('fill',actor.id===combat.controlledId?'#ffe78d':actor.team==='enemy'?'#ef8d7a':'#8fe4bb');
  }
  const targets=byId('map-targets');
  for(const button of targets.querySelectorAll('[data-target-id]'))if(!knownIds.has(button.dataset.targetId))button.remove();
  for(const actor of knownActors.filter(a=>a.team==='enemy')){
    let button=targets.querySelector(`[data-target-id="${actor.id}"]`);
    if(!button){button=document.createElement('button');button.className='bd938-button';button.dataset.combatAction='select';button.dataset.targetId=actor.id;targets.append(button);}
    button.textContent=`${actor.name} · ${Math.ceil(actor.health)}`;button.disabled=actor.health<=0;
  }
  byId('army-panel').hidden=!army;
  if(!army)return;
  const select=byId('army-squad');
  for(const squad of army.squads){let option=Array.from(select.options).find(o=>o.value===squad.id);if(!option){option=document.createElement('option');option.value=squad.id;select.append(option);}option.textContent=`${squad.name} · ${squad.counts.active||0}/${squad.deployedAtStart} còn chiến đấu`;}
  const chosen=army.squads.find(s=>s.id===select.value)||army.squads[0];
  if(chosen){setText('army-report',`${army.feedback?army.feedback+' · ':''}${chosen.name}: ${chosen.report} · Tên ${chosen.ammo} · Thuốc cứu ${chosen.medicine}.`);
    const labels={active:'chiến đấu',downed:'gục, cần cứu',wounded:'bị thương',dead:'tử trận',missing:'mất tích',captured:'bị bắt',retired:'đã rút'};
    setText('army-losses',`Quân số ${chosen.name}: ${Object.entries(chosen.counts).map(([k,n])=>`${n} ${labels[k]||k}`).join(' · ')}.`);
  }
  const convoyLabels={planning:'đang lập tuyến',moving:'đang vận chuyển',contested:'bị địch chặn',blocked:'tắc tuyến',delivered:'đã giao'};
  setText('army-stores',army.depots.map(d=>`${d.name} (${d.health}%): ${d.stock.ammo} tên, ${d.stock.timber} gỗ, ${d.stock.medicine} thuốc, ${d.stock.recruits} quân bổ sung`).join(' · ') + (army.convoys.some(c=>c.amount)?` · Tuyến hàng: ${army.convoys.filter(c=>c.amount).map(c=>convoyLabels[c.status]||c.status).join(', ')}`:''));
  setText('army-intel',army.intel.length?`Trinh sát: ${army.intel.slice(0,3).map(i=>`${i.id} (${Math.round(i.x)}, ${Math.round(i.z)}) · ${Math.floor(i.ageTicks/30)} giây trước`).join(' | ')}${army.intel.length>3?` · và ${army.intel.length-3} tin khác`:''}`:'Trinh sát: chưa thấy quân địch.');
  const markers=[...army.squads.map(s=>({id:s.id,x:s.x,z:s.z,color:'#a5edb6',radius:1.4})),...army.intel.map(i=>({id:i.id,x:i.x,z:i.z,color:i.visible?'#ff907b':'#b8a0a0',radius:.7})),...army.depots.map(d=>({id:d.id,x:d.x,z:d.z,color:'#f5d772',radius:1.5}))];
  const wanted=new Set(markers.map(m=>m.id));
  for(const el of svg.querySelectorAll('[data-army-id]'))if(!wanted.has(el.dataset.armyId))el.remove();
  for(const m of markers){let el=svg.querySelector(`[data-army-id="${m.id}"]`);if(!el){el=document.createElementNS(ns,'circle');el.dataset.armyId=m.id;svg.append(el);}el.setAttribute('cx',m.x);el.setAttribute('cy',m.z);el.setAttribute('r',m.radius);el.setAttribute('fill',m.color);}
}
function combatOutcome(combat){
  setState('RESULTS');
  const phase=combat?.phase||'failed_command';
  if(phase==='victory'){
    openDialog('results','Toàn Thắng Trận Đồ',['Toàn bộ lực lượng thủy bộ địch đã bị đánh tan trên sông Bạch Đằng.',saveHandle?'Chiến công và thương vong đã được ghi nhận vào bản lưu chiến dịch.':'Chế độ này không lưu; có thể bắt đầu lượt thử mới.'],saveHandle?[{label:'Tải mốc / Chơi tiếp',run:beginLoad},{label:'Xuất bản lưu',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]:[{label:'Chơi lại lượt thử',run:beginLoad},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);
  }else if(phase==='tactical_retreat'){
    openDialog('results','Rút Quân Chiến Thuật',['Các cánh quân đã hoàn thành lui quân an toàn về cứ điểm hậu phương.',saveHandle?'Tổn thất và tiêu hao vật tư đã được lưu lại theo thực tế.':'Chế độ này không lưu; có thể bắt đầu lượt thử mới.'],saveHandle?[{label:'Về trại / Kết toán',run:showRetryConfirmation},{label:'Xuất bản lưu',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]:[{label:'Chơi lại lượt thử',run:beginLoad},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);
  }else{
    openDialog('results','Không còn sĩ quan dự bị',[ 'Nhân vật trung tâm và các sĩ quan dự bị đã mất khả năng tiếp tục. Lượt thử kết thúc.',saveHandle?'Kết quả đã được ghi. Về trại để xem người và vật tư có thể thu hồi trước khi trở lại chặng.':'Chế độ này không lưu; chơi lại tạo lượt thử mới.' ],saveHandle?[{label:'Về trại / Chơi lại',run:showRetryConfirmation},{label:'Xuất bản lưu',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]:[{label:'Chơi lại lượt thử',run:beginLoad},{label:'Chọn lại',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);
  }
}
function showRetryConfirmation(){
  try{
    const receipt=saveHandle.previewRetry();
    openDialog('retry','Kết toán tại trại',[
      `Nhân vật chính dưỡng thương ${receipt.campHours} giờ chiến dịch, dùng ${receipt.medicineCost} thuốc; trở lại với thể lực giảm và giữ dấu thương tích. Thời gian này được tính trong chiến dịch, không cần chờ ngoài đời.`,
      `${receipt.missingIds.length} người ngoài vùng thu hồi sẽ được ghi mất tích. Quân tử trận và người chưa đủ sức chiến đấu không trở lại đội hình.`,
      `${receipt.returnedCargo.length} chuyến hàng thu hồi, ${receipt.lostCargo.length} chuyến hàng bị mất. Máu, tên, vật tư và hư hại thuyền còn lại được giữ; không cấp lại bộ khởi đầu.`,
      'Chỉ thuyền chưa bị phá hủy, không mắc cọc và ở vùng bến sửa mới có thể thu hồi. Quân tại kho hậu phương còn hoạt động hoặc trên thuyền thu hồi được mới được đưa về. Đây là quy tắc thử nghiệm của chương mẫu.',
    ],[{label:'Xác nhận và trở lại chặng',run:retrySavedAttempt},{label:'Quay lại kết quả',run:()=>combatOutcome(session.snapshot().combat)},{label:'Về Sa Bàn',run:navigateHome}]);
  }catch(error){const messages={BOAT_NOT_RECOVERABLE:'Thuyền đã mất hoặc đang ngoài vùng thu hồi / mắc cọc. Chưa có phương tiện để trở lại chặng; thương vong và bản lưu vẫn được giữ.',HERO_NOT_RECOVERABLE:'Nhân vật chính nằm ngoài vùng có thể ứng cứu trong tình huống này. Bản lưu được giữ để đối chiếu hậu quả.',HERO_UNAVAILABLE:'Nhân vật chính không đủ điều kiện phục hồi.'};openDialog('error','Không thể tái triển khai',[messages[error.message]||error.message],[{label:'Xuất bản lưu',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())},{label:'Về lựa chọn',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);}
}
async function retrySavedAttempt(){
  if(!session||root.dataset.state!=='RESULTS')return;
  const current=session;closeDialog();setState('RETRYING');
  try{await current.retryFailedAttempt();if(session===current&&root.dataset.state==='RETRYING')await beginLoad();}
  catch(error){if(session!==current)return;setState('ERROR');openDialog('error','Chưa thể tạo lại chặng',['Bản lưu đã xác nhận được giữ nguyên. Không có quân hay vật tư được cấp thêm.',error.message],[{label:'Mở lại bản lưu',run:beginLoad},{label:'Về Sa Bàn',run:navigateHome}]);}
}
async function finish() {
  if (!session || root.dataset.state !== 'RUNNING') return;
  session.pause();setState('FINISHING');try{await session.whenSaved();}catch{return;}if(!session||root.dataset.state==='ERROR')return;setState('RESULTS');
  const seconds = session.snapshot().seconds;
  openDialog('results', 'Hoàn tất lượt thử khung', [
    `${names[preferences.hero]} · Thời gian khám phá: ${formatTime(seconds)}.`,
    'Bạn đã trải nghiệm cảnh và điều khiển ban đầu. Đây chưa phải chiến thắng hoặc kết quả của chương chiến đấu.',
  ], [ { label: saveHandle?'Tải mốc đã lưu':'Chơi lại', run: beginLoad }, { label: 'Chọn lại nhân vật', run: () => returnToSetup() }, { label: 'Về Sa Bàn', run: navigateHome } ]);
}
async function beginLoad() {
  if (root.dataset.state === 'LOAD') return;
  cancelLoad();closeDialog();
  savePreference();
  const current = generation; const controller = new AbortController(); loadController = controller;
  showScreen('loading'); setState('LOAD');
  byId('systems').open = false;
  byId('camera').textContent = 'Góc nhìn: Toàn cảnh'; byId('clock').textContent = '00:00';byId('clock-compact').textContent='00:00';
  const progress = (done, text) => {
    if (generation !== current) return;
    byId('progress').value = done; byId('loading-text').textContent = text;
    byId('loading-count').textContent = `${done} / 3 bước hoàn tất`;
  };
  let scene = null;
  let openedRepository=null,openedHandle=null,openedScope=null,conflictBackup=null;
  try {
    if(session){session.pause();try{await session.whenSaved();}catch{}}disposeSession();
    await closingSave;
    if(generation!==current)return;
    const mode=byId('save-mode').value;
    if(mode!=='none'){
      let bridge=null,scope={kind:'guest',id:'device'};
      if(mode==='account'){
        bridge=await connectFirebaseSave(window.__FIREBASE_CONFIG__);
        const uid=bridge.currentUid();if(!uid)throw new Error('Cần đăng nhập tài khoản Firebase trước khi mở bản lưu tài khoản.');
        scope={kind:'firebase',id:uid};
      }
      openedScope=scope;
      openedRepository=await openSaveRepository();
      openedHandle=await preparePersistedSession({repository:openedRepository,scope,slot:'main',owner:crypto.randomUUID(),bridge,
        onStatus({status,detail}){const labels={saving:'Đang lưu…',local:'Đã lưu cục bộ',synced:'Đã đồng bộ',failed:'Lưu thất bại',conflict:'Xung đột bản lưu'};setText('save-status',`${labels[status]||status}${detail?' · '+detail:''}`);
          if(status==='conflict'&&session&&root.dataset.state!=='ERROR'){session.pause();setState('ERROR');openDialog('error','Xung đột bản lưu',['Hai thiết bị có thay đổi khác nhau. Phiên chơi đã dừng; bản cục bộ và bản cloud đều được giữ lại.'],[{label:'Xuất bản cục bộ',run:async()=>downloadSaveBackup(await saveHandle.exportLocal())},{label:'Về lựa chọn',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);}},
        onAccountChange(){if(session){session.pause();setState('ERROR');openDialog('error','Tài khoản đã thay đổi',['Phiên chơi đã dừng. Bản lưu cục bộ và dữ liệu chưa đồng bộ vẫn được giữ theo tài khoản cũ.'],[{label:'Về lựa chọn',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}]);}}
      });
      if(generation!==current){await openedHandle.close();openedRepository.close();return;}
      saveRepository=openedRepository;saveHandle=openedHandle;openedRepository=null;openedHandle=null;
      setText('save-status',scope.kind==='guest'?'Lưu trên thiết bị':'Lưu tài khoản · kiểm tra đồng bộ');
    }else setText('save-status','Không lưu');
    const loaded = await loadScene({ signal: controller.signal, onProgress: progress });
    if (generation !== current) return;
    if(saveHandle?.checkpoint){
      const saved=saveHandle.checkpoint.world;
      if(encodeSave(saved.config)!==encodeSave(loaded.data.riverConfig)||encodeSave(saved.combat.config)!==encodeSave({...loaded.data.characterConfig,tickHz:loaded.data.riverConfig.tickHz})||(saved.army&&encodeSave(saved.army.config)!==encodeSave(armyDefaults)))throw new Error('Bản lưu dùng cấu hình khác; chưa thể mở an toàn.');
      preferences.hero=saved.heroId;labOptions.vesselType=saved.vesselType;labOptions.scenarioId=saved.scenarioId;
    }
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
    activeMapConfig=loaded.data.riverConfig;lastMapOpen=false;byId('map').hidden=true;byId('map-view').replaceChildren();byId('map-targets').replaceChildren();
    session = createSession({ root, scene, data: loaded.data, heroId: preferences.hero, ...labOptions,persistence:saveHandle, onPause: pause, onCamera: toggleCamera, onStatus: updateRiverHUD,onOutcome:combatOutcome,onFault(error){lastFault=String(error.stack||error);setState('ERROR');openDialog('error','Mô phỏng đã dừng',['Lượt chơi đã dừng. Nếu lỗi xảy ra khi lưu, mốc đã xác nhận trước đó được giữ lại.',error.message], [{label:'Tải mốc trước',run:beginLoad},{label:'Về lựa chọn',run:()=>returnToSetup()}]);}, onClock: second => { byId('clock').textContent = formatTime(second);byId('clock-compact').textContent=formatTime(second); } });
    progress(3, 'Cảnh đã dựng xong. Sẵn sàng khám phá.');
    showScreen('play'); scene.resize();
    const role = loaded.data.roles.find(item => item.id === preferences.hero);
    byId('actor').textContent = `${role.name} · ${loaded.data.riverConfig.vessels[labOptions.vesselType].name}`;
    setState('BRIEFING'); loadController = null;
    openDialog('briefing', 'Sẵn sàng khám phá bến sông?', [
      'Bạn bắt đầu ở tay lái. W/S tăng giảm tốc, A/D lái, Space neo. E rời lái để đi trên boong; E ở đuôi thuyền nhận lại tay lái. C đổi camera.',
      'Đi tới mép boong rồi G để nhảy sang thuyền địch khi áp mạn đủ chậm. Space nhảy tự do khi đi bộ. J / nút Đánh để đánh hoặc bắn, Q giữ đỡ, V né, L khóa, nút Cung/Kiếm đổi vũ khí. M mở bản đồ: trận vẫn chạy; Esc mới tạm dừng.',
      `Tình huống: ${loaded.data.riverConfig.scenarios[labOptions.scenarioId].name}. Vòng vàng đánh dấu bãi cọc, vòng xanh là bến sửa. Tình huống nước rút bắt đầu từ phút thứ 7 của con nước, không phải tua nhanh thời gian.`,
      `Rơi nước phải bơi tới bờ hoặc thuyền ta đủ chậm; E gọi đồng đội tỉnh táo kéo lên. Khi gục, sĩ quan dự bị tiếp quản. ${saveHandle?'Tải lại mở mốc đã ghi. Sau thất bại, về trại để kết toán trước khi trở lại; thương vong và hàng đã mất không được hoàn lại.':'Chế độ này không lưu chiến dịch.'}`,
    ], [ { label: 'Bắt đầu lượt thử', run: resume }, { label: 'Chọn lại', run: () => returnToSetup() } ]);
  } catch (error) {
    scene?.dispose();
    if(openedRepository&&openedScope){try{const record=await openedRepository.read(openedScope,'main');if(record)conflictBackup=encodeSave({schemaVersion:1,scope:openedScope,slot:'main',record,outbox:await openedRepository.pending(openedScope,'main'),journal:await openedRepository.events(openedScope,'main')});}catch{}}
    if(openedHandle)await openedHandle.close();if(openedRepository)openedRepository.close();
    if (controller.signal.aborted || generation !== current) return;
    disposeSession(); showScreen('setup'); setState('ERROR');
    let message = error instanceof TypeError ? 'Không tải được tài nguyên. Hãy kiểm tra kết nối và thử lại.' : error.message || 'Đã có lỗi khi tải cảnh.';
    if(message.startsWith('REMOTE_STATE_UNAVAILABLE'))message='Không thể xác minh bản lưu tài khoản. Kiểm tra kết nối và quyền Firestore; bản lưu cũ không bị ghi đè.';
    else if(message==='CLOUD_CONFLICT')message='Hai thiết bị có thay đổi khác nhau. Bản cục bộ được giữ lại; cần xử lý xung đột trước khi tiếp tục.';
    else if(message==='SLOT_IN_USE')message='Bản lưu đang được dùng ở tab khác hoặc tab cũ vừa đóng. Hãy đóng tab kia và thử lại sau ít giây.';
    else if(message==='UNSUPPORTED_CHECKPOINT')message='Bản lưu dùng phiên bản mô phỏng chưa được hỗ trợ. Bản cũ được giữ nguyên; hãy xuất bản lưu để bảo quản trước khi nâng cấp.';
    const actions=[{label:'Thử lại',run:beginLoad},{label:'Về lựa chọn',run:()=>returnToSetup()},{label:'Về Sa Bàn',run:navigateHome}];
    if(conflictBackup)actions.unshift({label:'Xuất bản cục bộ',run:()=>downloadSaveBackup(conflictBackup)});
    openDialog('error','Chưa mở được cảnh 3D',[message,'Bạn có thể thử lại hoặc chọn lại cách lưu.'],actions);
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.matches('[data-exit]')) { event.preventDefault();void navigateHome();return; }
  if(target.dataset.combatAction){session?.action(target.dataset.combatAction,{targetId:target.dataset.targetId});return;}
  if(target.dataset.armyAction){const kind=target.dataset.armyAction,squadId=byId('army-squad').value;
    if(kind==='order')session?.action('army-order',{squadId,orderType:byId('army-order').value,x:Number(byId('army-x').value),z:Number(byId('army-z').value),lossThreshold:Number(byId('army-loss').value)/100,retreatPolicy:byId('army-policy').value});
    else if(kind==='cancel')session?.action('army-cancel',{squadId});
    else if(kind==='convoy')session?.action('army-convoy',{resource:byId('army-resource').value,amount:Number(byId('army-amount').value)});
    else session?.action('army-job',{squadId,jobType:kind});
    return;
  }
  if (target.dataset.riverAction) { session?.action(target.dataset.riverAction); return; }
  if (target.dataset.dialogAction !== undefined) { dialogActions[target.dataset.dialogAction]?.(); return; }
  if (target.dataset.hero) { preferences.hero = target.dataset.hero; syncChoices(); savePreference(); return; }
  if (target.dataset.quality) { preferences.quality = target.dataset.quality; syncChoices(); savePreference(); return; }
  const actions = {
    'bd938-next': () => { byId('characters').hidden = true; byId('quality').hidden = false; byId('load').focus({ preventScroll: true }); },
    'bd938-previous': () => { byId('characters').hidden = false; byId('quality').hidden = true; byId('next').focus({ preventScroll: true }); },
    'bd938-load': beginLoad, 'bd938-cancel-load': () => returnToSetup(),
    'bd938-systems-close':()=>{byId('systems').open=false;session?.focus();},
    'bd938-camera': toggleCamera, 'bd938-pause': () => pause(), 'bd938-finish': finish,
    'bd938-map-pause':()=>pause(),
    'bd938-hud-toggle': () => {
      const isCollapsed = root.classList.toggle('bd938-hud-collapsed');
      const btn = byId('hud-toggle');
      if (btn) btn.textContent = isCollapsed ? '👁️ Mở rộng HUD' : '👁️ Thu gọn HUD';
    },
    'bd938-dialog-close': () => { if (dialogMode === 'pause') resume(); else if(dialogMode==='retry')combatOutcome(session.snapshot().combat);else if (dialogMode === 'briefing' || dialogMode === 'results') returnToSetup(); },
  };
  actions[target.id]?.();
});
root.addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea,[contenteditable="true"]'))return;if(byId('systems').open&&event.code==='Escape'){event.preventDefault();event.stopPropagation();byId('systems').open=false;session?.focus();return;}if(!byId('map').hidden&&!event.ctrlKey&&!event.metaKey&&!event.altKey){if(event.code==='KeyM'){event.preventDefault();session?.action('map');}if(event.code==='Escape'){event.preventDefault();pause();}}});
byId('map-view').addEventListener('pointerup',event=>{if(byId('army-panel').hidden)return;const svg=byId('map-view'),matrix=svg.getScreenCTM();if(!matrix)return;const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const v=p.matrixTransform(matrix.inverse());byId('army-x').value=String(Math.round(v.x));byId('army-z').value=String(Math.round(v.y));});
root.addEventListener('change', event => {
  if (event.target.id === 'bd938-vessel') labOptions.vesselType = event.target.value;
  if (event.target.id === 'bd938-scenario') labOptions.scenarioId = event.target.value;
});
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (dialogMode === 'pause') resume();
  else if(dialogMode==='retry')combatOutcome(session.snapshot().combat);
  else if (dialogMode === 'briefing' || dialogMode === 'results') returnToSetup();
});
window.addEventListener('pagehide', exit);
window.addEventListener('pageshow', event => { if (event.persisted) returnToSetup({ focus: false }); });
if (document.getElementById('bd938-lock-overlay')) {
  console.info('Bạch Đằng 938 (3D Mới) đang tạm khóa trên tất cả thiết bị (đang hoàn thiện dần).');
} else {
  syncChoices();
}

// Test/inspection API stays in module scope; no global gameplay handlers or keys.
export function getDiagnostics() {
  return { ...metrics, state: root.dataset.state, preferences: { ...preferences }, pauseReasons: [...pauseReasons], session: session?.snapshot() ?? null, lastDisposed,lastFault,canvases: root.querySelectorAll('canvas').length, dialogOpen: dialog.open };
}
