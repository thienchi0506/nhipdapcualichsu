# Kiến trúc game mới — bản thiết kế 0.2

Ngày: 01/11/2026. **Đã thiết kế, chưa triển khai hoặc chạy thử game mới.** Thay kiến trúc sơ bộ 0.1 (đã lưu trong evidence). Đầu vào: quy định người dùng, [khảo sát thực tế](survey.md), [lỗi nền](preexisting-issues.md). Không áp dụng lại luật của game cũ.

**Cập nhật 02/11/2026:** trạng thái “chưa triển khai” và các route dự kiến bên dưới là mốc tại ngày thiết kế. Khung route/camera/input hiện đã được triển khai theo [bàn giao chặng 2](shell-handoff.md); core chiến dịch/AI/journal chưa triển khai. Giữ tài liệu này làm đặc tả mục tiêu.

## 1. Quyết định tích hợp

| Phương án | CSS/JS và tài nguyên | Auth, điều hướng, hiệu năng | Kết luận |
|---|---|---|---|
| Mô-đun gắn vào trang chính | ES modules cô lập biến nhưng vẫn chung DOM, CSS, listener, WebGL và nhạc; cần modal/teardown phức tạp. | Tên cache không chứng minh Auth; trang chính vốn nặng, dễ giữ hai scene. | Không chọn. |
| **Trang riêng, nội bộ ES modules** | Document riêng, dependency và vòng đời riêng, chỉ tải khi vào route. | Khôi phục Auth cùng origin; điều hướng giống game cũ; trang chính chỉ thêm link. | **Chọn: ít điểm chạm nhất, dễ kiểm tra/gỡ riêng.** |
| iframe trong trang chính | Cô lập DOM/CSS nhưng same-origin không cô lập dữ liệu; giữ cả trang cha trong bộ nhớ. | Cần postMessage, focus, resize, fullscreen, âm thanh và thoát; Auth không đơn giản hơn. | Không cần nếu không bắt buộc chơi nhúng. |

Route dự kiến `game-bach-dang-938/index.html`, **chưa được tạo**. Chặng tích hợp chỉ thêm một link tại `.card--sa-ban`, `trang-chinh.html:5003`, cạnh hai link dòng 5017–5022. Giữ nguyên href/onclick/hash/query/menu/footer/game cũ. Không dùng tên `tran-do-nhap-vai.html` đã tồn tại.

- Link tương đối `game-bach-dang-938/index.html`, nút về `../trang-chinh.html`; không hard-code `/` vì GitHub Pages dùng đường dẫn repository. Không chỉ dựa vào `history.back()`.
- Trang chính không preload/prefetch, import, tạo loop hoặc audio mới. Route mới tải shell trước, tải engine/chương khi chọn chương. Không thêm service worker toàn origin.
- Root `#bd938-root`, CSS `.bd938-*`, ID/keyframe có prefix, biến CSS đặt trên root; body riêng mang class `bd938-page`. ES modules không export ra `window`.
- Không import runtime, upgrades, global hoặc nhạc của game cũ. Mỗi resource/session có chủ sở hữu và teardown.
- Không sửa Auth, Rules, đề, kiến thức, cộng đồng hay phát hành. B01–B06 giữ trong danh sách lỗi nền, không gộp sửa ngầm.

## 2. Công nghệ và cấu trúc dự kiến

