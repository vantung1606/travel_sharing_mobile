# Đồng bộ mobile theo frontend

Cập nhật: 21/11/2026. Thực hiện từng đợt nhỏ, lấy chức năng và form của `travel_frontend` làm mẫu, giữ cách tương tác phù hợp với điện thoại.

## Phạm vi đã xem

Đã lập danh mục màn hình, component nhập liệu và lời gọi API trong `travel_frontend/src/pages/user`, `travel_frontend/src/components`, `travel_frontend/src/services` và các thư mục `app`, `components`, `src/services` của mobile. Đã đọc chi tiết form xác thực web/mobile, nơi lưu phiên, các điểm mở form và hợp đồng backend tương ứng. Việc lập danh mục chưa xác nhận tất cả chức năng hoạt động tương đương.

Các thay đổi chưa commit có sẵn được giữ lại. Các đợt xác thực được thực hiện trên nhánh `fix/mobile-auth-form-parity`.

## Đợt 1: Form xác thực dùng chung

Mẫu đối chiếu: `travel_frontend/src/components/auth/AuthModal.jsx`.

- Đồng bộ thứ tự trường, tab đăng nhập/đăng ký, nhận email hoặc tên tài khoản khi đăng nhập và ba bước khôi phục mật khẩu.
- Đưa form về nền sáng, trường nhập/nút bo tròn và màu xanh theo frontend; tăng vùng chạm, cho phép chữ/nút xuống dòng, giới hạn chiều rộng trên tablet.
- Kiểm tra email trước khi gửi OTP; chỉ xác thực mã gồm đúng sáu chữ số; chỉ sang bước mật khẩu khi nhận được `resetToken`.
- Hiển thị thông báo lỗi backend ở từng bước; dùng đúng tiêu đề lỗi khi đăng ký.
- Khóa trường nhập, tab và điều hướng khi đang gửi; chặn các yêu cầu trùng nhau, kể cả thao tác bàn phím.
- Xóa OTP/token/mật khẩu mới khi bắt đầu lại hoặc gửi lại mã. Đặt lại thành công thì về đăng nhập, giữ email và xóa mật khẩu.
- Không điền tên tài khoản vào ô email khôi phục. Giữ nguyên mật khẩu khi đăng nhập/đăng ký.
- Form đặt lại mật khẩu kiểm tra khoảng trắng đầu/cuối vì endpoint hiện cắt khoảng trắng trước khi lưu.
- Bổ sung thao tác gửi/chuyển ô bằng bàn phím, gợi ý tự điền, nhãn trợ năng và xử lý nút quay lại Android.

Đã đối chiếu `AuthController`, các request DTO, `AuthService`, entity `User` và schema `users`/`password_reset_tokens` trong backend. Không bổ sung trường hay thay đổi hợp đồng API. Chưa đối soát trực tiếp CSDL đang triển khai.

### Kiểm chứng

- TypeScript toàn mobile: `npx.cmd --no-install tsc --noEmit`.
- Lint component: `npx.cmd --no-install eslint components/WelcomeAuthModal.tsx`.
- Đóng gói Expo cho web và kiểm tra tương tác bằng Chrome ẩn với API mô phỏng ở localhost.
- Đóng gói bundle Android: `npx.cmd --no-install expo export --platform android` đạt; đây là kiểm tra bundle JavaScript/Hermes, chưa phải bản APK chạy trên thiết bị.
- Kiểm tra đăng nhập, đăng ký, nhập email khôi phục, nhập OTP và mật khẩu mới tại 320, 375, 414, 768, 1024, 1280, 1440px: 35 trường hợp không tràn ngang, ô nhập nằm trong khung màn hình.
- Kiểm tra email sai, lỗi gửi OTP, chặn gửi trùng, OTP thiếu/sai, phản hồi thiếu token, mật khẩu quá ngắn/có khoảng trắng/không khớp, lỗi đặt lại và thử lại, quay về đăng nhập, đăng ký lỗi và đăng nhập bằng tên tài khoản. Không có lỗi JavaScript trong lượt kiểm tra thành công.
- Chưa kiểm tra bàn phím, nút quay lại và tự điền trên thiết bị Android/iOS thật; chưa thử gửi email thật hoặc đăng nhập Google thật.
- Lint toàn mobile trước khi sửa: 142 lỗi, 48 cảnh báo. Các lỗi này thuộc nhiều file khác; lint component sửa trong đợt này đạt.

