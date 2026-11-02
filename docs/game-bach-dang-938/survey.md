# Khảo sát thực tế trước khi tích hợp game mới

Ngày khảo sát: 01/11/2026. Phạm vi lần này: mã nguồn, cấu hình trong checkout, chạy cục bộ và thông tin phát hành công khai. Chỉ tạo tài liệu/bằng chứng; không sửa mã hoạt động.

## 1. Mốc được khảo sát và cách thu bằng chứng

- Checkout: nhánh `main`, HEAD `0393e604ef85c44615a0bfa859dd6865c7c9df45`. Có 10 tệp game/kiểm tra đã sửa nhưng chưa commit trước khảo sát; giữ nguyên chúng.
- Mốc chạy thử là **working tree hiện tại**, gồm các thay đổi chưa commit. Đây không mặc định là phiên bản đang phát hành.
- Chạy HTTP server Python tại `http://127.0.0.1:8765/`; các trang chính trả HTTP 200.
- Dùng Chrome headless 156.0.8078.79, profile tạm riêng, desktop 1365×900 và mobile emulation 390×844, DPR 1. Không dùng dữ liệu đăng nhập trong trình duyệt cá nhân.
- Trong phép thử UI, chặn các endpoint Auth, token, Firestore, Storage và Analytics production; vẫn cho tải SDK, font và thư viện đồ họa. Chỉ thao tác localStorage/sessionStorage trong profile tạm.
- Kiểm tra hash trước/sau cho mã đang được Git theo dõi. Xem [bằng chứng nguyên trạng mã](evidence/audit-2026-11-01/runtime-integrity.json).

Bằng chứng chính: [kiểm kê nguồn](evidence/audit-2026-11-01/source-inventory.json), [ảnh/trạng thái trang](evidence/audit-2026-11-01/browser-pages.json), [luồng UI](evidence/audit-2026-11-01/browser-flows.json), các lượt kiểm tra đích được ghi trong [mục lục bằng chứng](evidence/README.md).

## 2. Cấu trúc và trang chính

Website là các trang HTML tĩnh trong thư mục gốc, CSS/JavaScript chủ yếu viết nội tuyến. Không tìm thấy component React/Vue, router SPA, `package.json`, cấu hình Vite/Webpack, `firebase.json`, `firestore.indexes.json`, `.github/workflows` hay `AGENTS.md` trong checkout hiện tại.

| Khu vực | Tệp thật và điểm mã | Hành vi hiện tại đã xác định |
|---|---|---|
| Trang mở đầu | `index.html:1311`, `index.html:1934` | `#btn-start` dẫn tới `trang-chinh.html`; có chuyển cảnh riêng. Bấm thực tế vào được trang chính trên cả hai viewport. |
| Trang chính | `trang-chinh.html` | Trang đầy đủ dung lượng khoảng 1,47 MB; chứa menu, timeline, ba thẻ chính, footer, modal dữ liệu và bảo tàng 3D. |
| Thẻ Sa Bàn | `trang-chinh.html:5003` | `.card--sa-ban` có hai thẻ `a`: `sa-ban.html` và `sa-ban-3d.html`, xác nhận từ DOM và bấm thật. |
| Menu bảo tàng | `trang-chinh.html:4512` | Có lối vào 3D cũ riêng từ dropdown bảo tàng. |
| Footer | `trang-chinh.html:5133` | Các liên kết kho kiến thức, phòng thi, sa bàn, đăng nhập và Quần Anh Hội. |
| Các cửa sổ nội dung | `trang-chinh.html:11005`, `trang-chinh.html:12140` | `moModalDuLieu` tạo nội dung động, mở `#antique-modal-overlay`; `dongModalDuLieu` bỏ `.open`, phục hồi scroll/body, dừng video và cập nhật breadcrumb. Bấm mở/đóng bảo tàng đã đạt. |
| Về trang mở đầu | `trang-chinh.html:6184` | Menu “Trang chủ” dùng `veTrangChu` về `index.html`; đã bấm kiểm tra. |

