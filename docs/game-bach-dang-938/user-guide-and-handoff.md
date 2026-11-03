# TÀI LIỆU HƯỚNG DẪN VÀ HỒ SƠ BÀN GIAO — BẠCH ĐẰNG 938

> Tài liệu chính thức cho phiên bản Release Candidate (Chương mẫu bến thử Bạch Đằng 938).
> Biên soạn theo yêu cầu BƯỚC 14 (Mô hình: GPT-6 Luna).
> Cập nhật ngày: 03/11/2026.

---

## 1. Cách mở game mới từ Sa Bàn

Website **Nhịp Đập Của Lịch Sử** tích hợp game mới như một mục độc lập trong phân hệ Sa bàn chiến thuật, tuyệt đối không làm ảnh hưởng hay thay thế các game 2D và 3D hiện hữu.

1. **Truy cập**:
   - Từ trang chủ `trang-chinh.html`, cuộn xuống phân khu **Sa Bàn Chiến Trường** (`#khu-vuc`).
   - Bạn sẽ nhìn thấy 3 lựa chọn song song:
     * *Sa Bàn 2D — Bạch Đằng & Như Nguyệt* (`sa-ban.html`)
     * *Sa Bàn 3D — Trận Đồ Tác Chiến Thực Thể* (`sa-ban-3d.html`)
     * **Bạch Đằng 938 — Chiến dịch nhập vai** (`game-bach-dang-938/index.html`, mang ID `bd938-entry`).
2. **Khởi động**:
   - Nhấp vào thẻ **Bạch Đằng 938 — Chiến dịch nhập vai**. Trình duyệt sẽ mở giao diện thiết lập ban đầu (Setup Screen).
   - Khi chưa vào trận, website không tải mô hình 3D, không chạy vòng lặp ngầm và không phát sinh tài nguyên dư thừa.
   - Muốn quay lại trang chủ bất kỳ lúc nào: Nhấp nút **"← Về Sa Bàn"** ở góc trên bên trái.

---

## 2. Cách chọn nhân vật và cấu hình đồ họa

### Bước 1: Chọn nhân vật và thiết lập chặng
- **Nhân vật trung tâm**: Chọn 1 trong 4 người dẫn đường (3 người còn lại sẽ đóng vai trò chỉ huy AI đồng minh):
  * **H01 · THỦY QUÂN** — *Người dẫn thuyền*: Am hiểu dòng chảy, định vị luồng lạch, giữ vững tay lái cho toàn đội.
  * **H02 · CUNG THỦ** — *Người giữ trận*: Tác chiến tầm xa, bảo vệ sườn thuyền và yểm trợ bờ sông.
  * **H03 · CÔNG BINH** — *Người dựng lũy*: Sửa chữa thân thuyền, khắc phục bánh lái, gia cố trận địa cọc.
  * **H04 · QUÂN NHU** — *Người giữ bến*: Quản lý cứu thương, kho tên, vận chuyển hàng và tiếp tế.
- **Tùy chọn thử nghiệm**:
  * *Thuyền thử*: "Thuyền nhẹ · ít hàng" (cơ động nhanh, mớn nước nông) hoặc "Thuyền vận tải · hàng nặng" (chở nhiều vật tư, mớn nước sâu, dễ mắc cạn hơn).
  * *Tình huống tái hiện*: Gồm 6 tình huống (`combat` - giao chiến áp mạn; `harbor` - bến sông tự do; `shoal` - vượt vùng cạn; `ebb` - nước rút tại bãi cọc; `impact` - va chạm cọc ngầm; `rudder` - hỏng lái cạnh bến sửa).
  * *Lưu bản thử*: "Không lưu — chơi thử", "Lưu trên thiết bị" hoặc "Lưu bằng tài khoản Firebase".
- Nhấp nút **"Tiếp tục · Chọn đồ họa →"** (ID: `bd938-next`).

### Bước 2: Chọn mức đồ họa
Game cung cấp 3 mức đồ họa tự thích ứng, được ghi nhớ tự động trên trình duyệt:
- **01 · Tiết kiệm** (`economy`): Tối ưu hóa hiệu năng, giảm mật độ bóng, khử răng cưa nhẹ. *Đặc biệt khuyến nghị cho điện thoại di động và máy tính bảng.*
- **02 · Cân bằng** (`balanced`): Mức mặc định hài hòa giữa độ sắc nét và tốc độ khung hình cho máy tính thông thường.
- **03 · Chi tiết** (`detailed`): Đầy đủ hiệu ứng bóng đổ, ánh sáng mặt nước và độ nét cao nhất dành cho PC có card đồ họa rời.
- Nhấp **"Mở bến thử 3D →"** (ID: `bd938-load`). Quá trình tải cảnh diễn ra qua 3 bước có thanh tiến độ rõ ràng.
- Đọc bảng hướng dẫn tóm tắt (Briefing) và nhấp **"Bắt đầu lượt thử"** để chính thức vào trận.