## Đợt 2: Tài khoản trong trang hồ sơ

Mẫu đối chiếu: trạng thái khách của `travel_frontend/src/pages/user/Profile/ProfilePage.jsx`, mở `AuthModal` dùng chung.

- Bỏ form đăng nhập/đăng ký và xử lý Google riêng trong `app/(tabs)/profile.tsx`. Trang khách hiển thị lời mời đăng nhập và nút tạo tài khoản, sử dụng form chung đã sửa ở đợt 1.
- `authPrompt.open()` tiếp tục mặc định mở đăng nhập; `authPrompt.open('register')` mở thẳng đăng ký. Layout truyền tab ban đầu cho `WelcomeAuthModal` và luôn đưa về đăng nhập khi đăng xuất hoặc hết phiên.
- Đăng nhập/đăng ký thành công cập nhật hồ sơ qua đăng ký sự kiện của `authStorage`, không cần tải lại trang. Quên mật khẩu, Google và thông báo lỗi cùng dùng một luồng.
- Khi đổi tài khoản hoặc đăng xuất, xóa dữ liệu hồ sơ, bài đã lưu, bản nháp chỉnh sửa và các modal cá nhân. Bỏ qua phản hồi hồ sơ/bài đã lưu thuộc yêu cầu cũ; thao tác ảnh và lưu hồ sơ cũng kiểm tra tài khoản trước khi áp dụng kết quả.
- Tải bài đã lưu khi người dùng chọn tab hoặc kéo làm mới. Các thao tác sửa lịch trình/theo dõi tiếp tục làm mới hồ sơ của phiên hiện tại.
- Loại bỏ import và style xác thực không còn dùng. Khởi tạo giá trị animation của thanh tab bằng state để lint không báo đọc ref trong render.

### Kiểm chứng đợt 2

- TypeScript toàn mobile đạt; lint cả bốn file sửa (`profile.tsx`, `_layout.tsx`, `WelcomeAuthModal.tsx`, `authPrompt.ts`) đạt 0 lỗi, 0 cảnh báo.
- Đóng gói web và bundle Android/Hermes đạt. Kiểm tra bằng Chrome ẩn với API mô phỏng cục bộ: vào hồ sơ khi là khách, mở đúng tab đăng ký/đăng nhập, kiểm tra dữ liệu sai, mở quên mật khẩu, đăng nhập, đăng xuất và đăng ký tài khoản khác.
- Cố tình giữ chậm phản hồi hồ sơ của tài khoản A và bài đã lưu của tài khoản B, trả về sau khi đã đăng nhập tài khoản khác: dữ liệu cũ không ghi đè tài khoản mới. Không có lỗi JavaScript trong lượt kiểm tra thành công.
- Trang hồ sơ khách và form đăng ký mở từ hồ sơ qua 14 trường hợp ở 320, 375, 414, 768, 1024, 1280, 1440px, không tràn ngang.
- Chạy lại kiểm tra đợt 1: toàn bộ luồng OTP, lỗi backend, chặn gửi trùng và 35 trường hợp form/kích thước tiếp tục đạt.
- Chưa thử Google, email thật hoặc thiết bị Android/iOS thật. Checkbox nhớ mật khẩu vẫn chưa thay đổi cách lưu phiên; chưa mở rộng hành vi này trong đợt 2.

