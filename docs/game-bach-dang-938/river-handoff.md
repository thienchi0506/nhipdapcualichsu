# Bàn giao lớp mô phỏng sông nước

Ngày 02/11/2026 · triển khai cục bộ trên game mới, chưa phát hành. Chi tiết công thức, đơn vị và mức xấp xỉ ở [river-model.md](river-model.md).

## Đã triển khai

- Thay di chuyển tức thời bằng gia tốc, phanh/lùi, quán tính quay, cản dọc/ngang và trôi theo trường dòng. Tải và tình trạng mái chèo/bánh lái/dây giằng tác động lực đẩy/khả năng quay/cản.
- Hai lớp thuyền có mớn theo tải/quân/nước rò; kiểm tra độ sâu quanh thân, bãi cạn/bờ và mắc cạn. Cùng config đáy/cọc được dùng cho tính toán và render.
- Mực nước theo sim clock và đường triều của thiết kế; cọc kiểm tra cao độ keel/tip, kể cả khi thuyền không chạy hoặc cọc còn ngập.
- Sweep thân qua quãng đường, chia nhỏ chuyển động góc/tịnh tiến, contact episode có hysteresis; không trừ lại damage cọc theo từng frame. Có tiếp xúc mới hợp lệ sau khi nổi ra rồi mắc lại.
- Hư hại bộ phận, rò tăng tải/mớn, bơm, giảm cargo, neo giữ dòng, gỡ bằng công việc/kéo có giới hạn, sửa từng bộ phận tại bến có thời gian và trừ gỗ một lần.
- HUD triều/độ sâu/mớn/tốc độ/dòng/độ hở đáy; cảnh báo chữ; panel xem bộ phận/vật tư và thao tác cảm ứng/phím. Các số UI cập nhật 10Hz, sim 30Hz.
- Năm tình huống chọn được trước khi vào: tự khám phá; thuyền nhẹ/nặng qua vùng cạn; nước rút tại bãi cọc; tiếp cận cọc nước thấp; mất lái tại bến.

## Cách tự kiểm tra

Mở game từ thẻ Sa Bàn như chặng trước. Ở màn nhân vật chọn **Thuyền thử** và **Tình huống tái hiện**, tiếp tục chọn đồ họa rồi mở bến.

| Tình huống | Thao tác | Điều cần quan sát |
|---|---|---|
| Qua vùng cạn | Thử cùng đường bằng thuyền nhẹ rồi vận tải, giữ W/▲. | Nhẹ qua được; thuyền vận tải dừng trước bãi, độ hở giảm, cảnh báo mắc cạn. Có thể gỡ lùi về nước sâu/đổi đường. |
| Nước rút tại bãi cọc | Thuyền nhẹ neo sẵn tại bãi; chờ khoảng 25 giây sim. | Nước hạ từ mốc 420s, cọc còn dưới mặt nước nhưng tới keel; phát sinh impact, thân giảm một lần/episode. |
| Gỡ sau khi mắc | Mở panel → Gỡ mắc (F); đừng chờ quá sâu. | Chuẩn bị 25s, kê/trợ lực có giới hạn rồi kéo lùi chậm. Khi ra được, neo hoặc lái ra luồng sâu để tránh bãi cạn kế tiếp. |
| Mất lái | Giữ A/D: chưa quay; Neo & sửa tại bến. | Job 10s/2 gỗ/5 điểm integrity; lái trở lại một phần. Muốn đi phải nhả neo; sửa không tự trừ gỗ tiếp mãi. |
| Tiếp cận cọc nước thấp | Giữ tiến và đổi góc tới bãi; thử lượt khác. | Tốc độ/góc va ảnh hưởng năng lượng pháp tuyến, bộ phận hỏng và khả năng bị kẹt. |

Space neo/nhả; F gỡ; R sửa; B bơm; X bỏ hàng chỉ hoạt động khi canvas có focus. C đổi camera, Esc pause. Panel không pause; menu pause dừng nước và công việc. Bảng chọn tình huống không tua nhanh thời gian toàn game.

## Đã chạy thử

- [physics-checks.json](evidence/river-2026-11-02/physics-checks.json): **47/47** kiểm tra core/scheduler. Có nhẹ/nặng/cạn, nước rút/cọc ngầm, va thẳng/xéo/đuôi, mất lái/chèo, sửa/khấu trừ lặp, giảm tải, nước rò/bơm, gỡ nông/từ chối kẹt sâu, nước lên tự nổi và một episode mới hợp lệ. Tiếp xúc đáy được giải về khoảng hở gần 0, không dừng sớm cả quãng một frame.
- Cùng commands theo tick ở lịch render **5/10/15/30/60/144Hz**, kiểm tra tick/x/z/yaw trùng; có stall 500ms giữ nợ thời gian. Ca vận tốc thử 300m/s được tiêm riêng để phát hiện xuyên cọc trong một tick, không phải vận tốc gameplay.
- [river-ui-checks.json](evidence/river-2026-11-02/river-ui-checks.json): **17/17** trên Chrome cô lập. Chạy thật đến mắc cạn, sửa lái, bỏ hàng ở 320px, chờ nước rút rồi gỡ/kéo ra/neo, kết quả/replay/thoát. Không ép tick hoặc sửa state để tạo kết quả của chuỗi gỡ mắc này.
- [browser-checks.json](evidence/river-2026-11-02/browser-checks.json): **62/62** hồi quy khung, 320/360/375/390/430px và desktop; 5 lần mở/đóng, cảm ứng, pause/resume, replay, link 2D/3D cũ, thư viện/phòng thi và không có request game mới trên trang chính.
- [edge-checks.json](evidence/river-2026-11-02/edge-checks.json): **21/21** cleanup/RAF/context/listener, mạng lỗi/chậm/hủy, mất hoặc không có WebGL, storage bị từ chối, bấm lặp, landscape, browser Back và nhập WASD/Space vào ô tìm kiếm sau thoát. Không uncaught JavaScript exception trong lượt cuối.
- [Lượt chốt tiếp xúc đáy](evidence/river-2026-11-02/final-smoke.json): **3/3**, đi thật vào bãi cạn với thuyền vận tải, khoảng hở keel gần 0 đúng epsilon, thoát dọn tài nguyên và không lỗi JS.