**Sa Bàn trên trang chính là thẻ điều hướng sang các document khác, không phải một modal game đang nằm trong trang chính.** Cửa sổ bảo tàng dùng modal là luồng khác. Vì vậy không có hàm “đóng sa-ban” tại trang chính để tái sử dụng cho game mới.

## 3. Game 2D cũ: lối vào, đóng/mở và tài nguyên

### Game chính tại `sa-ban.html`

| Luồng | Điểm mã | Hành vi |
|---|---|---|
| Vào từ trang chính | `trang-chinh.html:5017` | Điều hướng document sang `sa-ban.html`; ban đầu hiện `#lobby-screen`. |
| Vào Bạch Đằng ngay | `sa-ban.html:8155` | `vaoThangSaBanChienDau` ẩn lobby, hiện `#game-stage-wrapper`, gọi `chuyenSangTranDo`. Vào mới từ đầu cho `currentStageId=2`, Hồi 2. |
| Vào doanh trại Bạch Đằng | `sa-ban.html:12807` | `vaoAiBachDang` đổi trạng thái hiển thị lobby/game. |
| Vào Như Nguyệt | `sa-ban.html:11885`, `sa-ban.html:11909` | `vaoAiNhuNguyet` và `vaoThangSaBanNhuNguyet` đặt `currentStageId=1`, khởi tạo riêng và mở doanh trại/trận. |
| Về chọn ải | `sa-ban.html:12824` | `quayVeLobby` đổi display của lobby/game/header. Đây là trở về một view trong cùng document, không phải hủy document. |
| Về trang chính | Link trong header game/lobby | Điều hướng sang `trang-chinh.html`; đã bấm kiểm tra. |
| Sang 3D | `sa-ban.html:8142` | `vaoSaBan3D(id)` dẫn tới `sa-ban-3d.html?campaign=1` hoặc `?campaign=2`. |
| Deep link trận | `sa-ban.html:13104` | `#nhu-nguyet`, `#ai-1`, `#saban-nhu-nguyet` mở Như Nguyệt; `#saban`, `#chien-dau` mở Bạch Đằng. |

Tài nguyên và phụ thuộc thật: canvas `#gameCanvas` 1000×560, `game-runtime.js`, `game-runtime.css`, `game-upgrades-2d.js`, `site-music.js`, font và ảnh nền tham chiếu trong CSS; nhạc dùng `nhac-nen-1.mp3` tới `nhac-nen-4.mp3`. Hiệu ứng chiến đấu/âm thanh có phần vẽ canvas và tổng hợp Web Audio. Không thấy game này nạp GLB làm trận địa.

Game dùng trạng thái global, listener bàn phím và vòng lặp riêng trong document. `quayVeLobby` chỉ đổi view; không nên dùng hàm đó làm cơ chế teardown cho game mới. Việc điều hướng sang document khác là ranh giới cô lập hiện hành.

Ảnh đã xem trực tiếp: [trận Bạch Đằng desktop](evidence/audit-2026-11-01/2d-bachdang-battle-1365.png). Không thấy màn đen trong lượt chạy ngắn này; canvas có nội dung và số frame tăng. Đây không chứng minh lỗi tải lâu trước đây đã được loại bỏ trên mọi mạng/thiết bị.

### Các trang 2D phụ phải bảo toàn

- `tran-do-nhap-vai.html`: game canvas 2D riêng gồm doanh trại/trận/hậu chiến, có liên kết về trang chính và `sa-ban.html`; không phải game 3D mới.
- `sa-ban-nhu-nguyet.html`: một trang sa bàn riêng, có nút sang `sa-ban.html#nhu-nguyet`, lưu điểm và lựa chọn giọng đọc.
- `sanh-game.html`: trang game/doanh trại riêng, có các giai đoạn và link về trang chính.
- Quét các literal trong HTML/JS gốc chưa tìm thấy lối vào tới ba tên tệp phụ này từ các tệp khác. Điều này chỉ xác nhận kết quả quét, không khẳng định người dùng không có bookmark hoặc lối vào ngoài website. Cả ba URL cục bộ vẫn tải được, nên không được xóa/đổi tên.