## Đợt 3: Chỉnh sửa hồ sơ, ảnh đại diện và đổi mật khẩu

Đối chiếu `ProfilePage.jsx`, `ChangePasswordModal.jsx`, `UpdateProfileRequest`, `ChangePasswordRequest`, `UserFollowService` và entity `User`. Dùng các endpoint hiện có, không bổ sung trường CSDL.

- Mở form chỉnh sửa bằng dữ liệu đã lưu mới nhất; hủy rồi mở lại không giữ bản nháp. Phản hồi làm mới hồ sơ không ghi đè ô đang nhập.
- Giới hạn họ tên 100, biệt danh 50 (kể cả `@`), điện thoại 20, địa chỉ 255, tiểu sử/URL ảnh 500 ký tự theo entity. Chuẩn hóa biệt danh trước khi gửi và dùng giá trị ngân sách `Sang chảnh` như frontend; vẫn giữ lựa chọn cũ nếu tài khoản đang lưu giá trị khác.
- Khóa lưu, đóng, trường nhập và lựa chọn trong lúc lưu/tải ảnh, chặn gửi trùng bằng trạng thái yêu cầu. Lỗi HTTP, phản hồi `success: false` hoặc thiếu hồ sơ không báo lưu thành công.
- Đồng bộ kết quả API vào hồ sơ và dữ liệu phiên đăng nhập, giữ token hiện tại. Toast nằm trong modal để lỗi không bị che.
- Nút đổi ảnh đại diện trên hồ sơ tải ảnh và cập nhật qua API ngay. Ảnh chọn trong form chỉ được gắn vào hồ sơ khi lưu; hủy bỏ bản nháp. Gửi đúng tên và loại file lấy từ Expo ImagePicker.
- Form chỉnh sửa có cuộn, chừa vùng an toàn và tránh bàn phím; biệt danh/điện thoại chuyển thành một cột trên điện thoại nhỏ. Bổ sung đường dẫn đổi mật khẩu ngay trong form như frontend.
- Form đổi mật khẩu giữ nguyên mật khẩu hiện tại khi gửi, kiểm tra mật khẩu mới/xác nhận/trùng mật khẩu cũ và chặn khoảng trắng đầu/cuối của mật khẩu mới vì backend đang cắt khoảng trắng trước khi lưu. Không giới hạn mật khẩu hiện tại theo độ dài của form đăng ký.
- Đổi mật khẩu thành công đóng form và thông báo; đóng/hủy rồi mở lại xóa toàn bộ mật khẩu và trạng thái hiện/ẩn. Bổ sung tự điền, chuyển ô/gửi bằng bàn phím, nút trợ năng và nội dung cuộn trên màn hình thấp.

### Kiểm chứng đợt 3

- TypeScript toàn mobile đạt. Lint `profile.tsx` và `ChangePasswordModal.tsx` đạt 0 lỗi, 0 cảnh báo; `api.ts` có 0 lỗi và 3 cảnh báo biến catch không dùng đã tồn tại trước đợt này.
- Đóng gói Expo cho web và bundle Android/Hermes đạt.
- Kiểm tra bằng Chrome ẩn và API mô phỏng cục bộ: dữ liệu ban đầu, hủy bản nháp, giới hạn độ dài, ngân sách, chuẩn hóa payload, lỗi HTTP/lỗi logic/thiếu dữ liệu, khóa khi gửi, lưu hồ sơ vào phiên, chọn ảnh trong form và lưu ảnh từ hồ sơ.
- Kiểm tra đổi mật khẩu: thiếu trường, mật khẩu ngắn, trùng cũ, không khớp, khoảng trắng; lỗi máy chủ; bảo toàn mật khẩu hiện tại có khoảng trắng; chặn gửi trùng/đóng lúc đang gửi; thành công, hủy và mở lại form.
- Hai form qua 18 kích thước/trạng thái: 320, 375, 414, 768, 1024, 1280, 1440px cùng 320×480 và 740×360. Không tràn ngang; kiểm tra ô biệt danh/điện thoại/địa chỉ không chồng lên nhau ở màn hình nhỏ. Không có lỗi JavaScript trong lượt kiểm tra thành công.
- Chưa thao tác với tài khoản thật, CSDL đang triển khai hoặc Cloudinary thật; chưa kiểm tra bàn phím/chọn ảnh trên thiết bị Android/iOS thật.

