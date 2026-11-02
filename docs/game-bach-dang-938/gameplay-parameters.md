# Tham số tập trung và quy tắc cân bằng

Nguồn số duy nhất của thiết kế: [gameplay-defaults.json](gameplay-defaults.json), `configVersion=bd938-design-0.2`. **Mọi giá trị gameplay là đề xuất, không phải số liệu năm 938.** Tham số UI/hiệu năng cũng là ngân sách mục tiêu chưa đo. Không sao chép số vào từng system khi lập trình; inject config bất biến, validate trước LOAD, ghi hash config vào save/replay.

**Cập nhật triển khai sông 02/11/2026:** giá trị thực thi của phòng thử sông nằm tập trung tại [river-config.json](../../game-bach-dang-938/data/river-config.json), version `bd938-river-lab-1`; JSON thiết kế trên vẫn là mục tiêu toàn chiến dịch chưa triển khai. Không còn bộ tốc độ/tick thứ hai trong shell-scene. Xem [river-model.md](river-model.md) cho quyết định 8 bước catch-up và các xấp xỉ.

## Phân nhóm và quy tắc sử dụng

| Nhóm | Ý nghĩa/đơn vị | Cách hiệu chỉnh và ràng buộc |
|---|---|---|
| `simulation` | Hz, tick, mét; seed | Các Hz lịch chạy chia hết tickHz; epsilon nhỏ hơn dung sai replay. Không đổi tick khi đang chơi. |
| `chapter` | Nhân số, vai trò thuyền, nhịp chương, thời gian sim | Cấu hình encounter cụ thể, không là luật “luôn có N thuyền”. Tổng sức chứa đủ roster; roster gồm cả 4 nhân vật chính và sĩ quan dự bị. |
| `river` | Key `[simSeconds,waterElevationM]`, dòng m/s, kg/m³ | Nội suy tuyến tính các key tăng thời gian; current field theo vùng, clamp max. Đồ thị nước là nhịp tái dựng gameplay, không phải dự báo thủy văn. |
| `boats` | Thân tàu, draft, mass, tốc độ, component integrity | Base draft là mớn không tải của lớp tàu; thêm mass người/cargo/nước rò chia density × waterplane area. Không tính emptyMass lần nữa vào phần tăng draft. |
| `characters` | Health/stamina chuẩn hóa, m/s, giây công việc | Chạy/bơi tốn sức; dưới 0 clamp về 0 và đổi hành động, không thành stamina âm. Hero xuống 0 → wounded, không dead. |
| `combat` | Damage chuẩn hóa, giây, mét, số đạn/vật tư | Damage không lấy từ FPS hay kích thước mesh. Không có chiêu phép; tên lửa cần dầu, thời gian chuẩn bị và điều kiện cháy. |
| `intel` | Tầm nhìn, thời gian cũ, độ trễ truyền lệnh | Địch khuất chỉ có lastSeen pose/tick, không raycast chọn vị trí thật; lệnh nhận chậm theo tick. |
| `logistics` | Vật tư nguyên đơn vị, workSeconds | Mọi chuyển/tiêu hao qua journal. Việc xây/sửa có worker và duration; không hồi vật tư khi reload. |
| `persistence` | Giây/ms giờ thực cho I/O, không phải combat time | Commit cảnh báo/timeout không tự hoàn tất trận; hết timeout khóa chơi và xử lý save. Cloud mặc định off. |
| `quality`, `benchmark` | Chỉ hình ảnh/đo tải | Không đổi damage, perception, quân số thật, thời gian cứu hay xác suất theo preset. |

## Công thức tối thiểu cần thống nhất

