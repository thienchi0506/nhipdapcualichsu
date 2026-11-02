import { loadScene } from '../src/app/loader.js';
import { createRiverState } from '../src/sim/vessel.js';
import { createEncounter } from '../src/sim/encounter.js';
import { createArmy, observeCommander } from '../src/sim/army.js';
import { bedAt } from '../src/sim/river.js';

// A deliberately isolated renderer fixture; no live gameplay state is changed.
export async function runArmySceneTest() {
  const scope=new AbortController(),loaded=await loadScene({signal:scope.signal,onProgress:()=>{}});
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:800px;height:600px;z-index:9999';document.body.append(host);
  let scene;
  try {
    const river=createRiverState(loaded.data.riverConfig,{scenarioId:'harbor'}),combat=createEncounter(loaded.data.characterConfig,river,'H01'),army=createArmy(river,{playerCount:1,enemyCount:1});
    river.combat=combat;river.army=army;combat.army=army;combat.helm=false;
    const hero=combat.actors[0],enemy=army.people.find(p=>p.team==='enemy');
    hero.x=-30;hero.z=0;hero.y=bedAt(river.config,hero.x,hero.z);hero.yaw=0;hero.attachment=null;
    enemy.x=-30;enemy.z=-5;army.tick=15;observeCommander(army,hero);
    scene=loaded.createScene({host,data:loaded.data,quality:'economy',heroId:'H01',scope:new AbortController(),onContextLost:()=>{}});
    scene.render(river);scene.toggleCamera();scene.render(river);
    const target=scene.stats().armyTargets.find(x=>x.id===enemy.id);
    const picked=target?.visible?scene.pick(target.x,target.y):null;
    return {passed:!!target?.visible&&picked===enemy.id,target,picked};
  } finally {scene?.dispose();host.remove();scope.abort();}
}
