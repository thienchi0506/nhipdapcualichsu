# Bàn giao bản thử quân đội và chỉ huy

02/11/2026 · triển khai cục bộ trên route game mới. Đây là **bản thử chỉ huy trong một lượt**, chưa đạt toàn bộ cổng hoàn thành của chiến dịch: lưu thương vong bền vững và benchmark dài/thiết bị thật chưa có.

## Đã triển khai

- Tình huống giao chiến mặc định có 40 quân ta trong bốn tổ và 40 quân địch. Mỗi người có ID riêng, tổ, vai trò, vị trí, máu, tên, trạng thái `active/downed/wounded/dead`, thương tích và lịch sử có giới hạn. Người chết và bị thương không bị xóa hoặc hồi sinh trong lượt. Tuyển bổ sung tạo ID mới, không hồi sinh ID cũ.
- Tổ nhận lệnh cơ động, giữ/bảo vệ điểm, tiến công khu vực, cứu thương hoặc rút; có hủy/đổi lệnh, biên nhận chống xử lý trùng và thông báo khi điểm ngập, không có đường hoặc hết người. Đường A* trên lưới bờ dùng ngân sách theo tick; đội hình có giãn cách, kiểm tra đất/né chướng ngại, dừng khi thủ lĩnh tụt lại và tìm đường lại khi kẹt. Không dịch chuyển xuyên sông.
- Ngưỡng tổn thất tính trên quân số lúc xuất phát, không giảm mẫu số khi mất người. Chính sách cho phép tự rút về điểm tập kết hoặc cảnh báo tiếp tục giữ. Quân y tiếp cận gần người gục, dùng một phần thuốc và sau thời gian cứu chuyển người đó sang trạng thái bị thương; người chưa được cứu có thể tử trận.
- Tầm nhìn dùng lưới không gian và kiểm tra địa hình; mỗi quan sát ghi vị trí và tick, hiển thị tuổi tin. Tin cũ giữ vị trí từng thấy rồi hết hạn, không cập nhật vị trí thật khi khuất. Nhân vật trực tiếp cũng phát hiện quân địch. Lính trên tàu cũ của sandbox hiện ẩn khi ngoài tầm nhìn nhân vật.
- Quân địch có tổ phòng thủ và tổ tiến tới kho, truy đuổi vị trí vừa quan sát, trở lại khu phòng thủ hoặc mục tiêu; đường bộ tránh vùng ngập/chướng ngại. Cung thủ dùng đạn từng người, bắn tiêu hao, ưu tiên địch gần nhìn thấy; có thể đánh hỏng kho. Lệnh bảo vệ được thực thi bằng giữ vị trí và tự bắn khi phát hiện địch.
- Kho hậu phương/tiền phương có tồn kho tên, thuốc, gỗ và quân bổ sung. Chọn loại/số hàng cho đoàn chuyển đường bộ, trừ hàng một lần lúc xuất phát; khi địch ở gần tuyến, đoàn giữ hàng và dừng, đến kho mới cộng hàng. Lính gần kho lấy tên, tổ lấy thuốc; sửa kho và tuyển người dự trữ vật tư một lần, hủy khi công nhân rời kho và hoàn phần dự trữ.
- Nhân vật và quân tổ cùng tham gia va chạm chiến đấu: chọn lính trong cảnh/khóa L, bắn tên thật hoặc cận chiến; cung thủ tổ cũng có thể bắn nhân vật. Mỗi mũi tên/đòn cận chiến có cause riêng, không đồng thời gây hit lặp lên cùng mục tiêu. Quân tổ vẫn chạy khi đang điều khiển/cận chiến với nhân vật, mở bản đồ không dừng trận; menu tạm dừng dừng toàn bộ.
- Hiện chưa dùng LOD mô phỏng: mỗi người được cập nhật trong cùng mô hình; hình người 3D dùng `InstancedMesh` chỉ là cách **hiển thị các người có state thật**. Không gọi API AI, không thêm thư viện hay dịch vụ có phí.

