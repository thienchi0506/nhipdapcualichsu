# Lưu, mất mát và tiếp quản — hợp đồng v0.2

**Thiết kế mục tiêu cho chiến dịch đầy đủ.** Lưu cho sandbox hiện có đã bàn giao; trạng thái thực thi, quyết định dùng full checkpoint và các giới hạn nằm trong [bàn giao lưu](save-handoff.md). Các mục bên dưới không mặc nhiên mô tả tính năng chiến dịch đã chạy. Mục tiêu là giữ hậu quả đã ghi qua reload/retry, không trừ lặp tài nguyên hoặc nhân đôi phần thưởng. Không hứa chống người dùng sửa bộ nhớ/save trong game chơi đơn chạy hoàn toàn ở client.

## 1. Phạm vi dữ liệu

- IndexedDB riêng: `dcls.bd938.saves.v1`. Khóa mỗi slot là `[principalKind, principalId, schemaVersion, slotId]`; UID Firebase lấy từ Auth thật. Khách có UUID cài đặt riêng, không dùng tên người chơi làm khóa.
- Stores dự kiến: `slots` (revision/head/projection), `journal` (event nghiệp vụ append-only), `checkpoints`, `replayTail` (commands + tick/RNG metadata), `leases`, `outbox`, `imports`. Index unique cho batchId và consequenceKey trong slot. Local preferences `dcls.bd938.preferences.v1` chỉ chứa audio/input/quality, không chứa quân/vật tư.
- Namespace riêng không phải mã hóa hay chống người có quyền máy đọc dữ liệu. Không lưu token/password trong save. Đăng xuất không xóa save hoặc chuyển nó cho user tiếp theo.
- Slot có campaignId, chapterInstanceId và attemptId riêng. Chapter instance là lần làm chương trong chiến dịch; retry tăng attemptId, **không đổi chapterInstanceId để nhận thưởng lại**.
- Mỗi save có schema/sim/config/content version + hash, seed/RNG streams, revision, committedTick/seq, checksum và lịch sử migration. Checksum phát hiện hỏng dữ liệu, không chứng minh chống gian lận.

## 2. Một nguồn sự thật cho mất mát và vật tư

`CampaignProjection = reduce(initialCampaign, committedJournal)` là sổ quân/vật tư/hậu quả chính thức. World snapshot là cách tăng tốc khôi phục vị trí/trận, không được phục sinh hoặc hoàn vật tư trái projection. Sau compaction, base projection + journal suffix phải tái tạo cùng checksum; tombstones tử trận, claim thưởng và high-water sequence không được bỏ.

Vật tư là các tài khoản nguyên lượng: kho trại, kho bến, cargo từng thuyền, quiver từng người, `reserved:<jobId>`, `consumed`, `lost`. Chuyển tài khoản phải cân bằng debit/credit trong cùng transaction. Bắn tên = quiver → consumed; cargo chìm = cargo → lost; không trừ kho thêm lần nữa. Mọi tài khoản sử dụng đều không âm.

| Biến cố | Khóa chống lặp | Quy tắc |
|---|---|---|
| Tạo campaign | `init:<campaignId>` | Chỉ cấp roster/kho sơ khởi một lần; mở lại menu không cấp thêm. |
| Tử trận | `death:<soldierId>` | available/downed → dead chỉ một lần; không có chuyển dead → available. |
| Chuyển vật tư | `transfer:<transferId>` | Hai vế nguyên tử; retry trả receipt trước, không debit lần hai. |
| Bắn/tiêu hao | `consume:<acceptedActionId>` | Chỉ khi command hợp lệ; không dùng click/particle làm khóa. |
| Hỏng tàu | `damage:<impactId>` hoặc tick damage batch | Va cọc một contact episode một lần; tick cháy/rò có seq riêng. |
| Thu hồi crate/loot | `claim:<chapterInstanceId>:<lootId>` | Pickup chuyển item duy nhất; retry không spawn bản sao. |
| Thưởng nhiệm vụ | `reward:<chapterInstanceId>:<objectiveId>` | XP/vật tư chỉ claim một lần, kể cả thử lại hoặc gọi callback kết quả hai lần. |
| Kết thúc attempt | `resolve:<chapterInstanceId>:<attemptId>` | Chỉ một outcome; thắng/thua/rút không cùng commit. |
| Chữa/tuyển quân | `camp:<serviceOrderId>` | Trừ đúng chi phí, ghi thời gian, cấp ID mới khi tuyển; không đổi tên để hồi sinh người chết. |