## Đợt 4: Địa điểm và bài viết đã lưu

Đối chiếu mục địa điểm yêu thích của `ProfilePage.jsx`, `SavedPlaceController`, `SavedPlaceService`, entity `SavedPlace`/`Place`/`PlaceImage` và các bảng `saved_places`, `place_images`, `post_bookmarks`. Không thay đổi backend hoặc schema.

- Mục Đã lưu trong hồ sơ mặc định hiển thị địa điểm như frontend. Có bộ chọn địa điểm/bài viết để giữ chức năng xem bài đã lưu của mobile.
- Đọc đầy đủ địa điểm từ `/users/saved-places`, ánh xạ ảnh, danh mục, giá và đánh giá từ entity. Chạm thẻ mở Khám phá với tên địa điểm trong ô tìm kiếm.
- Có trạng thái tải, lỗi, thử lại và danh sách trống riêng cho từng loại. Lỗi HTTP, `success: false` hoặc dữ liệu sai cấu trúc không bị coi là danh sách trống.
- Bỏ lưu địa điểm có chỉ báo đang gửi, chặn bấm trùng và giữ thẻ nếu API lỗi. Chỉ gỡ sau khi máy chủ xác nhận; phản hồi tải trước thao tác bỏ lưu không đưa thẻ trở lại.
- Thay bộ nhớ địa điểm đã lưu bằng cache dùng chung theo phiên, lấy máy chủ làm nguồn dữ liệu. Không đọc/gộp ID từ bộ nhớ cục bộ cũ. Đăng xuất/đổi tài khoản xóa cache đang hiển thị; phản hồi của tài khoản trước bị bỏ qua.
- Khám phá làm mới địa điểm và danh sách yêu thích khi được mở, đồng bộ sự kiện lưu với hồ sơ. Thao tác trái tim chỉ cập nhật sau API thành công; lỗi được thông báo thay vì bỏ qua.
- Bài viết đã lưu vẫn xem và bỏ lưu được. Sửa nút lưu trong chi tiết để nhận đúng trạng thái `false`; lưu lại cập nhật danh sách ngay. Chặn gửi yêu cầu trùng nhau.
- Thẻ địa điểm cho phép phần giá/đánh giá xuống dòng, tránh tràn khi có số lượt đánh giá hoặc khoảng giá dài ở 320px.

### Kiểm chứng đợt 4

- TypeScript toàn mobile đạt. Lint `profile.tsx`, `explore.tsx`, `PlaceCard.tsx`, `savedPlaces.ts` đạt 0 lỗi, 0 cảnh báo. `api.ts` còn 3 cảnh báo catch không dùng đã ghi nhận ở đợt 3.
- Đóng gói Expo cho web và Android/Hermes đạt.
- Chrome ẩn với API mô phỏng: tải chậm, lỗi HTTP/lỗi logic, thử lại, ánh xạ trường địa điểm, mở Khám phá, bỏ lưu thành công/thất bại, chặn gửi trùng, phản hồi GET cũ, trạng thái trống và bài viết đã lưu.
- Kiểm tra bỏ lưu rồi lưu lại trong chi tiết bài viết; lưu từ Khám phá rồi xem tại hồ sơ; bỏ lưu từ hồ sơ rồi xem trái tim trên Khám phá. Đăng xuất, đăng nhập tài khoản khác và trả phản hồi chậm của tài khoản cũ không làm lộ danh sách trước đó.
- Hai danh sách qua 14 trường hợp tại 320, 375, 414, 768, 1024, 1280, 1440px, gồm nội dung dài; không tràn ngang hoặc tràn nội dung thẻ. Không có lỗi JavaScript trong lượt kiểm tra thành công.
- Chưa kiểm tra trên thiết bị thật hoặc với dữ liệu production. Các thao tác khác của bài viết/lịch trình trong hồ sơ chưa được sửa hết; hàm chia sẻ lịch trình tại hồ sơ hiện còn là hàm rỗng, cần làm trong đợt tiếp theo.

