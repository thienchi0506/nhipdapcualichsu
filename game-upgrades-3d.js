/* Rendering upgrades and explicit combat orders for the existing campaigns. */
(function () {
    'use strict';
    if (typeof Game3D === 'undefined' || typeof THREE === 'undefined') return;
    const active = HistoryGame.active;
    const initial = new Map(), arrowPool = [];
    let arrowGeometry, arrowMaterial, fireArrowMaterial, commandPanel, wakeGeometry, wakeMaterial;
    let lastHud = -1, sceneEpoch = 0;
    const wakes = new Map();
    const staticUnits = new Set(['cungThuBac','cungThuNam','nnCungNo']);
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
    function campaignUnits() {
        return Object.values(Game3D.units).filter(u => u.campaign === Game3D.currentCampaign);
    }
    function visible(object) {
        for(let p=object;p;p=p.parent) if(!p.visible)return false;
        return !!object;
    }
    function remember() {
        Object.values(Game3D.units).forEach(u=>{
            if(!u.mesh || !u.pos)return;
            if(!u.campaign)u.campaign = /^(nn|soaiBe|beDot|beHau|cauPhao)/.test(u.id) ? 2 : 1;
            if(!initial.has(u.id))initial.set(u.id,{x:u.pos.x,y:u.pos.y,z:u.pos.z,hp:u.maxHp||u.hp,speed:u.speed,rx:u.mesh.rotation.x,ry:u.mesh.rotation.y,rz:u.mesh.rotation.z});
        });
    }
    function prepareCampaign() {
        remember(); sceneEpoch++;
        Game3D.selectedUnit=null; Game3D.selectedEnemyTarget=null;
        if(Game3D.selectionRing3D)Game3D.selectionRing3D.visible=false;
        Game3D.units && Object.values(Game3D.units).forEach(u=>{
            if(!u.mesh)return;
            u.mesh.visible=u.campaign===Game3D.currentCampaign;
            if(u.labelEl)u.labelEl.style.display='none';
            u.order=null;u.attackCooldown=0;u.isMoving=false;
        });
        if(Game3D.nnAlliedGroup)Game3D.nnAlliedGroup.visible=Game3D.currentCampaign===2;
        if(Game3D.nnSongRaftsGroup)Game3D.nnSongRaftsGroup.visible=Game3D.currentCampaign===2;
        Game3D.trapCooldown=0;
        Game3D.dilemmasTriggered={1:false,2:false,3:false};
        Game3D.nhuNguyetDilemmasTriggered={1:false,2:false,3:false};
        Game3D.skills && Object.values(Game3D.skills).forEach(s=>s.remainingCooldown=0);
        campaignUnits().forEach(u=>{
            const base=initial.get(u.id); if(!base)return;
            u.hp=base.hp;u.maxHp=base.hp;u.morale=100;u.speed=base.speed;
            u.surrendered=false;u.sunk=false;u.trapped=false;u.burning=false;u.active=false;u.isRetreating=false;
            u.pos.set(base.x,base.y,base.z);u.mesh.position.copy(u.pos);
            u.mesh.rotation.set(base.rx,base.ry,base.rz);
            u.targetX=base.x;u.targetZ=base.z;
            if(u.whiteFlagMesh){HistoryGame.dispose(u.whiteFlagMesh);u.whiteFlagMesh=null;}
        });
        Game3D.thuyTrieu.phanTram=85;Game3D.thuyTrieu.dangTang=true;
        Game3D.lastHudUpdate=-1;
    }
    function acquireArrow(isFire=false) {
        if(!arrowGeometry){arrowGeometry=new THREE.CylinderGeometry(.06,.08,1.2,6);arrowMaterial=new THREE.MeshBasicMaterial({color:0xffba61});fireArrowMaterial=new THREE.MeshBasicMaterial({color:0xff5b24});}
        const mesh=arrowPool.pop()||new THREE.Mesh(arrowGeometry,arrowMaterial);
        mesh.material=isFire?fireArrowMaterial:arrowMaterial;
        mesh.userData.pooledArrow=true;mesh.visible=true;Game3D.scene.add(mesh);return mesh;
    }
    function releaseArrow(mesh) {
        if(mesh.userData.pooledArrow){mesh.parent?.remove(mesh);mesh.visible=false;mesh.material=arrowMaterial;if(arrowPool.length<180)arrowPool.push(mesh);}
        else HistoryGame.dispose(mesh);
    }
    function projectile(from, to, onHit, options={}) {
        if(Game3D.arrows3D.length>=180)return false;
        const hit=options.accuracy===undefined||Math.random()<=options.accuracy;
        const spread=options.spread||0;
        const mesh=acquireArrow(!!options.fire), start=new THREE.Vector3(from.x,from.y+3,from.z), end=new THREE.Vector3(to.x+(Math.random()-.5)*spread,to.y+2,to.z+(Math.random()-.5)*spread);
        mesh.position.copy(start);
        const resolveHit=hit&&onHit?()=>{
            const target=options.target;
            if(target?.pos?.distanceTo && target.pos.distanceTo(end)>(options.hitRadius||5))return;
            onHit();
        }:null;
        Game3D.arrows3D.push({mesh,start,end,progress:0,speed:options.speed||2.2,height:options.height||6,onHit:resolveHit});return true;
    }
    function water(material) {
        Game3D.waterTime={value:0};
        material.onBeforeCompile=shader=>{
            shader.uniforms.hgTime=Game3D.waterTime;
            shader.vertexShader='uniform float hgTime;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>', `
                float wa=position.x*0.12+hgTime*2.2;
                float wb=position.z*0.08+hgTime*1.8;
                float wc=(position.x+position.z)*0.06+hgTime*1.4;
                vec3 objectNormal=normalize(vec3(-cos(wa)*0.042-cos(wc)*0.015,1.0,sin(wb)*0.036-cos(wc)*0.015));
            `).replace('#include <begin_vertex>', `
                vec3 transformed=position;
                transformed.y+=sin(wa)*0.35+cos(wb)*0.45+sin(wc)*0.25;
            `);
        };
        material.customProgramCacheKey=()=> 'history-water-v1';
    }
    function setAttack(target) {
        const unit=Game3D.selectedUnit;
        if(HistoryGame.paused || !active(unit)||!active(target)||target.campaign!==Game3D.currentCampaign)return;
        if(/quanY/i.test(unit.id)){hienThiThongBaoPopup('🌿 QUÂN Y','Đơn vị quân y hỗ trợ chữa thương. Hãy chọn thuyền chiến hoặc cung nỏ để tấn công.');return;}
        unit.order={type:'attack',target,epoch:sceneEpoch};
        Game3D.selectedEnemyTarget=target;
        hienThiThongBaoPopup('⚔ LỆNH TẤN CÔNG',`${unit.name}: tiếp cận trong tầm, rồi bắn ${target.name}.`);
        veDuongDi3DUonLuon(unit,target.pos.x,target.pos.z,true);
    }
    function setMove(unit,x,z) {
        if(!active(unit)||HistoryGame.paused||!Number.isFinite(x)||!Number.isFinite(z))return false;
        if(staticUnits.has(unit.id)||/cungThu/i.test(unit.id)){
            hienThiThongBaoPopup('🛡 GIỮ TRẬN ĐỊA','Cung nỏ cố định giữ vị trí trên bờ. Hãy chọn thuyền để cơ động.');return false;
        }
        unit.order={type:'move',epoch:sceneEpoch};
        unit.targetX=clamp(x,-32,32);unit.targetZ=clamp(z,-125,130);unit.isMoving=true;
        return true;
    }
    function hold() {
        const u=Game3D.selectedUnit;if(!active(u))return;
        u.order={type:'hold'};u.targetX=u.pos.x;u.targetZ=u.pos.z;u.isMoving=false;u.isRetreating=false;
        xoaDuongDi3D(u);
    }
    function retreat() {
        const u=Game3D.selectedUnit;if(!active(u))return;
        raLenhDiChuyenToaDo(u,Game3D.currentCampaign===2?-28:u.pos.x,Game3D.currentCampaign===2?u.pos.z:-35);
        if(u.order)u.order.type='retreat';
    }
    function update(dt, elapsed) {
        remember();
        if(Game3D.isPostWar || ['CHUA_BAT_DAU','KET_THUC','THUA_TRAN','THANG_TRAN','THANG_TRAN_NHU_NGUYET'].includes(Game3D.combatPhase))return;
        if(Game3D.currentCampaign===1 && Game3D.bachDang?.active)return;
        const units=campaignUnits(), allies=units.filter(u=>u.type==='ta'&&active(u)), enemies=units.filter(u=>u.type==='dich'&&active(u));
        for(const u of allies){
            u.attackCooldown=Math.max(0,(u.attackCooldown||0)-dt);
            const order=u.order;
            if(order?.type==='attack'){
                const t=order.target;
                if(!active(t)||order.epoch!==sceneEpoch){holdUnit(u);continue;}
                const dx=t.pos.x-u.pos.x,dz=t.pos.z-u.pos.z,dist=Math.hypot(dx,dz);
                const range=/cung|no/i.test(u.id)?90:25;
                if(dist>range){
                    if(!staticUnits.has(u.id)&&!/cungThu/i.test(u.id)){
                        u.targetX=clamp(t.pos.x-dx/dist*range*.75,-32,32);
                        u.targetZ=clamp(t.pos.z-dz/dist*range*.75,-125,130);u.isMoving=true;
                    }
                }else{
                    u.targetX=u.pos.x;u.targetZ=u.pos.z;u.isMoving=false;
                    if(u.attackCooldown===0){
                        const tidePenalty=Game3D.currentCampaign===1&&Game3D.thuyTrieu.phanTram>75?.3:1;
                        const hitDamage=(t.maxHp||100)*.07*tidePenalty*(t.trapped?1.25:1);
                        if(projectile(u.pos,t.pos,()=>{
                            if(!active(t)||order.epoch!==sceneEpoch)return;
                            apDungSatThuongDich(t,hitDamage);t.morale=Math.max(0,t.morale-3);
                            t.hitFlash=.15;
                        }))u.attackCooldown=1.4;
                    }
                }
            }
            if(/quanY/i.test(u.id)&&u.attackCooldown===0){
                allies.forEach(a=>{if(a!==u&&a.pos.distanceTo(u.pos)<30)a.hp=Math.min(a.maxHp||100,a.hp+2);});
                u.attackCooldown=2;
            }
        }
        for(const e of enemies){
            e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);
            if(e.morale<=0){keoCoTrangDauHang(e);continue;}
            if(e.attackCooldown>0||e.trapped)continue;
            let target=null,range=34;
            for(const a of allies){const d=a.pos.distanceTo(e.pos);if(d<range){range=d;target=a;}}
            if(target){
                const epoch=sceneEpoch;
                projectile(e.pos,target.pos,()=>{
                    if(epoch!==sceneEpoch||!active(target))return;
                    target.hp=Math.max(0,target.hp-3);target.morale=Math.max(0,target.morale-1);target.hitFlash=.15;
                    if(target.hp===0){target.sunk=true;holdUnit(target);if(Game3D.selectedUnit===target)boChonDaoQuan();}
                });e.attackCooldown=2;
            }
        }
        // Count both sunk and surrendered ships; hidden ships from another campaign are irrelevant.
        const fleet=units.filter(u=>u.type==='dich');
        if(fleet.length && fleet.every(u=>!active(u))){
            Game3D.combatPhase=Game3D.currentCampaign===2?'THANG_TRAN_NHU_NGUYET':'THANG_TRAN';
            if(Game3D.currentCampaign===2&&!Game3D.nhuNguyetDilemmasTriggered[3])kichHoatTinhHuong(3);
        }
        const fighters=units.filter(u=>u.type==='ta'&&!/quanY/i.test(u.id));
        if(fighters.length&&fighters.every(u=>!active(u))){
            Game3D.combatPhase='THUA_TRAN';
            hienThiThongBaoPopup('TRẬN ĐÁNH KẾT THÚC','Lực lượng chiến đấu đã mất khả năng tác chiến. Chọn Chơi lại trong bảng kết quả để thử cách bố trí khác.');
            const result=document.getElementById('hg-defeat');
            if(result)result.showModal();
        }
    }
    function holdUnit(u){u.order=null;u.targetX=u.pos.x;u.targetZ=u.pos.z;u.isMoving=false;}
    function wakeFor(unit){
        if(!wakeGeometry){wakeGeometry=new THREE.RingGeometry(2,2.25,20,1,Math.PI*.1,Math.PI*.8);wakeMaterial=new THREE.MeshBasicMaterial({color:0xb2e7e7,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide});}
        let record=wakes.get(unit.id);
        if(!record){const mesh=new THREE.Mesh(wakeGeometry,wakeMaterial);mesh.rotation.x=-Math.PI/2;Game3D.scene.add(mesh);record={mesh,x:unit.pos.x,z:unit.pos.z};wakes.set(unit.id,record);}
        return record;
    }
    function render(dt,elapsed){
        const list=campaignUnits();
        for(const u of list){
            if(!u.mesh||!visible(u.mesh))continue;
            if(u.type==='ta'&&!staticUnits.has(u.id)&&!/cungThu/i.test(u.id)){
                const wake=wakeFor(u),dx=u.pos.x-wake.x,dz=u.pos.z-wake.z,moving=Math.hypot(dx,dz)>.005;
                wake.mesh.visible=active(u)&&moving&&!HistoryGame.settings.reducedMotion;
                wake.mesh.position.set(u.pos.x,Game3D.thuyTrieu.mucNuocY+.8,u.pos.z);
                if(moving)wake.mesh.rotation.z=-Math.atan2(dx,dz);
                const scale=1.2+Math.sin(elapsed*4)*.08;wake.mesh.scale.set(scale,scale,scale);
                wake.x=u.pos.x;wake.z=u.pos.z;
                if(active(u)&&!u.trapped&&!HistoryGame.settings.reducedMotion)u.mesh.rotation.z=Math.sin(elapsed*1.8+u.pos.x)*.018;
            }
            u.hitFlash=Math.max(0,(u.hitFlash||0)-dt);
        }
        for(const [id,wake]of wakes)if(!list.some(u=>u.id===id))wake.mesh.visible=false;
        if(commandPanel&&elapsed-lastHud>.2){
            lastHud=elapsed;const u=Game3D.selectedUnit;commandPanel.hidden=!active(u);
            if(u)commandPanel.querySelector('output').textContent=`${u.name} · ${Math.round(HistoryGame.healthPercent(u))}% · ${{attack:'Tấn công',hold:'Giữ vị trí',move:'Cơ động',retreat:'Rút lui'}[u.order?.type]||'Sẵn sàng'}`;
        }
    }
    function setup(){
        if(!Game3D.renderer||HistoryGame.isMobile())return;
        document.body.classList.add('hg-game-3d');
        remember();
        HistoryGame.onSettings((quality,settings)=>{
            Game3D.renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality.dpr));
            if(Game3D.renderer.shadowMap.enabled!==quality.shadows){
                Game3D.renderer.shadowMap.enabled=quality.shadows;
                Game3D.scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true);});
            }
            for(const key of ['particles','firefliesMesh','foamMesh']){
                const mesh=Game3D[key];if(mesh?.geometry?.attributes.position)mesh.geometry.setDrawRange(0,Math.floor(mesh.geometry.attributes.position.count*quality.particles));
            }
            if(settings.reducedMotion)Game3D.actionCamEnabled=false;
        });
        commandPanel=document.createElement('div');commandPanel.id='hg-orders';commandPanel.className='interactive';commandPanel.hidden=true;
        commandPanel.innerHTML='<output></output><button type="button" data-command="hold">Giữ vị trí</button><button type="button" data-command="retreat">Rút lui</button>';
        commandPanel.querySelector('[data-command=hold]').onclick=hold;
        commandPanel.querySelector('[data-command=retreat]').onclick=retreat;
        document.body.append(commandPanel);
        const defeat=document.createElement('dialog');defeat.id='hg-defeat';defeat.className='interactive';
        defeat.innerHTML='<h2>Hãy thử một phương án khác</h2><p>Đưa quân vào tầm hỗ trợ của quân y và giữ lực lượng dự bị cho thời điểm phản công.</p><button type="button">Chơi lại chiến dịch</button>';
        defeat.querySelector('button').onclick=choiLaiChienDich3D;document.body.append(defeat);
        Game3D.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();HistoryGame.pause('context');hienThiThongBaoPopup('ĐANG KHÔI PHỤC ĐỒ HỌA','Trình duyệt đã tạm ngắt bộ xử lý đồ họa. Vui lòng chờ; có thể tải lại trang nếu chưa phục hồi.');});
        Game3D.renderer.domElement.addEventListener('webglcontextrestored',()=>HistoryGame.resume('context'));
    }
    function batchEnvironment(root){
        if(!root || root.userData.hgBatched)return;
        root.userData.hgBatched=true;root.updateMatrixWorld(true);
        const buckets=new Map(), inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
        root.traverse(mesh=>{
            if(!mesh.isMesh || mesh.isInstancedMesh || mesh.children.length || !mesh.geometry?.parameters || !mesh.material || Array.isArray(mesh.material) || mesh.material.transparent || mesh.geometry.type==='RingGeometry')return;
            const key=mesh.geometry.type+JSON.stringify(mesh.geometry.parameters)+mesh.material.uuid+mesh.castShadow+mesh.receiveShadow;
            if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(mesh);
        });
        for(const meshes of buckets.values()){
            if(meshes.length<4)continue;
            const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
            batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
            const matrix=new THREE.Matrix4();
            meshes.forEach((mesh,i)=>{matrix.multiplyMatrices(inverse,mesh.matrixWorld);batch.setMatrixAt(i,matrix);mesh.parent.remove(mesh);});
            batch.instanceMatrix.needsUpdate=true;root.add(batch);
        }
    }
    window.GameTactics3D={update,render,water,remember,prepareCampaign,releaseArrow,projectile,setAttack,setMove,batchEnvironment};
    document.addEventListener('DOMContentLoaded',setup);
    window.addEventListener('history-game-pause',e=>{
        Object.keys(Game3D.keys).forEach(key=>Game3D.keys[key]=false);
        if(e.detail){speechSynthesis.pause();if(AudioEngine.ctx?.state==='running')AudioEngine.ctx.suspend();}
        else {speechSynthesis.resume();if(AudioEngine.ctx?.state==='suspended')AudioEngine.ctx.resume().catch(()=>{});}
    });
    window.addEventListener('history-game-scene-reset',()=>{
        Game3D.arrows3D.splice(0).forEach(a=>releaseArrow(a.mesh));
        Game3D.skillEffects.splice(0).forEach(e=>HistoryGame.dispose(e.mesh));
        (Game3D.targetMarkers3D||[]).splice(0).forEach(m=>HistoryGame.dispose(m.mesh));
        (Game3D.activeNavPaths||[]).splice(0).forEach(p=>{HistoryGame.dispose(p.tubeMesh);HistoryGame.dispose(p.arrowMesh);p.ripples?.forEach(r=>HistoryGame.dispose(r.mesh));});
        speechSynthesis.cancel();document.body.classList.remove('screen-shake');
    });
})();
