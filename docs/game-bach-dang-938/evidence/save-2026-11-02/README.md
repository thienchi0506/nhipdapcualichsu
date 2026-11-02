# Bằng chứng kiểm tra chặng lưu

Ngày 02-11-2026, Chrome headless 156 trên Windows. Các kích thước mobile là giả lập, chưa phải thiết bị thật. Hạ tầng thử sử dụng demo-bd938-save và tài khoản giả; không đọc/ghi dữ liệu phòng thi hoặc tài khoản production.

| Tệp | Kết quả | Phạm vi |
|---|---|---|
| save-core.json | 71/71 | Giao dịch IDB, idempotency, checksum/ngữ nghĩa checkpoint, UID, lease tab, ranh giới công bố trạng thái, lỗi ghi, 5 retry và kết toán. |
| related-core.json | 129/129 | Hồi quy các bộ kiểm tra sông nước, nhân vật/chiến đấu và quân đội đang có. |
| device-ui.json | 7/7 | Giao diện chọn lưu, mất hàng, tải mốc, trở lại trang và casualty fixture. |
| retry-ui.json | 9/9 | Fixture thất bại → click thật vào trại/xác nhận → cảnh chơi → điều khiển → pause/tải mốc, 390 px. |
| browser-checks.json | 62/62 | Vòng đời/cleanup 5 lần, desktop và 320/360/375/390/430 px, đường vào cũ, thư viện và phòng thi. |
| rules-emulator.json | 20/20 | Rules của game và quyền bài đăng/bình luận sẵn có, thử UID A/B và khách. |
| browser-emulator.json | 15/15 | Firebase SDK thật tới emulator: sync/CAS, nhánh offline, chunk upload dở/retry, riêng tư/bất biến, thiếu chunk, khôi phục Unicode và camp recovery. |
| auth-emulator.json | 7/7 | Đăng nhập/đăng xuất giả lập, queue cũ, đổi UID, session persistence qua trang khác. |

Bản thử lớn gồm 400 quân mỗi bên, 1.487.033 byte, 22 phần. Có thêm chuỗi tiếng Việt/emoji trong fixture để thử ranh giới Unicode và kích thước. Không coi thử lưu này là chứng nhận FPS hoặc chạy chương 15–25 phút.

`camp-confirmation-390.png` và `retry-playable-390.png` là ảnh từ luồng retry tương tác thật sau khi nạp fixture. Các ảnh scene/pause/result khác thuộc bộ hồi quy. Các script Python cùng thư mục dùng harness `../audit_capture.py`; game được phục vụ qua HTTP trên 127.0.0.1:8765. Harness chặn backend production. Script emulator kết nối duy nhất Firestore 8089 và Auth 9099.

Mã thử IDB dùng database tên ngẫu nhiên và xóa sau khi đóng. Browser dùng profile tạm. Rules thử là bản ghép từ firestore.rules hiện hành cùng fragment game mới trong thư mục tạm. `temp-tools.json` ghi vị trí Node/JRE/packages kiểm thử cục bộ, không phải đường dẫn triển khai của website. Không deploy Rules hoặc bật thanh toán.

`protected-baseline.json` ghi hash 12 tệp website/Firebase/game cũ trước lượt sửa. `protected-integrity.json` đối chiếu sau lượt sửa; đây là kiểm tra tính toàn vẹn nguồn, bổ sung cho kiểm tra lối vào chứ không thay thế chơi hết các chức năng cũ.

Một lượt chạy UI song song dừng tại bước chọn đồ họa vì click CDP không chuyển khỏi SHELL; không có lỗi runtime của app trong diagnostics. Chạy lại riêng đạt 9/9. Ảnh `retry-ui-failure.png` được giữ lại; chưa kết luận đây là race của harness hay UI, cần theo dõi tại chặng kiểm tra trải nghiệm độc lập.
