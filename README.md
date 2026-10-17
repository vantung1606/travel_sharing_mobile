# Wayfare Mobile Companion App (React Native & Expo)

Ứng dụng di động du lịch thuộc hệ sinh thái **Wayfare Travel Sharing System**, kết nối đồng bộ 100% thời gian thực với Backend Spring Boot và CSDL MySQL qua REST API.

---

## 📱 1. Kiến Trúc & Đồng Bộ Dữ Liệu
* **Backend:** Spring Boot RESTful API (chạy tại port 8081).
* **Database Single Source of Truth:** 100% dữ liệu (Địa điểm, Lịch trình, Bài viết, Tài khoản) được lấy từ Backend, không sử dụng file dữ liệu tĩnh.
* **Xác thực:** Lưu trữ JWT Token an toàn với `@react-native-async-storage/async-storage`.

---

## 🚀 2. Hướng Dẫn Chạy Trên Điện Thoại Android (An Toàn - Không Cần Bật Gỡ Lỗi USB)

1. Tải ứng dụng **Expo Go** từ CH Play (Google Play Store) về điện thoại của bạn.
2. Đảm bảo điện thoại và máy tính bắt chung 1 mạng Wi-Fi.
3. Trong thư mục `travel_mobile`, khởi động app:
   ```bash
   npx expo start
   ```
4. Mở Expo Go trên điện thoại, quét mã QR hiển thị trên màn hình terminal. App sẽ tải và chạy ngay trên máy của bạn!

---

## 📦 3. Hướng Dẫn Xuất File `.apk` Độc Lập Để Cài Đặt / Nộp Đồ Án

1. Cài đặt EAS CLI (nếu chưa có):
   ```bash
   npm install -g eas-cli
   ```
2. Đăng nhập tài khoản Expo (miễn phí):
   ```bash
   eas login
   ```
3. Chạy lệnh build file APK:
   ```bash
   eas build -p android --profile preview
   ```
4. Sau khi build xong (khoảng 5-10 phút trên cloud Expo), hệ thống sẽ cung cấp đường link và mã QR để bạn tải trực tiếp file `.apk` về điện thoại cài đặt!
