# Font Glass — Đổi font web theo gu của bạn

> Website chọn font cho bạn. Font Glass cho bạn quyền
> Một tiện ích nhỏ dành cho những người nhìn một trang web và nghĩ: “Nội dung ổn đấy, nhưng cái font thì không.”

**Font Glass** là extension cho Chromium, giúp bạn tuỳ chỉnh font hiển thị trên website bằng font có sẵn trên máy hoặc font bạn tự nhập. Dự án bắt đầu từ một nhu cầu rất cụ thể: dùng font hệ thống — đặc biệt là SF Pro/SF UI — trên web, với nhiều quyền kiểm soát hơn những gì mình tìm được ở các công cụ có sẵn.

Nó được tạo theo kiểu **vibe coding**😗: ý tưởng, yêu cầu và quá trình thử nghiệm đến từ người làm dự án; phần code được xây dựng và tinh chỉnh cùng AI (ChatGPT và Gemini).
---

## Có gì trong này?

- **Chọn font cho nội dung web** từ danh sách font mà trình duyệt có thể nhận diện trên máy.
- **Nhập font riêng** từ các định dạng TTF, OTF, WOFF và WOFF2, dùng trực tiếp trong extension khi không tiện cài font vào hệ thống.
- **Tách font nội dung và font code** để đoạn code không bị biến thành một cuộc khủng hoảng typographic.
- **Chỉnh cỡ chữ** theo chế độ có sẵn, theo tỉ lệ hoặc theo số pixel cố định.
- **Tuỳ chỉnh độ đậm** khi font hỗ trợ trục Variable Font `wght`; font tĩnh sẽ không được giả vờ là variable.
- **Tuỳ chọn italic** và **ligatures** cho code, với chế độ giữ nguyên, bật hoặc tắt.
- **Kiểm tra nhanh glyph tiếng Việt**, giúp phát hiện font có thể thiếu dấu trước khi bạn áp dụng khắp trang.
- **Giữ nguyên một số thành phần nhạy cảm** như icon và khu vực code để hạn chế việc đổi font làm giao diện vỡ trận.
- **Theo dõi nội dung được tải động**, và cho phép tạm dừng Font Glass trên từng website.
- Giao diện có tiếng Việt và tiếng Anh.

Tính năng thực tế còn phụ thuộc vào font, trình duyệt và cách website xây dựng giao diện. Không có lời hứa rằng mọi website sẽ đẹp lên 100%; đôi khi website sẽ thắng một hiệp.

<img width="1917" height="1030" alt="code-font" src="https://github.com/user-attachments/assets/3345be07-1366-4f23-80c0-e810928d05d3" />
<img width="1917" height="1077" alt="Ligatures" src="https://github.com/user-attachments/assets/e80aa1ce-ed8f-4c70-b895-d9513d19c65e" />
<img width="1917" height="1027" alt="Font-khac-italic" src="https://github.com/user-attachments/assets/a812a696-2d1f-4c04-82d7-fa935d86dc5c" />
<img width="1917" height="982" alt="SF-Pro-Dislay" src="https://github.com/user-attachments/assets/fe33bb77-9c11-4ff4-960c-89c70b645573" />


## Cài đặt

Font Glass hiện được cài thủ công dưới dạng extension unpacked.

1. Tải hoặc clone repository này.
2. Giải nén ZIP nếu bạn tải bản ZIP.
3. Mở `chrome://extensions` trên Chrome hoặc `edge://extensions` trên Edge.
4. Bật **Developer mode**.
5. Chọn **Load unpacked** rồi trỏ tới thư mục `font-glass` có file `manifest.json`.
6. Ghim extension lên thanh công cụ nếu muốn mở nhanh.

Khi cập nhật từ bản ZIP mới, chọn đúng thư mục extension hiện có hoặc tải bản mới vào thư mục riêng, sau đó bấm **Reload (↻)** trong trang quản lý extension.

## Dùng font hệ thống hay nhập font?

