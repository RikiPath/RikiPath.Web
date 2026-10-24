# Chat riêng Mentor–Learner

- Mở `/mentor-chat/` hoặc `/mentor-chat/?bookingId=123` bằng tài khoản Learner/Mentor.
- Cả hai vai trò có mục **Tin nhắn 1–1** riêng trên menu.
- REST: `/api/mentor-chat/threads`, `/{bookingId}`, `/{bookingId}/messages`.
- SignalR: `/hubs/mentor-chat`; không dùng kết nối, nhóm hay state của meeting.
- Mỗi booking là một cuộc trò chuyện. Backend kiểm tra thanh toán và đúng người tham gia.
- Booking Assigned/Accepted và chưa hết giờ mới được gửi; lịch sử vẫn xem được sau khi đóng.
- Hỗ trợ tải tin cũ, đếm chưa đọc, đã đọc, gửi bằng Enter (Shift+Enter xuống dòng), kết nối lại và đồng bộ lịch sử.

## Chạy local

1. Đặt cấu hình thật tại `RikiPath.Backend/RikiPath.WebApi/appsettings.json` (file được gitignore).
2. Trong backend: `dotnet restore RikiPath.WebApi/RikiPath.WebApi.csproj`.
3. Nếu database chưa có migration chat: `dotnet ef database update --project RikiPath.Infrastructure --startup-project RikiPath.WebApi`.
4. Chạy backend: `dotnet run --project RikiPath.WebApi/RikiPath.WebApi.csproj --launch-profile http` (cổng 5265).
5. Trong frontend: `npm install`, rồi `npm run dev` (cổng 5173).
6. Mở `http://localhost:5173/mentor-chat/`, đăng nhập bằng tài khoản thật; tắt preview nếu đang bật (`?preview=0`).

Vite proxy cả `/api` và `/hubs` về `http://localhost:5265`. Có thể đổi bằng `VITE_BACKEND_TARGET` trong `.env.local`. Nếu gọi hub riêng trực tiếp, đặt `VITE_MENTOR_CHAT_HUB` và cấu hình CORS backend tương ứng.

Kiểm tra hai phía bằng hai browser profile riêng để không ghi đè session đăng nhập. Chọn cùng booking có thanh toán và lịch chưa hết hạn. Tin nhắn phải xuất hiện ở cả hai phía và còn sau tải lại. Các lịch demo cũ đã hết hạn chỉ cho xem lịch sử.

## Kiểm tra mã nguồn

- Frontend: `npm run build`; `npx eslint src/pages/consultation/MentorPrivateChat.jsx src/api/mentorChatApi.js src/services/mentorChatHub.js`.
- Backend: dừng API trước khi chạy `dotnet test RikiPath.Tests/RikiPath.Tests.csproj --filter FullyQualifiedName~MentorPrivateChatTests` vì project hiện dùng chung output directory. Build lại WebApi trước khi khởi động API sau test.