## Cách thử

Vào **Bạch Đằng 938 — Chiến dịch nhập vai**, giữ tình huống **Lái → áp mạn → giao chiến**, bắt đầu rồi bấm M/Bản đồ. Chọn một tổ, loại nhiệm vụ và ngưỡng rút; chạm bản đồ chọn điểm hoặc nhập X/Z trên phần đất rồi **Giao lệnh**. Chọn tổ khác và giao mục tiêu riêng; đóng bản đồ để điều khiển nhân vật. Tổ báo đang tìm đường, di chuyển, giữ hoặc bị chặn; có thể hủy/đổi lệnh.

Chọn hàng và số lượng tối đa 40 rồi bấm **Chuyển tiếp tế** để chuyển từ kho hậu phương tới kho tiền phương. Để **Tuyển bổ sung** hoặc **Sửa kho**, đưa một tổ còn người đến gần kho phù hợp; sửa cần kho bị hỏng và đủ gỗ, tuyển cần thiếu người và còn nguồn bổ sung. Đi tới lính địch và dùng L/chạm mô hình để chọn mục tiêu; đổi cung hoặc cận chiến như hướng dẫn trong game.

## Mô hình và ranh giới

Đơn vị mét, tick 30Hz, không dùng giờ thực làm quyết định sim. `army.js` sở hữu state từng người, tổ, kho, tuyến, lệnh và event; `session.js` bước hệ quân đội một lần sau encounter trên cùng tick. Input gửi command; scene chỉ đọc state. Lệnh được lưu bằng command ID của phiên; không cho lệnh trùng trừ kho hai lần. `army-config.js` tập trung các mặc định của bản thử. Tầm nhìn cá nhân được phân đều qua 15 tick thay vì tính đồng loạt; không xóa state người ở xa.

Đây là mô hình gần đúng: quân tổ bắn theo kiểm tra tầm/địa hình và sát thương tại tick, chưa có đường bay/hiệu ứng tên riêng cho từng quân tổ. Tên của nhân vật vẫn là projectile có va chạm. Cứu hiện là **ổn định thương binh tại chỗ**, chưa mang/di tản/chữa khỏi; tổ chỉ nhận đường bộ, chưa lên/xuống thuyền hoặc vận chuyển hàng qua sông. Kho được sửa bởi tổ; sửa bộ phận thuyền vẫn do cơ chế sông trước đó. Phòng thủ/truy kích là AI tình huống, chưa có đội trưởng liên lạc trễ, sương mù/che khuất mesh đầy đủ, công sự hoặc lệnh cấp chiến dịch.

**Chưa có journal/lưu chiến dịch:** ID, thương tích, người chết, công việc và hàng chỉ bền trong một lượt trên RAM; chơi lại/tải lại tạo lượt thử mới. Do đó chưa đáp ứng luật giữ mất mát qua retry, chưa thể coi là chương hoàn chỉnh. Phải triển khai transaction/journal theo [save-and-recovery.md](save-and-recovery.md), không dùng kết quả sandbox làm bằng chứng đã lưu vĩnh viễn.

## Kiểm tra và đo sơ bộ

