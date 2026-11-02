# Nhân vật và chiến đấu trực tiếp — mô hình triển khai

02/11/2026 · chỉ áp dụng cho `game-bach-dang-938/`. Đây là tình huống thử chức năng với mô hình tạm, không phải chương chiến dịch hoàn chỉnh hay tái hiện nhân số lịch sử.

## Quyền sở hữu và bước mô phỏng

- `data/character-config.json` giữ các thông số di chuyển, sức bền, đòn đánh, cứu, tiếp quản và camera. `river-config.json` vẫn sở hữu sông/thuyền; thêm tình huống `combat`, không thay các tình huống sông trước.
- `sim/encounter.js` sở hữu nhân vật, đòn đánh, tên, chọn mục tiêu, trạng thái bản đồ và tiếp quản. Nó điều phối **một** lần `stepRiver` trong mỗi tick, rồi vận chuyển hành khách, điều khiển nhân vật/AI, giải đòn/tên. Không có vòng lặp combat thứ hai.
- `app/input.js` chỉ tạo ý định; không sửa máu, vị trí hoặc thuyền. `app/session.js` đóng dấu command ID/epoch, xếp hàng và bước fixed clock 30Hz. Presentation đọc state; các thông số chẩn đoán xuất ra là bản sao, không phải API sửa game.
- Command ID chống xử lý lại; epoch đổi khi tiếp quản để lệnh của nhân vật cũ không chạy lên sĩ quan mới. Đổi lái/bản đồ/tiếp quản xóa held input và lệnh còn chờ. Pause, blur, hidden, abort đều giải phóng input.
- Event có tick, sequence, actor/source/cause ID. Có `Jumped`, `Landed`, `EnteredWater`, `RescueStarted/Cancelled/Rescued`, `AttackStarted`, `MeleeResolved`, `ArrowFired/Hit/Blocked`, `Damage`, `Parried`, `Blocked`, `Evaded`, `GuardBroken`, `HeroWounded`, `ActorDowned/Died`, `ReserveTookOver`, `NoReserves`.

## Di chuyển và bề mặt

Hệ trục kế thừa: mét, Y hướng lên, thuyền hướng âm Z khi yaw=0; góc tính bằng radian, thời gian từ tick. Nhân vật lưu tọa độ chân. Trên boong, lưu `boatId/localX/localZ`; mỗi tick đổi sang world bằng pose hiện tại của thuyền, không cộng thêm delta thuyền lần nữa. Renderer dùng cùng mặt boong và nội suy hình ảnh thuyền ta.

Bề mặt đi được gồm hình chữ nhật boong xoay, cầu bến và đáy/bờ đủ nông. Chọn bề mặt cao nhất có thể bước tới; bước cao tối đa 0,4m. Bước hụt mép chuyển sang rơi, không giữ nhân vật lơ lửng trên một attachment cũ. Chân đang đứng trên boong theo cả cao độ nước/mớn và chuyển động ngang của boong.

WASD khi lái là ga/lái; sau E là đi bộ theo hướng camera. Đi 2,2m/s; giữ Shift chạy 4,2m/s, tốn 9 sức/s. Bộ chạm hướng hoạt động độc lập với nút đỡ/đánh. Đồng đội tránh bước thẳng khỏi mép khi theo người chơi; trên boong hẹp, đồng đội nhường với tiếp xúc mềm để không khóa lối đi của người điều khiển. Địch vẫn cản chuyển động tiến vào người; được phép lùi tách khỏi chỗ chồng ban đầu.

E rời lái: phó thuyền giữ ga/hướng vừa có khi người chơi còn trên boong. Khi người chơi rời thuyền, phó thuyền thả neo, hãm có quán tính; không dịch chuyển thuyền về chỗ cũ. Muốn lái lại, quay về boong ta, đi tới khu vực đuôi rồi E. E cạnh cầu bến/thuyền thực hiện cú nhảy lên/xuống được kiểm tra khoảng cách.

## Áp mạn, nhảy và đồng đội