## 4. Game 3D cũ

| Luồng | Điểm mã | Hành vi đã chạy |
|---|---|---|
| Trang chính → 3D | `trang-chinh.html:5020` | Bấm link mở đúng `sa-ban-3d.html`; Three.js khởi tạo và hiện sảnh `#lobby-3d-modal`. |
| Vào chiến trường | `sa-ban-3d.html:7749` | `chuyenVaoThucChien` ẩn sảnh, hiện UI và chọn camera toàn cảnh. |
| Sẵn sàng → hướng dẫn → trận | `#btn-call-battle`, `.battle-guide-continue` | Đã bấm thật: Bạch Đằng chuyển sang `NUOC_LON`, sáu thuyền ta/bảy thuyền địch được đăng ký; renderer có draw calls. |
| Mở lại sảnh | `sa-ban-3d.html:7742` | `moSanhCho3D` hiện sảnh và đặt góc nhìn tactical. |
| Kết quả → bản đồ | `sa-ban-3d.html:7815` | Nút kết quả gọi `troVeBanDoChienDich3D`, phục hồi sảnh và reset các trạng thái liên quan. Đã bấm từ trạng thái thắng giả lập. |
| Chơi lại | `sa-ban-3d.html:7866` | `choiLaiChienDich3D` tải lại trang với `?campaign=1/2`; Bạch Đằng đã bấm thật, về campaign 1 ở trạng thái `CHUA_BAT_DAU`. |
| Như Nguyệt | `#btn-enter-campaign-2`, `#btn-call-battle` | Đã bấm thật: campaign 2, `NHU_NGUYET_THUC_CHIEN`, sáu bè địch, renderer có draw calls. |

Trận địa, tàu và hiệu ứng trong trang này dùng Three.js/geometry tạo bằng mã, `game-upgrades-3d.js`, runtime chung và Web Audio. Không thấy literal `.glb` hay đường `models/` trong `sa-ban-3d.html`; không được quy nhầm toàn bộ GLB lớn của bảo tàng trang chính thành tài nguyên trận 3D này.

Ảnh đã xem: [Bạch Đằng 3D mobile](evidence/audit-2026-11-01/3d-bachdang-battle-390.png). Bảng kết quả được kích hoạt qua hàm game trong bộ nhớ trình duyệt tạm để kiểm tra nút/điều hướng; không gọi đó là chiến thắng bằng chơi tự nhiên toàn trận.

## 5. Đăng nhập, dữ liệu và quyền

| Thành phần | Cách hoạt động trong nguồn | Giới hạn xác minh |
|---|---|---|
| `dang-nhap.html:1193` | Firebase Web SDK 10.12.2; `initializeAuth` dùng IndexedDB rồi browserLocalPersistence. Có email/password, tạo tài khoản và Google popup. | Đã kiểm tra UI/tab/required field và hàm handler được nạp. Chưa dùng tài khoản thật. |
| `dang-nhap.html:1317` | Đăng nhập thành công lưu `tenNguoiDung`, `emailNguoiDung`, `uidNguoiDung` vào localStorage rồi tới trang chính. | Nhánh thành công/Google popup chưa chạy tới backend. |
| `firebase-config.js` | Cung cấp cấu hình Web client qua `window.__FIREBASE_CONFIG__`. | Không sao chép giá trị cấu hình vào hồ sơ; không tìm thấy ba marker admin/service-account/private-key trong HTML/JS gốc được quét. Đây không phải chứng nhận kiểm toán bí mật đầy đủ. |
| `trang-chinh.html:5168` | Hiển thị tên từ localStorage; nếu có tên thì đổi link tài khoản thành `#`. | Tên cache không chứng minh Firebase session còn hợp lệ; không dùng các khóa cache làm quyền cho game mới. |
| `quan-anh-hoi.html:1121` | Khởi tạo Auth/Firestore/Storage, dùng `onAuthStateChanged`; bài đăng/bình luận có luồng cloud và local fallback. | Chỉ nạp UI và fallback khi endpoint production bị chặn. Không đăng bài, bình luận, upload hoặc kiểm tra dữ liệu người dùng. |
| `firestore.rules` | Đọc công khai `posts`/`comments`; tạo cần Auth và `authorUid` trùng UID; giới hạn nội dung; update chỉ một số bộ đếm; delete bị từ chối. | Đây là Rules trong checkout; chưa chứng minh bằng với Rules đã deploy. Không có match dữ liệu game mới. |
| `storage.rules` | `/posts/{userId}/{fileName}` đọc công khai; tạo cần UID trùng path, giới hạn 80 MB và MIME ảnh/video; không update/delete. | Chưa chạy upload hay Rules emulator. |