Giữ HTML/CSS/JavaScript tĩnh, native ES modules, chưa cần build/npm/framework. Dùng Three.js làm renderer; không đổi engine vì mới hơn. **Ứng viên pin cho chương mẫu: Three.js 0.128.0 ES module đóng gói riêng**, cùng thế hệ hiện có. Bản r128 có `build/three.module.js` trong [package chính thức](https://raw.githubusercontent.com/mrdoob/three.js/r128/package.json). Chặng vỏ xác minh license/hash/WebGL/loader trước khi đưa thư viện vào repo. Nếu có lý do đổi bản, ghi quyết định riêng; không thay thư viện cũ.

Chưa thêm physics engine: thuyền 2.5D, capsule nhân vật, swept collision cho đạn; renderer không quyết định sát thương. GLTFLoader phải cùng tag với renderer. Hình học placeholder dành cho thử nền tảng, không được báo là mỹ thuật hoàn tất.

```text
game-bach-dang-938/                 # DỰ KIẾN, chưa tạo
  index.html, styles/game.css
  vendor/three-r128/                # pin + LICENSE + hash
  assets/{models,textures,audio,ui}/
  data/{gameplay,chapters,rosters,assets}/
  src/
    app/{bootstrap,lifecycle,input,auth-adapter}.js
    core/{clock,commands,events,state,rng}.js
    sim/{river,movement,collision,characters,combat,ai,logistics,objectives}.js
    presentation/{renderer,camera,ui,audio,effects}.js
    persistence/{repository,journal,migrations,cloud-adapter}.js
  tests/{runner.html,fixtures,replays}/
```

Đây là ranh giới trách nhiệm, chưa bắt buộc mỗi tên thành một tệp. Core không import Three, DOM, Firebase. Có thể kiểm tra module thuần qua trang test, Python/CDP và Chrome sẵn có. [gameplay-defaults.json](gameplay-defaults.json) là nguồn tham số **thiết kế**; khi lập trình đưa vào một nguồn thực thi, không duy trì hai bản số độc lập.

## 3. Vòng đời ứng dụng

| Trạng thái | Hành vi và điều kiện chuyển |
|---|---|
| `SHELL` | Chọn nhân vật/chương/đồ họa/save, Auth hoặc khách; chưa simulation. Chọn bắt đầu/tiếp tục → `LOAD`. |
| `LOAD` | Đọc/validate save, khóa writer, tải asset bắt buộc; có tiến độ/hủy. Đủ → `BRIEFING`; lỗi → `ERROR`; hủy → `SHELL`. |
| `BRIEFING` | Hướng dẫn, mục tiêu, âm thanh, đội hình. Chỉ sau người chơi xác nhận và lưu giao dịch xuất quân mới sang `RUNNING`. |
| `RUNNING` | Tick, AI, input, UI/audio. Có thể → `PAUSED`, `RESOLVING`, `EXITING`, `ERROR`. Bản đồ chỉ đổi UI mode. |
| `PAUSED` | Scene đứng yên, có menu/settings/lưu/xuất save. Chỉ resume khi hết lý do hệ thống và người chơi bấm tiếp tục. Reset accumulator giờ thực. |
| `RESOLVING` | Khóa combat input; commit kết quả/hậu quả đúng một lần. Lưu thành công → `RESULTS`; lỗi không được phát thưởng lại. |
| `RESULTS` | Hiện quân mất/cứu, đồ thu hồi, mục tiêu/hậu chiến. Về trại, tải lại chặng theo luật giữ mất mát hoặc thoát. |
| `EXITING` | Khóa input, flush save, dispose rồi điều hướng. Lưu lỗi thì hiện lựa chọn xử lý/xuất bản gần nhất, không ghi đè im lặng. |
| `ERROR` | Mã lỗi, retry/hạ đồ họa/xuất save/về trang chính. Retry không tạo loop thứ hai. |
| `DISPOSED` | Không tick/audio/fetch/listener của phiên. Mở lại cần session mới. |

`pauseReasons` là tập (`user`, `hidden`, `focusLost`, `contextLost`, `saveFailure`, `accountChanged`, `writerLost`), không boolean bị ghi đè. Popup xác nhận thoát thêm `user`; resume không xóa lý do hệ thống. `blur`/ẩn tab tự pause. `pageshow` từ bfcache khôi phục shell chờ người chơi, không tự chiến đấu/phát tiếng.

Teardown idempotent: abort fetch/listener, cancel RAF/timer/observer/Auth subscription, nhả pointer lock/capture, reset phím giữ, dừng audio/narration, dispose geometry/material/texture/render targets riêng, hủy pool/worker nếu có, đóng writer lease. `pagehide` teardown đồng bộ; không dựa vào async unload save để bảo toàn mất mát.

## 4. Bản đồ đang chạy khác với menu tạm dừng

| Tình huống | Trận và thuyền | Điều khiển |
|---|---|---|
| Bản đồ chiến thuật | Sim/AI/triều/đạn vẫn chạy; nhãn **“Trận vẫn tiếp diễn”** và cảnh báo. Thuyền đang lái chốt hướng + mức ga, chỉ tự bắn trả; được giảm ga khi sắp mắc cạn, không tự truy đuổi. Người trên bộ giữ chỗ/tự vệ. | Drag/zoom/select/order; không gửi WASD sang nhân vật. Đóng map xóa phím giữ rồi trả điều khiển. |
| Nhân vật rời thuyền | Phó tướng giữ vị trí bằng chèo trong giới hạn lực/dòng chảy; tự bắn trả và nhận lệnh. Không đóng băng vị trí phi vật lý. | Người chơi điều khiển người trên bờ/boong; có lệnh gọi thuyền. |
| Menu pause | Tick, AI, triều, đạn, cooldown, cứu thương, deadline đều dừng. Map dưới lớp pause cũng đứng. | Chỉ menu; từ chối combat commands thay vì xếp hàng chờ resume. |

## 5. Phân hệ và quyền sở hữu

| Hệ thống | Sở hữu/ghi | Đầu vào → đầu ra |
|---|---|---|
| App/lifecycle | Session, pause reasons, tải/hủy, writer | Ý định UI → chuyển trạng thái/command |
| Coordinator | WorldState, tick, thứ tự hệ thống | Commands/config/RNG → state kế và events |
| Sông/địa hình | Water level, current, depthfield | Tide curve/bed → độ sâu/lực |
| Di chuyển/va chạm | Pose/velocity/attachment | Lệnh → vị trí/contact; không phát thưởng |
| Nhân vật | Sức bền, hành động, vết thương, control owner | Damage/contact → downed/takeover |
| Chiến đấu | Đạn thật, hit, damage bộ phận, cháy | Fire/melee → thương/tử trận intents |
| AI/chỉ huy | Orders, blackboard, known intel, đường đi/morale | Sensing/mục tiêu/ngưỡng mất → cùng Command API của người chơi |
| Hậu cần | Kho/cargo/job sửa/cứu/xây/tuyến tiếp tế | Inventory transfers/lao động → vật tư/trạng thái qua ledger |
| Campaign/objectives | Phase, flags, hậu quả, entitlement | Committed events → phase/result/progression |
| Render/camera/effects | Camera, scene, LOD, particle pool | Read-only snapshot/events → hình ảnh; không sửa gameplay |
| UI/input | Focus, touch, view model | Intent → command; UI dirty flags, không DOM mỗi quân/tick |
| Audio | Mix, consent, voices | Events → phát/dừng/duck; không quyết định sát thương |
| Persistence | Revision, journal, checkpoint, scope/outbox | Commit batch → receipt/lỗi; không gọi renderer |

Không bus global hay sửa chéo object. Coordinator áp dụng patch đúng vùng quyền ghi, kiểm tra invariant rồi công bố snapshot. API cụ thể: [system-contracts.md](system-contracts.md).

## 6. Tọa độ, thời gian và tái hiện

- Mét, giây, kg, radian; hệ tay phải, `+Y` lên, mặt phẳng `XZ`, `+X` đông bản đồ tái dựng, `-Z` bắc, hướng chuẩn thuyền `-Z`. Gốc tại bến xuất quân; không phải tọa độ địa lý đã xác minh năm 938.
- World pose tách boat-local pose. Quân trên boong dùng `parentBoatId + localPose`; chuyển boong/bờ/nước qua một attachment event, không cộng vận tốc thuyền hai lần. Picking theo cùng transform; pixel không vào sim.
- Bed/cọc cùng datum `Y=0`. `depth=max(0,waterY-bedY)`, `keelY=waterY-draft`; draft theo tải và thân tàu. Chạm cọc khi swept hull giao cọc và keel tới tip elevation. Cọc có thể chạm đáy tàu khi còn chìm; không gây damage tự động cho mọi thuyền lúc triều xuống.
- Fixed sim 30 Hz, render nội suy; AI chiến thuật 2 Hz, sensing 5 Hz, path planning 2 Hz, steering/contact 30 Hz, stagger theo stable ID. Các số nằm trong cấu hình tập trung.
- Thứ tự tick: commands → sensing đến hạn → AI/orders → river → movement → swept collision → combat/fire → wounds/logistics → objectives → invariant/commit staging → view. Cộng simultaneous hits trước xử lý gục, tie theo ID.
- Không dùng `Math.random`, `Date.now`, audio time hay render delta trong core. RNG seeded, stream riêng combat/AI/weather/spawn và state được lưu. Replay gồm commands tick/seq, config/content/sim version và hash.
- Catch-up tối đa 4 tick/frame; không bỏ tick hoặc bù thời gian ẩn tab. Nếu quá tải kéo dài, báo mô phỏng chậm theo giờ thực và đề nghị hạ đồ họa. Không đổi combat timestep để che quá tải.
- Tái hiện chính xác trước hết trên cùng simVersion/config/runtime. Không hứa bit-identical mọi JS engine: dùng epsilon/quantization tập trung, sort ổn định; cross-browser so tọa độ theo dung sai và bắt buộc hậu quả/event giống nhau. Event khác thì chưa đạt gate.

## 7. Auth, âm thanh và lưu

Auth adapter dùng SDK/cấu hình Web hiện hữu, cùng default app/cùng origin; **không tin `uidNguoiDung` hay tên cache**. SDK 10.12.2 là ứng viên khớp hiện trạng, không nâng ngầm. Persistence phải tương thích trang đăng nhập; tham chiếu [Firebase Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence).

Auth nạp song song shell, có timeout UI/chơi khách; chưa biết phiên khác với đã đăng xuất. UID đổi: pause, khóa scope cũ, hủy cloud request thế hệ cũ, về menu; không gán save A cho B. Link đăng nhập `../dang-nhap.html` giữ hành vi về trang chính hiện tại; người dùng mở lại game, không sửa return URL ngoài phạm vi.

Local save riêng là điều kiện chương mẫu; cloud adapter **tắt mặc định**, chỉ bật sau Rules emulator và chặng triển khai riêng. Namespace `dcls.bd938`, schema/slot/UID riêng; guest có scope riêng, nhập vào tài khoản cần thao tác rõ ràng, không tự merge. Xem [save-and-recovery.md](save-and-recovery.md).

Route mới không nạp `site-music.js` vì script hiện hữu có URL nhạc tương đối/global listener. Điều hướng làm nhạc trang cũ dừng qua pagehide, giữ lựa chọn cũ. Audio game có consent riêng; mặc định tắt nhạc/giọng, SFX bật bằng lựa chọn ở briefing. Narration tạm hạ/tắt music bus, không thay consent. Pause/hidden/exit dừng tiếng; resume chỉ khi được cho phép. Về trang chính để script cũ khôi phục nhạc theo lựa chọn cũ. Không ghi khóa nhạc cũ từ game mới.

## 8. Trình tự triển khai sau thiết kế

1. Vỏ cô lập, link mới, scene thử; kiểm tra request, teardown, Back/bfcache, lỗi tải, Auth mock/account scope.
2. Core deterministic và journal **trước combat gây tổn thất**; test replay/restart/tiêu hao/crash/writer.
3. Chương mẫu theo [chapter-sample.md](chapter-sample.md), sông/thuyền, nhập vai/AI/hậu cần theo lớp; chơi tự nhiên, không dùng fixture thắng thay bằng chứng hoàn thành.
4. Đo quân số/mỹ thuật theo [performance-and-art.md](performance-and-art.md); hồi quy [regression-checklist.md](regression-checklist.md).

Chốt ở cấp thiết kế: trang riêng, ES modules, local AI, sim một writer, journal hậu quả, cloud off. Tham số cân bằng/đồ họa là **đề xuất cần playtest**, không phải dữ kiện lịch sử/benchmark. Chặng này dừng ở tài liệu.
