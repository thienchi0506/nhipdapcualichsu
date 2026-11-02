# Bạch Đằng 938 — Chiến dịch nhập vai

**Hồ sơ dự án · phiên bản 0.4 · 02/11/2026**

**Trạng thái:** Đã có khung riêng và lớp sông nước: quán tính/dòng/triều/mớn, va cọc, mắc/gỡ/sửa và HUD. Đã kiểm tra core và chạy tình huống thật cục bộ; chưa có chương chiến đấu, journal/lưu chiến dịch hoặc benchmark quân số. Chưa sửa Firebase production/phát hành. Xem [bàn giao sông nước](river-handoff.md), [mô hình xấp xỉ](river-model.md) và [chặng khung trước](shell-handoff.md).

Thư mục này là hồ sơ chuẩn cho game mới. Quy định trong hồ sơ người dùng gửi ngày 01/11/2026 có ưu tiên cao hơn các ý tưởng game Bạch Đằng cũ.

Hồ sơ khảo sát chi tiết: [survey.md](survey.md), [danh sách hồi quy](regression-checklist.md), [lỗi tồn tại trước game mới](preexisting-issues.md) và [bằng chứng/chạy lại](evidence/README.md).

Hồ sơ thiết kế để triển khai:

- [Kiến trúc và lựa chọn tích hợp](architecture.md): trang riêng + ES modules, vòng đời và ranh giới bảo toàn.
- [Hợp đồng hệ thống](system-contracts.md): state, commands, events, quyền ghi và API dự kiến.
- [Lưu và phục hồi](save-and-recovery.md): journal, retry giữ mất mát, tiếp quản, UID và cloud tắt mặc định.
- [Chương mẫu 15–25 phút](chapter-sample.md): mục tiêu, nhịp chơi, thắng/thua/rút và hậu chiến.
- [Tham số](gameplay-parameters.md) và [JSON mặc định đề xuất](gameplay-defaults.json).
- [Ngân sách hiệu năng và mỹ thuật](performance-and-art.md): kế hoạch 50/100/200/400/480 quân.
- [Bàn giao chặng thiết kế](architecture-handoff.md): kiểm tra đã làm, giới hạn và bước kế tiếp.

## 1. Phạm vi đã chốt

- Game web 3D, chơi đơn; ba đồng đội do AI cục bộ điều khiển. Không có co-op, PvP, phòng mạng hoặc máy chủ mô phỏng trận đấu.
- Chỉ thêm lựa chọn **“Bạch Đằng 938 — Chiến dịch nhập vai”** bên cạnh Sa Bàn 2D và Sa Bàn 3D hiện có.
- Giữ nguyên hai game cũ, mọi lối vào, nội dung, tiến độ và cách lưu của chúng. Không thay trang chủ hoặc chuyển framework toàn website.
- Ưu tiên trải nghiệm PC; có điều khiển cảm ứng và mức đồ họa phù hợp điện thoại.
- Làm một chương mẫu hoàn chỉnh trước. Chưa gọi toàn bộ chiến dịch là hoàn thành khi mới xong chương mẫu.
- Chương thường hướng tới 15–25 phút, có lưu tiến độ.
- AI binh sĩ chạy trên thiết bị; không dùng API AI tính phí, Cloud Functions hay dịch vụ cần trả phí.
- Không triển khai công khai, đẩy nhánh phát hành hoặc thay cấu hình Firebase production trong các chặng cục bộ.

## 2. Luật gameplay chuẩn

### Nhân vật, đồng đội và câu chuyện

- Có bốn nhân vật chính với tuyến truyện riêng; người chơi chọn một người, ba người còn lại làm chỉ huy AI.
- Nhân vật phát triển từ chỉ huy một đơn vị nhỏ tới phối hợp nhiều cánh quân.
- Câu chuyện tập trung vào đồng đội, niềm tin và trách nhiệm trước thương vong.
- Nhân vật, nhiệm vụ, lời thoại và cảnh không được sử liệu xác nhận phải được ghi rõ là **tái dựng hư cấu**. Không đặt lời thoại hư cấu trong ngoặc kép như lời lịch sử.

### Điều khiển và chiến thuật

