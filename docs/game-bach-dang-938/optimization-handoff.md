# Bước 11 — sửa lỗi trải nghiệm, đo và tối ưu

Ngày 03/11/2026. Mốc trước: `34cc820`. Phạm vi chạy: game mới `game-bach-dang-938/`; không thay trang chính, game cũ, phòng thi, thư viện, Auth, cấu hình hoặc Rules Firebase. [Báo cáo bước 10](ux-review.md) và [toàn bộ bằng chứng](evidence/perf-2026-11-03/).

## 1. Các vấn đề đã xử lý

| Mục bước 10 | Kết quả | Bằng chứng sau sửa |
|---|---|---|
| UX02: camera áp mạn bị che | Bổ sung cột/cờ vào vật cản camera, tìm góc bên khi góc sau quá sát thân tàu. Cột/cờ trang trí ở sát camera theo nhân vật được tạm ẩn để không lấp khung hình. Giữ nhân vật, tàu, mục tiêu và collision của mô phỏng. | [Cận chiến nhìn rõ](evidence/perf-2026-11-03/camera-fixed-melee.png), `camera-final.json`. Chơi bằng input thật, không ép vị trí lên tàu. |
| UX03: panel đè summary/nút kết thúc ở ngang | Panel riêng có nút Đóng 44px, header giữ trên vùng cuộn. Đóng trả focus canvas. | [Panel ngang](evidence/perf-2026-11-03/fixed-844-systems.png), kiểm tra cả 844/667/568px ngang. |
| UX04: HUD chồng/cắt/chữ nhỏ | HUD xếp theo nội dung; mobile hiện triều/độ sâu/khoảng dưới đáy, toàn bộ thông số còn trong bảng thuyền. Tăng chữ chính lên 12px, thu gọn footer, có đồng hồ trên mobile/ngang. | [360px](evidence/perf-2026-11-03/fixed-360-playing.png), [844px ngang](evidence/perf-2026-11-03/fixed-844-playing.png). |
| UX05: bản đồ co 80px | Bản đồ mở trong vùng màn hình riêng; mobile SVG 280px, desktop/ngang tối thiểu 180px, có chú giải và bảng lệnh cuộn. Header có nút Đóng và Tạm dừng riêng để không cần chạm toolbar đang ở phía sau. | [360px](evidence/perf-2026-11-03/fixed-360-map.png), [ngang](evidence/perf-2026-11-03/fixed-844-map.png); `map-pause-validation.json` kiểm tra bổ sung header cuối. |
| UX06: hai nút theo/giữ | Một nút duy nhất, cập nhật nhãn và aria-pressed. | Panel và `validation.json`. |
| UX07: không rõ gục/tử trận | Hiện số người còn chiến đấu, gục cần cứu, bị thương, tử trận, mất tích hoặc bị bắt theo trạng thái đang có. | `casualties-validation.json`, [ảnh giao chiến thực](evidence/perf-2026-11-03/casualties-distinguished.png). Không đổi luật cứu/thương vong. |
| UX08: trạng thái vận tải tiếng Anh | Ánh xạ tiếng Việt ở UI, giữ nguyên giá trị trạng thái trong bản lưu. | Kiểm tra chuyển 30 tên ở năm kích thước. |

UX01 **vẫn mở**: bản hiện tại chưa có nội dung và chuỗi nhiệm vụ chương 15–25 phút. Đây là chặng nội dung/nhiệm vụ chưa triển khai, không thể nghiệm thu bằng nút “Kết thúc lượt thử”. Không thêm kết quả thắng giả để vượt kiểm tra. Mỹ thuật/âm thanh cuối cũng chưa hoàn tất.

## 2. Tối ưu giữ nguyên kết quả mô phỏng

- Cây cùng hình học/vật liệu chuyển từ nhiều mesh sang ba InstancedMesh. Giữ vị trí, hình học, màu và bóng; không giảm số cây hoặc số quân. Cảnh thường giảm **225 → 182 draw calls**. Một số tam giác ngoài frustum vẫn được gửi theo nhóm ở Three r128; giảm draw calls không tự chứng minh FPS tăng.
- Spatial index dùng lại bucket và chỉ duyệt ô có người cho truy vấn xa; truy vấn gần dùng hàng số thay tạo hàng nghìn khóa chuỗi. Kiểm tra hình chữ nhật loại ứng viên chắc chắn ngoài tầm trước phép đo khoảng cách cũ. Giữ thứ tự duyệt và Math.hypot cho phép thử cuối, không đổi lịch AI, tầm nhìn, sát thương hoặc bước mô phỏng.
- So **40 hash tại tick 30/60/…/240**, cho 50/100/200/400/480 quân mỗi bên: toàn bộ roster hai phe, trạng thái, đường đi, sự kiện và snapshot khớp trước/sau. Các cache là WeakMap dẫn xuất, không đưa vào schema lưu.
- Đã thử tải các dữ liệu/module song song. Các lượt đo không cho thấy lợi ích ổn định; **đã rút thay đổi loader**, giữ tải khi người chơi mở game. Không preload trên trang chủ, không thêm thư viện hoặc asset lớn.

