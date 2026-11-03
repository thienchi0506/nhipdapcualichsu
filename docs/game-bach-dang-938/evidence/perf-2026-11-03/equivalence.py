from pathlib import Path
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import Browser
b=Browser()
try:
 b.navigate('game-bach-dang-938/index.html')
 result=b.evaluate("""(async()=>{
 const {createArmy,stepArmy,issueArmyCommand,armySnapshot}=await import('/game-bach-dang-938/src/sim/army.js');
 const config=await(await fetch('/game-bach-dang-938/data/river-config.json')).json(),out=[];
 for(const n of [50,100,200,400,480]){
  const r={tick:0,config,readings:{waterY:1.4}},a=createArmy(r,{playerCount:n,enemyCount:n}),hashes=[];
  for(const [i,s]of a.squads.filter(s=>s.team==='enemy').entries()){const dx=(-32+i%3*3)-s.x,dz=(30+i%5*2)-s.z;s.x+=dx;s.z+=dz;s.goal={x:s.x,z:s.z};s.order.point={...s.goal};for(const id of s.members){const p=a.byId.get(id);p.x+=dx;p.z+=dz;}}
  for(let t=1;t<=240;t++){r.tick=t;if(t%30===1)for(const s of a.squads.filter(s=>s.team==='friendly').slice(0,8))issueArmyCommand(a,{id:`eq:${t}:${s.id}`,squadId:s.id,type:'attack',x:-30,z:15+t%60,lossThreshold:.8});stepArmy(a,r);
   if(t%30===0){const raw=JSON.stringify({snapshot:armySnapshot(a),all:a.people,events:a.events,counts:a.eventCounts,paths:a.squads.map(s=>[s.id,s.path,s.pathIndex])}),bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));hashes.push({tick:t,sha256:[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')});}
   if(t%40===0)await new Promise(r=>setTimeout(r,0));
  }out.push({perSide:n,hashes});
 }return out;
})()""")
 Path(__file__).with_name('equivalence-'+sys.argv[1]+'.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
 print('Golden trace '+sys.argv[1]+' complete',flush=True)
finally:b.close()
