# Bật đồng bộ game mới bằng tài khoản hiện có

Code dùng SDK Firebase 10.12.2 và project `nhipdapcualichsu` hiện có. Không cần tạo project, đổi Auth, bật Storage, Cloud Functions hoặc thanh toán. Chưa có thay đổi nào được công bố lên Firebase production trong chặng này.

## Thao tác dành cho chủ dự án

1. Lưu bản Rules đang chạy từ Firebase Console → Firestore Database → Rules để đối chiếu và khôi phục khi cần.
2. Mở [fragment game mới](../../game-bach-dang-938/firestore.rules.fragment.txt). Đặt nguyên khối `match /gameBachDang938/{uid}/versions/v1/slots/{slotId}` **bên trong** `match /databases/{database}/documents` hiện có. Khối `snapshots` phải nằm bên trong khối slot.
3. Giữ các khối `posts`, `comments`, phòng thi và quyền khác đang chạy. Không thay toàn bộ Rules bằng fragment; không thêm quyền đọc/ghi cho mọi người.
4. Kiểm tra Rules ghép với emulator hoặc Rules Playground: A được get/create/update đúng revision trong UID A; B và khách không đọc/ghi A; chunk chỉ cho chủ UID tạo/get, không update/list/delete. Bộ kiểm tra hiện có xác nhận bài đăng/bình luận vẫn theo quyền cũ.
5. Sau khi chủ dự án kiểm tra và quyết định công bố Rules, dùng tài khoản thử: đăng nhập ở trang đăng nhập hiện hữu, mở game mới, chọn Lưu bằng tài khoản. Chờ Đã đồng bộ rồi mở lại cùng tài khoản để đối chiếu. Không dùng dữ liệu phòng thi làm fixture.

Firestore tự tạo document khi ghi thành công; không cần thêm collection bằng tay. Path chính: `gameBachDang938/{uid}/versions/v1/slots/main`. Không thêm UID cố định vào mã hoặc chuyển dữ liệu khách vào UID khác.

## Cách xử lý trạng thái

- Chưa áp dụng Rules: chế độ tài khoản có thể bị từ chối xác minh/mở; bản cũ không bị ghi đè. Lưu trên thiết bị vẫn dùng được và được giữ riêng.
- Mất mạng sau khi đã có bản tài khoản: giữ tiến trình cục bộ và outbox. Chỉ báo Đã đồng bộ sau khi server xác nhận.
- Hai tab: tab cũ phải đóng hoặc hết lease thì tab mới mới ghi. Hai thiết bị sửa offline: giữ cả hai bản, dừng ghi đè, cho xuất bản cục bộ; không tự gộp tiền/quân hoặc chọn theo giờ máy.
- Đăng xuất/đổi người: phiên dừng, queue cũ vẫn theo UID cũ. Đăng nhập lại đúng người và mở lại game để đồng bộ. Không xóa dữ liệu trình duyệt khi còn bản chờ.
- Upload chia phần bị ngắt: head cũ còn hiệu lực. Gửi lại cùng sync ID không tăng revision hoặc hậu quả hai lần. Không tự xóa các phần bằng Console trong lúc một thiết bị còn đồng bộ.
- Phiên bản không hỗ trợ hoặc chạm giới hạn: giữ bản hiện có và xuất để bảo quản; không reset slot như cách sửa lỗi.

## Môi trường kiểm thử

Xem [hồ sơ bằng chứng](evidence/save-2026-11-02/README.md). Dùng duy nhất project `demo-bd938-save`, Firestore `127.0.0.1:8089`, Auth `127.0.0.1:9099` và HTTP cục bộ. Node 22, JRE 21, firebase-tools 14.22.0 cùng thư viện kiểm thử ở thư mục tạm; không là thư viện chạy của website. `rules-test.cjs` kiểm tra bản Rules ghép rồi chạy `check_save_emulator.py`. Không dùng config, tài khoản hoặc dữ liệu production.
