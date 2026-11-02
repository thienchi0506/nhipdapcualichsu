# Bàn giao chặng 2 — khung game cô lập

Ngày 02/11/2026. Đã triển khai và chạy cục bộ; chưa phát hành. Chặng này dựng vỏ có thể thao tác, không phải chương chiến đấu hoàn chỉnh.

**Ghi chú cập nhật sông nước cùng ngày:** runner/báo cáo hồi quy khung đã được chạy lại với động học có quán tính; thời gian giữ tiến trong phép thử tăng thành 1,2s. Bản đang liên kết là lượt hồi quy đạt của chặng sông; lượt chuyển tiếp có lỗi details/timing được lưu tại `evidence/river-2026-11-02/initial-shell-regression.json`. Toàn bộ kết quả hiện hành xem [river-handoff.md](river-handoff.md); các mô tả “chưa có sông/va cọc” bên dưới là phạm vi tại thời điểm làm khung.

## Thay đổi hoạt động

| Khu vực | Đã triển khai |
|---|---|
| Trang chính | Chỉ thêm **3 dòng HTML**: một anchor `#bd938-entry` trong `.card--sa-ban`, sau nhóm hai link cũ. Không đổi href/handler của game cũ hoặc nhúng engine mới vào trang chính. |
| Route mới | `game-bach-dang-938/index.html`, CSS scoped, ES modules; không framework/build mới. |
| Chọn trước lượt | Bốn vai trò H01–H04; chọn Tiết kiệm/Cân bằng/Chi tiết, ghi nhớ local preference riêng; không phụ thuộc đăng nhập. |
| Tải | Ba công việc thật: đọc JSON → import scene/Three riêng → dựng/compile/render cảnh. Không dùng timer tăng phần trăm giả. Có hủy, lỗi và thử lại. |
| Cảnh/camera | Bến sông hình học tạm, bốn vai trò có cờ/trang bị; thuyền được chọn có vòng sáng. Toàn cảnh ban đầu, theo thuyền, kéo xoay/zoom. |
| Điều khiển/vòng đời | WASD và D-pad cảm ứng; briefing, start, pause/resume, kết thúc lượt thử, replay, chọn lại, về Sa Bàn. Tab ẩn/mất focus tự pause; browser Back trở lại shell. |
| Cô lập/dọn dẹp | Không global gameplay API; diagnostics chỉ export trong module. Session hủy RAF/input/ResizeObserver/GPU/shadow/context; bỏ canvas. Không nạp nhạc/runtime cũ vào route mới. |

Tệp runtime thêm: `index.html`, `styles/game.css`, `data/shell-scene.json`, `src/app/{bootstrap,preferences,diagnostics,loader,input,session}.js`, `src/core/demo.js`, `src/presentation/scene.js`, `vendor/three-r128/{three.module.js,LICENSE,manifest.json}` trong route mới. [README chạy cục bộ](../../game-bach-dang-938/README.md).

## Bằng chứng và kết quả