## 3. Commit và khôi phục khi gián đoạn

**Mặc định ưu tiên tính đúng:** tick có biến đổi bền vững (tiêu vật tư, thương vong, damage persistent, quyền thưởng) dùng commit barrier trước khi công bố trạng thái và hiệu ứng thành công. Các biến đổi cùng tick được gom một batch; không một transaction cho mỗi lính. Tick chỉ di chuyển có thể chạy trong RAM và ghi replay tail cùng checkpoint định kỳ.

1. Coordinator tính candidate tick bằng state/RNG/commands, chưa sửa committed state.
2. Chuẩn bị serializable events, projection patch, replay tail đủ từ checkpoint tới tick này. Không giữ transaction IDB trong khi await mạng/asset.
3. Trong một IDB readwrite transaction: đọc head và lease, so expectedRevision/leaseEpoch, kiểm tra unique keys/nonnegative; ghi journal + projection + tail/head mới. BatchId đã có thì trả receipt cũ.
4. Khi transaction complete, publish state/events, phát shot audio/animation và đánh dấu đã lưu. Tick không cần hậu quả bền vững vẫn phải có command trong replay buffer để tái tạo đến durable head.
5. Lỗi/timeout: pause `saveFailure`, giữ candidate batch với cùng ID; retry đọc batch status trước khi commit lại. Không giả vờ lưu thành công, không tiếp tục sinh nợ hậu quả.

Barrier có thể thành điểm nghẽn ở tải cao: đo riêng latency và số giao dịch ở 400+ quân. Không tuyên bố đạt ngân sách trước khi đo. Nếu cần micro-batch nhiều tick, phải có quyết định mới mô tả cửa sổ chưa commit; không âm thầm giảm bảo đảm lưu để đạt FPS.

Checkpoint full world định kỳ theo config và ở phase/exit; lưu snapshot có appliedSeq, tick, RNG, deadlines, projectiles/jobs/orders/fog. Crash/reload:

