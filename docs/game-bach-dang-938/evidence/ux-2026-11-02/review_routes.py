"""Actual click routes after exiting new game, isolated guest only."""
from review_common import *
import traceback

b=Browser();reports=[]

def record(name,fn):
    item={'name':name};reports.append(item)
    try:
        fn(item);item['exceptions']=errors(b);print('DONE '+name,flush=True)
    except Exception as exc:
        item['failure']={'error':str(exc),'traceback':traceback.format_exc()}
        item['snapshot']=b.snapshot();b.shot(name+'-failure');print('FAIL '+name+' '+str(exc)[:200],flush=True)
    write('routes-observations.json',{'browser':b.version,'productionBackendBlocked':True,'reports':reports})

def home(w,h):
    b.navigate('trang-chinh.html',w,h)

def atHome():
    wait(b,"location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'",30)
    time.sleep(.5)

try:
    for w,h in [(1365,900),(390,844)]:
        def newgame(item):
            home(w,h)
            item['links']=b.evaluate("[...document.querySelectorAll('.card--sa-ban a')].map(e=>({text:e.innerText,href:e.getAttribute('href')}))")
            item['initialNewResources']=b.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/game-bach-dang-938/')).map(e=>e.name)")
            b.click('.card--sa-ban a[href="game-bach-dang-938/index.html"]')
            wait(b,"location.pathname.includes('/game-bach-dang-938/')&&document.readyState==='complete'")
            item['entered']=state(b)
            b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",30)
            b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>5')
            b.click('#bd938-finish');b.click('[data-dialog-action="2"]');atHome()
            item['returned']=b.evaluate("({url:location.href,gameGlobals:typeof window.GameSession,newResources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/game-bach-dang-938/')).map(e=>e.name)})")
            b.shot(f'route-home-after-new-{w}')
        record(f'new-roundtrip-{w}',newgame)

        def old2d(item):
            if not b.evaluate("location.pathname.endsWith('/trang-chinh.html')"):home(w,h)
            b.click('.card--sa-ban a[href="sa-ban.html"]')
            wait(b,"location.pathname.endsWith('/sa-ban.html')&&document.readyState==='complete'&&!!window.HistoryGame",30)
            item['lobby']=b.snapshot()
            b.click('button[onclick="vaoThangSaBanChienDau()"]');time.sleep(.6)
            item['battle']=b.evaluate("({stage:currentStageId,act:gameState.hoiHienTai,title:document.getElementById('hud-game-title').innerText,frames:HistoryGame.snapshot().renderedFrames})")
            b.click('#hg-pause');item['paused']=b.evaluate('HistoryGame.snapshot().paused');b.shot(f'legacy-2d-{w}')
            b.click('#hg-pause');b.click('button[onclick="quayVeLobby()"]')
            item['returnedLobby']=b.evaluate("getComputedStyle(document.getElementById('lobby-screen')).display!=='none'")
            b.click('a.btn-nav-back[href="trang-chinh.html"]');atHome()
        record(f'old-2d-after-new-{w}',old2d)

        def old3d(item):
            if not b.evaluate("location.pathname.endsWith('/trang-chinh.html')"):home(w,h)
            b.click('.card--sa-ban a[href="sa-ban-3d.html"]')
            wait(b,"location.pathname.endsWith('/sa-ban-3d.html')&&document.readyState==='complete'&&typeof Game3D!=='undefined'&&!!Game3D.renderer",45)
            item['lobby']=b.snapshot()
            b.click('#lobby-3d-modal .btn-enter-campaign')
            wait(b,"getComputedStyle(document.getElementById('lobby-3d-modal')).visibility==='hidden'")
            b.click('#btn-call-battle');b.click('.battle-guide-continue');wait(b,'Game3D.bachDang.active')
            time.sleep(.5);item['battle']=b.evaluate("({active:Game3D.bachDang.active,campaign:Game3D.currentCampaign,fleet:Game3D.baitFleet.length,enemies:Game3D.danhSachTauDich.length,renderCalls:Game3D.renderer.info.render.calls})")
            b.click('#hg-pause');item['paused']=b.evaluate('HistoryGame.snapshot().paused');b.shot(f'legacy-3d-{w}')
            b.click('a[href="trang-chinh.html"]');atHome()
        record(f'old-3d-after-new-{w}',old3d)

        def exam(item):
            if not b.evaluate("location.pathname.endsWith('/trang-chinh.html')"):home(w,h)
            b.click('a.card__btn[href="thao-truong.html"]')
            wait(b,"location.pathname.endsWith('/thao-truong.html')&&document.readyState==='complete'&&typeof EXAMS_DATA!=='undefined'",30)
            b.click('#btn-mode-catalog');item['catalogCount']=b.evaluate('EXAMS_DATA.length')
            b.click('button[onclick^="startExam("][onclick*="standard"]')
            item['initial']=b.evaluate("({id:currentExam.id,p1:currentExam.part1.length,p2:currentExam.part2.length,options:document.querySelectorAll('#q-card-p1-0 .opt-card').length,timer:timerSeconds})")
            b.click('#opt-card-0-0');item['selected']=b.evaluate('userAnswersP1[0]===0')
            item['newGameResources']=b.evaluate("performance.getEntriesByType('resource').filter(e=>e.name.includes('/game-bach-dang-938/')).map(e=>e.name)")
            b.shot(f'exam-answer-after-new-{w}')
            b.click('#btn-mobile-submit' if w<760 else '#btn-sidebar-submit');b.click('#btn-modal-confirm')
            item['submitted']=b.evaluate("({submitted:isSubmitted,score:document.getElementById('res-score').innerText,result:getComputedStyle(document.getElementById('result-summary-box')).display!=='none'})")
            b.shot(f'exam-result-after-new-{w}')
            b.click('#btn-retake-exam');item['retake']=b.evaluate("({submitted:isSubmitted,answer:userAnswersP1[0]})")
        record(f'exam-after-new-{w}',exam)

    def library(item):
        home(1365,900);b.click('a.card__btn[href="tang-thu-cac.html"]')
        wait(b,"location.pathname.endsWith('/tang-thu-cac.html')&&document.readyState==='complete'")
        item['inputs']=b.snapshot()['actions']
        b.click('[data-grade="12"]');b.click('.topic.open .study')
        item['lesson']=b.evaluate("({title:currentLesson.title,open:document.getElementById('modal').classList.contains('active')})")
        b.click('#close')
        field=b.evaluate("[...document.querySelectorAll('input')].find(e=>e.type==='search'||e.type==='text')?.id")
        if field:
            b.click('#'+field);b.call('Input.insertText',{'text':'WASD Space'})
            item['typed']=b.evaluate('document.getElementById('+json.dumps(field)+').value')
        b.shot('library-after-new')
    record('library-and-text-input-after-new',library)
finally:
    b.close()
