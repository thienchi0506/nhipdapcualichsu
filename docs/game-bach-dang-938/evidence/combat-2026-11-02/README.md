# Bằng chứng chặng nhân vật/chiến đấu

Kết quả cuối: `character-checks.json` 45/45, `combat-ui-checks.json` 17/17, `physics-checks.json` 47/47, `browser-checks.json` 62/62, `edge-checks.json` 21/21 và `source-integrity.json` 17/17. Mỗi runner ghi đè báo cáo tương ứng khi chạy lại. Đọc [bàn giao](../../combat-handoff.md) để phân biệt fixture core, chơi thực, xấp xỉ và giới hạn.

- `check_combat.py`: core và chuỗi input thật, ảnh bắn/nhảy/cận chiến/tiếp quản/mobile.
- `check_physics.py`: sông core; các ca cadence là tính đúng fixed tick, không đo FPS.
- `check_shell_regression.py`: vòng đời và 5 chiều rộng mobile, liên kết cũ.
- `check_edges.py`: network, WebGL, focus, Back, storage, input/cleanup và landscape.
- `check_source.py`: đối chiếu hash đầu chặng, engine, imports/config và báo cáo. `hashes-before.json` là baseline, `hashes-after.json` và hash toàn route mới nằm trong báo cáo nguồn.

`combat-failure.png` là ảnh chẩn đoán **lượt giữa chặng**, khi đồng đội chặn đường trên boong; đã sửa. `initial-smoke.json`/`initial-desktop.png` là smoke đầu chặng. Chúng không phải kết quả cuối. Các ảnh `boarded-melee.png`, `reserve-takeover.png`, `combat-mobile-390.png` và báo cáo JSON thành công là lượt kiểm tra sau sửa.

Profile Chrome tạm và HTTP localhost, không gửi dữ liệu Firebase production; không phải thiết bị di động vật lý. Chi tiết chạy lại nằm trong bàn giao. Mã chạy game không import các fixture hay runner này.
