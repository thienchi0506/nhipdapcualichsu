import {createSession} from '../src/app/session.js';
import {openSaveRepository} from '../src/save/repository.js';
import {createSaveController} from '../src/save/controller.js';
import {preparePersistedSession} from '../src/save/prepare-session.js';
import {restoreGame,projectGame,captureGame} from '../src/save/game-state.js';

export async function runSessionSaveTests(){
  const name=`bd938-barrier-${crypto.randomUUID()}`,repo=await openSaveRepository({name}),scope={kind:'guest',id:'barrier-test'};
  const controller=await createSaveController({repository:repo,scope,slot:'main',owner:'test-tab'});
  const riverConfig=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json(),characterConfig=await(await fetch(new URL('../data/character-config.json',import.meta.url))).json();
  const data={riverConfig,characterConfig},root=document.createElement('div'),canvas=document.createElement('canvas'),draws=[];root.append(canvas);document.body.append(root);
  const checks=[],check=(name,passed,evidence)=>checks.push({name,passed:!!passed,evidence});
  const wait=async fn=>{const end=performance.now()+5000;while(performance.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,20));}throw new Error('WAIT_TIMEOUT');};
  let hold=false,release=null,fail=false,fault=null,session=null;
  const scene={canvas,render:s=>draws.push({tick:s.tick,cargo:s.cargoKg,pump:s.pumping}),releaseControls(){},dispose(){},orbitBy(){},zoomBy(){},pick(){return null;},movementYaw(){return 0;},toggleCamera(){return 'follow';},stats(){return {};}};
  const persistence={campaignId:'barrier-campaign',attemptId:'barrier-attempt',checkpoint:null,async commit(value){if(hold)await new Promise(resolve=>{release=resolve;});if(fail){fail=false;throw new Error('SIMULATED_STORAGE_FAILURE');}return controller.commit(value);}};
  try{
    session=createSession({root,scene,data,heroId:'H01',scenarioId:'harbor',persistence,onPause:()=>{},onCamera:()=>{},onClock:()=>{},onFault:e=>{fault=e;}});
    session.start();await wait(()=>controller.revision===1);await wait(()=>session.snapshot().tick>2);
    check('Initial game state commits before the first simulation tick',draws.some(d=>d.tick===0)&&(await repo.read(scope,'main')).revision>=1);
    hold=true;session.pause();await wait(()=>!!release);const resumedFrom=session.snapshot().tick;session.start();hold=false;release();await wait(()=>session.snapshot().tick>resumedFrom+1);
    check('Resume during a pending pause checkpoint restarts the simulation',session.snapshot().running&&session.snapshot().tick>resumedFrom);
    hold=true;session.action('unload');await wait(()=>session.snapshot().saving&&!!release);
    const count=draws.length,before=await repo.read(scope,'main');await new Promise(r=>setTimeout(r,120));
    check('Candidate with lost cargo is not rendered or committed while storage is pending',draws.length===count&&before.projection.inventory.cargoKg===600);
    session.pause();hold=false;release();await session.whenSaved();await wait(async()=>(await repo.read(scope,'main')).projection.inventory.cargoKg===0);
    check('Committed cargo loss remains saved when user pauses during the write',!session.snapshot().running&&(await repo.read(scope,'main')).projection.inventory.cargoKg===0);
    await new Promise(r=>setTimeout(r,40));const rev=controller.revision;fail=true;session.start();session.action('pump');await wait(()=>!!fault);
    check('Storage failure stops the loop and restores the previous committed state',fault.message==='SIMULATED_STORAGE_FAILURE'&&!session.snapshot().running&&!session.snapshot().river.pumping&&controller.revision===rev);
    session.dispose();session=null;
    const saved=await repo.read(scope,'main'),p2={...persistence,checkpoint:saved.checkpoint};
    session=createSession({root,scene,data,heroId:'H01',scenarioId:'harbor',persistence:p2,onPause:()=>{},onCamera:()=>{},onClock:()=>{},onFault:e=>{fault=e;}});
    check('A reconstructed session resumes the saved checkpoint, without restoring cargo',session.snapshot().river.cargoKg===0&&session.snapshot().tick===saved.checkpoint.tick);
    session.dispose();session=null;await controller.close();
    const prepared=await preparePersistedSession({repository:repo,scope,slot:'main',owner:'new-tab'});
    check('Prepared session validates checkpoint against the saved projection',prepared.checkpoint.tick===saved.checkpoint.tick&&prepared.eventIds.length>0&&prepared.campaignId==='barrier-campaign');
    await prepared.close();
    const failScope={kind:'guest',id:'failure-test'},failureController=await createSaveController({repository:repo,scope:failScope,slot:'main',owner:'failure-tab'});
    const failedWorld=restoreGame(saved.checkpoint);failedWorld.combat.phase='failed_command';failedWorld.journalPending=[];failedWorld.combat.journalPending=[];
    const failureIds={campaignId:'failure-campaign',attemptId:'failure-attempt'};
    const failureCheckpoint=captureGame(failedWorld,failureIds);
    await failureController.commit({batchId:'seed-failure',projection:projectGame(failedWorld,failureIds.campaignId),checkpoint:failureCheckpoint,events:[]});
    let reported=false;const failurePersistence={...failureIds,checkpoint:failureCheckpoint,eventIds:[],commit:value=>failureController.commit(value)};
    session=createSession({root,scene,data,heroId:'H01',persistence:failurePersistence,onPause:()=>{},onCamera:()=>{},onClock:()=>{},onOutcome:()=>{reported=true;},onFault:e=>{fault=e;}});
    session.start();await wait(()=>reported);
    const finalSave=await repo.read(failScope,'main'),finalEvents=await repo.events(failScope,'main');
    check('The game reports failure only after committing its outcome and journal',finalSave.projection.missionResults.length===1&&finalSave.projection.missionResults[0].outcome==='failed_command'&&finalEvents.some(e=>e.type==='AttemptResolved')&&!session.snapshot().running,{results:finalSave.projection.missionResults,eventTypes:finalEvents.map(e=>e.type),running:session.snapshot().running});
    session.dispose();session=null;await failureController.close();
  }finally{session?.dispose();await controller.close();repo.close();indexedDB.deleteDatabase(name);root.remove();}
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}