---

## 3. Hướng dẫn điều khiển trên PC và Mobile

### A. Điều khiển trên Máy tính (Bàn phím & Chuột)

| Thao tác | Phím bấm | Chi tiết hành vi |
|---|---|---|
| **Lái thuyền** | `W` / `S` | Tăng ga tiến / Giảm ga, hãm lùi thuyền |
| | `A` / `D` | Bẻ bánh lái sang trái / sang phải |
| | `Space` | Thả neo giữ thuyền đứng yên trên dòng nước |
| | `E` | Rời tay lái (chuyển sang đi bộ trên boong thuyền) |
| **Đi bộ & Nhảy** | `W`, `A`, `S`, `D` | Đi lại tự do trên sàn thuyền hoặc trên đất liền |
| | `Space` | Nhảy tự do (vượt vật cản, tránh trượt chân rơi xuống sông) |
| | `E` | Cầm lại tay lái khi đứng ở đuôi thuyền ta; hoặc kéo đồng đội dưới nước lên |
| | `G` | Nhảy sang boong thuyền địch (khi hai thuyền áp sát mạn ở tốc độ an toàn) |
| **Chiến đấu** | `J` hoặc Chuột trái | Đánh kiếm (chuỗi combo 3 đòn) hoặc Giương cung bắn tên |
| | `F` | Đổi vũ khí nhanh giữa Kiếm ngắn và Cung tên |
| | `Q` (Giữ) | Giơ kiếm thế thủ Đỡ đòn. Nếu đỡ đúng lúc đòn địch chạm vào sẽ **Phản đòn (Parry)** làm choáng kẻ địch |
| | `V` | Lộn người Né đòn (Dodge) tức thì |
| | `L` | Khóa mục tiêu (Lock-on) địch gần nhất trong tầm nhìn |
| **Camera & Bản đồ** | `C` | Đổi góc nhìn: Góc nhìn thứ ba sau lưng ↔ Góc chéo chiến thuật từ trên cao |
| | Giữ chuột phải + Kéo | Xoay góc nhìn camera quanh nhân vật |
| | Cuộn chuột | Phóng to / Thu nhỏ tầm nhìn |
| | `M` | Mở / Đóng Bản đồ chiến thuật (**Trận vẫn chạy tiếp tục**) |
| | `Esc` | Tạm dừng hoàn toàn mô phỏng (Menu Pause) |

### B. Điều khiển trên Điện thoại cảm ứng (Mobile)

- **Cụm D-pad điều hướng (Góc trái bên dưới)**:
  * `▲`, `▼`, `◀`, `▶`: Chạm để tiến, lùi, rẽ lái thuyền hoặc di chuyển nhân vật trên bộ.
- **Cụm nút tác chiến (Góc phải bên dưới)**:
  * Nút to **"Đánh / Bắn"**: Nhấn hoặc giữ để liên tục tấn công.
  * Nút **"Đỡ (Q)"**: Chạm giữ để dựng thế thủ chắn trước ngực.
  * Nút **"Né (V)"**: Chạm nhanh để lộn người né tránh đòn đánh nguy hiểm.
  * Nút **"Nhảy"**: Chạm để nhảy lên chướng ngại vật hoặc nhảy sang mạn thuyền.
- **Thanh công cụ tác chiến (Dải nút trên cụm điều khiển)**:
  * `E · Rời lái` / `E · Cầm lái`: Chuyển đổi trạng thái lái thuyền.
  * `G · Sang thuyền`: Kích hoạt khi áp sát thuyền đối phương.
  * `Cung / Kiếm`: Đổi nhanh vũ khí.
  * `L · Khóa`: Khóa mục tiêu để bắn cung chuẩn xác.
  * `M · Bản đồ`: Mở màn hình bố phòng và ra lệnh cho các tổ quân.
