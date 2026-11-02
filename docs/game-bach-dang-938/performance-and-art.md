# Ngân sách hiệu năng, benchmark và mỹ thuật

**Ngân sách dự kiến, chưa đo game mới. Không cam kết FPS.** Chrome headless/SwiftShader của khảo sát phù hợp test logic/UI, không đại diện GPU điện thoại/PC. Giá trị cấu hình ở [gameplay-defaults.json](gameplay-defaults.json); thay đổi phải có version/kết quả đo.

## 1. Mục tiêu ban đầu

| Hạng mục | Tiết kiệm/mobile | Cân bằng/PC | Chi tiết/PC |
|---|---|---|---|
| Thời gian frame mục tiêu, chưa xác minh | ≤33,3ms | ≤16,7ms | ≤16,7ms |
| DPR trần | 1 | 1,5 | 2 |
| Draw calls / tam giác nhìn thấy | 120 / 180k | 220 / 450k | 320 / 850k |
| Ước tính bộ nhớ texture GPU | 96 MiB | 192 MiB | 320 MiB |
| Nhân vật skeletal animation gần camera | 24 | 48 | 80 |
| Particle trang trí đồng thời | 160 | 350 | 600 |
| Shadow map một nguồn chính | 512² | 1024² | 2048² |

Đây là trần kế hoạch, không phải “khả năng phần cứng tối thiểu”. Quân ngoài ngân sách skeletal vẫn tồn tại/được vẽ bằng LOD phù hợp; không giảm quân số thật hoặc cho mất tên/máu trong roster. Vệt đạn mỹ thuật được gộp, projectile gây damage không bỏ.

Ngân sách CPU đề xuất: simulation p95 ≤8ms/tick (30Hz), render submission/UI p95 ≤4ms/frame ở cân bằng; GPU p95 ≤10ms nếu đo được. Các số CPU/GPU không cộng đơn giản thành FPS vì có pipeline/độ trễ khác nhau. Ghi cả frame p50/p95/p99, long tasks >50ms, GC, memory và latency input-to-feedback; mục tiêu input phản hồi p95 <100ms, cần máy thật để xác nhận cảm giác chạm.

Commit barrier là rủi ro kỹ thuật cần đo sớm: hướng tới IDB commit p95 ≤4ms cho batch tick, p99 ≤20ms ở cấu hình thử; dùng ngưỡng cảnh báo/timeout trong config để bảo vệ save. Đây không là bảo đảm browser. Không viết full roster/world mỗi tick: event/patch nhỏ + replay delta; full checkpoint theo nhịp riêng. Nếu I/O ngăn chạy mượt, dừng gate và ghi quyết định thay giao thức, không bỏ journal hoặc giảm bảo toàn mất mát im lặng.

Ngân sách tải kế hoạch: shell HTML/CSS/UI ≤150 KiB; engine pin riêng ≤1,5 MiB raw; gói **cần để bắt đầu** chương ≤8/16/32 MiB raw theo ba mức. Đo transferred bytes thực trên HTTP vì chưa biết nén/caching phát hành. Chương không đợi toàn bộ voice/music hoặc asset chương sau. Save serialized mục tiêu ≤2 MiB ở 480 quân, journal được compact an toàn; không đưa texture/audio vào save.

Không viết CSS/asset mới vào trang chủ ngoài link/kiểu cần thiết của link. Network test trước khi mở phải có **0 request và 0 loop thuộc namespace game mới**, so với baseline đã có Three/animation cũ.

## 2. Cách giảm chi phí mà giữ luật

- Một scheduler, một sim world, một render loop; không interval riêng mỗi lính. Spatial grid broadphase, swept collision narrowphase; pathfinding theo nhóm/queue giới hạn, AI schedules cố định theo tick.
- 400+ người luôn có ID/state và tham gia hậu quả. LOD chỉ giảm draw/animation/particle/label; không biến 400 health thành một thanh máu tổ rồi mất identity. Far units dùng rigid instanced parts/impostor đã bake, near units skeletal; chuyển LOD không đổi hit shape/sát thương/độ sâu.
- Physics/gameplay không phụ thuộc mesh decimation. Render culling không xóa projectile/objective. Fog culling không cho AI nhìn thông tin bị che.
- Mesh/material/texture dùng chung theo archetype, object pool cho hiệu ứng, không cấp object tạm hàng nghìn mỗi frame. Dispose theo ownership/refcount, không hủy texture còn dùng ở entity khác.
- HUD dirty flags tối đa theo `hudHz`, bản đồ theo `mapHz`; roster dài virtualize theo hàng nếu cần, không tạo DOM tên nổi cho mọi lính.
- Quality giảm nước phản chiếu, bóng, xa mờ, mật độ hạt; không giảm âm báo quan trọng/độ đọc UI. `prefers-reduced-motion` tắt rung camera/nhấp nháy dày, giữ dấu hướng/feedback sát thương.
- Worker chưa bắt buộc. Chỉ chuyển path planning hoặc tác vụ đã đo khỏi main thread nếu bottleneck rõ, có protocol generation/tick và kết quả ổn định; không trả path trễ rồi sửa thời gian quá khứ.