Năm tệp mã chạy sửa: `index.html`, `styles/game.css`, `src/app/bootstrap.js`, `src/presentation/scene.js`, `src/sim/army.js`, đều trong thư mục game mới. Thêm fixture `tests/performance.html`; trang này không được nạp từ giao diện chơi hoặc trang chủ.

## 3. Điều kiện và cách đo

Chrome headless, WebGL SwiftShader, DPR 1, 1365×900, HTTP localhost; backend production bị chặn. Đo trên cùng máy nhưng tải hệ thống thay đổi rõ trong phiên: tại một thời điểm chỉ còn khoảng **1,27 GiB RAM vật lý trống trên 15,69 GiB**. Không tắt ứng dụng của người dùng để làm đẹp kết quả. Không coi các số này là FPS điện thoại/Internet thật.

`measure.py` dùng profile sạch, xóa HTTP cache cho lần đầu, đo LOAD→BRIEFING bằng MutationObserver, năm lần mở lại cùng document và sáu lần thoát về lựa chọn. Frame thường lấy 6s RAF; fixture quân đội lấy 8s wall-clock, tách thời gian CPU path/AI/combat/logistics/render, giữ backlog thay vì bỏ tick. Frame p95 là khoảng cách RAF, không phải GPU timer hoặc đo input latency. Bộ nhớ JS lấy từ CDP; chưa đo được số byte VRAM.

Network ghi riêng tài nguyên: Three r128 có 1.140.878 byte encoded, request localhost 67,9ms ở lượt cuối. Tổng resource URL đầu tiên trong log khoảng 1,33 MiB transferred, chưa cộng HTML navigation; các lần fetch JSON lặp được ghi riêng. Không có asset hình/âm thanh mới, không thêm payload vào trang chủ.

### Các lượt đầy đủ trước/sau

| Chỉ số | Trước (`before.json`) | Bản cuối (`final.json`) |
|---|---:|---:|
| Tải đầu, LOAD→BRIEFING | 345ms | 2.594ms |
| Trung vị 5 lần mở lại | 149ms | 788ms |
| Frame thường p95 / max | 8,5 / 9,3ms | 52,7 / 165,8ms |
| Frame thường >50ms | 0 | 14 |
| Draw calls, cảnh ban đầu | 225 | 182 |
| GPU geometries, cảnh ban đầu | 171 | 171 |

**Không kết luận tải hoặc frame thường nhanh hơn từ hai lượt này.** Thời gian tải dao động mạnh; thử xen kẽ ba cặp ở `paired-loads.json` còn dùng ứng viên loader song song sau đó đã rút, nên không lấy số thuận lợi ở đó làm số cuối. Chưa tách được chi phí khởi tạo WebGL/driver và ảnh hưởng tải hệ thống.

Ma trận tải đầy đủ; quân số là **mỗi bên**, 480 nghĩa là 960 người có trạng thái và tham gia mô phỏng:

| Quân mỗi bên | Frame p95 trước → cuối | AI p95 trước → cuối | Path p95 trước → cuối | Frame max bản cuối |
|---:|---:|---:|---:|---:|
| 50 | 16,6 → 25,0ms | 2,6 → 1,8ms | 0,1 → 0,1ms | 116,9ms |
| 100 | 8,5 → 25,1ms | 4,2 → 5,4ms | 0,1 → 0,1ms | 83,3ms |
| 200 | 8,5 → 25,0ms | 9,0 → 10,5ms | 0,3 → 0,6ms | 66,7ms |
| 400 | 16,7 → 41,6ms | 21,5 → 37,5ms | 0,2 → 0,5ms | 100,0ms |
| 480 | 25,0 → 58,0ms | 28,3 → 45,1ms | 0,4 → 0,4ms | 299,9ms |

Các bản ứng viên ở `after.json`/`after-final.json` có một số số đo tốt hơn, nhưng không dùng thay lượt cuối. Việc lưu cả các lượt chậm là chủ ý.

### Kiểm tra xen kẽ bản gốc và bản cuối

Để kiểm tra ảnh hưởng môi trường, `paired_stress.py` xuất HEAD vào thư mục tạm riêng, phục vụ local ở port 8766 rồi chạy cùng fixture, xen kẽ với working copy ở 8765. Không ghi đè mã hoặc bản lưu đang dùng. Cặp thứ hai, cả hai bên đều chạy đủ 240 tick với backlog khoảng 8ms:

