# Bằng chứng kiểm định 03/11/2026

Commit kiểm tra `03aedcd8d85924a35329580774e53d117870284a`; Chrome 156.0.8078.80, Windows, headless/SwiftShader, profile tạm. Không có runtime edit, deploy hay dữ liệu production. [Kết luận](../../release-audit.md).

## Chạy lại

Từ root repository, Python 3.12 đã có `websocket-client`, Chrome cài sẵn:

```powershell
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/serve.py
```

Giữ server trong phiên riêng. Nó phục vụ root ở 8765 và prefix bắt buộc `/nhipdapcualichsu/` trên 8767. Chạy các script **lần lượt**, không chạy nhiều Chrome/performance workload cùng lúc:

```powershell
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/static_audit.py
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_current.py
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_routes.py
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_boundaries.py
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_boundaries.py --followup
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/run_remaining.py
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_legacy_mechanics.py
```

`run_remaining.py` hiện bao gồm combat, edges, legacy switch, performance và cycles. Lượt đầu của phiên kiểm định đã chạy cycles riêng vì runner được bổ sung sau khi tiến trình cũ bắt đầu. Không cần chạy cycles hai lần.

`verify_routes.py`, `verify_combat.py`, `verify_edges.py` được sao chép từ harness bước 11, chỉ chuyển thư mục output; kết quả JSON/PNG ở đây là **chạy mới**, không sao chép báo cáo. `requirements-probes.js` là fixture bổ sung độc lập cho kết thúc/rút lui/restore/render, không thuộc runtime.

## Emulator

```powershell
python -X utf8 docs/game-bach-dang-938/evidence/release-2026-11-03/verify_emulators.py
```

Script dùng Node/JRE/firebase-tools/rules-unit-testing **đã có trong temp** theo `../save-2026-11-02/temp-tools.json`, tạo cấu hình tạm riêng và chỉ chạy `demo-bd938-save`. Nếu các công cụ temp đã bị dọn, cần chuẩn bị lại toolchain local rồi cập nhật đường dẫn; không dùng tài khoản/project production thay thế.

Rules thử đầu tiên là `firestore.rules` gốc: xác nhận chủ slot game bị từ chối. Sau đó nạp Rules gốc + fragment mới và chạy các test quyền/SDK/Auth. `rules-under-test.txt` là bản Rules ghép đã kiểm thử, **không phải cấu hình đã deploy**. `emulator-run.log` đã bỏ dòng dump biến môi trường của CLI; giữ kết quả/lỗi kiểm thử. Không xuất token hoặc thông tin tài khoản thật.

## Đọc kết quả

- `current-validation.json`: 197 kiểm tra core/lưu mới; probe kết thúc/rút lui, khôi phục, homepage lazy-load, focus/resize và prefix.
- `requirements-probes.js`: ghi rõ fixture; `eliminated.phase=active` và `retreat.missionResults=null` là khoảng trống chức năng thật, không phải một trận được người chơi hoàn thành tự nhiên.
- `combat-observations.json` + ảnh: input thật tới sĩ quan dự bị tiếp quản.
- `routes-observations.json`, `legacy-switch.json`, `legacy-mechanics.json`: đường vào cũ, đề 22+2, hai lỗi chuyển trận cũ, fixture cơ chế 56/56.
- `boundaries.json`: giữ lần đầu popup bị chặn và click trang chủ chưa điều hướng, cũng như kiểm tra kho kiến thức/login/lỗi asset thành công. `boundaries-followup.json`: chạy lại hai cửa sổ và lưu/offline với harness đã xử lý đúng user gesture/navigation.
- `rules-emulator.json`, `browser-emulator.json`, `auth-emulator.json`, `current-rules-gap.json`: 20/20, 15/15, 7/7 và khoảng trống Rules hiện hành.
- `performance-current.json`, `cycles-current.json`: đo mới, 5 vòng vào/ra cùng document, hủy tải, render ba mức không đổi 960 người; không phải benchmark thiết bị thật.
- `source-audit.json`: so hash nguồn bảo toàn và thư viện/giấy phép; `integrity.json` đối chiếu runtime với HEAD cuối lượt.

Trường `newPrefixedElements` trong probe trang chủ đếm cả thẻ liên kết mang ID `bd938-entry`; không phải số canvas. Nhãn này đã được sửa từ tên sai `newCanvas` của phiên bản harness đầu, không thay đổi giá trị quan sát.

Các screenshot là bằng chứng bổ trợ cho chuỗi tương tác và log; không dùng một ảnh để khẳng định cả luồng chơi đúng. Kiểm tra mobile chỉ giả lập viewport. Dừng các máy chủ local bằng Ctrl+C sau khi hoàn tất.