- [Kiểm tra core](evidence/army-2026-11-02/army-core.json): **36/36**, gồm ID/trạng thái, hai tổ, đổi/hủy lệnh, đường không thông, ngưỡng rút, fog/tin cũ, hai bên bắn, quân y tiếp cận thương binh, tử trận, đạn/kho/tuyến bị địch chặn, sửa/tuyển/hoàn vật tư, replay deterministic, và va chạm giữa nhân vật với lính tổ. Đây là fixtures có thiết lập trạng thái, không thay cho chơi tự nhiên.
- [Chơi thử giao diện](evidence/army-2026-11-02/army-ui.json) **12/12**: giao hai tổ mục tiêu khác nhau, chuyển thuốc bằng UI, lái → nhảy sang tàu → cận chiến và xác nhận hai tổ tiếp tục di chuyển, hủy lệnh, pause/thoát, map 320px cuộn và nút đóng. Được thao tác bằng bàn phím/chuột/touch emulation, không tiêm vị trí hay máu trong luồng chơi. [Fixture cảnh 3D](evidence/army-2026-11-02/army-scene.json) kiểm tra ray chọn mô hình lính trả đúng ID; fixture này có đặt sẵn vị trí riêng và không phải chơi tự nhiên.
- [Sông](evidence/combat-2026-11-02/physics-checks.json) **47/47**, [nhân vật/cận chiến](evidence/army-2026-11-02/character-checks.json) **45/45**, [vòng chơi nhân vật](evidence/army-2026-11-02/combat-ui-checks.json) **17/17**, [lỗi/cleanup](evidence/army-2026-11-02/edge-checks.json) **21/21**. Bộ vòng đời/liên kết và 320–430px: xem [browser-checks.json](evidence/army-2026-11-02/browser-checks.json).
- [Đo quy mô](evidence/army-2026-11-02/army-benchmark.json): mô phỏng 50/100/200/400/480 quân **mỗi bên**, tổng 100/200/400/800/960 người, có giao tranh, bắn và thương vong thực. Kiểm tra ID duy nhất, không thấy người chết/bị thương tự trở lại active trong mẫu.

Thời gian dưới đây là **p95 ms của từng pha riêng**, không cộng p95 để suy ra thời gian frame. Cột tìm đường chỉ tính những tick có việc trong hàng đợi:

| Quân ta + địch | Tìm đường đang hoạt động | AI | Chiến đấu |
|---|---:|---:|---:|
| 50 + 50 | 0,2 | 0,4 | 0,1 |
| 100 + 100 | 0,3 | 0,7 | 0,2 |
| 200 + 200 | 0,8 | 2,3 | 0,8 |
| 400 + 400 | 0,5 | 9,2 | 2,8 |
| 480 + 480 | 0,2 | 8,5 | 3,3 |

Đây là **một phép đo ngắn**, 240 tick/mức, 60 tick khởi động và 180 tick lấy mẫu, Chrome headless trên máy hiện tại. Không bao gồm renderer, callback nhân vật, journal, GPU hay điện thoại. Mức 400/480 có riêng pha AI p95 vượt ngân sách CPU mục tiêu 8ms/tick; chưa được coi là đạt gate 400+. Cần benchmark theo ma trận [hiệu năng](performance-and-art.md): khởi động 60 giây, lấy mẫu 180 giây × 3 lần, cảnh đầy đủ và thiết bị thật, cùng kiểm tra dài hạn 25 phút. Không suy ra FPS từ bảng này.

Ảnh kiểm tra: [giao lệnh hai tổ](evidence/army-2026-11-02/orders-desktop.png), [nhân vật cận chiến khi tổ tiếp tục](evidence/army-2026-11-02/melee-while-squads-move.png), [bản đồ mobile 320px](evidence/army-2026-11-02/army-mobile-320.png).

## Phạm vi tệp và chạy lại

Mã mới: `src/sim/army-config.js`, `src/sim/army.js`, `tests/army-tests.js`. Nối vào `src/sim/encounter.js`, `src/app/{session,bootstrap}.js`, `src/presentation/scene.js`, `index.html`, `styles/game.css` và `tests/index.html`. Không sửa mã hai game cũ, Auth/Firebase, đề thi hoặc kiến thức. [Đối chiếu mã bảo toàn](evidence/army-2026-11-02/source-integrity.json) đối chiếu với hash trước chặng nhân vật và các tệp mới.

Chạy HTTP localhost từ gốc repo, rồi chạy các script trong `evidence/army-2026-11-02/`: `check_army_core.py`, `check_army_scene.py`, `check_army_ui.py`, `check_combat.py`, `check_edges.py`, `check_shell_regression.py`, `benchmark.py`, `check_source.py`. Chrome dùng profile tạm, chặn backend Firebase. Mở `game-bach-dang-938/tests/index.html` để chạy các fixture core trong browser.
