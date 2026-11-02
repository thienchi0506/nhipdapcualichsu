# Bằng chứng khảo sát và triển khai cục bộ

Chặng sông nước 02/11/2026: [river-2026-11-02](river-2026-11-02/), core/scheduler, tình huống chơi thật, hồi quy khung và lỗi/cleanup; diễn giải tại [river-handoff.md](../river-handoff.md). Các runner dùng HTTP :8765; bảng core cũng mở được tại `game-bach-dang-938/tests/index.html`. Lịch 5–144Hz là test đồng nhất kết quả, không benchmark GPU/FPS thật.

Chặng khung ngày 02/11/2026: [shell-2026-11-02](shell-2026-11-02/), gồm browser-checks, edge-checks, suite game cũ, hash nguồn và screenshots. Diễn giải/phạm vi tại [shell-handoff.md](../shell-handoff.md). Để chạy lại `check_shell.py`/`check_edges.py` trong thư mục đó, mở HTTP server gốc repo tại cổng 8765; công cụ dùng Chrome profile tạm, chặn backend production. Không dùng báo cáo chặng khảo sát/thiết kế làm test cho mã game mới.

Ngày chạy: 01/11/2026. Thư mục [audit-2026-11-01](audit-2026-11-01/) chứa JSON, screenshot và log, không chứa mã hoạt động của website.

## Tệp quan trọng

- `audit-summary.json`: kết quả chính, lỗi nền, phạm vi chưa xác minh và các lượt evidence đã hiệu chỉnh.
- `source-inventory.json`: kiểm kê từng HTML thật, script/assets, literal href, canvas, dòng truy cập storage, hàm và đường tệp thiếu.
- `additional-source-checks.json`: cỡ runtime/data/Rules, các cấu hình không tìm thấy, HTTP 200 trang chính và 404 video hero.
- `runtime-hashes-before.json`, `runtime-hashes-after.json`, `runtime-integrity.json`: chứng minh các tệp mã đang theo dõi không đổi trong chặng.
- `release-observations.json`: GET read-only GitHub API, Pages workflow/deployment/status và hash HTML public. Không chứa token.
- `release-workflow-jobs.json`: các bước thật của run Pages: checkout, Jekyll build, upload artifact, report build status và deploy; không thấy bước chạy test game.
- `browser-pages.json`: probe 11 trang × 2 viewport; có raw console/network và ảnh từng trang. Các lỗi `phase` của công cụ ở trang phụ được chạy lại trong `browser-pages-targeted.json`.
- `browser-flows.json`: lượt flow đầu. Dùng các file targeted bên dưới cho kết quả cuối của 2D, phòng thi và thẻ ghi nhớ.
- `browser-flows-2d-roundtrip.json`: bấm đúng nút đang hiện, tái hiện lỗi chuyển Như Nguyệt → Bạch Đằng; không xem lỗi selector của lượt đầu là lỗi app.
- `browser-flows-3d.json`: hướng dẫn, bắt đầu, pause, kết quả fixture, về bản đồ, đếm handler Như Nguyệt và nút chơi lại thật.
- `browser-flows-exam-flow.json`: toàn bộ thao tác nộp/làm lại dùng nút thật; đề de-01 mở 22+2.
- `browser-flows-library-flow.json`: số thẻ đo bằng phần tử con thật của grid, không dùng class phỏng đoán.
- `browser-flows-music-flow.json`: trạng thái audio và lựa chọn trước/sau bật, điều hướng, vào/ra phòng thi; mỗi lượt đưa preference tạm về tắt trước kiểm tra.
- `browser-flows-landing-navigation.json`: bấm từ index tới trang chính và quay lại.
- `legacy-game-checks.json`, `legacy-game-checks.log`, `legacy-game-process.json`: công cụ kiểm tra game đã có trong repo, kết quả assertion/console và mã thoát Python. Trong log có thể có HTTP ConnectionReset khi đóng trình duyệt; phân biệt với JS errors trong JSON.

Các screenshot có hậu tố `1365`/`390` là hai viewport khảo sát. `3d-result-fixture-*` là trạng thái kết quả được kích hoạt qua hàm game trong RAM profile tạm; không phải bằng chứng chơi thắng trọn trận. Các ảnh `2d-bach-dang.png`, `2d-nhu-nguyet.png`, `3d-bach-dang.png`, `3d-nhu-nguyet.png` do helper hiện có tạo.

## Chạy lại

Tại thư mục repo, mở server trong terminal riêng:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Sau đó dùng Python có module `websocket` và Chrome tại đường mặc định Windows:

```powershell
python -B -X utf8 docs/game-bach-dang-938/evidence/audit_capture.py --source --release --probe
python -B -X utf8 docs/game-bach-dang-938/evidence/audit_capture.py --probe --page sa-ban-nhu-nguyet.html
python -B -X utf8 docs/game-bach-dang-938/evidence/audit_flows.py
python -B -X utf8 tools/game_browser_check.py --output docs/game-bach-dang-938/evidence/audit-2026-11-01/legacy-game-checks.json --seconds 3 --checks --shot
```

Có thể dùng `audit_flows.py --only 2d-roundtrip`, `--only 3d`, `--only exam-flow`, `--only library-flow`, `--only music-flow` hoặc `--only landing-navigation` để chỉ chạy phần liên quan. Kết quả targeted được lưu riêng.

Script audit tạo profile Chrome tạm và đóng tiến trình Chrome do nó tạo khi xong. Không chạy đăng nhập, đăng bài, upload hoặc gọi API ghi dữ liệu production. Các thử nghiệm điểm/tiến độ chỉ nằm trong localStorage của profile tạm. Dừng server tự mở sau khảo sát bằng Ctrl+C.
