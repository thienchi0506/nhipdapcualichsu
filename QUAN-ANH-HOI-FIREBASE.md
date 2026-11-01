# Kích hoạt đầy đủ Quần Anh Hội

Trang đã dùng cấu hình từ `firebase-config.js`. Firebase Auth cần bật phương thức đăng nhập mà website đang cung cấp. Bài viết và bình luận công khai để đọc, còn đăng, thán phục, bình luận và tải tệp yêu cầu tài khoản đã đăng nhập.

## Cấu hình một lần trong Firebase Console

1. Mở dự án `nhipdapcualichsu` trong [Firebase Console](https://console.firebase.google.com/).
2. Trong **Authentication → Sign-in method**, bật phương thức đăng nhập đang dùng ở `dang-nhap.html`.
3. Trong **Firestore Database → Rules**, sao lưu Rules hiện có. Nếu dự án chưa có Rules cho tính năng khác, có thể dùng `firestore.rules`; nếu đã có, chỉ gộp hai khối `match /posts` và `match /comments` vào Rules hiện tại, không xóa các khối còn lại.
4. Tạo/bật **Storage**, mở mục **Rules** và sao lưu Rules đang dùng. Gộp khối `match /posts/{userId}/{fileName}` từ `storage.rules`, giữ Rules cho đường dẫn khác, rồi chọn **Publish**.
5. Kiểm tra **Project settings → Your apps**: `projectId` và `storageBucket` trong `firebase-config.js` phải trỏ đúng dự án/bucket.
6. Thêm domain GitHub Pages đang dùng vào **Authentication → Settings → Authorized domains** nếu domain chưa có.

- Không bật test mode công khai. Rules mẫu cho phép mọi người đọc bài/bình luận và media của diễn đàn, nhưng chỉ người đã đăng nhập mới được tạo nội dung; mỗi lượt tải chỉ ghi được vào thư mục UID của tài khoản đó. Khi gộp Rules, giữ nguyên quyền của những tính năng khác trong cùng dự án Firebase.

## Giới hạn tải tệp

- Ảnh: tối đa 15 MB.
- Video MP4, WebM hoặc Ogg: tối đa 80 MB.
- Nếu Storage chưa bật hoặc Rules chưa được publish, bài văn bản vẫn có thể đăng; bài có tệp sẽ báo lỗi để người dùng thử lại sau khi cấu hình.