Lưu game, điểm thi và tiến độ học hiện chủ yếu là localStorage, không được mặc định là dữ liệu Firebase theo tài khoản:

| Khóa/phạm vi cũ cần giữ | Bên sử dụng |
|---|---|
| `bangVang_BachDang_938` | `sa-ban.html` và `tran-do-nhap-vai.html` dùng chung tên bảng thành tích. |
| `danhTuongProfile3D` | Hồ sơ/thành tích 3D cũ. |
| `history-game-settings`, `giongDocBat` | Tùy chỉnh game/giọng đọc dùng qua nhiều trang. |
| `tenDanhTuong`, `diemSaBan_<ten>` | Các trang sa bàn phụ. |
| `dcls_completed_exams`, `thao_truong_best_<id>`, `dcls_peaceScore`, `dcls_playerName` | Thao Trường. |
| `dcls_completedLessons` | Tàng Thư Các. |
| `quanAnhHoi_posts`, `quanAnhHoi_comments`, `quanAnhHoi_theme` | Cache và giao diện cộng đồng. |
| `tenNguoiDung`, `emailNguoiDung`, `uidNguoiDung` | Cache nhận diện sau đăng nhập. |
| sessionStorage `dcls.music.session.v1` | Nhạc xuyên trang; gồm lựa chọn bật, bài và vị trí phát. |

## 6. Phòng thi, kho kiến thức và âm thanh

- `thao-truong.html` chứa UI lẫn phần lớn dữ liệu đề; nạp thêm `grade10-exams.js`, `grade11-exams.js`. Có 70 mục trong `EXAMS_DATA` ở mốc này. `startExam` tại dòng 48830 chọn/sao chép câu, `showScreen` đổi catalog/exam, có modal xác nhận và chấm/lưu điểm cục bộ.
- Đã bấm chọn đáp án, mở xác nhận, nộp, xem điểm và làm lại ở desktop/mobile. Đáp án được chọn đúng trạng thái; kết quả hiện; làm lại xóa lựa chọn và ẩn kết quả. Đề chuẩn đầu tiên thiếu cấu trúc: xem [lỗi nền](preexisting-issues.md).
- `tang-thu-cac.html` dùng `curriculumData`, `DU_LIEU_BAI_HOC`, `openLesson`/`closeModal`; 13 bài khối 10, 13 bài khối 11, 17 bài khối 12. Đã đổi khối 12, mở bài Liên hợp quốc, thấy bốn thẻ ghi nhớ, đánh dấu/bỏ đánh dấu, đóng modal và tìm “ASEAN” được sáu bài khớp.
- `site-music.js` điều phối nhạc ở các document. Đã kiểm tra: ban đầu không phát; bấm bật thì phát; sang 2D giữ bật; trong phòng thi audio paused; rời phòng thi ra catalog audio phát tiếp. Thử ở cả hai viewport. Không kiểm tra loa thực hay cuộc gọi/đổi ứng dụng trên điện thoại vật lý.