- Chuyển được giữa góc nhìn sau lưng và góc chéo từ trên xuống; có bản đồ chiến thuật.
- Mở bản đồ không tạm dừng trận. Khi người chơi đang lái thuyền, thuyền giữ hướng và tự bắn trả.
- Khi nhân vật rời thuyền, phó tướng giữ vị trí, tự bắn trả và nhận lệnh.
- Có lái thuyền, bắn cung, đổ bộ, cận chiến, nhảy sang thuyền địch và nguy cơ rơi xuống nước.
- Cận chiến dùng sức bền, đỡ đúng lúc, phản đòn và sơ hở; không có phép thuật.
- Người chơi đặt mục tiêu và ngưỡng tổn thất; tổ trưởng AI tự thi hành.
- Có sương mù chiến trường; thông tin địch thu được trước đó có thể lỗi thời.

### Sông nước, hậu cần và tổn thất

- Mô phỏng độ sâu, tải trọng, dòng chảy, thủy triều, va chạm, hư hại bộ phận, mắc cọc và thoát mắc.
- Cho phép bố trí trận địa theo nguồn lực, địa hình và thời gian.
- Có tuyến vận chuyển, kho tiền phương, tiếp tế đạn, sửa chữa và cứu thương.
- Mục tiêu dài hạn là quản lý hơn 400 quân có danh tính và trạng thái theo cấp chỉ huy.
- Binh sĩ có thể tử trận vĩnh viễn. Nhân vật chính sống nhưng có thể bị thương; sĩ quan dự bị tiếp quản khi nhân vật gục. Hết sĩ quan dự bị thì chơi lại chặng và giữ sổ mất mát.
- Có thể rút quân, chịu hậu quả và bổ sung lực lượng.
- Kết quả phụ thuộc kỹ năng nhân vật, trang bị, nâng cấp thuyền, kinh nghiệm đơn vị và kỹ năng điều khiển của người chơi.

### Các luật cũ không áp dụng

Game mới **không dùng lại** bộ luật của ý tưởng trước: HP cố định 4.000/20.000/25.000, đếm ngược triều 15 giây, đội thuyền cố định sáu chiếc, điều kiện bảy tàu trúng cọc, hay chiêu cuối chim bồ câu. Đây là một game mới, không phải bản thay thế hay đổi thông số của game cũ.

## 3. Quy tắc độ chính xác lịch sử

- Lấy sử liệu và nghiên cứu có dẫn nguồn làm dữ kiện nền; ghi lại nguồn ngay trong hồ sơ từng nhiệm vụ.
- Tách UI **Sử liệu** khỏi UI **Tái dựng**. Dữ kiện có nhiều dị bản phải được chú thích, không khẳng định một phương án thành sự thật duy nhất.
- Bản đồ chiến trường, đội hình, nhân số, nhiệm vụ cá nhân và lời thoại chưa được nguồn xác nhận là giả định thiết kế.
- Nguồn tham khảo bước đầu và sổ giấy phép tài nguyên nằm tại [sources-and-assets.md](sources-and-assets.md).

## 4. Khảo sát codebase

| Thành phần | Hiện trạng đã kiểm tra | Ranh giới với game mới |
|---|---|---|
| `trang-chinh.html` | Trang chủ tĩnh; thẻ Sa Bàn hiện có đường vào 2D và 3D, ngoài ra còn các liên kết bảo tàng cũ. | Chỉ thêm một đường vào game mới ở thẻ Sa Bàn trong chặng tích hợp; giữ mọi liên kết cũ nguyên trạng. |
| `sa-ban.html` | Game canvas 2D cũ, có vòng lặp và trạng thái riêng. | Không thay mã, luật hoặc khóa lưu của game này. |
| `sa-ban-3d.html` | Game Three.js cũ, nạp Three.js r128 từ CDN; có runtime và biến global riêng. | Không sửa để biến thành game nhập vai mới; không nâng phiên bản Three.js dùng chung. |
| `tran-do-nhap-vai.html` | Game canvas 2D riêng (`#gameCanvas`, 1000×560), JavaScript nội tuyến, bảng thành tích localStorage. | Đây không phải game 3D mới; giữ trang và dữ liệu hiện có. |
| `game-runtime.js`, `game-upgrades-*.js` | Runtime/logic dùng bởi game hiện hành; đang có thay đổi chưa commit. | Game mới dùng namespace, vòng lặp, listener và tài nguyên riêng. |
| `dang-nhap.html`, `firebase-config.js` | Firebase Auth hiện hữu; cấu hình web được cung cấp qua biến cấu hình phía trình duyệt ở một số luồng. | Chỉ dùng cấu hình web công khai đã được xác minh; không đưa khóa quản trị/service account vào client. |
| `firestore.rules` | Quyền hiện chỉ định nghĩa cho `posts` và `comments`. | Chưa có quyền cho dữ liệu game; cần quy tắc riêng và kiểm tra trước khi bật đồng bộ. |
| `storage.rules` | Phạm vi hiện tại là tệp bài đăng trong `/posts/...`. | Game mẫu chưa cần tải tài nguyên người dùng lên Storage. |
| Tài nguyên `models/`, `images/`, `assets/` | Có mô hình GLB cỡ khoảng 16–76 MB; các mô hình cọc được đặt tên theo trận 1288. Chưa thấy sổ nguồn/giấy phép đi kèm. | Không đưa vào game 938 chỉ dựa vào tên hoặc hình thức; xác minh nguồn, niên đại và giấy phép trước. |