## Đợt 5: Bỏ Trang chủ khỏi mobile

- Xóa route `app/(tabs)/index.tsx` khỏi Expo Router.
- Bỏ khai báo Trang chủ khỏi `Tabs`, loại nhãn/icon home khỏi thanh điều hướng và giữ Cộng đồng là tab đầu tiên/điểm neo.
- Xác nhận không còn tham chiếu `/index` hoặc nhãn `Trang chủ` trong mobile. Các điểm điều hướng còn lại đi thẳng tới Cộng đồng, Khám phá, Lịch trình hoặc Tài khoản.

### Kiểm chứng đợt 5

- Route tree chỉ còn `community`, `explore`, `itinerary`, `profile` trong nhóm tab.
- Expo web bundle còn 11 web bundles, không có bundle `index`; Android/Hermes bundle đạt.
- TypeScript và lint `_layout.tsx` đạt; `git diff --check` không có lỗi.

## Đợt 6: Chia sẻ lịch trình trong hồ sơ

- Thay hàm `ShareTrip` rỗng trong hồ sơ bằng luồng chia sẻ thật, dùng chung URL `webItineraryUrl` với màn hình Lịch trình.
- Trên web ưu tiên Web Share; nếu không có thì sao chép URL/nội dung vào clipboard và báo toast. Trên Android/iOS dùng `Share.share` với tiêu đề, nội dung và URL.
- Bắt lỗi/hủy chia sẻ an toàn, không làm thay đổi dữ liệu lịch trình.

### Kiểm chứng đợt 6

- TypeScript và lint `_layout.tsx`/`profile.tsx` đạt 0 lỗi, `git diff --check` đạt.
- Xác nhận route Trang chủ đã bị xóa, route tree chỉ còn Cộng đồng, Khám phá, Lịch trình và Tài khoản; web bundle không còn bundle `index`.
- Bundle Expo web và Android/Hermes đạt sau khi thêm luồng chia sẻ.
- Chưa mở bảng Share native trên thiết bị thật; đã đối chiếu API `Share.share` theo tài liệu React Native và fallback clipboard theo luồng Lịch trình hiện có.

## Đợt 7: Dấu chân du lịch trên mobile

Đối chiếu `TravelFootprintSection.jsx` và các API hiện có của `ProvinceController`/`ProvinceService`, DTO `ProvinceDto`, entity `Province`/`UserProvinceVisit`. Dùng danh mục và dấu chân lưu trong tài khoản qua REST API; không bổ sung CSDL hoặc danh mục tỉnh tĩnh trên mobile.