## 7. Đồ họa, tài nguyên, build và kiểm tra

- Three.js r128 từ cdnjs dùng ở game 3D và trang chính; trang chính còn nạp OBJLoader/GLTFLoader 0.128.0 và `model-viewer` 3.4.0. Firebase 10.12.2 và Google Fonts được tải từ CDN.
- Bảo tàng trang chính tạo `model-viewer` động. Các model mặc định là trống đồng và cọc năm 1288; script base64 `models/model_trong_dong_data.js` và `models/model_coc_bach_dang_data.js` được tạo script tag tại `trang-chinh.html:10154`. GLB trong `models/` có tệp 16.529.444 và 76.391.016 byte, có bản sao tên khác. Không giả định giấy phép hoặc phù hợp năm 938.
- Trang chính đã có thư viện đồ họa và animation riêng trước game mới. Tiêu chí cô lập sau tích hợp là **không có tải/vòng lặp của game mới khi chưa mở**, không phải yêu cầu xóa mọi Three.js hay animation sẵn có.
- Máy có Python 3.12 và Chrome; không tìm thấy `node`/`npm` trong PATH. Website tĩnh vẫn chạy được bằng HTTP server, không cần build hiện tại.
- Có `tools/game_browser_check.py` và `tools/game_regression_checks.js`: smoke, frame samples, runtime pause/resume/cancel, sát thương, thanh máu, điều kiện kết quả và đổi campaign. Lượt chạy khảo sát đạt 11/11 + 11/11 + 17/17 + 17/17, không có JS errors được bộ này ghi nhận.
- Các script gốc như `agent1_constitution_guardian_check.py`, `test_prompt12_17.py`, `check_trang_chinh_targets.py`, `test_fire_motifs.py` là kiểm tra tĩnh/hình học từng phần; chưa thấy cấu hình test runner hoặc CI gọi chúng thành một suite. Không chạy toàn bộ script ad-hoc vì nhiều tệp phục vụ các thay đổi hình ảnh trước đây.

## 8. Quy trình phát hành quan sát được

- Git remote được đọc từ cấu hình repo: `https://github.com/thienchi0506/nhipdapcualichsu.git`.
- API công khai ghi nhận workflow `pages-build-deployment`, path `dynamic/pages/pages-build-deployment`; ba run gần nhất đều `completed/success`, nhánh `main`.
- Jobs của run `41304330968` đã được đọc: `Checkout` → `Build with Jekyll` (image `ghcr.io/actions/jekyll-build-pages:v1.0.13`) → `Upload artifact`, sau đó `Report Build Status` và `Deploy to GitHub Pages`. Không có bước chạy bộ kiểm tra Python/game trong danh sách job quan sát được. Đây là build trên GitHub Pages, dù checkout không có npm/build tool riêng.
- Deployment Pages gần nhất được quan sát có SHA `0393e604ef85c44615a0bfa859dd6865c7c9df45`, ref `main`, trạng thái `success`, môi trường `github-pages`, thời điểm 01/11/2026 12:01:03 UTC.
- URL phát hành trả HTTP 200. Hash HTML 3D trên URL phát hành khác hash 3D trong working tree, phù hợp việc working tree có sửa chưa commit.
- API `/repos/.../pages` trả 404 khi đọc không xác thực. Vì vậy chưa truy cập được lựa chọn Settings → Pages/source folder/protection/approval; không khẳng định cấu hình tự phát hành mọi push chỉ dựa vào tên branch.
- Không commit, push, mở PR, gọi deploy hay thay Firebase production trong khảo sát.

Chi tiết phản hồi: [release-observations.json](evidence/audit-2026-11-01/release-observations.json) và [release-workflow-jobs.json](evidence/audit-2026-11-01/release-workflow-jobs.json).