| 480 quân mỗi bên | Bản gốc | Bản sửa |
|---|---:|---:|
| Frame thường p95 (3s) | 16,6ms | 8,5ms |
| Frame tải quân p95 / max | 24,9 / 50,1ms | 25,0 / 66,6ms |
| Số frame tải quân >50ms | 1 | 3 |
| AI p95 / max | 30,3 / 49,1ms | 28,2 / 60,4ms |
| Path p95 / max | 0,3 / 1,2ms | 0,5 / 0,9ms |
| Combat p95 | 6,7ms | 4,7ms |
| Render submission p95 | 3,3ms | 5,1ms |

Cặp đầu có đợt hệ thống chậm rất lớn ở bản gốc: chỉ 64 tick trong 8s, còn 6,17s backlog, frame p95 1.724,7ms. Không gộp đợt này thành tỷ lệ “tăng tốc” của bản sửa. Hai cặp chưa đủ kết luận hiệu năng ổn định. **480 quân chưa qua ngân sách CPU 8ms/tick; đợt chậm và tải đầu còn mở.** Có [gói tái hiện cho Astra](astra-performance-handoff.md).

### Bộ nhớ và vào/ra

Sáu chu kỳ bản cuối: JS heap sau thoát 8,79–13,03 MiB, dao động theo GC, không tăng đơn điệu. Mọi lần đều trả loop, listener phiên, observer, renderer, geometry, material và canvas về 0; fixture tải quân cũng dọn về 0. Đây là bằng chứng ownership, không phải bảo đảm không rò bộ nhớ trên mọi thiết bị hoặc đo VRAM. Bản lưu và outbox không bị xóa để đạt số heap thấp.

## 4. Kiểm tra sau sửa

- **197/197** core: sông 47, nhân vật 45, quân đội 37, lưu 49, retry 11, barrier lưu phiên 8. Bao gồm dữ liệu khác UID, giữ mất mát, khôi phục và lỗi ghi cục bộ; không kiểm lại production Firebase.
- **55/55** kiểm tra UI tại 360/390/430px, 844×390 và 1365×900; thêm **12/12** tại 320px, 667×375, 568×320 và đa chạm/pointercancel; **15/15** ca nút pause trên bản đồ ở năm kích thước. Ở ngang ngắn đã bỏ min-height cưỡng bức và đặt lại hàng D-pad: cả toolbar và nút dưới đều nằm trong viewport, không chỉ kiểm tra tràn ngang. Nút chơi tối thiểu 44px, panel đóng được bằng pointer, pause giữ tick, chơi lại và dọn tài nguyên hoạt động.
- Chơi tự nhiên lái → bản đồ → neo → áp mạn → cận chiến → An tiếp quản; bản sửa camera cuối được kiểm tra lại đến cận chiến, ảnh đã xem trực tiếp. Không dùng fixture thắng.
- Sau thoát: cả hai game cũ vào đúng trận và pause được; phòng thi chọn/nộp/làm lại ở desktop và 390px. Lượt thư viện đầu có thao tác đóng chưa thành công trong harness; lưu ảnh lỗi và kiểm lại bằng nhấn/nhả chuột 120ms: mở/đóng bài, nhập `WASD Space` đạt, không exception. Không sửa thư viện.
- 97 tệp ngoài game mới trong manifest khảo sát giữ nguyên SHA-256 (`protected-files.json`); không sửa ngân hàng đề/đáp án hoặc Rules. Không push/deploy.

## 5. Phần còn lại

1. Chặng nội dung/nhiệm vụ và chương 15–25 phút (UX01), mỹ thuật/âm thanh cuối vẫn chưa có; không đánh dấu toàn bộ game hoàn thành.
2. Tải đầu và các đợt giật 400/480 quân: cần profile dài hơn trên máy ít tải và thiết bị thật, theo gói Astra. Chưa thêm worker/LOD làm đổi kết quả hay giảm số quân để vượt gate.
3. Chưa xác minh điện thoại thật, Safari/Firefox, tai thỏ/thanh địa chỉ động, GPU timer/VRAM, pin/nhiệt và cloud production. Safe area hiện được hỗ trợ qua CSS env, kiểm tra kích thước ở đây chỉ là emulation.

Bước tiếp theo là giải nút thắt tải/AI theo gói tái hiện và triển khai chặng nội dung/nhiệm vụ còn thiếu có kiểm soát. Những kiểm tra lưu và hồi quy đã đạt không cần làm lại nếu không có thay đổi liên quan.