## 3. Ma trận 50/100/200/400/480 quân

`friendlyCounts` là **quân phía người chơi**, không phải tổng hai bên. Bài tải mặc định có số địch bằng số ta: lần cuối 480 ta +480 địch, tổng 960 identity. Sample chapter thực dùng 50 ta/60 địch; benchmark là fixture stress riêng, không sửa nội dung chương hoặc tự tăng roster chiến dịch.

| Mức ta | Câu hỏi cần trả lời | Gate trước mở mức kế |
|---|---|---|
| 50 | Điều khiển/hitbox/takeover/save hoàn chỉnh; chương thật 50/60 | Không lỗi invariant/replay/leak; luồng begin→result→retry có thể chơi tự nhiên. |
| 100 | Đồng loạt nhận lệnh, đổi đường/cứu quân/tàu cháy | Queue không tăng vô hạn, UI chọn tổ không giật kéo dài. |
| 200 | Bến hẹp, boarding, nhiều thuyền/đạn/fog | Không tunnel, không nhân đôi attachment, order latency được ghi. |
| 400 | Roster có tên/đơn vị, tổng tải hai bên 800 | Giữ identity/tombstones, thử toàn bộ tải render + journal, không dùng bài nhìn cảnh trống làm bằng chứng. |
| 480 | Vượt 400 thuộc lực lượng ta, tải cực đại 960 người | Đo và báo khả năng theo thiết bị/preset, không tự xóa quân để “pass”. |

Với mỗi mức/preset/device, chạy cùng seed/commands/config, warm-up 60s, capture 180s, lặp 3 lần. Chạy ít nhất các cảnh: toàn cảnh thấy quân; giao tranh cung tên hai bờ; nhiều thuyền mắc/cháy; boarding/cận chiến tập trung; mở map/ra lệnh nhiều tổ; cứu thương + chuyển kho; kết quả/retry. Số projectile gameplay đo theo vũ khí/AI thực, particle budget tách riêng.

Sau đó soak 25 phút ở chương mẫu và fixture 480, ghi RAM trước/sau/giai đoạn GC, số resource/loop/listener/audio voice khi pause/exit; 10 lần mở/đóng route và thử bfcache. Không đặt ngưỡng leak chỉ theo heap một frame; kiểm tra resource count về mức shell, mức tăng có dừng sau warm cache hay không.

Thiết bị cần có: một PC GPU tích hợp, một PC GPU rời, Android phổ thông/tầm trung và iPhone Safari. Ghi model/OS/browser/GPU/RAM/DPR/preset/độ phân giải/nhiệt/mạng. Máy nào không tiếp cận được đánh dấu chưa đo, không dùng emulator để suy ra FPS của máy đó. Test UI 320/360/375/390/430px và desktop 1365×900, cả dọc/ngang; benchmark GPU ghi riêng resolution và FPS không gộp.

Mỗi kết quả lưu: commit code + sim/config/content hashes, scenario/seed, ta/địch/tàu/đạn/LOD counts, frame/tick/render/commit percentiles, transferred bytes, draw calls/triangles, memory estimate, error log và correctness checksum. Dữ liệu GPU không có API đo tin cậy ghi “không đo được”, không suy ra từ CPU time.

Nếu không đạt: xác định bottleneck → tối ưu trong vùng đó → chạy lại cùng replay → so hậu quả invariant và hình ảnh. Không thay câu chuyện/quân số/tốc độ triều để đạt chỉ số. Nếu vẫn không đủ, công bố giới hạn thiết bị hoặc lập thay đổi kiến trúc để duyệt; chưa tuyên bố hoàn tất 400+.

## 4. Kế hoạch mỹ thuật theo lớp

Phong cách đề xuất: 3D bán cách điệu, silhouette và vật liệu dễ phân biệt ở góc toàn cảnh, đất/nước/gỗ nhất quán với website; UI nâu đỏ/vàng tiết chế. Tỷ lệ và trang phục là tái dựng tới khi có nguồn. Không dùng model cọc 1288 hoặc cổ vật 76MB chỉ vì sẵn trong kho.

