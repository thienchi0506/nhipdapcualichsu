# Bạch Đằng 938 — khung và mô phỏng sông

Khung game và lớp sông nước, 02/11/2026. Chạy bằng HTTP từ thư mục gốc repository:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mở `http://127.0.0.1:8765/trang-chinh.html`, chọn **Bạch Đằng 938 — Chiến dịch nhập vai** trong thẻ Sa Bàn. Có thể mở trực tiếp `http://127.0.0.1:8765/game-bach-dang-938/index.html`. Không dùng `file://` vì ES modules và fetch cần HTTP.

## Đã có

- Chọn một trong bốn vai trò hư cấu, chọn ba mức đồ họa; ghi nhớ theo trình duyệt bằng `dcls.bd938.preferences.v1`. Nếu storage bị chặn vẫn chơi thử được.
- Tải dữ liệu cảnh, module 3D/Three r128 riêng và dựng shader; tiến độ đếm các công việc thực tế đã xong.
- Cảnh bến thử, bốn thuyền/nhân vật có màu cờ và trang bị theo vai trò, camera toàn cảnh hoặc theo thuyền. Mô hình hình học tạm, không phải mỹ thuật cuối.
- WASD/phím mũi tên khi canvas có focus, D-pad cảm ứng nhấn giữ, kéo cảnh để xoay, cuộn để đổi khoảng nhìn, C đổi camera, Esc tạm dừng.
- Bắt đầu → nghỉ/tiếp tục → kết thúc lượt thử → chơi lại/chọn lại/về Sa Bàn; tự pause khi mất focus hoặc ẩn trang. Không tự chạy tiếp khi browser Back trở lại.
- Dọn scene, RAF, input listeners, observer, geometry/material, shadow targets và WebGL context khi chọn lại/thoát. Shell giữ các handler điều hướng nhẹ phục vụ bfcache, không giữ input hoặc render loop của phiên.
- Thuyền tăng/giảm tốc và quay có quán tính, trôi theo dòng, mớn theo tải/nước rò, bãi cạn/cọc/triều, hư hại bộ phận và công việc gỡ/sửa. Chọn thuyền nhẹ/vận tải cùng năm tình huống ở màn chọn nhân vật.
- Bảng “Thuyền & xử lý nguy hiểm”: neo, gỡ, sửa, bơm, bỏ hàng; HUD độ sâu/mớn/triều/dòng và cảnh báo. Space/F/R/B/X tương ứng khi canvas có focus.

## Phạm vi

Chưa có chiến đấu, AI chỉ huy, bản đồ chiến thuật, mất mát binh sĩ, journal bền vững, lưu chiến dịch hoặc đồng bộ UID/Firebase. Hư hại/vật tư sông chỉ thuộc lượt thử, replay khởi tạo lại. Không phát thưởng/điểm và không ghi các khóa tiến độ cũ. Mô hình 2.5D, dòng giải tích, mặt nước phẳng; hình học/nhân vật vẫn là placeholder. Cọc đã tham gia va chạm, dùng cùng dữ liệu render/sim.

Không tải `site-music.js` hoặc runtime game cũ. Khung này chưa tạo AudioContext/âm thanh riêng. Hai link game cũ giữ nguyên; không commit/push/deploy trong chặng cục bộ.

Tham số vật lý/tình huống trong `data/river-config.json`; `data/shell-scene.json` chỉ giữ vai trò/đồ họa. `src/sim/` và `src/core/clock.js` thay primitive `core/demo.js`. Three.js 0.128.0 pin tại `vendor/three-r128/`, kèm MIT LICENSE, URL nguồn và SHA-256. Không tải CDN engine khi chơi.

Xem [bàn giao sông nước](../docs/game-bach-dang-938/river-handoff.md), [mức xấp xỉ](../docs/game-bach-dang-938/river-model.md) và [kiến trúc](../docs/game-bach-dang-938/architecture.md). Mở `tests/index.html` để chạy các fixture core; đây không phải benchmark FPS.