### Nền tảng và thay đổi đang có

- Website đang là HTML/CSS/JavaScript tĩnh; chưa thấy `package.json`, `firebase.json`, `firestore.indexes.json` hoặc thư mục `docs/` trước chặng này.
- Không tìm thấy `AGENTS.md` trong các tệp dự án được rà soát.
- Đầu chặng, nhánh `main` đã có thay đổi chưa commit ở `game-runtime.css`, `game-runtime.js`, `game-upgrades-3d.js`, `sa-ban-3d.html`, `sa-ban-nhu-nguyet.html`, `sa-ban.html`, `sanh-game.html`, `thao-truong.html`, `tools/game_browser_check.py` và `tools/game_regression_checks.js`. Các thay đổi này được giữ nguyên; chặng khảo sát không sửa các tệp đó.

## 5. Chặng triển khai và trạng thái

| Chặng | Nội dung | Trạng thái |
|---|---|---|
| 1. Khảo sát và hồ sơ | Đọc phạm vi, kiểm kê trang/tài nguyên/Firebase, xác lập ranh giới, kiến trúc sơ bộ và quy tắc nguồn. | **Hoàn tất** |
| 1A. Thiết kế kiến trúc | So sánh tích hợp, định nghĩa hệ thống/hợp đồng/lưu, chương mẫu, tham số, hiệu năng/mỹ thuật. | **Hoàn tất tài liệu** |
| 2. Vỏ game cô lập | Tạo route riêng, màn hình tải/chọn chất lượng, tích hợp một liên kết mới; kiểm tra trang chủ không tải mã/tài nguyên game mới. | **Hoàn tất khung và kiểm tra cục bộ** |
| 3. Chương mẫu — nền tảng và lưu | Vòng đời, core deterministic/journal, camera, điều khiển PC/mobile, thuyền/sông; test replay/retry trước combat có mất mát. | **Đã có lớp sông và fixture deterministic; journal/campaign save chưa làm** |
| 4. Chương mẫu — chiến đấu | Mệnh lệnh, AI đồng đội, va chạm, hư hại thuyền, bắn cung, đổ bộ và cận chiến. | Chưa làm |
| 5. Chương mẫu — chỉ huy/hậu cần | Sương mù, tuyến tiếp tế, sửa chữa/cứu thương, ngưỡng tổn thất, nhân sự và hậu quả. | Chưa làm |
| 6. Hoàn thiện và kiểm chứng | Soak/hồi quy/hiệu năng/mỹ thuật/độ chính xác; cloud chỉ xét bật ở chặng riêng sau Rules emulator, không chặn local save. | Chưa làm |

Không bắt đầu chặng tiếp theo trong lần bàn giao này.

## 6. Kiểm tra chặng 1

- Đã rà cấu trúc trang, điểm vào Sa Bàn, script/runtime game cũ, Firebase Rules và danh mục GLB.
- Đã tra cứu nguồn lịch sử và giấy phép thư viện; xem [sources-and-assets.md](sources-and-assets.md).
- Không có code game hay cấu hình production nào được thay đổi trong chặng này.
- `git diff --check` chạy sau khi tạo hồ sơ; kết quả được ghi trong báo cáo bàn giao.