| Nhóm | Gói chương mẫu cần làm | Mức/kiểm tra |
|---|---|---|
| Địa hình/nước | Heightfield bờ/lòng sông, bến, lau/sậy, đường rút, dòng chảy/foam theo hướng | Collision mesh riêng; nước không che tín hiệu draft/cọc; chuyển mức chất lượng không đổi bed/collision. |
| Thuyền | Hai archetype nhẹ/vận tải, biến thể hộ tống; boong, chèo, bánh lái, hàng, vùng component hỏng | Pivot/scale đúng mét; socket crew/boarding; LOD xa giữ silhouette; damaged variants không phải đổi collision bất ngờ. |
| Người | Bốn hero nhận diện riêng, reserve/soldier có biến thể trang phục/gương mặt; chia sẻ rig phù hợp | Không làm 400 model riêng; tên/identity độc lập appearance. Vũ khí/đội hình phân biệt được trên mobile. |
| Animation | Idle, đi/chạy, chèo/lái, ngắm/kéo/thả cung, melee/đỡ/phản đòn, hụt chân/bơi, wounded, mang người, sửa/dập lửa | Root motion là presentation theo sim; attack marker khớp tick event, không gây damage từ callback animation. Near/far transition không trượt boong. |
| Vật thể/đồ nghề | Cọc theo phần, dây, bó gỗ, hòm tên, bộ cứu thương, kho, cờ, khiên/cung/giáo | Tương tác có anchor/outline; obstacle/cover tags rõ; nhỏ nhưng cần chơi thì không bị LOD làm biến mất. |
| VFX | Tên thật + trail dễ nhìn, sparks, cháy/lửa/khói, nước văng, va cọc, dấu lệnh/đường rút | Particle pool, ít overdraw; cháy trong sim khác lửa cosmetic. Giảm motion vẫn thấy hit/đường nguy hiểm. |
| Ánh sáng/bóng | Một sun, ambient, contact shadow/LOD shadow, nước phản xạ giản lược | Bóng giúp nhận boong/cọc/nhân vật, không quá tối; tránh đèn động mỗi mũi tên. Chi tiết bật tùy preset. |
| UI | Icon điều khiển/lệnh/sức bền/cứu/hàng/map/save; tooltip có touch/keyboard thay hover | Đọc tiếng Việt có dấu, tương phản, 44px target, không dùng màu đơn độc báo địch/ta hoặc wounded/dead. |
| Âm thanh | Sông/chèo, cung/va gỗ, chỉ lệnh, wounded/cứu, nền/narration tự chọn | Pool/giới hạn voice/ưu tiên; nhiều quân không đồng nghĩa phát 400 tiếng cùng lúc. Subtitle và tắt riêng nhạc/SFX/voice. |

Thứ tự sản xuất: (1) blockout/collision và đơn vị chuẩn; (2) một thuyền + một rig đầy đủ hành động; (3) scene chuẩn ánh sáng/LOD để đo; (4) biến thể roster/props; (5) VFX/audio/UI; (6) tinh chỉnh bóng/chuyển động nhỏ theo benchmark. Không đặt polish trước gate save/combat.

Mỗi asset đi qua manifest: assetId, tác giả/URL/giấy phép/ngày, nguồn lịch sử hoặc nhãn tái dựng, bản gốc và bản xuất, hash, raw bytes, estimated GPU bytes, triangles/bones/materials/draw calls, LODs, collision proxy, scale/pivot/axis, chapter/preset group và fallback. Chỉ ship tài nguyên có quyền dùng rõ; có LICENSE/ATTRIBUTION tương ứng. Chưa tải hoặc tạo bitmap/model mới trong chặng này.

Định dạng đề xuất GLB và texture atlas; texture 1K cho nền tảng, 2K cho chi tiết gần có lợi ích đo được. Không tự thêm Draco/KTX decoder trước khi đo lợi ích byte/decode trên thiết bị; nếu thêm phải pin/license và kiểm tra memory. Không gửi base64 model lớn trong HTML. File có hash/version ổn định cho cache, không query timestamp ngẫu nhiên mỗi lần mở.

## 5. Gate chất lượng và kết quả hiện tại

1. Core/invariants/replay đúng trước khi đánh giá đẹp/mượt.
2. Benchmark đủ ma trận và công bố các ô chưa chạy.
3. Asset có license/provenance, nhìn rõ hành động/hit/độ sâu ở các preset.
4. Chơi tự nhiên chương mẫu; hồi quy site cũ không tệ hơn baseline.

Hiện tại: **chưa có benchmark game mới, chưa có asset game mới, chưa kiểm tra FPS trên thiết bị thật**. Báo cáo này là kế hoạch đo và sản xuất, không dùng 56/56 test của game cũ để chứng minh hiệu năng game mới.
