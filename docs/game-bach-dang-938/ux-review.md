# Bước 10 — kiểm tra trải nghiệm độc lập

Khảo sát bản `34cc820`, bằng chứng thu ngày 02–03/11/2026 tại [evidence/ux-2026-11-02](evidence/ux-2026-11-02/). Mã chạy chưa sửa trong lượt khảo sát. Chrome headless, WebGL SwiftShader, profile khách riêng, HTTP localhost. Chặn Auth/Firestore/Storage production; không dùng dữ liệu phòng thi thật. Đây là giả lập viewport/touch, không phải kiểm tra điện thoại thật, Safari hoặc loa thật.

## Kết quả quan sát

- Chọn được cả bốn vai trò; ba mức đồ họa nhớ sau reload. Economy/balanced/detailed lần lượt 7.067/13.115/27.451 tam giác trong cùng cảnh khởi đầu; đây không phải số đo FPS.
- 1365×900, 360×800, 390×844, 430×932: bắt đầu → bản đồ → tạm dừng → tiếp tục → kết thúc lượt thử → chơi lại → chọn lại hoạt động. Pause giữ nguyên tick. Sau chọn lại: loop/listener/renderer/geometry/material/canvas đều về 0.
- Chơi thực bằng phím/chuột: lái → bản đồ (tick 91→116, Z 22,76→20,65 trong 0,8s) → neo → rời lái → đi tới mũi → G áp mạn → đánh → nhân vật gục → An tiếp quản. Không ép thắng hoặc thay state để vượt bước. Bắn cung giữ J 120ms tạo một tên và một lần trúng; lượt thử phím J nhấn/nhả tức thời không qua tick được lưu riêng như giới hạn harness, không kết luận là lỗi bắn cung.
- Hai ngón di chuyển/đỡ hoạt động; pointercancel dừng cả hai. Mở bản đồ khi đi bộ tự đỡ là hành vi của engine, không phải kẹt nút. Esc trên bản đồ mở menu tạm dừng.
- Lệnh cơ động, tiếp tế có phản hồi; kho giảm 500→470 tên. Thử tiến công thực 62s khiến tổ 1 còn 0/10 chiến đấu; dữ liệu là 10 người gục. UI chưa phân biệt gục/tử trận.
- Tình huống “Nước rút tại bãi cọc” hiển thị cảnh báo cọc tới đáy thuyền; mở gỡ mắc được.
- Sau thoát game mới, cả hai entry game cũ vào đúng trận Bạch Đằng, render và pause được. Desktop/390px: phòng thi chọn đáp án, xác nhận nộp, thấy điểm, làm lại được. Thư viện mở bài và nhập `WASD Space` được. Trang chủ/phòng thi không tải tài nguyên game mới. Không chơi hết các trận cũ.
- Không thấy exception JavaScript trong những luồng hoàn tất. Đề mẫu de-01 vẫn 22+2: lỗi nền E02 đã ghi ở khảo sát cũ, không quy cho game mới và không sửa đề trong chặng này.

## Danh sách cần xử lý

P1: cản nghiệm thu hoặc quan sát/điều khiển chính. P2: ảnh hưởng rõ trải nghiệm. P3: hoàn thiện nội dung giao diện.

