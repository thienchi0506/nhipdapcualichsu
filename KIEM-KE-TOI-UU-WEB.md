# Kiểm kê và nhật ký tối ưu website

Phạm vi rà soát gồm 11 trang HTML và các tệp dữ liệu/phụ trợ mà chúng tải. Bản ghi này theo dõi chức năng và kiểm tra đã chạy; mục chưa kiểm tra không được xem là đã đạt.

## Danh mục trang và luồng chính

| Trang | Chức năng cần rà |
|---|---|
| `index.html` | Trang mở đầu, chuyển cảnh, nhạc và điều hướng vào sảnh |
| `trang-chinh.html` | Dòng thời gian, nhân vật, bảo tàng, di tích, sách, video và mô hình 3D |
| `dang-nhap.html` | Đăng nhập/đăng ký email, Google, hiện mật khẩu và lưu phiên Firebase Auth |
| `quan-anh-hoi.html` | Bài viết, chủ đề, lượt thán phục, bình luận realtime, media, giao diện sáng/tối |
| `tang-thu-cac.html` | Kho bài học, tra cứu, thẻ học và điều hướng đề thi |
| `thao-truong.html` | Chọn khối/đề, danh mục/luyện tập, trả lời 3 phần, chấm điểm và bảng câu hỏi |
| `sa-ban.html` | Sa bàn 2D, Như Nguyệt/Bạch Đằng, điều khiển, trạng thái trận và khóa mobile |
| `sa-ban-3d.html` | Sa bàn Three.js, cảnh chiến đấu, đơn vị, camera, điều khiển và hiệu ứng |
| `sa-ban-nhu-nguyet.html` | Chiến dịch, hội thoại, tiếp tục/chơi lại và bảng xếp hạng |
| `sanh-game.html` | Sảnh chiến dịch, hội thoại, phần thưởng và điều hướng game |
| `tran-do-nhap-vai.html` | Điều khiển nhập vai, quyết định, hậu chiến và bảng xếp hạng |

## Kết quả đã xác minh trong lượt đầu

- Chrome desktop: Quần Anh Hội tải được, không ghi nhận lỗi JavaScript; nút đổi giao diện hoạt động; chọn và bỏ ảnh xem trước hoạt động.
- Chrome viewport 390 px: Quần Anh Hội không còn tràn ngang (`scrollWidth` bằng `clientWidth`); nội dung đăng bài nằm gọn trong viewport.
- Quần Anh Hội chờ Firestore tối đa 8 giây rồi hiển thị bản lưu hoặc trạng thái rỗng có thông báo, không để vòng tải vô hạn. Trong lần chạy cục bộ này, Firestore không trả snapshot; chưa xác minh đăng nhập/ghi dữ liệu trên tài khoản thật.
- Sa bàn 2D và 3D khởi tạo được trong Chrome; không ghi nhận lỗi JavaScript. Vòng đồ họa 3D dừng khi ẩn tab và chạy lại khi tab hiện.
- Rà tham chiếu nội bộ trên cả 11 trang: không thấy đường dẫn nội bộ hỏng ngoài `hero-loop.mp4`; mã trang chủ đã có fallback canvas khi video này không có.
- Hai gói Base64 mô hình 3D khoảng 22 MB và 102 MB trước đây bị tải khi mở Sảnh Chính. Đã chuyển chúng thành dự phòng chỉ tải khi mở trực tiếp `file://`; trên HTTP(S), mô hình GLB giữ nguyên và tải trễ. Chrome xác nhận lúc mở trang không gửi yêu cầu `.glb` hoặc các gói `_data.js`.

## Kết quả rà soát mở rộng và sửa tiếp

- Chromium mở đủ 11/11 trang, trạng thái tải hoàn tất; không phát hiện ngoại lệ JavaScript không xử lý trong lượt khởi tạo. Đã đo bố cục ở viewport 390 px và 1365 px; không thấy tràn ngang ở các trang được đo. `tran-do-nhap-vai.html` có canvas đặt rộng 1000 px dù khung co theo màn hình; đã cho canvas co theo khung, giữ nguyên độ phân giải game 1000×560 và tỷ lệ 25:14. Thử trên 390 px cho khung 350 px và canvas 344×192.6 px.
- Khóa mobile đã được áp dụng cho cả URL 3D mở trực tiếp. Sa bàn 2D tự mở thông báo trên điện thoại và không khởi động vòng lặp game/hiệu ứng; đường dẫn từ 3D chuyển tới thông báo 2D. Đã thử thông báo trực tiếp trên Android UA và xác nhận đóng/mở trạng thái qua DOM.
- Chạy sa bàn 2D Bạch Đằng trong Chromium: canvas 1000×560 có điểm ảnh được vẽ, trang vào đúng hồi 2 và không có ngoại lệ JavaScript; không còn khung canvas trống trong phép thử này.
- Thử luồng thắng 3D Bạch Đằng bằng trạng thái sáu tàu ở sát ngưỡng đầu hàng: tất cả chuyển `surrendered`, trận sang `THANG_TRAN`; chọn quyết định cuối và đóng lời khuyên mở bảng kết quả/bảng xếp hạng. Tìm và sửa điểm dừng đội hình: tàu có độ lệch z=+24 trước đây dừng ngoài ngưỡng cọc z≤24. Khi sĩ khí về 0, tàu nay đầu hàng; khi HP về 0, tàu chìm như trước.
- Chạy tuyệt kỹ số 3 trong chiến dịch 3D Như Nguyệt: tìm ra lời gọi `AudioEngine.playFireExplosion()` bị thiếu, gây `TypeError` trước khi đặt trạng thái thắng. Đã bổ sung âm thanh nổ tổng hợp Web Audio dùng cho đạn đá lửa/hỏa công; thử lại xác nhận `THANG_TRAN_NHU_NGUYET`, hậu chiến, phần kết quả và bảng xếp hạng đều hiện, không có ngoại lệ JavaScript.
- Kiểm tra liên kết/tài nguyên tĩnh: tất cả tham chiếu nội bộ tồn tại, trừ video nền tùy chọn `hero-loop.mp4` (trang mở đầu đã có canvas WebGL dự phòng). `sa-ban-nhu-nguyet.html` dùng `#nhu-nguyet` để kích hoạt luồng bằng JavaScript, nên không cần phần tử có ID tương ứng.

## Còn cần kiểm tra

- Đăng nhập thật; publish Rules đã gộp an toàn; thử bài viết, bình luận, ảnh và video trên Firebase của dự án.
- Chơi tay trọn hai chiến dịch qua thắng/thua và quyết sách hậu chiến; các lần chạy tự động hiện xác minh khởi tạo canvas và tuyến thắng 3D, chưa thay thế lượt chơi thực tế.
- Kiểm tra từng thao tác nghiệp vụ trong Tàng Thư, Thao Trường, đăng nhập, Sảnh Game và các modal/hậu chiến trên thiết bị thật.
- Firebase không trả snapshot trong máy thử cục bộ; cần cấu hình/publish Rules và thử Auth/Firestore/Storage trên domain thật trước khi xác nhận chức năng cộng đồng cloud.
- Kế hoạch 150 điểm kiểm tra/tối ưu chưa được hoàn tất đủ 150 mục; các mục chưa có kết quả kiểm tra vẫn để mở, không đánh dấu đạt.
