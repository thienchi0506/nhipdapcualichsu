# Bàn giao nhân vật và chiến đấu trực tiếp

02/11/2026 · cục bộ, chưa phát hành. Luật, hợp đồng state/event, bơi/cứu và mức xấp xỉ ghi tại [character-model.md](character-model.md).

## Kết quả

Đã ghép nhân vật với mô phỏng sông hiện có trong route game mới: đi trên bờ/boong chuyển động, lái/rời/nhận lái, hai camera, chọn/khóa mục tiêu, cung đạn đạo, cận chiến/sức bền/đỡ/phản đòn/né/choáng, nhảy áp mạn và đồng đội theo. Rơi nước phải tự bơi hoặc được cứu theo khoảng cách/tốc độ/đồng đội/thời gian; không có hồi vị trí an toàn vô điều kiện. Nhân vật chính gục là bị thương; An/Bình tiếp quản lần lượt tại vị trí thật, hết dự bị dừng lượt thử và mở kết quả.

Tình huống **Lái → áp mạn → giao chiến** được chọn mặc định. Các tình huống sông cũ vẫn chọn được. Mô hình/người/vũ khí là hình học tạm, không phải mỹ thuật cuối hoặc nhân vật lịch sử đã xác minh.

## Tự chơi lại chuỗi kiểm tra

1. Chạy HTTP từ gốc repo, mở game qua thẻ Sa Bàn; chọn nhân vật, tình huống giao chiến và đồ họa Tiết kiệm/Cân bằng, đọc hướng dẫn rồi bắt đầu.
2. Ở tay lái, giữ W đi về thuyền cờ đỏ; M mở bản đồ và quan sát đồng hồ/thuyền vẫn chạy. Đóng map rồi điều khiển tiếp; Esc/Tạm dừng mới dừng trận.
3. Đến gần đuôi thuyền địch thì Space neo, chờ giảm tốc. E rời tay lái, C chuyển theo nhân vật; đi tới mũi/mép boong rồi G. Nếu quá xa/quá nhanh/thiếu sức sẽ có lý do từ chối. Đừng đi thẳng qua mép rồi mới bấm G.
4. Chạm/click lính địch hoặc L để khóa. J/nút Đánh dùng vũ khí đang chọn; nút Cung/Kiếm hoặc F khi đi bộ đổi vũ khí. Giữ Q đỡ, V né. Đồng đội theo/giữ có trong panel hệ thống, dùng được cả mobile.
5. Đứng chịu giao chiến trên boong địch để quan sát hero gục. Sau 3s camera và quyền điều khiển chuyển về sĩ quan dự bị còn sống trên thuyền ta; hero vẫn bị thương bên kia, không hồi/đổi chỗ.
6. Pause rồi chơi lại/chọn lại/về Sa Bàn: mọi input giữ được xóa và tài nguyên phiên được dọn. Replay tạo lượt thử mới vì chặng này chưa có journal chiến dịch.

WASD đi bộ theo hướng camera; Shift chạy; Space nhảy khi đi bộ/neo khi lái. Nút hướng và Đánh/Đỡ có thể giữ đồng thời bằng hai ngón. F khi lái là gỡ mắc; R/B/X lần lượt sửa/bơm/bỏ hàng. Các phím chỉ nhận khi canvas có focus; nút và map hoạt động trong vùng game.

## Kiểm tra đã chạy

| Bộ | Kết quả | Phạm vi |
|---|---:|---|
| [Nhân vật/chiến đấu core](evidence/combat-2026-11-02/character-checks.json) | 45/45 | Boong chuyển động, bến/bờ, áp mạn cạnh bên/tốc độ/khoảng cách, hụt thuyền/rơi, đồng đội theo/nhường, sức bền, parry/counter/block/dodge/stun, melee hữu hạn, tên sweep tốc độ cao/vật cản/tên lạc, cứu/hủy cứu/hết sức, map giữ ga cả khi UI đổi focus, đủ hai lượt dự bị và hết người. |
| [Chơi thực và đa chạm](evidence/combat-2026-11-02/combat-ui-checks.json) | 17/17 | Input thật cho bow hit, đổi camera giữ khóa, lái → map → áp mạn → nhảy → mouse pick → melee → hero tự gục vì địch → dự bị. Hai ngón tiến/đỡ, nhả riêng/cancel, pause và cleanup. |
| [Sông nước hồi quy](evidence/combat-2026-11-02/physics-checks.json) | 47/47 | Các invariant nước/cọc/gỡ/sửa và lịch render khác nhau của chặng trước. |
| [Giao diện/vòng đời](evidence/combat-2026-11-02/browser-checks.json) | 62/62 | 320/360/375/390/430px, desktop 1365×900; touch target, 5 vòng mở/đóng, replay, link 2D/3D cũ, thư viện/phòng thi, trang chính không tải game mới. |
| [Biên/lỗi/tách input](evidence/combat-2026-11-02/edge-checks.json) | 21/21 | Landscape 844×390, blur/Back, nhập vào ô tìm kiếm sau thoát, network hỏng/chậm/hủy, WebGL mất/không có, storage bị chặn, lặp bấm và kiểm chứng RAF/context/listeners. |