- Chọn checkpoint hợp lệ gần nhất và replay command tail đến **committedTick** bằng simVersion/config cũ, không phát audio hoặc gửi lại external side effects.
- Dựng projection tạm cùng lượt replay, so checksum với journal/head đã lưu; không áp lại debit của journal lên một snapshot đã chứa debit đó. EventId/consequenceKey phải khớp. Sai checksum → save lỗi, không chữa bằng cấp lại tiền/quân.
- Movement chưa tới durable head có thể mất khi đóng cưỡng bức; mọi tổn thất đã được báo “đã lưu” vẫn thuộc head. Dữ liệu browser bị xóa/OS mất điện không thể bảo đảm tuyệt đối: IndexedDB có giới hạn độ bền phụ thuộc môi trường; tham khảo [MDN về transaction durability](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#adding_retrieving_and_removing_data). Cần nút xuất backup; không quảng cáo chống mọi sự cố.
- Không trông cậy unload/pagehide hoàn tất Promise. Nút thoát chủ động đợi commit; đóng tab cưỡng bức dùng head cuối.

## 4. Tiếp tục, tải lại chặng và tạo chiến dịch khác

| Hành động | State chiến trường | Quân/vật tư/hậu quả |
|---|---|---|
| **Tiếp tục** cùng attempt | Phục hồi committedTick, tide/đạn/RNG/jobs/AI qua snapshot + tail. | Giữ nguyên projection, không cấp lại loadout. |
| **Tải lại chặng** | Kết thúc attempt cũ, settle người/cargo chưa rõ; tạo attempt mới và map/triều/enemy setup của chặng. | Dùng projection mới nhất; dead/captured/unrecovered/destroyed không xuất lại. Các loot đã claim bị loại khỏi map; reward claim giữ nguyên. |
| **Rút quân** | Trận tiếp tục tới extraction/deadline; người/đồ phải tới điểm rút. | Chỉ đồ mang về nhập kho; đồ đã lost/consumed không trở lại. Mất mục tiêu và thời gian chiến dịch được ghi. |
| **Chiến dịch mới** | Tạo campaignId/slot mới sau xác nhận; không ghi đè slot cũ. | Bộ khởi đầu của chiến dịch mới; không là cách “retry” hiện tại hoặc xóa sổ thương vong. |

Retry không đơn giản là load snapshot đầu trận rồi “trừ chết thêm”. Trình tự: commit resolution attempt cũ → settle roster/cargo → về trại điều trị/điều chỉnh lực lượng → allocate loadout bằng transfer từ kho còn lại → commit attempt mới → dựng encounter. Thuyền chưa mất có damage còn lại, muốn sửa phải trả vật tư/lao động. Người wounded không tự đầy máu; các job đã consume một phần chỉ trả phần reserved chưa dùng khi hủy. Đạn đang bay ở resolution không hoàn lại.

Ví dụ đối chiếu: kho 100 tên, cấp 20 vào thuyền → kho 80/cargo 20; bắn 3 → 80/17/consumed 3. Một lính tử trận và cargo còn lại thu hồi khi rút → kho 97, consumed 3, lính vẫn dead. Retry cấp 20 → kho 77/cargo 20; **không phải 100/20, cũng không trừ thêm 3**. Cùng transfer/result được gửi lại không đổi các số này.

Nếu thiếu quân/vật tư để xuất quân: UI nêu thiếu gì, cho bỏ bớt mục tiêu phụ/loadout, dùng tuyển quân còn quota theo chi phí, hoặc ở trại phục hồi; không cấp quân vô hạn để ép tiếp tục. Nếu không còn lực lượng phù hợp sau tổn thất vĩnh viễn, cho xem kết thúc chiến dịch thất bại/xuất save và tạo chiến dịch mới riêng. Đây là hậu quả hợp lệ, không phải màn loading bế tắc.

## 5. Nhân vật chính bị thương và sĩ quan dự bị

1. Bốn mainHero có tên/tiểu sử hư cấu được ghi rõ; người chơi chọn một, ba người khác chỉ huy AI. Hai reserveOfficer của chương mẫu thuộc roster thật, có vị trí/khả năng chiến đấu, không là mạng miễn phí sinh ra lúc gục.
2. MainHero health về 0: `HeroWounded`, mất khả năng chiến đấu nhưng **không chết**. Đánh dấu vị trí/cần cứu; loại khỏi hit targets gây chết, không cho kẻ địch farming XP. Thể hiện được kéo khỏi trận hoặc mất liên lạc chờ tìm, không biến mất như hồi sinh.
3. Nếu là nhân vật đang điều khiển, xóa held input và chờ handoff ngắn theo config; battle vẫn chạy trừ khi người chơi mở pause. Chọn reserve đầu tiên available theo ưu tiên đã chọn trước trận; tăng controlEpoch, chuyển camera đến vị trí thật, HUD đổi tên/chức vụ. Không teleport reserve tới hero hoặc cấp đầy máu/đạn.
4. Reserve bị gục có thể downed/bleed/dead như quân thường; nếu có reserve khác thì tiếp quản tiếp. Không còn reserve hợp lệ → `failed_command`, ngừng giao tranh bằng resolution, settle attempt rồi cho retry/trại. Không tự chuyển sang một trong ba mainHero khác để né điều kiện hết dự bị.
5. MainHero AI bị thương: phó chỉ huy của cánh quân nhận order/commanderId; nếu thiếu thì tổ trưởng giữ lệnh cuối và rút theo policy. Không biến mainHero AI thành người chết.
6. Người thường downed có bleed timer theo sim; cứu bằng worker/kit trước deadline → wounded; bỏ lại khi rút → missing, sau thời gian xử lý được xác định captured/dead theo event/zone/rule của chương. Không dùng RNG mới mỗi lần load để đổi kết cục.
7. **Trở lại sau chặng:** ở bước trại sau win/retreat/failure, mainHero được cứu/đưa về theo tình tiết đã ghi. Treatment dùng kit và thời gian chiến dịch trong config; trở lại với health/stamina giảm, có wound marker/tình tiết tiếp theo. Nếu không có kit, chọn dưỡng thương lâu hơn qua camp timeline (`campRecoveryWithoutKitTimeMultiplier`), không yêu cầu chờ giờ thực. Không hồi phục trong cùng attempt chỉ bằng reload. Reserve/soldier tử trận không được hưởng nhánh bảo toàn mainHero.

Cứu mainHero thành công vẫn có ích: tránh mất trang bị, trì hoãn hồi phục và suy giảm niềm tin. “Nhân vật chính sống” là quy tắc câu chuyện, không miễn hậu quả cho cả đơn vị.

## 6. Nhiều tab, UID và cloud tương lai

Lease slot dùng transaction IDB, leaseEpoch và expiry/renew ở config. Lease dùng giờ thực để phối hợp tab, **không** dùng làm clock chiến đấu. Tab thứ hai chỉ xem; chỉ takeover sau hết lease và transaction tăng epoch. Mọi commit kiểm tra epoch, nên tab cũ tỉnh lại không ghi đè. Đồng hồ máy đổi/lỗi lease → pause và giành lại writer qua giao dịch, không tiếp tục ghi theo cache. BroadcastChannel chỉ báo UI nhanh, không là khóa duy nhất.

Cloud off trong chương mẫu cho tới khi được giao bật và kiểm thử. Path thiết kế hợp lệ dạng document:

```text
gameBachDang938/{uid}/versions/v1/slots/{slotId}             # head
gameBachDang938/{uid}/versions/v1/slots/{slotId}/snapshots/{snapshotId}
```

Snapshot chia chunk theo nhân sự/journal nếu kích thước vượt budget, immutable; head chỉ trỏ bundle đủ chunk/hash. Upload các chunk trước, transaction kiểm tra expected cloud revision rồi đổi head sau; bỏ dở không thay head. Client chỉ sync checkpoint/thoát theo quota ứng dụng, không mỗi tick và không listener realtime cả chiến dịch. Giữ queue cục bộ khi offline. Callback transaction không làm side effect, vì có thể được chạy lại; transaction Firestore không chạy offline theo [tài liệu chính thức](https://firebase.google.com/docs/firestore/manage-data/transactions).

Rules tương lai phải khóa `request.auth.uid == uid`, validate version/shape/immutable owner/revision/path; test tài khoản A không đọc/ghi B. Rules hiện tại không có match này, **không thay Rules production ở chặng này**. Không dùng Storage/Cloud Functions, billing hay AI API.

Hai máy sửa cùng slot offline: không cộng hai sổ tử trận rồi cộng tiền tùy ý. Nếu cloud head không là tổ tiên của local base, chặn ghi đè, giữ cả bản như nhánh xung đột để người dùng chọn tiếp tục một nhánh riêng; không merge inventory hoặc rollback cùng slot tự động. Bản local/offline không được hứa là đồng bộ tức thì đa thiết bị.

Guest import tạo slot mới trong UID đã xác minh, gắn source campaign/receipt; không gộp tiền vào slot đang có. Schema migration copy-on-write có kiểm tra invariant, giữ bản cũ cho tới validate xong; version mới hơn app thì read-only/export, không downgrade.

## 7. Bộ kiểm tra lưu bắt buộc

| ID | Tình huống | Kết quả yêu cầu |
|---|---|---|
| S01 | Duplicate command/batch/transfer/death/reward/result | Mỗi nghiệp vụ đúng một lần. |
| S02 | Kill rồi retry 5 lần | Cùng soldier ID vẫn dead; quân không tự bổ sung, thưởng không lặp. |
| S03 | Cấp/bắn/thu hồi/retry ví dụ 100 tên | Đúng 77 kho/20 cargo/3 consumed, không âm. |
| S04 | Crash trước transaction, giữa transaction, sau commit trước UI ack | Hoặc toàn batch vắng hoặc toàn batch đủ; retry không nhân đôi. |
| S05 | Reload với đạn đang bay, job xây dở, cargo chìm | Tick/RNG/projectile/job đúng; không hoàn đạn/nhân vật tư. |
| S06 | MainHero gục → reserve 1 → reserve 2 → hết reserve | Đúng actor/epoch; hero không dead; kết thúc failed_command giữ mất mát. |
| S07 | Retry và camp recovery | Retry không heal trong attempt; treatment chỉ một debit, hero trở lại sau settlement, soldier chết vẫn chết. |
| S08 | Hai tab tranh lease, tab cũ resume | Một writer, stale epoch reject. |
| S09 | UID A → B, khách → tài khoản, offline Auth unknown | Không cross-read/cross-write bằng cache tên/UID; guest import rõ ràng. |
| S10 | Save quota/corrupt/migration interruption | Không ghi đè bản tốt, không tiếp tục mất mát chưa commit; xuất backup được. |
| S11 | Cloud denied/offline/conflict/incomplete chunks | Local chơi/lưu được; head không trỏ bundle thiếu; không merge sai. |
| S12 | Snapshot compaction + tail replay | Checksum hậu quả bằng journal chưa compact, tombstones/claims giữ nguyên. |

Tất cả S01–S12 là **kế hoạch kiểm tra chưa chạy**, không phải bằng chứng implementation đã đúng.
