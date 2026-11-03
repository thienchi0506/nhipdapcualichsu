"""Current legacy round trips; observations only, no repairs."""
from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();out=[]
def save(): (HERE/'legacy-switch.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
try:
 for w,h in [(1365,900),(390,844)]:
  row={'size':[w,h]};out.append(row)
  b.navigate('sa-ban.html',w,h);b.click('button[onclick="vaoThangSaBanNhuNguyet()"]');time.sleep(.4)
  row['enteredNhuNguyet2d']=b.evaluate('currentStageId');b.click('button[onclick="quayVeLobby()"]');time.sleep(.4)
  b.click('button[onclick="vaoThangSaBanChienDau()"]');time.sleep(.4)
  row['afterSelectingBachDang2d']=b.evaluate("({stage:currentStageId,title:document.getElementById('hud-game-title').innerText})")
  b.shot('legacy-2d-wrong-campaign-'+str(w));save()
  b.navigate('sa-ban-3d.html',w,h);wait(b,"typeof Game3D!=='undefined'&&!!Game3D.renderer",45)
  # Count actual UI calls without changing original function behavior.
  b.evaluate("window.__calls=0;const f=chuyenSangChienDichNhuNguyet;chuyenSangChienDichNhuNguyet=function(...args){window.__calls++;return f.apply(this,args)}")
  b.click('#btn-enter-campaign-2');time.sleep(.6);row['nhuNguyetCallsPerClick']=b.evaluate('window.__calls')
  b.click('#btn-call-battle');wait(b,'Game3D.nhuNguyetBattle.active');time.sleep(.3)
  row['nhuNguyet3d']=b.evaluate("({active:Game3D.nhuNguyetBattle.active,campaign:Game3D.currentCampaign,rafts:Game3D.danhSachBeMangTong.length,calls:Game3D.renderer.info.render.calls})")
  b.shot('legacy-3d-nhu-nguyet-'+str(w));row['exceptions']=errors(b);save();print('Legacy switch '+str(w),flush=True)
except Exception as e:out.append({'error':str(e),'traceback':traceback.format_exc()});save()
finally:b.close()