- Thêm **Tài khoản → Cài đặt → Dấu chân du lịch**. Danh sách có tìm kiếm không dấu theo tên/tên gọi cũ từ `aliases`, lọc miền và số tỉnh đã ghé theo từng vùng.
- Lấy danh mục từ `GET /provinces`, dấu chân từ `GET /provinces/visited`; lưu/gỡ bằng `PUT /provinces/{code}/visited?visited=true|false`. Hiển thị số lượng và phần trăm từ các mã có trong danh mục, không đếm trùng hoặc tính mã tỉnh đã bỏ.
- Chỉ đổi trạng thái sau khi API xác nhận. Khóa thao tác khi đang lưu, chặn gửi trùng; lỗi HTTP, lỗi logic và dữ liệu phản hồi sai giữ trạng thái cũ và thông báo ngay trong modal.
- Có tải, danh mục trống, tìm kiếm không khớp, lỗi và thử lại. Mở lại màn hình tải dữ liệu đã lưu và xóa bộ lọc cũ.
- Màn hình có cuộn, vùng chạm tối thiểu 44px và tránh bàn phím; giới hạn chiều rộng ở tablet. Chờ đóng Cài đặt trước khi mở modal mới. Khi đóng/đổi tài khoản, phản hồi đang chờ không ghi lại vào màn hình mới.
- Phần này triển khai dấu chân được người dùng lưu trên server. Bản đồ và tự nhận diện từ nội dung bài viết/lịch trình của frontend chưa được đưa vào đợt này.

### Kiểm chứng đợt 7

- TypeScript toàn mobile và lint `profile.tsx`, `SettingsSheet.tsx`, `TravelFootprintSheet.tsx` đạt. `api.ts` vẫn còn 3 cảnh báo catch không dùng đã ghi nhận trước đó.
- Expo web và bundle Android/Hermes đóng gói thành công.
- Chrome ẩn với API mô phỏng: tải chậm, lỗi danh mục/dấu chân, phản hồi sai cấu trúc, thử lại, đếm mã hợp lệ, tìm kiếm không dấu và alias, lọc miền, danh mục trống, thêm/gỡ dấu chân, chặn gửi trùng và giữ trạng thái khi API lỗi.
- Kiểm tra đóng/mở lại khi GET hoặc PUT chưa trả về; đăng xuất rồi đăng nhập tài khoản khác và trả phản hồi cũ không làm đổi dấu chân của tài khoản mới. Không có lỗi JavaScript trong lượt kiểm tra thành công.
- 9 kiểm tra bố cục tại 320, 375, 414, 768, 1024, 1280, 1440px, 320×480 và 740×360; kiểm tra thẻ tên dài không tràn. Chưa thử trên thiết bị thật hoặc CSDL production.

## Các đợt tiếp theo

| Phần | Nội dung cần đối chiếu tiếp | Trạng thái |
| --- | --- | --- |
| Tài khoản | Form hồ sơ đã dùng luồng chung ở đợt 2. Checkbox nhớ mật khẩu chưa tác động cách lưu phiên; frontend cũng cần xác nhận hành vi này. | Form đã đồng bộ; còn hành vi nhớ phiên |
| Hồ sơ | Form, ảnh đại diện, đổi mật khẩu, mục đã lưu, chia sẻ lịch trình và dấu chân lưu trên server đã có. Còn thao tác chi tiết bài viết/lịch trình, bản đồ/tự nhận diện dấu chân và khả năng lưu ảnh bìa qua backend. | Đã hoàn thành các phần ghi ở đợt 1–7; còn các mục liệt kê |
| Khám phá | Bộ lọc, đề xuất địa điểm, ảnh, thêm vào chuyến đi và thêm/sửa/xóa đánh giá. | Chờ đối chiếu chi tiết |
| Lịch trình | Form tạo thủ công, gợi ý lịch trình, sửa thông tin/điểm dừng, chia sẻ và xuất lịch trình. | Chờ đối chiếu chi tiết |
| Cộng đồng | Tạo/sửa bài, ảnh/video, gắn địa điểm/lịch trình, bình luận, lưu/chia sẻ và báo cáo. | Chờ đối chiếu chi tiết |
| Tin nhắn | Trò chuyện cá nhân/nhóm, thành viên, đính kèm ảnh/lịch trình và trạng thái đã đọc. | Chờ đối chiếu chi tiết |
| Thông báo | Danh sách, bộ lọc, đọc/xóa và điều hướng tới nội dung liên quan. | Chờ đối chiếu chi tiết |

Các trang quản trị web không thuộc phạm vi mobile dành cho du khách.