- **Tải/thuyền:** `draft = baseDraft + (crewMass + cargoMass + floodedWaterMass)/(density*waterplaneArea)`. `keelY=waterY-draft`; lấy draft lớn hơn theo hull damage khi mất khả năng nổi, không hạ tàu bằng animation rồi tính ngược sát thương.
- **Cọc:** kiểm tra swept hull với cọc và penetration đủ ngưỡng. Năng lượng tương đối theo pháp tuyến `0.5*effectiveMass*normalSpeed²/1000` kJ; integrity damage bằng năng lượng × hệ số, cap theo config. Một impactId chỉ gây sát thương một lần. Khi mắc cố định, chỉ rò/cháy theo thời gian; không trừ lại damage impact mỗi tick. Thoát mắc cần giảm tải/triều/lực kéo và work, không nút miễn phí.
- **Tàu hỏng:** tách hull/rudder/oars/rigging. Hull rò làm tăng nước/draft; rudder giảm tốc quay, oars giảm lực đẩy; cháy tiêu hao integrity bộ phận và lan theo điều kiện. Có thể vô hiệu hóa/chiếm tàu còn nổi; không buộc “HP tàu = 0” mới thắng.
- **Bắn:** tiêu đạn lúc action được chấp nhận; đạn ballistic chịu gravity, swept hit, range/lifetime; chỉ hit event mới gây damage. Tên cháy phải chạm mục tiêu khô có thể cháy, dùng RNG combat; vệt lửa không tạo đạn mới. Loạt bắn đồng đội là các projectile có shooterId, không damage nhân theo particle.
- **Cận chiến:** windup → active hit → recovery; mỗi attackId chỉ hit một target tối đa một lần. Parry hợp lệ theo tick và hướng; counter trong window, tốn stamina, vẫn có recovery. Không damage khi chỉ animation chạm nhưng hitbox chưa active.
- **Ngưỡng tổn thất tổ:** `(dead + missing + captured + wounded-unavailable)/deployedAtAttemptStart`. Mẫu số cố định của attempt, không giảm khi có người chết. Vượt ngưỡng → tổ trưởng đề nghị/thực hiện rút theo order policy; không tự khiến toàn chương thất bại.
- **Giá trị sơ khởi:** cấp roster/vật tư chỉ một lần lúc tạo campaign. Khi chia thuyền/phát tên, chuyển kho → cargo/quiver, không tạo thêm. Các crateId thưởng chỉ được nhận một lần suốt chapter instance.

## Cấu hình nội dung bổ sung khi làm chương

JSON trên không giả vờ đã chứa map/AI hoàn chỉnh. Map manifest sẽ cung cấp bed heightfield, cọc (tipY/position), polygon bờ/boong, đường thoát, kho, flow cells, spawn zones, vai trò mục tiêu và roster stable IDs. Mỗi entry phải có đơn vị, provenance lịch sử/tái dựng, reference tới archetype trong config. Không dùng số fallback rải trong system; thiếu key bắt buộc thì báo lỗi LOAD có đường dẫn field.

Thiết lập người dùng chỉ được đổi input/audio/quality/accessibility. Đổi balance trong bản phát triển tạo configVersion mới; save đang dở giữ phiên bản cũ hoặc qua migration rõ ràng, không áp config mới rồi tiếp tục replay cũ.

## Các điều còn cần đo/chốt

- Độ dài tide, tốc độ chèo, damage, mức đạn/dầu, cảm giác parry và ngưỡng cứu thương: playtest chương mẫu trước khi khóa balance.
- Tên/ngoại hình bốn nhân vật, quân phục, kiến trúc thuyền và vị trí trận địa: kiểm tra nguồn; mặc định vai trò hư cấu, không gắn danh nhân chưa có căn cứ.
- Dữ liệu độ sâu/mớn tàu hiện là mô hình đơn giản; không tuyên bố mô phỏng kỹ thuật tàu lịch sử chính xác.
- Ngân sách render/commit ở 400+ quân chưa đo. Nếu phải đổi kiến trúc/tần số sim để đáp ứng, ghi quyết định mới thay vì thay ngầm quy tắc chiến đấu.