- **Cảm ứng xoay và phóng to camera**: Kéo 1 ngón tay trên vùng nhìn 3D để xoay; chụm/tách 2 ngón tay (Pinch) để phóng to/thu nhỏ.
- **Chạm ra lệnh trên Bản đồ**: Chạm trực tiếp vào mặt bản đồ SVG để chọn tọa độ X, Z cho cánh quân cơ động.

---

## 4. Cách lưu, tiếp tục và hiểu trạng thái đồng bộ

Hệ thống cung cấp **3 cơ chế lưu trữ** độc lập, an toàn tuyệt đối:

1. **Không lưu (`none`)**: Dùng cho các lượt chơi nhanh, kiểm tra thiết bị, không tạo dữ liệu lưu trữ.
2. **Lưu trên thiết bị (`device`)**:
   - Sử dụng công nghệ IndexedDB (`dcls.bd938.saves.v1`) độc lập trong trình duyệt của bạn.
   - Hoạt động 100% offline, không cần Internet, có mã hóa kiểm tra toàn vẹn SHA-256 chống hỏng file.
3. **Lưu bằng tài khoản Firebase (`account`)**:
   - Tận dụng phiên đăng nhập Firebase Auth hiện hữu của website.
   - Tự động đồng bộ các thay đổi định kỳ và sau mỗi trận vào nhánh dữ liệu an toàn `gameBachDang938/{uid}/versions/v1/slots/main`.

### Bảng giải thích nhãn trạng thái (Góc trên thanh công cụ)

| Nhãn hiển thị | Ý nghĩa thực tế |
|---|---|
| **Đang lưu…** | Hệ thống đang ghi dữ liệu vào IndexedDB hoặc tải gói đồng bộ lên Firestore. |
| **Đã lưu cục bộ** | Tiến trình, thương vong và mốc mới nhất đã được lưu bền vững trên máy của bạn. |
| **Đã đồng bộ** | Dữ liệu trên thiết bị đã khớp hoàn toàn với bản ghi trên tài khoản cloud. |
| **Lưu thất bại** | Không có mạng hoặc mạng chập chờn. Bản lưu trên máy vẫn an toàn, game sẽ tự thử lại sau. |
| **Xung đột bản lưu** | Phát hiện có phiên chơi từ tab/thiết bị khác sửa đổi mốc lưu. Game dừng lại an toàn và cho phép bạn tải file JSON dự phòng về máy. |

*Lưu ý: Bạn luôn có thể nhấp nút **"Xuất bản lưu"** tại màn hình kết quả để tải file backup `.json` về máy tính hoặc điện thoại bất cứ lúc nào.*

---

## 5. Quy tắc thương vong, nhân vật bị thương và rút quân

Một trong những triết lý trung tâm của game là **trách nhiệm trước sinh mạng của đồng đội**:

1. **Thương vong vĩnh viễn (Permanent Casualty)**:
   - Binh sĩ tử trận (bị thương nặng không được cứu chữa trong thời gian xuất huyết, hoặc chìm dưới sông sâu) sẽ được ghi nhận vĩnh viễn vào Sổ quân (`campaignLedger`).
   - **Tải lại chặng (Reload) KHÔNG làm hồi sinh những người đã chết**.
2. **Cứu chữa thương binh**:
   - Binh sĩ hoặc đồng đội khi cạn máu sẽ chuyển sang trạng thái ngã gục (`downed`).
   - Y sĩ trong tổ quân hoặc nhân vật chính có thể tiếp cận trong bán kính 2m và tiêu hao hộp thuốc cứu thương (`medicine`) để ổn định vết thương, chuyển người đó thành trạng thái bị thương nhẹ (`wounded`).
3. **Nhân vật trung tâm và Sĩ quan dự bị tiếp quản**:
   - Nhân vật chính khi hết máu (0 HP) sẽ không bị xóa sổ mà rơi vào trạng thái trọng thương (`wounded`).
   - Sau 3 giây, **Sĩ quan dự bị An (R01)** sẽ lập tức tiếp quản quyền chỉ huy tại vị trí của mình trên chiến trường.
   - Nếu R01 gục ngã, **Sĩ quan dự bị Bình (R02)** sẽ tiếp quản tiếp theo.
   - Nếu toàn bộ sĩ quan dự bị đều mất khả năng chiến đấu: Chặng chơi kết thúc do mất chỉ huy (`failed_command`).