## 9. Khu vực bảo toàn và điểm tích hợp

| Khu vực phải bảo toàn | Cách kiểm tra sau khi tích hợp |
|---|---|
| Mọi link vào 2D/3D cũ trên thẻ, menu bảo tàng, footer, Quần Anh Hội và deep link `campaign/hash` | So literal href/onclick và bấm hai link cũ; đối chiếu route/campaign với baseline. |
| Hai game cũ, trang phụ, runtime/chỉ số/luật, input và âm thanh của chúng | Hash/diff theo phạm vi; chạy suite game cũ và luồng UI; đối chiếu lỗi nền được ghi nhận. |
| Phòng thi/dữ liệu đề/đáp án/điểm | Không đổi tệp dữ liệu; chạy chọn đáp án → nộp → điểm → làm lại; đối chiếu các khóa cũ. |
| Kho kiến thức/nội dung/tiến độ | Đổi khối, mở bài, thẻ ghi nhớ, đánh dấu và tìm kiếm; kiểm tra khóa hoàn thành cũ. |
| Auth/cấu hình/Rules hiện có và dữ liệu Quần Anh Hội | So diff; tách test Auth/UI với test backend; không sửa Rules production để phục vụ game mới. |
| Bảo tàng, timeline, menu, nguồn mô hình và font/ảnh/video hiện có | Bấm modal và điều hướng; dùng danh sách tải nền làm mốc so sánh. |
| Quy trình phát hành và mọi sửa chưa commit có sẵn | So git status/hash; không đưa thay đổi mới lên nhánh phát hành trong chặng cục bộ. |

**Điểm tích hợp ưu tiên đã xác định:** khối `.card--sa-ban` tại `trang-chinh.html:5003`, cụm hai liên kết tại dòng 5017–5022. Chặng sau có thể thêm một lựa chọn mới trong cùng khối và cho nó mở một document game riêng. Hai liên kết hiện hữu vẫn giữ nguyên. Đây là điểm gắn nhỏ nhất, không cần biến đổi modal, router hoặc tệp game cũ.

Điểm phụ có thể gắn về sau nếu được giao: một mục giới thiệu trong lobby `sa-ban.html`. Điểm này nằm trong game cũ đang có thay đổi chưa commit và không cần thiết cho phương án ưu tiên; khảo sát chưa chọn hay sửa nó. Không tái sử dụng tên `tran-do-nhap-vai.html` vì đó là tệp hiện hữu.

## 10. Phần chưa xác minh

- Đăng nhập/đăng ký/Google thật, tài khoản A/B, Auth expiry/sign-out, cloud sync và Rules đã deploy. Không có tài khoản thử và không đăng nhập Firebase Console.
- Rules emulator: chưa có cấu hình emulator/Firebase CLI trong repo; chưa kiểm tra quyền chéo UID, quota hay dữ liệu production.
- Toàn bộ nội dung học thuật của 70 đề, mọi nhánh nhiệm vụ/hậu chiến và chơi tự nhiên trọn hai trận. Các kiểm tra kết quả có fixture được đánh dấu riêng.
- Tất cả model bảo tàng đã tải thành công, quyền dùng từng asset, offline/CDN failure, mạng yếu kéo dài 5–10 phút và WebGL context loss.
- Điện thoại vật lý, Safari/iOS, Firefox, tai thỏ/thanh địa chỉ thật, bàn phím ảo và âm thanh qua loa/đổi ứng dụng.
- Cấu hình Settings → Pages, bảo vệ branch và quy trình duyệt phát hành ở tài khoản GitHub.

Điều kiện hoàn thành khảo sát đã đạt: có điểm tích hợp chính xác từ nguồn/DOM, có mốc hiện trạng và [danh sách hồi quy](regression-checklist.md) để kiểm tra website cũ sau tích hợp. Các lỗi hiện có được lưu riêng tại [preexisting-issues.md](preexisting-issues.md).