**Khuyến nghị:** nếu có quyền, hãy cài font vào hệ điều hành trước. Sau đó mở lại trình duyệt nếu font chưa xuất hiện trong danh sách. Đây thường là cách gọn gàng hơn để các ứng dụng khác cũng có thể dùng font.

Nếu máy công ty bị khoá quyền cài font, hoặc bạn chỉ muốn thử một font mà không cài vào hệ thống, hãy dùng tính năng **Nhập font ngoài**. WOFF2 thường là lựa chọn gọn nhẹ cho web; nếu bạn chỉ có TTF/OTF hoặc định dạng khác được hỗ trợ thì vẫn có thể thử.

Lưu ý: sau khi cài font mới vào Windows, Chrome có thể chưa cập nhật danh sách font ngay. Thử đóng hoàn toàn rồi mở lại trình duyệt trước khi kết luận font đã biến mất vào một chiều không gian khác.

## Một vài lưu ý thực tế

- Font Glass chỉ có thể dùng những font mà trình duyệt/extension được phép nhận diện hoặc những font bạn chủ động nhập.
- Việc tìm thấy font trong danh sách không đảm bảo font có đủ glyph cho mọi ngôn ngữ.
- Chỉnh font có thể làm thay đổi xuống dòng, khoảng cách, độ cao thành phần hoặc bố cục của website. Nếu trang trông kỳ lạ, hãy đổi font khác hoặc khôi phục cài đặt.
- Một số trang, thành phần nhúng hoặc giao diện đặc biệt có thể không phản ứng hoàn toàn như mong đợi.
- Quyền truy cập và khả năng liệt kê font phụ thuộc vào trình duyệt, hệ điều hành và quyền đã cấp.

## Có lỗi? Thử mấy cách cơ bản trước

1. Mở lại popup/cài đặt extension và kiểm tra font đang chọn.
2. Nếu vừa cài font hệ thống, đóng rồi mở lại Chrome/Edge.
3. Nếu vừa cập nhật code extension, vào trang quản lý extension và bấm **Reload (↻)**.
4. Nếu chỉ một website bị lỗi, thử tạm dừng Font Glass trên website đó để xác định nguyên nhân.
5. Nếu vẫn lỗi, mở issue và ghi rõ trình duyệt, hệ điều hành, tên font, website gặp vấn đề và các bước tái hiện. Ảnh chụp màn hình cũng hữu ích — miễn là không chụp luôn mật khẩu ngân hàng nhé.

## Đóng góp

Đây là dự án mở để mọi người khám phá, góp ý, fork và cải thiện. Nếu bạn rành JavaScript, CSS, API extension hoặc đơn giản là phát hiện một lỗi khó chịu, **pull request và issue đều được chào đón**.

Tác giả là người nêu bài toán, thử nghiệm và quyết định hướng sản phẩm; AI đã hỗ trợ đáng kể trong quá trình triển khai code. Vì vậy, đừng ngại đề xuất thay đổi — code tốt hơn quan trọng hơn chuyện ai gõ dòng code đầu tiên.

## Vì sao lại làm cái này?

Vì đôi khi bạn chỉ muốn dùng font mình thích trên web, chứ không muốn biến việc đổi font thành một luận án CSS. Những công cụ sẵn có chưa đáp ứng đúng nhu cầu của mình, nên mình thử mô tả chính xác thứ mình muốn, nhờ AI hỗ trợ xây dựng, rồi liên tục dùng thử và sửa tiếp.

Font Glass là kết quả của quá trình đó: một công cụ được làm vì nhu cầu thật, chia sẻ công khai để người khác có thể dùng và làm nó tốt hơn.

---

**Nếu thấy hữu ích:** hãy dùng thử, báo lỗi, góp ý hoặc fork dự án. Nếu thấy nó chưa hữu ích, góp ý vẫn được — chỉ cần đừng bắt font Comic Sans làm mặc định toàn hệ thống là được.
