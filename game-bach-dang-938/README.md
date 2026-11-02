# Bạch Đằng 938 — sông nước, nhân vật và chiến đấu

Khung game, sông nước và lớp chiến đấu trực tiếp, 02/11/2026. Chạy bằng HTTP từ thư mục gốc repository:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/trang-chinh.html`, chọn **Bạch Đằng 938 — Chiến dịch nhập vai** trong thẻ Sa Bàn. Có thể mở trực tiếp `http://127.0.0.1:8765/game-bach-dang-938/index.html`. Không dùng `file://` vì ES modules và fetch cần HTTP.

## Đã có

- Chọn một trong bốn vai trò hư cấu, chọn ba mức đồ họa; ghi nhớ theo trình duyệt bằng `dcls.bd938.preferences.v1`. Nếu storage bị chặn vẫn chơi thử được.
- Tải dữ liệu cảnh, module 3D/Three r128 riêng và dựng shader; tiến độ đếm các công việc thực tế đã xong.
- Cảnh bến thử, avatar phân biệt đồng đội/địch, vũ khí và mục tiêu; camera toàn cảnh hoặc theo nhân vật, kiểm tra vật cản. Mô hình hình học tạm, không phải mỹ thuật cuối.
- WASD/phím mũi tên khi canvas có focus, D-pad cảm ứng nhấn giữ, kéo cảnh để xoay, cuộn để đổi khoảng nhìn, C đổi camera, Esc tạm dừng.
- Bắt đầu → nghỉ/tiếp tục → kết thúc lượt thử → chơi lại/chọn lại/về Sa Bàn; tự pause khi mất focus hoặc ẩn trang. Không tự chạy tiếp khi browser Back trở lại.
- Dọn scene, RAF, input listeners, observer, geometry/material, shadow targets và WebGL context khi chọn lại/thoát. Shell giữ các handler điều hướng nhẹ phục vụ bfcache, không giữ input hoặc render loop của phiên.
- Thuyền tăng/giảm tốc và quay có quán tính, trôi theo dòng, mớn theo tải/nước rò, bãi cạn/cọc/triều, hư hại bộ phận và công việc gỡ/sửa. Chọn thuyền nhẹ/vận tải cùng năm tình huống ở màn chọn nhân vật.
- Bảng “Thuyền & xử lý nguy hiểm”: neo, gỡ, sửa, bơm, bỏ hàng; HUD độ sâu/mớn/triều/dòng và cảnh báo. Space/F/R/B/X tương ứng khi canvas có focus.
- E rời lái/nhận lái tại đuôi, đi trên boong chuyển động hoặc bến/bờ; G nhảy áp mạn, đồng đội có lệnh theo/giữ. Bơi theo dòng và cứu có điều kiện/thời gian; không tự về vị trí an toàn.
- J đánh/bắn, Q đỡ/đỡ đúng lúc, V né, L chuyển khóa; F đổi Cung/Kiếm khi đi bộ, Space nhảy. Cận chiến có sức bền, phản đòn và choáng; tên bay/sweep va chạm, mỗi đòn/tên giải sát thương hữu hạn.
- M mở bản đồ khi trận vẫn chạy; Esc/Tạm dừng đóng băng cả mô phỏng. Nhân vật chính bị thương → sĩ quan dự bị tiếp quản tại vị trí thật; hết dự bị mở kết quả/chơi lại. Cảm ứng dùng các nút riêng, hỗ trợ đa chạm và pointercancel.
- Tình huống giao chiến có bốn tổ quân ta và địch, ID/sức khỏe/đạn từng người; map cho lệnh, rút theo ngưỡng, fog/tin cũ và tiếp tế đường bộ. Tổ tiếp tục làm nhiệm vụ khi người chơi cận chiến. Chế độ có lưu giữ hậu quả qua tải lại và kết toán trước khi retry; chưa có di tản thương binh/vận tải đường sông đầy đủ.
- Lưu không bắt buộc: không lưu / IndexedDB riêng trên máy / tài khoản Firebase hiện hữu. Có trạng thái ghi cục bộ, đồng bộ, lỗi và xung đột; không xóa outbox khi đăng xuất. Bản lưu lớn được chia phần bất biến trước khi cập nhật head.

## Phạm vi

Đã có sandbox giao chiến, lưu và retry có giữ hậu quả. Chưa có chương chiến đấu hoàn chỉnh hoặc AI chỉ huy cấp chiến dịch; 400+ quân mới được đo ngắn và kiểm tra lưu, chưa qua gate FPS. Không phát thưởng/điểm hoặc ghi khóa tiến độ cũ. Mô hình 2.5D, dòng giải tích, mặt nước phẳng; hình học/nhân vật còn tạm. Cọc dùng cùng dữ liệu render/sim. Đồng bộ tài khoản cần chủ dự án áp dụng Rules đã kiểm thử; xem [bàn giao lưu](../docs/game-bach-dang-938/save-handoff.md) và [hướng dẫn Firebase](../docs/game-bach-dang-938/firebase-save-setup.md).

Không tải `site-music.js` hoặc runtime game cũ. Khung này chưa tạo AudioContext/âm thanh riêng. Hai link game cũ giữ nguyên; không commit/push/deploy trong chặng cục bộ.

Tham số sông/tình huống trong `data/river-config.json`, nhân vật/chiến đấu/camera trong `data/character-config.json`; `data/shell-scene.json` giữ vai trò/đồ họa. `src/sim/` và `src/core/clock.js` sở hữu mô phỏng; input/renderer không sửa state trực tiếp. Three.js 0.128.0 pin tại `vendor/three-r128/`, kèm MIT LICENSE, URL nguồn và SHA-256. Không tải CDN engine khi chơi.

Xem [bàn giao quân đội](../docs/game-bach-dang-938/army-handoff.md), [bàn giao chiến đấu](../docs/game-bach-dang-938/combat-handoff.md), [luật nhân vật/cứu/tiếp quản](../docs/game-bach-dang-938/character-model.md), [mức xấp xỉ sông](../docs/game-bach-dang-938/river-model.md) và [kiến trúc](../docs/game-bach-dang-938/architecture.md). Mở `tests/index.html` để chạy fixture sông, nhân vật và quân đội; đây không phải benchmark FPS.
