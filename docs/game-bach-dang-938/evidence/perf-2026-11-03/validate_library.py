from pathlib import Path
import sys,json,time
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();out={}
try:
 start(b);b.click('#bd938-finish');b.click('[data-dialog-action="2"]');wait(b,"location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'&&!!document.querySelector('a.card__btn[href=\"tang-thu-cac.html\"]')");time.sleep(.4)
 b.click('a.card__btn[href="tang-thu-cac.html"]');wait(b,"location.pathname.endsWith('/tang-thu-cac.html')&&document.readyState==='complete'")
 b.click('[data-grade="12"]');b.click('.topic.open .study')
 out['opened']=b.evaluate("document.getElementById('modal').classList.contains('active')")
 r=rect(b,'#close');x=r['x']+r['width']/2;y=r['y']+r['height']/2
 b.call('Input.dispatchMouseEvent',{'type':'mouseMoved','x':x,'y':y});time.sleep(.1)
 b.call('Input.dispatchMouseEvent',{'type':'mousePressed','x':x,'y':y,'button':'left','buttons':1,'clickCount':1});time.sleep(.12)
 b.call('Input.dispatchMouseEvent',{'type':'mouseReleased','x':x,'y':y,'button':'left','buttons':0,'clickCount':1});time.sleep(.5)
 out['closed']=b.evaluate("!document.getElementById('modal').classList.contains('active')")
 out['exceptions']=errors(b)
 if out['closed']:
  b.click('#search');b.call('Input.insertText',{'text':'WASD Space'});out['typed']=b.evaluate("document.getElementById('search').value")
 b.shot('library-followup');print(out,flush=True)
finally:
 (HERE/'library-followup.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
