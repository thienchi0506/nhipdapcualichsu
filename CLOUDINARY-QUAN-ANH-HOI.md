# Bật ảnh/video miễn phí cho Quần Anh Hội

Quần Anh Hội tiếp tục dùng Firebase Auth và Firestore cho đăng nhập, bài viết, bình luận và lượt thán phục. Ảnh/video có thể tải lên Cloudinary Free; website lưu URL trả về trong trường `media` của bài viết Firestore.

## Cấu hình Cloudinary

1. Tạo tài khoản Cloudinary Free. Gói Free hiện có 25 credits mỗi tháng, dùng chung cho lưu trữ, băng thông và biến đổi media; theo bảng giá hiện tại không cần thẻ thanh toán. Theo dõi mức dùng trong Cloudinary vì hạn mức có thể thay đổi.
2. Trong Dashboard, ghi lại **Cloud name**.
3. Mở **Settings → Upload → Upload presets** và tạo hai preset, cả hai đặt **Signing Mode: Unsigned**:
   - Preset ảnh: tên tùy ý, giới hạn `allowed_formats` thành `jpg,jpeg,png,gif,webp`.
   - Preset video: tên tùy ý, giới hạn `allowed_formats` thành `mp4,webm,ogv`.
4. Trong Cloudinary Usage Limits, đặt giới hạn tài khoản phù hợp nếu tùy chọn này khả dụng. Website kiểm tra ảnh tối đa 15 MB và video tối đa 80 MB, nhưng giới hạn phía trình duyệt có thể bị bỏ qua; preset không cung cấp giới hạn kích thước riêng. Cân nhắc giới hạn tổng mức dùng Cloudinary.
5. Mở `cloudinary-config.js` và thay:
   - `YOUR_CLOUD_NAME` bằng Cloud name.
   - `YOUR_UNSIGNED_IMAGE_PRESET` bằng tên preset ảnh.
   - `YOUR_UNSIGNED_VIDEO_PRESET` bằng tên preset video.
6. Lưu tệp và đưa bản website chứa `cloudinary-config.js` lên GitHub Pages theo quy trình phát hành hiện có. Không nhập API Secret vào tệp này hoặc bất cứ mã JavaScript chạy trên trình duyệt nào.

## Dùng thử

1. Đăng nhập bằng tài khoản Firebase.
2. Trong Quần Anh Hội, chọn một ảnh nhỏ hoặc video ngắn, nhập nội dung và đăng bài.
3. Kiểm tra media xuất hiện trong bài viết và bản ghi bài đăng trong Firestore có `media.url`, `media.type` và `media.provider: "cloudinary"`.

Firebase Firestore Rules vẫn cần được Publish để bài viết lưu được. Cloudinary không thay thế Firestore.

## Giới hạn và bảo vệ preset unsigned

- Tên preset unsigned nằm trong JavaScript phía trình duyệt nên người khác có thể xem và gọi trực tiếp. Việc yêu cầu đăng nhập trong giao diện chỉ chặn người dùng thông thường; nó không thể chứng minh danh tính Firebase với Cloudinary.
- Chỉ cho phép định dạng cần thiết, không cho ghi đè ID, giới hạn Usage, theo dõi credits và thay preset nếu phát hiện lạm dụng. Media tải lên theo cách này là nội dung do người dùng cung cấp; cần có cách kiểm duyệt và xử lý nội dung không phù hợp.
- Muốn xác thực Firebase UID ngay tại lúc tải, cần một dịch vụ backend ký yêu cầu. Đây không nằm trong cấu hình tĩnh hiện tại và có thể có giới hạn/chi phí riêng.
- Firebase Storage vẫn được giữ làm đường dự phòng tương thích. Tuy nhiên, Firebase hiện yêu cầu gói Blaze để tạo hoặc tiếp tục truy cập Cloud Storage for Firebase; trên Spark hãy dùng Cloudinary hoặc chỉ đăng bài chữ. Blaze là pay-as-you-go nên không bật nếu chưa chấp nhận liên kết thanh toán.

Tham khảo: [Cloudinary Free](https://cloudinary.com/pricing), [unsigned uploads](https://cloudinary.com/documentation/upload_images), [upload presets](https://cloudinary.com/documentation/upload_presets), [Firebase Storage billing](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).