Core fixtures có thiết lập vị trí/máu/tốc độ riêng để kiểm tra invariant; không được coi là chơi tự nhiên. Chuỗi 17 ca UI dùng bàn phím/chuột/chạm vào game sản phẩm, không ép máu hoặc vị trí để tạo gục/tiếp quản. Việc hết cả hai sĩ quan được kiểm tra ở core; chưa khẳng định đã chơi tự nhiên tới hết dự bị trong browser.

Chrome headless 156/SwiftShader, profile tạm, backend Firebase bị chặn; không ghi tài khoản hoặc dữ liệu production. Chưa kiểm tra điện thoại vật lý, iOS/Safari/Firefox, gamepad hoặc 50–400+ quân. Không có cam kết FPS từ các kiểm tra này.

Ảnh: [bắn cung/góc theo](evidence/combat-2026-11-02/bow-follow-camera.png), [map khi trận chạy](evidence/combat-2026-11-02/tactical-map-live.png), [sang tàu/cận chiến](evidence/combat-2026-11-02/boarded-melee.png), [dự bị tiếp quản](evidence/combat-2026-11-02/reserve-takeover.png), [mobile 390px](evidence/combat-2026-11-02/combat-mobile-390.png).

## Tệp thay đổi

Thêm `data/character-config.json`, `src/sim/actor-space.js`, `src/sim/encounter.js`, `tests/character-tests.js`. Nối vào `src/app/{loader,input,session,bootstrap}.js`, `src/presentation/scene.js`, `styles/game.css`, `index.html`, `tests/index.html` và README của game mới. `data/river-config.json` thêm scenario; `sim/vessel.js` nhận analog intent và chướng ngại động tùy chọn, không thay API mặc định cho test sông.

Chặng này chỉ đổi route mới và hồ sơ của nó; trang chính/lối vào đã tích hợp từ chặng trước giữ nguyên. [Đối chiếu mã nguồn](evidence/combat-2026-11-02/source-integrity.json) đạt 17/17, 235 tệp website cũ giữ hash so đầu chặng và bản pin Three.js không đổi. Không đổi Auth/Rules, ngân hàng đề, kho kiến thức hay luật hai game cũ. Không thực hiện commit/push/deploy trong thao tác bàn giao này.

## Lỗi đã tìm và xử lý

- Hành khách phải nhận pose thuyền một lần; đi bộ chỉ đổi vị trí cục bộ, tránh cộng delta thuyền hai lần hoặc trượt chân qua boong.
- Đo khe boong bằng các cạnh xoay, không chỉ dùng tâm; cú nhảy kiểm tra cả tốc độ tương đối và quãng người phải đi.
- Đồng đội theo có thể chắn lối giữa hai sĩ quan trên boong hẹp. Thêm nhường đường/tiếp xúc mềm cho đồng đội và cho phép rời khỏi chỗ chồng; không bỏ va chạm với địch.
- Lệnh/held input cũ không được đi tiếp sau tiếp quản, map hay rời lái. Thêm control epoch, xóa hàng đợi và giải từng pointer capture.
- Mở map bằng nút có thể chuyển focus trước tick xử lý, làm ý định giữ phím thành 0. Map ghi nhớ ga đã áp dụng ở tick trước, không phụ thuộc vào việc mở bằng bàn phím hay chạm.
- Tên dùng cả pose trước chuyển động boong để sweep tương đối, chạm vật/người đầu tiên thì kết thúc. Đòn vung chỉ resolve một lần và ledger chặn cause/target lặp.
- Công cụ CDP `touchEnd` liệt kê **ngón kết thúc**, không phải ngón còn lại. Ca kiểm tra được sửa theo event pointer thực thu được; không đổi logic game để che lỗi công cụ.

## Chạy lại

Tại gốc repository, chạy server riêng `python -m http.server 8765 --bind 127.0.0.1`, rồi:

```powershell
python docs/game-bach-dang-938/evidence/combat-2026-11-02/check_combat.py
python docs/game-bach-dang-938/evidence/combat-2026-11-02/check_physics.py
python docs/game-bach-dang-938/evidence/combat-2026-11-02/check_shell_regression.py
python docs/game-bach-dang-938/evidence/combat-2026-11-02/check_edges.py
python docs/game-bach-dang-938/evidence/combat-2026-11-02/check_source.py
```

Có thể mở `game-bach-dang-938/tests/index.html` để chạy 92 fixture core mà không dựng cảnh 3D. Runner yêu cầu Python có `websocket` và Chrome đường mặc định như chặng khảo sát.

Chặng tiếp theo cần journal/lưu mất mát, cứu thương/hồi phục sau chương, AI mệnh lệnh/hậu cần và chương 15–25 phút; không suy ra các phần đó đã xong từ sandbox chiến đấu này.
