# Kiến trúc đề xuất — Bạch Đằng 938

**Trạng thái:** Sơ bộ, dùng cho các chặng sau; chưa tạo mã thực thi.

## 1. Tích hợp website

1. Đặt game trong route mới, dự kiến `game-bach-dang-938/index.html` cùng thư mục `src/` và `assets/` riêng.
2. Thẻ Sa Bàn trong `trang-chinh.html` nhận đúng một lựa chọn mới. Hai liên kết `sa-ban.html` và `sa-ban-3d.html` không đổi; không đổi trang đích của menu, footer hay bảo tàng cũ.
3. Trang mới dùng CSS tiền tố `.bd938-`, ID `bd938-*` và ES modules có phạm vi riêng. Không dựa vào biến `Game3D`, `HistoryGame`, `site-music` hoặc event listener toàn cục của game cũ.
4. Trang chủ chỉ chứa liên kết tĩnh mới. Game, Three.js riêng, mô hình, âm thanh và vòng lặp chỉ được tải sau khi người dùng mở route/game; không gắn preload hay khởi tạo vào trang chủ.

## 2. Các module dự kiến

| Module | Trách nhiệm |
|---|---|
| `bootstrap` | Tải/chạy/tắt game, chọn cấu hình chất lượng và điều phối phiên chơi. |
| `app-shell` | Menu, hướng dẫn, tạm dừng, bản đồ, kết quả và cửa sổ xác nhận. |
| `renderer` | Scene/camera/LOD, độ phân giải, ánh sáng và giải phóng tài nguyên GPU. |
| `input-router` | Phím, chuột, cảm ứng; chỉ nhận lệnh khi vùng game đang hoạt động. |
| `simulation` | Thời gian mô phỏng, sông nước, va chạm, trạng thái thuyền và chiến đấu. |
| `command-ai` | Cấp chỉ huy, mệnh lệnh, tổ trưởng và hành vi đồng đội. Tất cả tính toán tại client. |
| `campaign` | Nhiệm vụ, hội thoại, sự kiện lịch sử/tái dựng, hậu quả và mở khóa. |
| `save-repository` | Lưu/đọc dữ liệu riêng theo UID và phiên bản; có cache cục bộ. |
| `asset-manifest` | Tên, nguồn, giấy phép, kích thước, tải lười và vòng đời từng tài nguyên. |

Các module giao tiếp qua đối tượng phiên tường minh (`GameSession`/API nội bộ). Không đăng thêm API global trên `window`.

## 3. Vòng đời và cô lập

- `start`: tạo phiên, tải tài nguyên cần cho màn hiện tại, đăng ký listener bằng `AbortController`, mở âm thanh sau tương tác rõ ràng và bắt đầu một vòng lặp duy nhất.
- `pause`: dừng mô phỏng theo hành động người chơi hoặc trạng thái trang; riêng mở bản đồ chiến thuật không dừng đồng hồ mô phỏng theo yêu cầu gameplay.
- `stop/dispose`: hủy `requestAnimationFrame`/timer, abort listener, nhả phím giữ, dừng âm thanh, giải phóng geometry/material/texture, bỏ pointer capture và xóa UI phiên.
- `visibilitychange`/`pagehide`: dừng render ẩn nền và lưu checkpoint an toàn; khi rời game chạy `dispose` đầy đủ.
- Bàn phím chỉ được xử lý khi canvas/root game có focus hoặc con trỏ bị khóa. Bỏ qua `input`, `textarea`, `select`, `[contenteditable]`; không `preventDefault` phím trong phòng thi.
- Cảm ứng dùng tọa độ theo `getBoundingClientRect` và kích thước canvas thực; chỉ chặn cử chỉ trong vùng điều khiển game, không khóa cuộn/zoom toàn trang.

## 4. Khung dữ liệu và lưu tiến độ