G dùng khoảng cách thật giữa hai hình chữ nhật boong, kể cả cạnh bên/góc, không dùng khoảng cách tâm. Mặc định khe boong tối đa 1,6m; hành trình nhân vật tới điểm đáp tối đa 3,6m; tốc độ tương đối không quá 1,2m/s; tốn 20 sức. Đi tới mép trước khi nhảy. Cú nhảy 0,65s tính vận tốc ban đầu, cộng vận tốc mục tiêu khi xuất phát; sau đó bay đạn đạo dưới trọng lực. **Không bám/teleport tới mục tiêu đang chạy**. Nếu boong đã rời đi, người chơi có thể rơi xuống nước.

Space khi đi bộ nhảy tự do theo hướng bấm/hướng mặt, không tự tìm điểm an toàn. Đồng đội Lâm được lệnh theo/giữ trong panel hệ thống; khi theo cú nhảy, đi tới vị trí xuất phát và tự kiểm tra lại khoảng cách/tốc độ/sức bền trước khi nhảy. Không sao chép vị trí người chơi sang đồng đội. AI hiện là tránh mép và theo trực tiếp trong tình huống nhỏ, chưa có navmesh hay tổ chức đơn vị lớn.

## Bơi và cứu — không hồi vị trí miễn phí

- Rơi qua mặt nước chuyển sang bơi, bỏ attachment. Tốc độ bơi 0,9m/s, cộng dòng chảy; tốn 12 sức/s, kể cả khi cố nổi tại chỗ. Không hồi sức trong nước.
- Tới nơi đáy cách mặt nước không quá 0,9m thì đứng/lội trên **đáy tại chỗ**; không tự tìm bờ gần nhất rồi dịch sang.
- E gọi cứu chỉ khi cách điểm mép boong ta không quá 1,5m, thuyền chậm không quá 0,7m/s và có đồng đội tỉnh táo trên chính thuyền đó. Kéo lên mất 3s, chuyển động liên tục tới điểm boong đã chọn; không hồi máu/sức bằng thao tác cứu.
- Nếu người cứu gục, thuyền chạy quá nhanh hoặc rời khỏi khoảng cứu, thao tác hủy; người bơi vẫn ở vị trí hiện tại.
- Khi sức về 0, có 20s để được cứu hoặc vào vùng lội. Hết hạn gây gục: nhân vật chính bị thương; người khác bị hạ. Không có nút dịch chuyển an toàn, hồi sinh miễn phí hoặc tự về tàu.

## Đánh, đỡ và tên

Mặc định máu/sức 100. Cận chiến 28 sát thương thô, tốn 18 sức; lấy đà 0,3s, hồi 0,6s; tầm 1,8m, kiểm tra góc và chênh cao. **Một lần vung trúng tối đa một đối thủ, một lần**. Giữ J/nút Đánh lặp đòn sau hồi, không lặp mỗi frame. Giáp hiện giảm 25% sát thương thô cho mọi nhân vật.

Giữ Q/Đỡ chỉ đỡ phía trước: đỡ thường tốn 8 sức và nhận 25% sát thương trước giáp. Đỡ cận chiến trong cửa sổ 0,2s tiêu 12 sức, chặn đòn và làm người đánh choáng 0,8s; mở cửa sổ phản đòn 0,5s, đòn kế tiếp nhân 1,3. Hết sức có thể vỡ đỡ/choáng. V né tốn 20 sức, kéo dài 0,35s; chỉ 0,18s đầu tránh đòn. Không tạo miễn nhiễm kéo dài.

Cung: đổi bằng nút Cung/Kiếm (F khi đi bộ), L chuyển khóa hoặc chạm/click mô hình địch, J/nút Đánh để giương/bắn. Mỗi tên 22 sát thương thô, giương 1s, hồi 0,8s, vận tốc 32m/s, tầm 70m; túi tên 40. Không tạo tên khi hết đạn/mục tiêu mất trước lúc nhả. Khóa không đảm bảo trúng: tên bay thật, mục tiêu có thể di chuyển và vật cản có thể chặn.