Các lịch 5–144Hz là test **tính đúng mô phỏng**, không đo FPS GPU thực. Test dùng Chrome headless/SwiftShader, emulation touch; chưa xác minh máy thật/iOS/Safari/Firefox hoặc hiệu năng 400+ quân.

Ảnh bằng chứng: [vận tải mắc cạn](evidence/river-2026-11-02/heavy-grounded-desktop.png), [sửa bánh lái](evidence/river-2026-11-02/rudder-repaired-desktop.png), [nước rút/mắc cọc](evidence/river-2026-11-02/ebb-pinned-desktop.png), [đã kéo ra](evidence/river-2026-11-02/ebb-recovered-desktop.png), [panel mobile 320px](evidence/river-2026-11-02/systems-mobile-320.png).

Chạy lại từ HTTP server gốc repository cổng 8765:

```powershell
python docs/game-bach-dang-938/evidence/river-2026-11-02/check_physics.py
python docs/game-bach-dang-938/evidence/river-2026-11-02/check_river.py
python docs/game-bach-dang-938/evidence/river-2026-11-02/check_shell_regression.py
python docs/game-bach-dang-938/evidence/river-2026-11-02/check_edges.py
```

Cũng có thể mở `game-bach-dang-938/tests/index.html` để xem bộ core chạy trong browser; trang test không được game sản phẩm import. Các runner dùng profile tạm, không đăng nhập/gửi dữ liệu Firebase production.

## Những lỗi đã tìm và sửa trong chặng

1. Ở ranh giới epsilon, thuyền vừa va có thể bị coi đã tách ngay rồi mắc lại. Dùng cùng hysteresis khi giữ episode lẫn xét thoát, không phát Stuck/Freed mỗi tick.
2. Neo mà vẫn cộng xung dòng mỗi tick sẽ trôi chậm. Tether cân bằng dòng và chỉ hãm quán tính còn lại, không cho W thắng neo.
3. Timestamp RAF đầu đôi lúc nhỏ hơn thời điểm handler Start khiến elapsed âm, dừng loop. Mốc được thiết lập từ callback đầu, có test start/resume và không bỏ nợ thời gian của các frame sau.
4. Browser vẫn trả bounding boxes cho con của details đóng. Thêm CSS ẩn panel khi đóng để nó không tạo vùng thao tác/đo layout thừa; panel mở cuộn nội bộ.
5. Ca nước rút phải neo ban đầu để không bị dòng đưa khỏi bãi trước lúc triều chạm keel. Dữ liệu scenario ghi rõ anchor, không sửa tốc độ dòng để ép kịch bản.

Công cụ kiểm tra cũng được hiệu chỉnh: so stall phải dùng cùng commands gắn tick, HUD đợi nhịp cập nhật thay vì đọc ngay cùng tick sự kiện, và nhấn tiến 1,2s để xét phản hồi có quán tính thay tiêu chí di chuyển tức thời 0,35s. Các thay đổi này không nới invariant về damage/contact hoặc bỏ bài kiểm tra xuyên cọc.

## Phạm vi tệp và bảo toàn

Thêm `data/river-config.json`, `src/sim/{river,collision,vessel}.js`, `src/core/clock.js`, `tests/{index.html,river-tests.js}`; thay `src/core/demo.js` cũ. Sửa `src/app/{loader,input,session,bootstrap}.js`, `src/presentation/scene.js`, `index.html`, `styles/game.css`, `data/shell-scene.json` và README trong route mới. Tài liệu/test evidence trong `docs/game-bach-dang-938/` được cập nhật riêng.

Đối chiếu hash theo đầu chặng: [source-integrity.json](evidence/river-2026-11-02/source-integrity.json). Tất cả tệp đang được Git theo dõi ngoài route mới/docs được giữ nguyên, gồm trang chính với link đã thêm ở chặng trước và mọi thay đổi game cũ chưa commit. Three.js pin cũ của game mới cũng không đổi. Chưa commit/push/deploy, không thay Firebase Rules/Auth hay dữ liệu bài học/đề.

Kiểm tra nguồn cuối đạt **15/15**, so **235 tệp được bảo toàn** với đầu chặng, không có tệp nào trong nhóm đó thay hash. Import/config/liên kết và `git diff --check` đạt.

## Ranh giới và phần còn lại

Đây là mô phỏng **2.5D có xấp xỉ**, không chất lỏng đầy đủ; xem mô hình chi tiết để biết capsule/proxy, mẫu đáy và trợ lực gỡ. Chỉ thuyền người chơi có dynamics hoàn chỉnh; thuyền neo là chướng ngại tĩnh. Chưa mô phỏng roll/pitch, chìm/di tản, hạm đội AI hoặc toàn bộ thủy văn cửa sông.

Hư hại, hàng, nước và gỗ hiện chỉ thuộc lượt thử trong RAM. Replay reset rõ ràng; chưa coi là lưu tiến độ hoặc journal mất mát chiến dịch. Bước sau cần nối event/repair/transfer vào giao thức lưu trước khi dùng ở chương thật có mất mát vĩnh viễn. Chặng này dừng ở lớp sông nước và kiểm tra của nó.
