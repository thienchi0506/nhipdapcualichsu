"""Exercise existing local UI in a temporary browser profile; no app source edits."""
import json
import time
import argparse
from audit_capture import Browser, OUT, write


def main(only=None):
    b = Browser()
    reports = []

    def wait(expression, seconds=12):
        deadline = time.time() + seconds
        while time.time() < deadline:
            try:
                if b.evaluate(expression):
                    return
            except Exception:
                pass
            time.sleep(.1)
        raise TimeoutError(expression)

    def record(name, data, shot=True):
        reports.append({'name': name, 'data': data, 'events': list(b.events), 'responses': list(b.responses)})
        if shot:
            b.shot(name)
        print(name, json.dumps(data, ensure_ascii=False)[:500], flush=True)

    def scenario(name, action):
        if only and not name.startswith(only):
            return
        try:
            action()
        except Exception as exc:
            record(name + '-harness-or-flow-error', {'error': str(exc), 'snapshot': b.snapshot()})

    try:
        for width, height in [(1365, 900), (390, 844)]:
            suffix = '-' + str(width)

            def landing():
                b.navigate('index.html', width, height)
                b.click('#btn-start')
                wait("location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'", 20)
                entered = b.evaluate('location.pathname')
                b.click('.sub-navbar__link[onclick^="veTrangChu"]')
                wait("location.pathname.endsWith('/index.html')&&document.readyState==='complete'")
                record('landing-navigation' + suffix, {'entered': entered, 'returned': b.evaluate('location.pathname')})

            scenario('landing-navigation' + suffix, landing)

            def home_modals():
                b.navigate('trang-chinh.html', width, height)
                links = b.evaluate("[...document.querySelectorAll('.card--sa-ban a')].map(a=>({text:a.innerText,href:a.getAttribute('href')}))")
                # Menu dropdowns differ on mobile; click the top-level museum link itself.
                b.click('.sub-navbar__link[onclick*="bao-tang"]')
                opened = b.evaluate("({open:document.getElementById('antique-modal-overlay').classList.contains('open'),title:document.getElementById('modal-header-title').innerText,bodyPosition:document.body.style.position})")
                b.click('.antique-modal-close')
                closed = b.evaluate("({open:document.getElementById('antique-modal-overlay').classList.contains('open'),bodyPosition:document.body.style.position})")
                record('home-modal' + suffix, {'legacyLinks': links, 'opened': opened, 'closed': closed})

            scenario('home-modal' + suffix, home_modals)

            def game2d():
                b.navigate('trang-chinh.html', width, height)
                b.click('.card--sa-ban a[href="sa-ban.html"]')
                wait("location.pathname.endsWith('/sa-ban.html')&&document.readyState==='complete'&&!!window.HistoryGame")
                wait("document.getElementById('lobby-screen')!==null")
                b.click('button[onclick="vaoThangSaBanChienDau()"]')
                time.sleep(.6)
                first = b.evaluate("({stage:currentStageId,act:gameState.hoiHienTai,title:document.getElementById('hud-game-title').innerText,lobby:getComputedStyle(document.getElementById('lobby-screen')).display,frames:HistoryGame.snapshot().renderedFrames})")
                b.shot('2d-bachdang-battle' + suffix)
                b.click('#hg-pause')
                paused = b.evaluate('HistoryGame.snapshot().paused')
                b.click('#hg-pause')
                b.click('#hg-open')
                settings = b.evaluate("document.getElementById('hg-settings').open")
                b.click('#hg-settings .hg-close')
                b.click('button[onclick="quayVeLobby()"]')
                returned = b.evaluate("getComputedStyle(document.getElementById('lobby-screen')).display!=='none'")
                b.click('button[onclick="vaoThangSaBanNhuNguyet()"]')
                second = b.evaluate("({stage:currentStageId,act:gameState.hoiHienTai,title:document.getElementById('hud-game-title').innerText})")
                b.click('button[onclick="quayVeLobby()"]')
                b.click('button[onclick="vaoThangSaBanChienDau()"]')
                switchedBack = b.evaluate("({stage:currentStageId,act:gameState.hoiHienTai,title:document.getElementById('hud-game-title').innerText})")
                record('2d-roundtrip' + suffix, {'firstBachDang': first, 'pauseWorks': paused, 'settingsOpen': settings,
                       'returnLobby': returned, 'nhuNguyet': second, 'afterBachDangClickFollowingNhuNguyet': switchedBack,
                       'bachDangSelectionCorrectAfterSwitch': switchedBack['stage'] == 2})
                b.click('#game-stage-wrapper a[href="trang-chinh.html"]')
                wait("location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'")
                record('2d-return-home' + suffix, {'path': b.evaluate('location.pathname')}, False)

            scenario('2d-roundtrip' + suffix, game2d)

            def game3d():
                b.navigate('trang-chinh.html', width, height)
                b.click('.card--sa-ban a[href="sa-ban-3d.html"]')
                wait("location.pathname.endsWith('/sa-ban-3d.html')&&document.readyState==='complete'&&typeof Game3D!=='undefined'&&!!Game3D.renderer")
                b.click('#lobby-3d-modal .btn-enter-campaign')
                wait("getComputedStyle(document.getElementById('lobby-3d-modal')).visibility==='hidden'")
                b.click('#btn-call-battle')
                guide = b.evaluate("document.getElementById('bachdang-guide-overlay').classList.contains('open')")
                b.click('.battle-guide-continue')
                wait('Game3D.bachDang.active')
                time.sleep(.6)
                state = b.evaluate("({active:Game3D.bachDang.active,campaign:Game3D.currentCampaign,phase:Game3D.combatPhase,camera:Game3D.cheDoCamera,fleet:Game3D.baitFleet.length,enemies:Game3D.danhSachTauDich.length,renderCalls:Game3D.renderer.info.render.calls,width:document.documentElement.scrollWidth,abilityLabels:[...document.querySelectorAll('#bachdang-ability-dock .ability-label')].map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText,x:r.x,y:r.y,w:r.width,h:r.height,outsideViewport:r.x<0||r.right>innerWidth||r.y<0||r.bottom>innerHeight}})})")
                b.shot('3d-bachdang-battle' + suffix)
                b.click('#hg-pause')
                paused = b.evaluate('HistoryGame.snapshot().paused')
                b.click('#hg-pause')
                # End-state injection is explicitly an isolated fixture, not a natural-play victory claim.
                b.evaluate("ketThucTranBachDang('win','Trạng thái kết quả phục vụ khảo sát cục bộ');true")
                resultOpen = b.evaluate("document.getElementById('bachdang-outcome-overlay').classList.contains('open')")
                b.shot('3d-result-fixture' + suffix)
                b.click('button[onclick="ketThucTranBachDangVeSaBan()"]')
                wait("!document.getElementById('lobby-3d-modal').classList.contains('hidden')")
                # Observational wrapper counts bubbling handlers; original function still runs.
                b.evaluate("window.__auditNgCalls=0;window.__auditNgOriginal=chuyenSangChienDichNhuNguyet;chuyenSangChienDichNhuNguyet=function(...args){window.__auditNgCalls++;return window.__auditNgOriginal.apply(this,args)};true")
                b.click('#btn-enter-campaign-2')
                wait("getComputedStyle(document.getElementById('lobby-3d-modal')).visibility==='hidden'")
                invocations = b.evaluate('window.__auditNgCalls')
                b.click('#btn-call-battle')
                wait('Game3D.nhuNguyetBattle.active')
                time.sleep(.7)
                nn = b.evaluate("({active:Game3D.nhuNguyetBattle.active,campaign:Game3D.currentCampaign,phase:Game3D.combatPhase,rafts:Game3D.danhSachBeMangTong.length,renderCalls:Game3D.renderer.info.render.calls,width:document.documentElement.scrollWidth})")
                record('3d-roundtrip' + suffix, {'guideOpened': guide, 'bachDang': state, 'pauseWorks': paused,
                       'syntheticWinResultOpened': resultOpen, 'nhuNguyetEntryCallsPerClick': invocations, 'nhuNguyet': nn})

            scenario('3d-roundtrip' + suffix, game3d)

            def replay3d():
                b.navigate('sa-ban-3d.html', width, height)
                wait("typeof Game3D!=='undefined'&&!!Game3D.renderer")
                b.click('#lobby-3d-modal .btn-enter-campaign')
                wait("getComputedStyle(document.getElementById('lobby-3d-modal')).visibility==='hidden'")
                b.click('#btn-call-battle')
                b.click('.battle-guide-continue')
                wait('Game3D.bachDang.active')
                b.evaluate("ketThucTranBachDang('win','Fixture khảo sát nút chơi lại');true")
                rect = b.click('#bachdang-outcome-overlay button[onclick="choiLaiChienDich3D()"]')
                wait("location.search.includes('campaign=1')&&document.readyState==='complete'&&typeof Game3D!=='undefined'&&!!Game3D.renderer")
                wait("document.getElementById('lobby-3d-modal').classList.contains('hidden')")
                record('3d-replay' + suffix, {'fixture': 'Victory injected through existing result function; replay clicked with mouse hit-test',
                       'button': rect, 'afterReload': b.evaluate("({search:location.search,campaign:Game3D.currentCampaign,phase:Game3D.combatPhase,bodyClass:document.body.className,renderCalls:Game3D.renderer.info.render.calls})")})

            scenario('3d-replay' + suffix, replay3d)

            def library():
                b.navigate('trang-chinh.html', width, height)
                b.click('a.card__btn[href="tang-thu-cac.html"]')
                wait("location.pathname.endsWith('/tang-thu-cac.html')&&document.readyState==='complete'")
                counts = b.evaluate("[...document.querySelectorAll('[data-grade]')].map(e=>({grade:e.dataset.grade,label:e.innerText}))")
                b.click('[data-grade="12"]')
                b.click('.topic.open .study')
                lesson = b.evaluate("({id:currentLesson.id,title:currentLesson.title,open:document.getElementById('modal').classList.contains('active'),flashcards:document.getElementById('flashcards-grid').children.length})")
                before = b.evaluate("getCompleted().includes(currentLesson.id)")
                b.click('#mark-done')
                after = b.evaluate("getCompleted().includes(currentLesson.id)")
                b.shot('library-lesson' + suffix)
                b.click('#close')
                closed = b.evaluate("!document.getElementById('modal').classList.contains('active')")
                b.click('#search')
                b.call('Input.insertText', {'text': 'ASEAN'})
                searched = b.evaluate("({query:document.getElementById('search').value,matches:document.querySelectorAll('.lesson').length,title:document.getElementById('view-title').innerText})")
                record('library-flow' + suffix, {'grades': counts, 'lesson': lesson, 'doneBefore': before, 'doneAfter': after, 'closed': closed, 'search': searched})

            scenario('library-flow' + suffix, library)

            def exam():
                b.navigate('trang-chinh.html', width, height)
                b.click('a.card__btn[href="thao-truong.html"]')
                wait("location.pathname.endsWith('/thao-truong.html')&&document.readyState==='complete'&&typeof EXAMS_DATA!=='undefined'")
                b.click('#btn-mode-catalog')
                count = b.evaluate('EXAMS_DATA.length')
                b.click('button[onclick^="startExam("][onclick*="standard"]')
                initial = b.evaluate("({id:currentExam.id,p1:currentExam.part1.length,p2:currentExam.part2.length,submitted:isSubmitted,options:document.querySelectorAll('#q-card-p1-0 .opt-card').length,timer:timerSeconds})")
                b.click('#opt-card-0-0')
                answered = b.evaluate('userAnswersP1[0]===0')
                # The form has a desktop sidebar submit handler and a visible mobile shortcut.
                submitSelector = '#btn-mobile-submit' if width < 760 else '#btn-sidebar-submit'
                b.click(submitSelector)
                confirm = b.evaluate("document.getElementById('confirm-modal').classList.contains('active')")
                b.click('#btn-modal-confirm')
                result = b.evaluate("({submitted:isSubmitted,resultVisible:getComputedStyle(document.getElementById('result-summary-box')).display!=='none',score:document.getElementById('res-score').innerText,keys:Object.keys(localStorage).filter(k=>k.startsWith('thao_truong')||k.startsWith('dcls_'))})")
                b.shot('exam-result' + suffix)
                b.click('#btn-retake-exam')
                retake = b.evaluate("({submitted:isSubmitted,p1:currentExam.part1.length,p2:currentExam.part2.length,answer:userAnswersP1[0],resultVisible:getComputedStyle(document.getElementById('result-summary-box')).display!=='none'})")
                record('exam-flow' + suffix, {'catalogCount': count, 'initial': initial, 'answerSelected': answered, 'confirmationOpened': confirm, 'result': result, 'retake': retake})

            scenario('exam-flow' + suffix, exam)

            def music():
                def state():
                    return b.evaluate("({preference:JSON.parse(sessionStorage.getItem('dcls.music.session.v1')||'{}').enabled||false,audio:[...document.querySelectorAll('audio')].map(e=>({id:e.id,paused:e.paused,time:Math.round(e.currentTime*10)/10,ready:e.readyState,src:(e.currentSrc||e.src||'').split('/').pop()}))})")
                b.navigate('trang-chinh.html', width, height)
                if state()['preference']:
                    b.click('#btn-toggle-music')
                    time.sleep(.2)
                initial = state()
                b.click('#btn-toggle-music')
                time.sleep(.8)
                enabled = state()
                b.click('.card--sa-ban a[href="sa-ban.html"]')
                wait("location.pathname.endsWith('/sa-ban.html')&&document.readyState==='complete'")
                time.sleep(.6)
                game = state()
                b.click('a.btn-nav-back[href="trang-chinh.html"]')
                wait("location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'")
                b.click('a.card__btn[href="thao-truong.html"]')
                wait("location.pathname.endsWith('/thao-truong.html')&&document.readyState==='complete'")
                b.click('#btn-mode-catalog')
                b.click('button[onclick^="startExam("][onclick*="standard"]')
                room = state()
                b.click('#btn-mobile-submit' if width < 760 else '#btn-sidebar-submit')
                b.click('#btn-modal-confirm')
                b.click('#btn-back-to-catalog')
                time.sleep(.7)
                exited = state()
                record('music-flow' + suffix, {'beforeInteraction': initial, 'afterEnableClick': enabled,
                       'afterNavigationTo2d': game, 'insideExam': room, 'afterLeavingExam': exited})

            scenario('music-flow' + suffix, music)

            def auth_ui():
                b.navigate('dang-nhap.html', width, height)
                initialized = b.evaluate("({handler:typeof window.xuLyDangNhap,googleHandler:typeof window.dangNhapGoogle,loginValid:document.getElementById('form-dang-nhap').checkValidity(),uidKeyExists:localStorage.getItem('uidNguoiDung')!==null})")
                b.click('button[onclick*="chuyenTab"][onclick*="dang-ky"]')
                registration = b.evaluate("document.getElementById('tab-dang-ky').classList.contains('active')")
                b.click('button[onclick*="chuyenTab"][onclick*="dang-nhap"]')
                record('auth-ui' + suffix, {'initial': initialized, 'registrationTabOpened': registration,
                       'backendAttempted': False, 'reason': 'No credentials; production Auth/Firestore requests intentionally blocked.'})

            scenario('auth-ui' + suffix, auth_ui)
        write('browser-flows' + ('-' + only if only else '') + '.json', {'browser': b.version, 'remoteServicesBlocked': True, 'reports': reports})
    finally:
        b.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--only')
    main(parser.parse_args().only)
