"""Follow-up for physical-duration key presses (120ms), not zero-duration taps."""
from review_common import *
import traceback
b=Browser();out={'steps':[]}

def save(label):
    s=state(b);out['steps'].append({'name':label,'state':s,'layout':layout(b)})
    write('combat-observations.json',out);print(label,flush=True)

try:
    start(b)
    b.click('[data-combat-action="lock"]');b.click('[data-combat-action="weapon"]');b.click('#bd938-camera')
    b.click('#bd938-canvas');key(b,'KeyJ','j','keyDown');time.sleep(.12);key(b,'KeyJ','j','keyUp')
    ws(b,'(s.session.combat.eventCounts.ArrowHit||0)>0',8)
    save('arrow-hit');b.shot('combat-arrow-hit')
    start(b)
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'s.session.river.z<23')
    press(b,'KeyM','m');ws(b,'s.session.combat.mapOpen');key(b,'KeyW','w','keyUp')
    save('map-underway-before');time.sleep(.8);save('map-underway-after');b.shot('combat-map-live')
    b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'s.session.river.z<19.5');key(b,'KeyW','w','keyUp');press(b,'Space',' ')
    ws(b,'s.session.river.readings.speedMps<.25',8)
    b.click('#bd938-camera');b.click('[data-combat-action="interact"]');ws(b,'!s.session.combat.helm')
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'a.attachment?.localZ < -2.65',6);key(b,'KeyW','w','keyUp')
    save('at-bow-before-jump')
    b.click('[data-combat-action="board"]');ws(b,"a.attachment?.boatId==='enemy-boat'",6)
    b.click('[data-combat-action="lock"]');b.click('#bd938-canvas')
    key(b,'KeyJ','j','keyDown');time.sleep(.12);key(b,'KeyJ','j','keyUp')
    ws(b,'(s.session.combat.eventCounts.MeleeResolved||0)>0',5)
    save('melee-on-enemy-deck');b.shot('combat-melee-on-deck')
    ws(b,"s.session.combat.controlledId==='R01'",40)
    save('reserve-takes-over');b.shot('combat-reserve-takes-over')
    b.click('#bd938-pause')
    out['completed']=True
except Exception as exc:
    out['failure']={'error':str(exc),'traceback':traceback.format_exc()}
    save('failure');b.shot('combat-followup-failure');print(str(exc),flush=True)
finally:
    out['browser']=b.version;out['exceptions']=errors(b);write('combat-observations.json',out);b.close()
