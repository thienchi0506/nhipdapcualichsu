import {openSaveRepository} from '../src/save/repository.js';

export async function runSaveTabTests(){
  const name=`bd938-tabs-${crypto.randomUUID()}`,scope={kind:'guest',id:'test-device'},slot='main',checks=[];
  const check=(name,passed)=>checks.push({name,passed:!!passed});
  const secondWindow=window.open('about:blank','_blank');
  if(!secondWindow)throw new Error('POPUP_BLOCKED');
  const first=await openSaveRepository({name});let second;
  try{
    const module=await secondWindow.eval(`import(${JSON.stringify(new URL('../src/save/repository.js',import.meta.url).href)})`);
    second=await module.openSaveRepository({name});
    const a=await first.acquire(scope,slot,'tabA',1000),b=await second.acquire(scope,slot,'tabB',1001);
    check('Two real windows share one exclusive IndexedDB lease',a.ok&&!b.ok);
    const projection={schemaVersion:1,campaignId:'tabs',roster:[{id:'F-1',status:'dead',health:0,wounds:1}],inventory:{ammo:0}};
    await first.commit({scope,slot,owner:'tabA',epoch:a.epoch,expectedRevision:0,batchId:'first',projection,checkpoint:{tick:1},events:[{id:'death-F-1'}],now:1002});
    check('Second window reads the same committed casualty',(await second.read(scope,slot)).projection.roster[0].status==='dead');
    const takeover=await second.acquire(scope,slot,'tabB',20000);let blocked=false;
    try{await first.commit({scope,slot,owner:'tabA',epoch:a.epoch,expectedRevision:1,batchId:'stale',projection,checkpoint:{tick:2},events:[],now:20001});}catch(e){blocked=e.message==='LEASE_LOST';}
    check('A stale window cannot write after lease takeover',takeover.ok&&takeover.epoch>a.epoch&&blocked);
  }finally{second?.close();first.close();secondWindow.close();indexedDB.deleteDatabase(name);}
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}
