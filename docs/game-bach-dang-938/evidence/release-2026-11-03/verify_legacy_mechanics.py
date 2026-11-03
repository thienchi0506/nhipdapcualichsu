"""Current legacy mechanics fixtures; not a natural-play victory claim."""
from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];audit.OUT=HERE;b=Browser();out=[]
def save():(HERE/'legacy-mechanics.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
try:
 for mode,campaign in [('2d',1),('2d',2),('3d',1),('3d',2)]:
  row={'mode':mode,'campaign':campaign,'fixture':True};out.append(row)
  try:
   if mode=='2d':
    b.navigate('sa-ban.html');b.click('button[onclick="'+('vaoThangSaBanChienDau' if campaign==1 else 'vaoThangSaBanNhuNguyet')+'()"]');time.sleep(.5)
   else:
    b.navigate('sa-ban-3d.html');wait(b,"typeof Game3D!=='undefined'&&!!Game3D.renderer",45)
    b.click('#lobby-3d-modal .btn-enter-campaign' if campaign==1 else '#btn-enter-campaign-2');time.sleep(.7)
    b.click('#btn-call-battle')
    if campaign==1:b.click('.battle-guide-continue')
    wait(b,'Game3D.bachDang.active' if campaign==1 else 'Game3D.nhuNguyetBattle.active');time.sleep(.5)
   row['result']=b.evaluate((ROOT/'tools/game_regression_checks.js').read_text(encoding='utf8'))
   row['exceptions']=errors(b);print(mode,str(campaign),str(row['result']['passed'])+'/'+str(row['result']['total']),flush=True)
  except Exception as e:row['error']=str(e);row['traceback']=traceback.format_exc();print('ERROR',mode,campaign,str(e)[:180],flush=True)
  b.shot('legacy-mechanics-'+mode+'-'+str(campaign));save()
finally:b.close()
