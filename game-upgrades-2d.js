/* Cached river artwork, deterministic details and readable order feedback. */
(function () {
    'use strict';
    const cache=new Map(), previous=new WeakMap();
    function background(width,top,bottom,campaign){
        const key=[width,top,bottom,campaign].join(':');
        if(cache.has(key))return cache.get(key);
        const layer=document.createElement('canvas');layer.width=width;layer.height=bottom-top;
        const c=layer.getContext('2d'),g=c.createLinearGradient(0,0,0,layer.height);
        g.addColorStop(0,'#173942');g.addColorStop(.4,campaign===1?'#154858':'#24515b');g.addColorStop(1,'#102d37');
        c.fillStyle=g;c.fillRect(0,0,width,layer.height);
        // Fixed seed: shoreline details never shimmer between frames.
        let seed=9381077;
        function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
        for(let i=0;i<280;i++){
            const x=random()*width,y=random()*layer.height;
            c.fillStyle=`rgba(124,194,187,${.015+random()*.03})`;c.fillRect(x,y,6+random()*35,1);
        }
        const edge=c.createLinearGradient(0,0,0,12);edge.addColorStop(0,'#9bb0a259');edge.addColorStop(1,'#abcfc000');
        c.fillStyle=edge;c.fillRect(0,0,width,12);
        c.save();c.translate(0,layer.height);c.scale(1,-1);c.fillRect(0,0,width,12);c.restore();
        cache.set(key,layer);return layer;
    }
    function water(ctx,canvas,campaign){
        const top=campaign===1?135:140,bottom=campaign===1?430:420;
        ctx.save();ctx.shadowBlur=0;ctx.globalAlpha=1;
        ctx.drawImage(background(canvas.width,top,bottom,campaign),0,top);
        const time=HistoryGame.settings.reducedMotion?0:HistoryGame.now()/1000;
        const spacing=HistoryGame.quality.particles<.5?32:22;
        ctx.strokeStyle='rgba(156,219,218,.23)';ctx.lineWidth=1;
        for(let y=top+15;y<bottom-6;y+=spacing){
            ctx.beginPath();
            for(let x=0;x<=canvas.width;x+=40){
                const wave=y+Math.sin(x*.028+time*1.8+y)*2.6+Math.sin(x*.012-time)*1.3;
                if(x===0)ctx.moveTo(x,wave);else ctx.lineTo(x,wave);
            }ctx.stroke();
        }
        // Contact shadows and wakes stay in the water layer, behind ships and text.
        let ships=[];
        if(campaign===1&&typeof danhSachBeGoSong!=='undefined')ships=danhSachBeGoSong;
        if(campaign!==1&&typeof danhSachThuyenDich!=='undefined')ships=danhSachThuyenDich;
        for(const ship of ships){
            if(ship.sunk)continue;
            ctx.fillStyle='rgba(0,12,20,.28)';ctx.beginPath();ctx.ellipse(ship.x+3,ship.y+7,ship.width||30,9,0,0,Math.PI*2);ctx.fill();
            const prev=previous.get(ship);previous.set(ship,{x:ship.x,y:ship.y});
            if(!prev||HistoryGame.settings.reducedMotion)continue;
            const dx=ship.x-prev.x,dy=ship.y-prev.y;
            if(Math.hypot(dx,dy)<.02)continue;
            ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(Math.atan2(dy,dx));
            ctx.strokeStyle='rgba(199,232,221,.32)';ctx.beginPath();ctx.moveTo(-24,-7);ctx.lineTo(-43,-15);ctx.moveTo(-24,7);ctx.lineTo(-43,15);ctx.stroke();ctx.restore();
        }
        ctx.restore();
    }
    function overlay(ctx,canvas,act,campaign){
        if(act!==2)return;
        ctx.save();ctx.shadowBlur=0;ctx.globalAlpha=1;
        if(HistoryGame.settings.grid){
            ctx.strokeStyle='rgba(220,233,220,.12)';ctx.lineWidth=.7;
            ctx.beginPath();for(let x=0;x<canvas.width;x+=50){ctx.moveTo(x,140);ctx.lineTo(x,420);}for(let y=140;y<=420;y+=40){ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);}ctx.stroke();
        }
        if(typeof selectedUnit!=='undefined'&&selectedUnit&&Number.isFinite(selectedUnit.targetX)&&Number.isFinite(selectedUnit.targetY)){
            const u=selectedUnit,dist=Math.hypot(u.targetX-u.x,u.targetY-u.y);
            if(dist>8){
                ctx.strokeStyle='#8be2d7';ctx.setLineDash([5,5]);ctx.lineWidth=1.5;
                ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(u.targetX,u.targetY);ctx.stroke();ctx.setLineDash([]);
                ctx.beginPath();ctx.arc(u.targetX,u.targetY,7,0,Math.PI*2);ctx.stroke();
            }
        }
        ctx.font='bold 11px "Noto Serif", serif';ctx.textAlign='left';
        ctx.fillStyle='rgba(10,22,26,.85)';ctx.fillRect(8,canvas.height-30,210,23);
        ctx.fillStyle='#dbeadf';ctx.fillText(campaign===1?'↑ Bờ Bắc   ·   ↓ Phòng tuyến':'↑ Bờ Bắc   ·   ↓ Bờ Nam',17,canvas.height-14);
        ctx.restore();
    }
    window.GameVisuals2D={water,overlay};
    window.addEventListener('history-game-pause',e=>{
        if(typeof keys!=='undefined')Object.keys(keys).forEach(k=>keys[k]=false);
        if(e.detail)speechSynthesis.pause();else speechSynthesis.resume();
    });
})();