- [Kiểm tra browser chính](evidence/shell-2026-11-02/browser-checks.json): 62/62; desktop 1365×900, mobile emulation 320/360/375/390/430×844; chọn/tải/start/pause/resume/kết thúc/replay, 5 lần mở/đóng liên tiếp, cảm ứng, ghi nhớ cấu hình, link cũ và điều hướng thư viện/phòng thi.
- [Kiểm tra lỗi/cleanup độc lập](evidence/shell-2026-11-02/edge-checks.json): **21/21**; đo RAF bằng wrapper riêng, kiểm tra listener canvas qua CDP và context WebGL thực sự lost sau dispose; mạng chậm/hủy/lỗi, WebGL mất/không có, storage bị chặn, bấm lặp, landscape 844×390, browser Back, nhập WASD/Space ở tìm kiếm website sau thoát. Không uncaught JS exception trong các tình huống này.
- [Suite game cũ](evidence/shell-2026-11-02/legacy-regression.json): 11+11+17+17 = **56/56**, không JS error. Bốn trường hợp Bạch Đằng/Như Nguyệt 2D/3D; đây là suite hiện có với các fixture, không phải chơi tự nhiên toàn bộ trận.
- [Lượt xem cuối](evidence/shell-2026-11-02/visual-checks.json): **8/8** cho link mới/cũ vừa thẻ, dựng cảnh và dọn phiên ở desktop/mobile sau hiệu chỉnh màu tuyến tính cho Three r128. Ảnh cuối: [desktop](evidence/shell-2026-11-02/final-scene-1365.png), [mobile](evidence/shell-2026-11-02/final-scene-390.png), [thẻ Sa Bàn mobile](evidence/shell-2026-11-02/home-sa-ban-390.png).
- [Đối chiếu nguồn](evidence/shell-2026-11-02/source-integrity.json): so 235 tệp đang được Git theo dõi trước/sau; chỉ `trang-chinh.html` thay đổi, **234 tệp còn lại nguyên hash**, gồm mọi sửa chưa commit có sẵn của người dùng.
- [Kiểm tra nguồn cuối](evidence/shell-2026-11-02/source-checks.json): **14/14**; xác nhận nội dung trang chính bằng bản gốc cộng đúng một anchor, imports, namespace, provenance/hash thư viện, liên kết hồ sơ và `git diff --check`.
- Network đo trên trang chính: không request file thuộc `/game-bach-dang-938/`. Khi vào shell chưa tải Three, chưa tạo canvas/renderer/RAF. Engine chỉ tải khi người chơi mở bến thử; quay về shell có thể giữ module trong cache nhưng không scene/input/loop.

Ảnh: [chọn nhân vật](evidence/shell-2026-11-02/characters-desktop.png), [cảnh desktop](evidence/shell-2026-11-02/scene-desktop.png), [mobile 320px](evidence/shell-2026-11-02/scene-320.png), [landscape](evidence/shell-2026-11-02/landscape-844x390.png), [tải khi mạng chậm](evidence/shell-2026-11-02/loading-real-latency.png), [lỗi tải](evidence/shell-2026-11-02/load-error.png).

Các thử lỗi dùng fixture rõ ràng: CDP network latency/blocking, `WEBGL_lose_context`, chặn tạo WebGL, từ chối Storage, synthetic blur/persisted pageshow. Có thêm browser Back thật; chưa khẳng định máy/browser luôn dùng bfcache. Lượt đầu thử mạng chậm bị cache trả ngay; công cụ đã tắt cache để đo đúng và chạy lại, không phải lỗi game. Log helper cũ có thể in WinError 10054 lúc Chrome đóng socket; JSON game không có JS errors.

## Tài nguyên và lưu

Three.js r128 ES module tải từ tag chính thức, hash/license lưu trong manifest; không đổi bản CDN của game cũ. Địa hình/thuyền/người/cờ/props đều tạo bằng mã mới, chưa nhập ảnh/GLB/âm thanh của bên thứ ba. Dùng font hệ thống hỗ trợ tiếng Việt, không yêu cầu font CDN. Mỹ thuật hiện tại chỉ phục vụ phân biệt vai trò và kiểm tra khung.

Chỉ lưu `dcls.bd938.preferences.v1` (hero/quality). Không đọc tên/UID cache làm quyền, không tạo save chiến dịch hay ghi Firestore/Storage. Auth/mock/account-scope chưa cần cho lượt khám phá không lưu; UI nói rõ chưa đồng bộ. Các kiểm tra browser chặn backend Firebase production; không đăng nhập hoặc ghi dữ liệu thật.

## Chưa xác minh và bước sau

Chưa test điện thoại vật lý, Safari/iOS/Firefox, bàn phím ảo/tai thỏ/thanh địa chỉ thật, loa, GPU/FPS thật; không công bố hiệu năng 400+ quân. Chưa triển khai chương 15–25 phút, AI/combat/sông nước/hậu cần, journal mất mát hoặc save UID. B01–B06 giữ nguyên trong hồ sơ lỗi nền.

Chặng tiếp theo cần core deterministic và journal trước combat gây mất mát, theo hợp đồng đã thiết kế. Không dùng `demo.js` và local preference để giả lập lưu chiến dịch. Dừng ở chặng khung này; chưa commit/push/deploy hoặc sửa Firebase production.
