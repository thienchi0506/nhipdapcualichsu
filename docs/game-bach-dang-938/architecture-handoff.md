# Bàn giao chặng thiết kế kiến trúc

Ngày 01/11/2026 · HEAD nguồn `0393e604ef85c44615a0bfa859dd6865c7c9df45` cộng các thay đổi có sẵn được giữ nguyên.

## Đã hoàn thành trong chặng này

- Đọc toàn bộ quy định người dùng, hồ sơ khảo sát, lỗi nền và danh sách hồi quy; đối chiếu source nhạc/đăng nhập và trạng thái working tree.
- So sánh mô-đun trong trang chính, trang riêng và iframe; chọn **trang riêng + ES modules**, chỉ thêm một link ở thẻ Sa Bàn khi đến chặng code.
- Định nghĩa lifecycle, state ownership, command/event/API, sim clock/coordinates/replay, AI/chỉ huy, input/camera/UI/audio và các lỗi/teardown.
- Thiết kế journal, commit barrier, resume/retry/rút quân, bảo toàn người tử trận/vật tư/thưởng, UID/lease/migration, nhân vật chính bị thương và dự bị tiếp quản.
- Đặc tả chương mẫu khoảng 20 phút trong mục tiêu 15–25 phút, với mục tiêu/nhịp/trận/chiến thắng/thất bại/rút/hậu chiến; tách lịch sử và tái dựng.
- Đưa mặc định gameplay vào JSON tập trung, lập ngân sách hiệu năng và ma trận 50/100/200/400/480 quân phía ta, kế hoạch mỹ thuật/giấy phép.

## Hồ sơ bàn giao và truy vết yêu cầu

| Yêu cầu | Tài liệu/điểm kiểm tra |
|---|---|
| Cô lập game mới, bảo toàn lối vào/game/dữ liệu cũ | [architecture.md](architecture.md) §1–2; regression P01/P02/N02/I01–I04 |
| Vòng đời và map chạy trận/pause | architecture §3–4; contracts C04/C05/C08/C09 |
| Mô phỏng/nhân vật/combat/AI/camera/UI/audio/save | architecture §5; [system-contracts.md](system-contracts.md) §1–6 |
| Tọa độ/đơn vị/fixed tick/tái hiện | architecture §6; contracts C01/C06/C07 |
| Tham số tập trung, không luật cũ | [gameplay-parameters.md](gameplay-parameters.md), [gameplay-defaults.json](gameplay-defaults.json) |
| Mất mát/tài nguyên không lặp khi retry | [save-and-recovery.md](save-and-recovery.md) §2–4; S01–S05/S12 |
| Nhân vật chính sống, dự bị tiếp quản, về sau chặng | save §5; S06/S07; chapter §6 |
| Auth/private UID/version/offline/cloud không tính phí thêm | save §1/6; S08–S11; architecture §7 |
| Chương mẫu 15–25 phút/thắng/thua/rút/hậu quả | [chapter-sample.md](chapter-sample.md) §1–8; CH01–CH10 |
| 400+ người có identity; đo 50/100/200/400+ | [performance-and-art.md](performance-and-art.md) §1–3 |
| Mỹ thuật/nguồn/license, không hứa FPS | performance §4–5; [sources-and-assets.md](sources-and-assets.md) |

## Tệp tài liệu tạo/sửa

Sửa `README.md`, thay `architecture.md` bằng thiết kế 0.2. Bản 0.1 được chuyển vào [bản lưu](evidence/architecture-2026-11-01/architecture-0.1.md) để tra cứu, không còn là đặc tả hiện hành.

Tạo `system-contracts.md`, `save-and-recovery.md`, `chapter-sample.md`, `gameplay-parameters.md`, `gameplay-defaults.json`, `performance-and-art.md`, `architecture-handoff.md` và bộ kiểm tra/tệp hash/báo cáo trong `evidence/architecture-2026-11-01/`. Đây đều là tài liệu hoặc công cụ kiểm tra tài liệu; không có script được website import.

## Kiểm tra đã làm

[Báo cáo máy đọc](evidence/architecture-2026-11-01/design-validation.json) được tạo bằng [validate_design.py](evidence/architecture-2026-11-01/validate_design.py): kiểm tra JSON đề xuất, quan hệ tần số/thời gian/quân số/sức chứa/triều, liên kết nội bộ, UTF-8, whitespace, không tạo route runtime, `git diff --check` và hash mọi tệp đã được Git theo dõi ngoài docs trước/sau.

Lệnh chạy lại:

```powershell
python docs/game-bach-dang-938/evidence/architecture-2026-11-01/validate_design.py
```

Đây là **kiểm tra nhất quán hồ sơ**, không kiểm tra gameplay thực thi. Bộ game cũ 56/56 và ảnh browser là bằng chứng chặng khảo sát trước, không được tính là test game mới. Không cần chạy lại toàn bộ browser chỉ vì thêm Markdown/JSON chưa được website nạp.

Kết quả cuối: **31/31 kiểm tra hồ sơ đạt; 235 tệp được Git theo dõi ngoài docs có hash giữ nguyên; không có liên kết nội bộ hỏng; `git diff --check` đạt.** Các thay đổi chưa commit của người dùng vẫn giữ nguyên. Không khởi chạy website hoặc tạo benchmark mới trong chặng thiết kế này.

## Chưa triển khai hoặc chưa xác minh

- Chưa tạo route, link, renderer, core, AI, journal, Auth adapter, cloud rules hoặc chương chơi được.
- Chưa chơi thử/balance, benchmark số quân, kiểm chứng commit barrier trên thiết bị, đo GPU/FPS hay kiểm tra mobile thật cho game mới.
- Chưa chốt tên/ngoại hình bốn nhân vật, sơ đồ địa hình lịch sử, asset/giấy phép mới; tất cả con số mô phỏng là giả định thiết kế.
- Cloud production không thay đổi. Auth backend/Rules production/Pages settings vẫn có các giới hạn truy cập của khảo sát.
- Sáu lỗi nền B01–B06 chưa sửa; không phát sinh quyền sửa chúng từ chặng thiết kế này.

## Bước tiếp theo được chuẩn bị

Chặng vỏ cô lập: tạo route riêng với menu/tải/đồ họa/hướng dẫn/thoát, scene thử nhỏ và đúng một link mới. Dùng Auth mock và local namespace trước, đo không có tài nguyên game mới trên trang chính; teardown/Back/bfcache/input và các luồng cũ phải qua hồi quy. Sau đó mới làm core/journal để đủ nền cho tổn thất, rồi triển khai từng lớp chương mẫu.

**Dừng tại thiết kế trong lần bàn giao này** theo yêu cầu; không triển khai toàn game, commit/push/deploy hoặc sửa mã hoạt động.