4. **Kết toán tại Trại hậu phương**:
   - Khi thất bại hoặc rút quân, người chơi được chuyển về Trại:
     * Nhân vật chính cần số giờ chiến dịch nhất định để dưỡng thương (tùy thuộc vào lượng thuốc có sẵn tại kho hậu phương).
     * Khi trở lại chặng tiếp theo, nhân vật mang theo sẹo thương tật và chỉ số thể lực suy giảm.
     * Binh sĩ mất tích ngoài vùng an toàn hoặc hàng hóa chìm sâu sẽ không được phục hồi.
5. **Rút quân chiến thuật (`tactical_retreat`)**:
   - Người chơi có thể ra lệnh cho tổ quân rút lui trên bản đồ, hoặc đặt ngưỡng tổn thất tự động lui binh (ví dụ: khi mất quá 40% quân).
   - Khi toàn bộ các tổ quân hoàn thành lui binh về cứ điểm an toàn, trận đấu kết thúc vẻ vang với kết quả **Rút Quân Chiến Thuật**, bảo tồn sinh mạng cho lực lượng để chuẩn bị cho trận đánh kế tiếp.

---

## 6. Hướng dẫn xử lý các lỗi thường gặp

- **Thuyền bị mắc cạn hoặc kẹt dính cọc ngầm**:
  * Mở mục **"Thuyền & xử lý nguy hiểm"** (thanh dưới cùng).
  * Chờ con nước triều dâng, hoặc nhấn nút **"Gỡ mắc"** (phím `F` trên PC khi đang lái) kết hợp lùi ga `S` và bẻ lái ngược chiều va chạm.
  * Nếu thuyền chở nặng: Nhấn nút **"Bỏ bớt hàng"** (phím `X`) để vứt bỏ bớt gỗ hoặc hàng nặng, giúp mớn nước nâng lên.
- **Rơi xuống nước (Trạng thái bơi)**:
  * Khi rơi xuống sông, nhân vật tự động bơi, thể lực giảm dần. Hãy bơi về phía thuyền ta (khi thuyền chạy chậm < 3m/s) hoặc bơi vào doi đất thoải ven bờ, nhấn `E` để được kéo lên.
- **Thông báo "Bản lưu đang được dùng ở tab khác" (`SLOT_IN_USE`)**:
  * Để bảo vệ dữ liệu không bị ghi đè chéo, hệ thống giữ khóa phiên 15 giây. Hãy đóng các tab game thừa và chờ khoảng 15 giây trước khi nhấn "Thử lại".
- **Khung hình chậm hoặc giật lag**:
  * Nhấn nút **"Ⅱ Tạm dừng"**, chọn **"Về lựa chọn"**, chuyển sang mức đồ họa **01 · Tiết kiệm**.

---

## 7. Tóm tắt cấu trúc mô-đun (Dành cho nhà phát triển tiếp theo)

Tất cả mã nguồn của game nằm trọn vẹn trong thư mục `game-bach-dang-938/`:

```
game-bach-dang-938/
├── index.html                   # Khung giao diện HTML chuẩn, cô lập ID prefix bd938-
├── styles/game.css              # Toàn bộ CSS có namespace riêng, không ảnh hưởng trang chủ
├── data/
│   ├── river-config.json        # Thông số thủy triều, luồng lạch, bãi cọc, bến sửa
│   ├── character-config.json    # Chỉ số 4 nhân vật, máu, stamina, cự ly cung, parry
│   └── shell-scene.json         # Cấu hình ánh sáng và thực thể 3D ban đầu
├── src/
│   ├── core/clock.js            # Vòng lặp fixed-step 30 Hz độc lập với tốc độ khung hình
│   ├── sim/
│   │   ├── river.js & vessel.js # Thủy động lực học thuyền, mớn nước, va chạm cọc, sửa bánh lái
│   │   ├── encounter.js         # Chiến đấu, combo kiếm, tên bay, đỡ/phản đòn, tiếp quản chỉ huy
│   │   ├── army.js              # Mô phỏng tổ quân, tìm đường A*, sương mù trinh sát, tiếp tế kho
│   │   ├── actor-space.js       # Hệ tọa độ di chuyển trên boong thuyền chuyển động
│   │   └── collision.js         # Kiểm tra va chạm swept-box chống xuyên vật thể
│   ├── save/
│   │   ├── repository.js        # IndexedDB với mã băm SHA-256, khóa độc quyền lease slot
│   │   ├── controller.js        # Điều phối lưu cục bộ và xếp hàng gửi cloud
│   │   ├── firebase-bridge.js   # Cầu nối Firestore lazy-load chia nhỏ chunk an toàn
│   │   ├── game-state.js        # Xuất/nhập checkpoint và nhật ký mất mát vĩnh viễn
│   │   └── attempt-resolution.js# Kết toán chặng (victory / tactical_retreat / failed_command)
│   ├── presentation/scene.js    # Three.js WebGL renderer, instancing 1000 quân, camera chống kẹt
│   └── app/
│       ├── bootstrap.js         # Khởi tạo ứng dụng, xử lý sự kiện UI, hội thoại kết quả
│       ├── session.js           # Bộ điều phối trung tâm giữa Mô phỏng, Render và Lưu trữ
│       ├── input.js             # Bộ lắng nghe bàn phím, chuột và cảm ứng đa chạm
│       └── preferences.js       # Lưu trữ tùy chọn đồ họa và nhân vật trong localStorage
└── vendor/three-r128/           # Thư viện Three.js r128 nguyên bản kèm giấy phép MIT
```

