# Kích hoạt đăng bài và bình luận Quần Anh Hội

Quần Anh Hội dùng Firebase Authentication để nhận diện tài khoản và Cloud Firestore để lưu bài viết, bình luận, lượt thán phục. Ảnh/video có thể dùng Cloudinary Free; xem [CLOUDINARY-QUAN-ANH-HOI.md](CLOUDINARY-QUAN-ANH-HOI.md). Không cần Firebase Storage nếu đã cấu hình Cloudinary.

## Firebase Authentication

1. Mở Firebase Console của dự án `nhipdapcualichsu`.
2. Vào **Authentication → Connection method** và bật nhà cung cấp mà người dùng sẽ sử dụng. Trang đăng nhập hiện hỗ trợ email/mật khẩu và Google.
3. Trong **Authentication → Settings → Authorized domains**, thêm `thienchi0506.github.io` nếu chưa có.

## Cloud Firestore

1. Tạo Cloud Firestore database nếu dự án chưa có.
2. Mở **Firestore → Rules**.
3. Sao lưu Rules hiện có. Với database mới chỉ có Rules mặc định từ chối mọi truy cập, thay nội dung bằng `firestore.rules` ở gốc dự án. Nếu Rules đã bảo vệ dữ liệu khác, giữ nguyên các khối đó và gộp các khối `posts`, `comments`, `reports`, `websiteFeedback` cùng các hàm quản trị/liên quan bên trong `match /databases/{database}/documents`.
4. Nhấn **Publish**. Không dùng test mode công khai.

Rules cho phép đọc bài/bình luận công khai, yêu cầu đăng nhập cho thao tác ghi, và không cho xóa bài hoặc bình luận qua trình duyệt. Báo cáo bài viết và góp ý website chỉ UID quản trị đã cấu hình mới đọc được; người gửi phải đăng nhập.

## Góp ý và báo lỗi website

- Mục **GÓP Ý WEB** trên thanh điều hướng trang chính mở biểu mẫu gửi tiêu đề, chủ đề (**Báo lỗi website** hoặc **Góp ý xây dựng**), mô tả và tối đa 3 ảnh/video.
- Cần đăng nhập Firebase. Ảnh/video dùng Cloudinary Free theo hai unsigned preset đã cấu hình; ảnh tối đa 15 MB/tệp, video tối đa 80 MB/tệp và một video mỗi góp ý.
- Firestore lưu trong collection `websiteFeedback`. Thành viên không có quyền đọc; chỉ UID trong `quan-anh-hoi-admin-config.js` được xem danh sách và đổi trạng thái.
- Trong Firebase Console → Firestore → Rules, publish các quy tắc phù hợp trong `firestore.rules`. Nếu có quy tắc riêng của tính năng khác, gộp thay vì thay toàn bộ.
- Trên trang chính, admin đăng nhập rồi mở **GÓP Ý WEB** → **Xem góp ý gửi về**. Bảng admin theo dõi tối đa 100 mục gần nhất; không có email tự động.

## Thử chức năng

1. Mở Quần Anh Hội và đăng nhập.
2. Đăng một bài chỉ có chữ, rồi gửi một bình luận.
3. Kiểm tra dữ liệu xuất hiện ở Firestore collections `posts` và `comments`; thử mở trang trên trình duyệt khác để xác nhận dữ liệu đồng bộ qua mạng.
4. Nếu Firestore báo permission denied, kiểm tra đã Publish Rules trên đúng database `(default)` trong đúng dự án Firebase.

## Firebase Storage

Firebase Storage không cần thiết cho bài chữ và bình luận. Firebase hiện yêu cầu dự án ở gói Blaze để tạo hoặc tiếp tục truy cập Cloud Storage for Firebase. Vì Blaze là pay-as-you-go, không chuyển gói nếu chưa chấp nhận liên kết thanh toán. Trên dự án Spark, cấu hình Cloudinary Free theo tài liệu riêng để hỗ trợ ảnh/video.

## Lưu ý về an toàn và chi phí

- Firebase web config và Cloudinary unsigned preset là thông tin công khai trong ứng dụng trình duyệt; không đưa mật khẩu, API secret hay khóa quản trị vào mã trang.
- Cloudinary Free có hạn mức theo credits. Theo dõi mức sử dụng và giới hạn loại media trong presets. Unsigned preset có thể bị người ngoài gọi trực tiếp nên không thể coi kiểm tra đăng nhập ở giao diện là biện pháp bảo vệ phía máy chủ.
- Không bật Rules cho phép `read, write: if true` trên toàn bộ database.

Tham khảo: [Firebase Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started), [Firebase Storage và yêu cầu gói](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