| ID | Mức | Tái hiện và quan sát | Đề xuất cụ thể |
|---|---|---|---|
| UX01 | P1 / thiếu tính năng | Bắt đầu tình huống mặc định, chơi rồi bấm “Kết thúc lượt thử”: kết quả ghi rõ chưa phải kết quả chương. Không có chuỗi trinh sát/bố trí/giao chiến/ứng cứu/kết quả, nên chưa kiểm chứng được chương 15–25 phút. | Hoàn tất chặng nội dung/nhiệm vụ riêng theo schema đã duyệt; giữ nhãn sandbox cho tới lúc đó. Không giả lập chiến thắng bằng nút kết thúc. |
| UX02 | P1 | Desktop, lái tới cạnh tàu địch, neo, E rời lái, đi tới mũi, G sang tàu, dùng camera theo nhân vật: hình khối nâu che nhân vật/vùng đánh. Camera vẫn báo đủ khoảng cách với nền nhưng không bảo đảm tầm nhìn. [Ảnh](evidence/ux-2026-11-02/combat-melee-on-deck.png) | Xử lý vật cản giữa camera và nhân vật, chọn vị trí bên cạnh khi góc phía sau quá gần thân thuyền; kiểm tra lại trên tàu chuyển động. |
| UX03 | P1 | 844×390: mở “Thuyền & xử lý nguy hiểm”, bấm giữa summary để đóng. Panel nằm trên summary; hit-test trúng panel, không đóng. Panel còn đè nút kết thúc. Chỉ sát mép dưới summary mới thoát được. [Ảnh](evidence/ux-2026-11-02/landscape-system-hit-overlap.png) | Đặt panel riêng phía trên summary, giới hạn theo viewport, luôn giữ nút đóng ngoài vùng cuộn/đè. |
| UX04 | P2 | 360px: mở bảng hệ thống. Vùng cảnh bị co, HUD nhân vật và thông báo chồng/cắt; lúc đóng, nhiều lớp HUD vẫn phủ mục tiêu. Chữ một số nút chỉ 10px. [Ảnh](evidence/ux-2026-11-02/mobile-hud-clipped.png) | Panel nổi có nút đóng; bố cục HUD tự chảy, thu thông tin sông phụ khi hẹp/ngang; giữ HP/cảnh báo và nút chạm ≥44px, chữ dễ đọc hơn. |
| UX05 | P2 | Mở bản đồ trên điện thoại/ngang. SVG bị co còn 80px cao; ký hiệu tổ/kho rất nhỏ, thiếu chú giải, phần lớn là ô biểu mẫu. [Ảnh](evidence/ux-2026-11-02/landscape-map-clean.png) | Cho bản đồ một vùng đủ lớn, marker đọc được, chú giải; dùng bố cục bản đồ/bảng lệnh riêng, cuộn độc lập và giữ nút đóng. |
| UX06 | P2 | Mở bảng hệ thống: hai nút theo/giữ cạnh nhau; chỉ nút đầu cập nhật trạng thái. [Ảnh](evidence/ux-2026-11-02/desktop-duplicate-follow.png) | Một nút duy nhất có trạng thái aria-pressed và nhãn theo/giữ nhất quán. |
| UX07 | P2 | Giao tổ 1 tiến công X=-30, Z=-24; đợi giao chiến. UI chỉ nói 0/10 và “Không còn người…” trong khi snapshot có 10 downed; không rõ còn cứu được hay đã mất. [Ảnh](evidence/ux-2026-11-02/troop-loss-readout.png) | Hiển thị riêng còn chiến đấu/gục/thương/tử trận/mất tích theo trạng thái hiện hữu; không thay luật cứu hoặc mất mát. |
| UX08 | P3 | Bấm chuyển 30 tên trên bản đồ: dòng “Tuyến hàng: moving” trộn tiếng Anh. [Ảnh](evidence/ux-2026-11-02/mobile-supply-feedback.png) | Ánh xạ trạng thái tuyến hàng sang tiếng Việt, giữ nguyên giá trị lưu. |

## Giới hạn

Chưa có chương hoàn chỉnh, mỹ thuật/âm thanh cuối và hội thoại nhân vật nên không thể nghiệm thu các phần đó. Chưa đo Internet thực, FPS/GPU điện thoại, safe area/tai thỏ thật, xoay với thanh địa chỉ động hoặc bàn phím ảo. Không xác nhận đăng nhập/cloud production; không phát hiện lỗi mất/nhầm dữ liệu qua các luồng khách, nhưng điều đó không thay bộ kiểm thử lưu/emulator đã bàn giao. Không suy từ screenshot ra chức năng: các lỗi trên có thao tác, DOM/hit-test và snapshot kèm ảnh.

Các JSON `layout-observations`, `play-observations`, `combat-observations`, `edge-observations`, `routes-observations` ghi chi tiết. `layout-harness-attempt1.json` dùng nhầm tên trạng thái PLAYING thay RUNNING; đã sửa harness và chạy lại. Giữ bằng chứng này để phân biệt lỗi công cụ với lỗi sản phẩm.
