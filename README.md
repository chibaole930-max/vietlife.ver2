# VietLife (2D prototype) sybau

Game mô phỏng cuộc sống 2D chạy trên trình duyệt. Giao diện ở `index.html`, JavaScript được chia theo trách nhiệm trong `src/`; không cần build hay backend.

## Cấu trúc mã nguồn
- Xem [`src/README.md`](src/README.md) để biết thứ tự đọc code, vai trò từng file và cách lần theo một thao tác.

## Chạy
- Chạy online: `npm start`, rồi mở `http://localhost:8787`. Chơi offline: mở `index.html` hoặc dùng server tĩnh.
- Đưa lên GitHub Pages: push repo, bật Pages ở nhánh chính (đã có thể thêm file `.nojekyll`).

## Đã có
- Bản đồ phường 2D (canvas, top-down), đi bằng WASD/mũi tên hoặc chạm, tự tìm đường (A*)
- 5 nghề: Giao hàng, Lập trình, Nông nghiệp, Sản xuất, Đầu bếp — nối được chuỗi Lúa → Gạo → Bánh phở → Phở
- Tiền + Fame (hiếm, dùng mở đất đẹp, xe ba gác, project VIP, nhà hàng)
- Uy tín + behavioral tags (Giữ chữ tín, Hay vay, Chuyên lật kèo, Đầu cơ, Hay giúp người…)
- Chợ giá do người bán đặt, vay/cho vay, hợp đồng doanh nghiệp
- Tin phường (drama sinh ra từ hành động), Hỏi phường, bảng xếp hạng
- Online qua WebSocket: thấy người chơi khác, chat realtime, lời mời kết bạn
- Lịch sự kiện mỗi ngày: 1 lớn + 2–4 nhỏ, có lựa chọn và hậu quả khi bỏ lỡ
- Ngày 06:00–22:00 (~5 phút thật), thời gian dừng khi offline, không stamina, không idle

## Chưa có (bước tiếp)
- Giao dịch kinh tế trực tiếp giữa người chơi và đồng bộ save lên server. Xem phần “Chơi online với nhau” để biết phạm vi hiện hỗ trợ.
- Art thật của team (hiện vẽ bằng canvas, dễ thay bằng sprite).

## Chơi online với nhau

Bản đầu hỗ trợ người chơi nhìn thấy nhau trên bản đồ, chat realtime, lời mời kết bạn và đồng hồ ngày/giờ chung do server giữ. Hành động tiêu tốn thời gian của một người cũng làm giờ chung tiến lên; khi qua ngày, từng save áp dụng phí trọ và hạn nợ theo cùng mốc. Kinh tế, tiền và kho đồ vẫn là save cục bộ trên từng trình duyệt; giao dịch trực tiếp giữa người chơi chưa được bật.

1. Cài Node.js 18 trở lên trên máy chủ hoặc máy chạy game.
2. Trong thư mục dự án, chạy `npm start` (hoặc `node server/server.js`). Mặc định server phục vụ game và WebSocket tại `http://localhost:8787`.
3. Mở `http://localhost:8787` trong trình duyệt. Người chơi khác trong cùng mạng có thể mở `http://IP-MAY-CHU:8787`.
4. Muốn bạn bè ngoài mạng vào được, deploy `server/server.js` lên host hỗ trợ Node và WebSocket. Trang HTTPS cần kết nối địa chỉ `wss://.../ws`; truyền URL qua `?server=wss://ten-mien/ws`.

Server có health endpoint tại `/health`. Server tối giản này lưu người chơi và kết bạn trong RAM; khởi động lại sẽ xóa trạng thái đó. Dùng HTTPS/WSS và thêm xác thực/persistence trước khi mở public lâu dài.

## Deploy lên hosting bằng GitHub Actions + FTP

Workflow [`/.github/workflows/deploy.yml`](.github/workflows/deploy.yml) tự upload toàn bộ game (trừ `.git`, `.github`, `node_modules`) vào `public_html/` mỗi lần push vào nhánh `main`. Không cần build gì cả.

### 1. Thêm secrets (một lần duy nhất)

Vào repo trên GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Bắt buộc | Ví dụ |
| --- | --- | --- |
| `FTP_SERVER` | có | `ftp.example.com` |
| `FTP_USERNAME` | có | `u123456` |
| `FTP_PASSWORD` | có | mật khẩu FTP |
| `FTP_PORT` | không (mặc định `21`) | `2121` |
| `FTP_PROTOCOL` | không (mặc định `ftp`) | `ftps` nếu host bắt buộc FTPS |
| `FTP_SERVER_DIR` | không (mặc định `public_html/`) | `./` nếu login FTP đã vào thẳng web root |

### 2. Chạy thử

Push code lên nhánh `main`, mở tab **Actions** của repo để xem log. Muốn kiểm tra trước khi upload thật, sửa trong workflow thành `dry-run: true` rồi chạy lại.

### 3. Khởi động server Node (một lần duy nhất)

FTP chỉ upload file, **không khởi động được process** — nên sau lần deploy đầu, vào panel host để chạy `server/server.js` một lần:

- **cPanel**: mục *Setup Node.js App* → chọn app root là `public_html` (hoặc thư mục chứa `package.json`), startup file `server/server.js`, bấm *Start/Restart*. Dự án không có dependency ngoài nên không cần `npm install`.
- **Có SSH**: `pm2 start server/server.js --name vietlife` (hoặc `node server/server.js` chạy nền).
- Kiểm tra: mở `https://ten-mien/health` → trả `{ "ok": true, ... }` là server đã chạy.

Lưu ý:

- File `server/server.js` cũng nằm trong `public_html/` nên người dùng tải được qua `/server/server.js`. Muốn giấu, thêm `.htaccess` chặn thư mục `server/` hoặc tách code server sang thư mục ngoài web root (cần SSH).
- Sau mỗi push, file mới đã upload nhưng process Node đang chạy vẫn dùng code cũ → vào panel bấm **Restart** (hoặc `pm2 restart vietlife`) để áp dụng.
- Trang HTTPS kết nối WebSocket qua `wss://`; nếu game không tự nối được thì truyền `?server=wss://ten-mien/ws` như mục trên.