Đường lưu đề xuất: `gameBachDang938/{uid}/versions/{saveVersion}/slots/{slotId}`. Tên collection và quy tắc cuối cùng sẽ được kiểm tra với cấu trúc dự án trước khi lập trình.

Mỗi slot lưu checkpoint, không ghi mỗi frame:

- `schemaVersion`, `saveVersion`, `updatedAt`, `campaignId`, `chapterId`, `checkpointId`.
- Lựa chọn nhân vật, trạng thái nhiệm vụ, quyết sách, vật tư, tuyến tiếp tế và cấp chỉ huy.
- Danh sách đơn vị theo ID ổn định, cấp chỉ huy, kinh nghiệm, trạng thái thương/vắng mặt/tử trận và trang bị.
- Sổ hậu quả/mất mát dạng append-only để không âm thầm phục sinh người đã tử trận khi tải lại.
- Cache cục bộ theo UID + phiên bản để phục hồi khi offline; không dùng lại tên khóa localStorage của game cũ.

Quy mô hơn 400 người không nên cập nhật theo frame. Nếu kích thước hồ sơ vượt giới hạn tài liệu thực tế, chia sổ đơn vị theo nhóm/checkpoint và đo trước khi chốt schema. Quy tắc Firestore hiện không cấp quyền cho collection mới. Chỉ bật cloud save sau khi có rules riêng, kiểm tra quyền sở hữu UID và test emulator; không triển khai Rules production trong các chặng cục bộ.

## 5. Hiệu năng và chất lượng

- Chất lượng được chọn trước trận và ghi nhớ trên thiết bị: tự động, tiết kiệm, cân bằng, chi tiết. Chọn mức dựa trên đo đạc, không chỉ User-Agent.
- Tải mô hình/âm thanh theo màn và theo khoảng cách; tạo pool cho đối tượng lặp; dùng LOD, culling và fixed-step simulation khi cần.
- Render có thể giảm tần số khi tab ẩn; mô phỏng không dùng số khung hình làm đơn vị thời gian.
- Hơn 400 quân không đồng nghĩa với 400 vòng lặp DOM/mesh không tối ưu: tách mô phỏng trạng thái, hiển thị nhóm/LOD và cập nhật UI theo nhịp giới hạn.
- Tôn trọng `prefers-reduced-motion`, vùng an toàn và cấu hình cảm ứng; PC giữ đầy đủ tùy chọn hình ảnh.

## 6. Firebase, chi phí và an toàn

- Firebase SDK hiện dùng qua ES modules. Game cần khởi tạo client từ cấu hình web đã được xác minh; cấu hình web không phải khóa quản trị.
- Auth dùng UID thật; rules chỉ cho phép chủ UID đọc/ghi dữ liệu của mình, giới hạn trường, phiên bản và kích thước dữ liệu.
- Chỉ đọc/ghi checkpoint hoặc sự kiện quan trọng; không đồng bộ trạng thái mỗi frame.
- Không có service account, admin key, Cloud Functions hoặc API AI trong trình duyệt.
- Rules local được phép chuẩn bị và kiểm thử ở chặng phù hợp. Không sửa Firebase production hay phát hành khi chưa được giao rõ.

## 7. Ranh giới chặng kế tiếp

Chặng 2 chỉ tạo vỏ route cô lập, trạng thái tải/chọn cấu hình và một liên kết mới từ thẻ Sa Bàn. Tiêu chí kiểm tra: hai đường vào cũ vẫn mở đúng trang; khi ở trang chủ không tải file game/mô hình/âm thanh mới; khi thoát route không còn loop/listener/tài nguyên phiên; mã game không nhận phím khi focus ở ô nhập của trang khác.

Các lựa chọn như phiên bản Three.js riêng, cách lưu thật trên Firestore và định dạng tài nguyên chỉ được khóa sau khi có kiểm tra tương thích/giấy phép. Chặng này chưa thay phiên bản Three.js r128 của game cũ.
