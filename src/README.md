# Hướng dẫn đọc mã nguồn VietLife

VietLife đang dùng JavaScript thuần, không cần cài package hay chạy bước build. `index.html` nạp các file trong thư mục này theo thứ tự từ `00-core.js` đến `90-loop.js`. Các file là script thường nên cùng chia sẻ phạm vi global; hãy giữ thứ tự này khi thêm file mới.

## Bắt đầu từ đâu?

1. Đọc `00-core.js` để hiểu hằng số, vật phẩm, nghề và dữ liệu bot.
2. Đọc `10-map.js` để xem cách tạo bản đồ, tòa nhà và tìm đường A*.
3. Đọc `20-state.js` để hiểu dữ liệu save, tiền, vật phẩm và cấp nghề.
4. Đọc `30-world.js` để theo dõi thời gian trong ngày, sự kiện và mô phỏng bot.
5. Đọc `40-render.js` để xem cách vẽ canvas.
6. Đọc `50-navigation.js` và `60-ui.js` cho điều khiển, HUD và các panel.
7. Đọc `70-actions.js` để xem các thao tác của người chơi làm thay đổi state thế nào.
8. Đọc `80-boot.js` và `90-loop.js` để hiểu màn hình bắt đầu và vòng lặp game.

## Bản đồ file

| File | Trách nhiệm | Điểm bắt đầu nên đọc |
| --- | --- | --- |
| `00-core.js` | Hằng số và dữ liệu nội dung | `ITEMS`, `VEH`, `BOTS` |
| `10-map.js` | Dữ liệu bản đồ, dựng lưới, A* | `buildMap()`, `astar()` |
| `20-state.js` | State, kinh tế, tạo đơn và project | `newState()`, `addItem()`, `pay()` |
| `30-world.js` | Ngày mới, tick thế giới, bot, sự kiện | `newDay()`, `tickWorld()` |
| `40-render.js` | Canvas, cảnh tĩnh, nhân vật, giao thông | `renderStatic()`, `draw()` |
| `50-navigation.js` | Minimap, đi đường, input | `goTo()`, `updatePlayer()` |
| `60-ui.js` | HUD, panel và nội dung panel | `updateHUD()`, `PANELS` |
| `70-actions.js` | Hành động từ UI và save/load | `ACTS`, `save()`, `load()` |
| `80-boot.js` | Màn hình chào, tạo/tải game và vòng lặp | `showWelcome()`, `startGame()`, `frame()` |
| `85-online.js` | WebSocket, cộng đồng, chat và kết bạn | `onlineConnect()`, `onlinePanel()` |
| `90-loop.js` | Điểm khởi động ứng dụng | `boot()` |

## Theo dấu một thao tác

Ví dụ khi người chơi bấm nhận đơn giao hàng:

1. `60-ui.js` tạo nút có `data-a="takeOrder"`.
2. Bộ xử lý nút chuyển thao tác đến `ACTS.takeOrder()` trong `70-actions.js`.
3. Hàm cập nhật `s.carry` (state được tạo trong `20-state.js`).
4. `90-loop.js` gọi cập nhật HUD và tracker để hiển thị state mới.

## Thêm một tính năng nhỏ

- Nội dung tĩnh (vật phẩm, nghề, bot): thêm vào `00-core.js`.
- Quy tắc thay đổi state: thêm helper ở `20-state.js` hoặc hành động ở `70-actions.js`.
- Nội dung panel: sửa `PANELS` trong `60-ui.js`, dùng `btn(action, value, label)` để tạo nút.
- Khi thêm `ACTS.someAction`, nút tương ứng dùng `data-a="someAction"`.
- Nếu thêm file JavaScript, đặt tên có số thứ tự và thêm thẻ `<script src="src/..."></script>` vào cuối danh sách trong `index.html` ở đúng thứ tự phụ thuộc.

## Chạy game

Mở `index.html`, hoặc chạy máy chủ tĩnh trong thư mục dự án, ví dụ `python3 -m http.server 8000`, rồi vào `http://localhost:8000`. Không mở `src/*.js` trực tiếp trong trình duyệt.