---

## 8. Danh sách tính năng Hiện Có và Chưa Có

### Tính năng ĐÃ CÓ (Đã kiểm chứng đạt 100% qua 197 bài test)
- [x] Mô phỏng vật lý sông nước: thủy triều, dòng chảy, độ sâu đáy sông, mớn nước theo tải trọng.
- [x] Va chạm bãi cọc ngầm, hư hại thân và bánh lái thuyền, neo thuyền, thoát mắc cạn, sửa chữa tại bến.
- [x] Nhập vai điều khiển nhân vật trên bờ và trên boong thuyền đang di chuyển.
- [x] Cận chiến với kiếm ngắn: combo 3 đòn, đỡ đòn, phản đòn (parry), lộn né đòn (dodge), choáng.
- [x] Bắn cung tầm xa có thời gian tên bay và kiểm tra đường đạn thực tế.
- [x] Nhảy đổ bộ sang thuyền địch khi áp mạn gần nhau; rủi ro trượt chân rơi xuống sông và cơ chế bơi/cứu vớt.
- [x] Cơ chế Sĩ quan dự bị tiếp quản quyền chỉ huy tức thì khi nhân vật chính gục ngã.
- [x] Bản đồ chiến thuật thời gian thực (trận vẫn tiếp tục chạy khi mở bản đồ).
- [x] Sương mù chiến trường và thông tin trinh sát có tuổi thọ (thông tin cũ bị mờ đi).
- [x] Quản lý tổ quân với các mệnh lệnh: Cơ động, Giữ vị trí, Tiến công, Cứu thương, Rút quân.
- [x] Tuyến vận tải tiếp tế đạn, thuốc, gỗ và quân số giữa các kho bãi.
- [x] Cơ chế lưu trữ 3 tầng (None, IndexedDB, Firebase Firestore) có kiểm tra toàn vẹn SHA-256.
- [x] Ghi nhận mất mát vĩnh viễn (tử trận không hồi sinh khi tải lại), dưỡng thương tại trại.
- [x] 3 mức đồ họa tự chọn (Tiết kiệm, Cân bằng, Chi tiết) lưu trữ theo thiết bị.
- [x] Hỗ trợ đầy đủ bộ phím PC và cụm điều khiển cảm ứng đa chạm trên Mobile.
- [x] Độc lập và an toàn tuyệt đối: không ảnh hưởng tới phòng thi, kho kiến thức hay 2 game cũ của website.

### Tính năng CHƯA CÓ (Dành cho các chặng mở rộng trong tương lai)
- [ ] Toàn bộ chiến dịch nhiều chương (Hiện tại đã hoàn thành **Chương mẫu bến thử Bạch Đằng 938** hoàn chỉnh từ bắt đầu đến kết toán).
- [ ] Mô hình 3D nhân vật và thuyền dạng mesh nghệ thuật chi tiết cao (Hiện đang dùng hình học thủ tục procedural đa giác thấp có màu sắc phân biệt).
- [ ] Hệ thống âm thanh chiến trường Web Audio (tiếng sóng nước, mái chèo, tiếng va chạm binh khí, trống lệnh và nhạc nền biến đổi theo tình huống).
- [ ] Shader mặt nước gợn sóng biến dạng động đỉnh (Vertex Displacement Water Shader).
- [ ] Kích hoạt đồng bộ Firestore trên môi trường production (Cần quản trị viên nạp fragment rules trong `game-bach-dang-938/firestore.rules.fragment.txt` vào Firebase Console).