Tên dùng sweep đoạn tương đối giữa hai pose nhân vật theo tick, gồm chuyển động do boong. Chọn giao điểm sớm nhất giữa nhân vật, thân thuyền và cầu bến; tên hết hiệu lực sau lần chạm đầu, rơi nước/đất hoặc quá thời gian bay. Hiện có **tên lạc trúng đồng đội**, không xuyên người và không gây nhiều hit. Damage ledger theo `causeId:targetId` cũng chặn xử lý lặp; đòn đã bị đỡ/né không được tái áp sát thương sau đó.

## Gục và tiếp quản

Hero được chọn có loại `mainHero`: máu 0 → `wounded`, không `dead`. Hai sĩ quan dự bị An/Bình có danh tính và pose riêng từ lúc bắt đầu. Sau 3s người điều khiển gục, sĩ quan còn khả năng đầu tiên nhận quyền điều khiển **tại vị trí thực của họ**, không tới chỗ hero, không hồi máu hero, camera chuyển theo người mới. Sĩ quan đã gục không được chọn lại. Lệnh cũ bị loại bởi control epoch.

Nhân vật thường ở `downed` có giới hạn chảy máu 90s rồi `dead`. Chặng này chưa có chữa thương trên cạn hoặc hồi phục sau chương. Khi hết sĩ quan phù hợp, `failed_command` dừng mô phỏng, mở bảng kết quả/chơi lại/chọn lại/về Sa Bàn đúng một lần.

Tất cả thay đổi này hiện ở RAM của lượt thử. Replay tạo sandbox mới, **chưa phải retry chiến dịch có giữ mất mát**. Không gọi Firebase, không ghi khóa điểm/tiến độ cũ. Phải nối journal theo [save-and-recovery.md](save-and-recovery.md) trước khi đưa mất mát vào chương thật.

## Camera, bản đồ và vòng đời

Hai góc: toàn cảnh chéo và sau nhân vật. Chuyển góc giữ selected target/control identity. Ray kiểm tra địa hình, bến và thân thuyền để rút camera về phía trước vật cản; giữ khoảng hở với đất/nước. Đây là camera proxy, chưa là sphere cast đầy đủ cho các nội thất/mô hình GLB tương lai.

M mở bản đồ ngay trong viewport: clock, triều, địch, tên và chuyển giao vẫn chạy; khi lái, giữ ga/hướng; đồng đội trên thuyền chỉ bắn trả trong khoảng bị tấn công. Khi đi bộ, người điều khiển giữ đỡ tại chỗ. Bản đồ chọn mục tiêu và đóng được bằng nút/M; chưa có lệnh hành quân phức tạp. **Esc/Tạm dừng là menu dừng thật**, đóng băng cả đạn, sức, nước và bộ đếm tiếp quản. Resume không giữ phím cũ.

Các listener bàn phím gắn canvas, chạm gắn từng nút/canvas. Map chỉ nhận phím trong vùng map. Window blur/visibility chỉ phục vụ auto pause. Mỗi pointer có trạng thái riêng; pointerup/cancel/lostcapture không xóa ngón khác. Dispose abort listeners, giải pointer capture, dừng RAF và dọn avatar/label/geometry/material/context.

## Xấp xỉ và ranh giới

Nhân vật là capsule/AABB giản lược, boong là mặt phẳng có yaw; không ragdoll, không cơ thể vật lý nhiều khớp, roll/pitch hay đánh theo từng khớp tay. Tên quét tuyến tính từng tick dưới trọng lực; đất kiểm tra mẫu, chưa mesh collision tổng quát. Đồng đội/địch là AI tình huống nhỏ, không phải 400+ quân hoặc AI chỉ huy cuối. Vai trò, lính và bố trí trong sandbox đều là tái dựng hư cấu.

Mô hình/người/vũ khí là placeholder hình học gốc; không thêm thư viện, model nặng, âm thanh hoặc dịch vụ ngoài. Không suy ra FPS/khả năng iOS từ test Chrome emulation.
