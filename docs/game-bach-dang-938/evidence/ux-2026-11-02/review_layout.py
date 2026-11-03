"""Real setup/start/map/pause interactions at five emulated sizes."""
from review_common import *
import traceback

write('runtime-hashes-before.json', fingerprints())
b = Browser()
reports = []
try:
    for w,h in [(1365,900),(360,800),(390,844),(430,932),(844,390)]:
        item={'size':[w,h]};reports.append(item)
        name=f'{w}x{h}'
        try:
            b.navigate('game-bach-dang-938/index.html',w,h)
            item['setup']=layout(b);item['beforeStart']=state(b)
            b.shot(name+'-setup')
            b.click('[data-hero="H03"]')
            item['selection']=b.evaluate("document.getElementById('bd938-selected').innerText")
            b.click('#bd938-next');wait(b,"!document.getElementById('bd938-quality').hidden")
            b.click('[data-quality="economy"]')
            item['graphics']=layout(b);b.shot(name+'-graphics')
            b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",30)
            item['briefing']=layout(b);b.shot(name+'-briefing')
            b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>10')
            item['playing']=layout(b);item['statePlaying']=state(b);b.shot(name+'-playing')
            b.click('#bd938-systems summary')
            item['systems']=layout(b);b.shot(name+'-systems')
            b.click('#bd938-systems summary')
            b.click('.bd938-actor-tools [data-combat-action="map"]')
            item['map']=layout(b);item['mapStateBefore']=state(b)
            time.sleep(.4);item['mapStateAfter']=state(b);b.shot(name+'-map')
            b.click('#bd938-map [data-combat-action="map"]')
            b.click('#bd938-pause')
            item['pause']=layout(b);b.shot(name+'-pause')
            before=state(b);time.sleep(.4);after=state(b)
            item['pauseTick']=[before['session']['tick'],after['session']['tick']]
            b.click('[data-dialog-action="0"]');ws(b,"s.state==='RUNNING'")
            b.click('#bd938-finish');item['result']=layout(b);b.shot(name+'-result')
            b.click('[data-dialog-action="0"]');ws(b,"s.state==='BRIEFING'")
            item['replay']=state(b)
            b.click('[data-dialog-action="0"]');ws(b,"s.state==='RUNNING'")
            b.click('#bd938-pause');b.click('[data-dialog-action="2"]')
            item['disposed']=state(b);item['errors']=errors(b)
            print('DONE '+name,flush=True)
        except Exception as exc:
            item['failure']={'error':str(exc),'traceback':traceback.format_exc()}
            item['onFailure']=layout(b);item['errors']=errors(b)
            b.shot(name+'-failure')
            print('FAIL '+name+' '+str(exc)[:250],flush=True)
        write('layout-observations.json',{'browser':b.version,'emulated':True,'physicalDevice':False,'reports':reports})
finally:
    b.close()
