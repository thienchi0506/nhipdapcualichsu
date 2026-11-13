(() => {
    'use strict';

    // Store source as text only. Never insert these examples as HTML or an iframe.
    const notes = [
        { title: 'Chí', text: String.raw`<!DOCTYPE html>
<html>
<head>
</head>
<body>
<body style="font-family:'Times New Roman';font-size:20px;">
<fieldset>
<center><h2>PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN THI TỐT NGHIỆP 12<br>Năm Học 2026 – 2027</h2></center>
<form action="/action_page.php">
<img src="https://png.pngtree.com/thumb_back/fh260/background/20241113/pngtree-a-tree-growing-from-an-open-book-the-background-is-blurred-image_16591834.jpg" width="200" height="110"style="float:right;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li><label for="hoten">Họ và tên:</label><input type="text" id="hoten">
</li>
<li><label for="nam">Nam:</label>
<input type="checkbox" id="nam">
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<label for="nu">nữ:</label>
<input type="checkbox" id="nu">
</li>
<li>
 <label for="dantoc">Dân tộc:</label>
<input type="text" id="dantoc"></li>
<li>
<label for="ngaysinh">Ngày, tháng, năm sinh:</label>
<input type="text" id="ngaysinh"></li>
<li>
<label for="phone">Số điện thoại liên lạc:</label>
<input type="text" id="phone"></li>
</ol>
<b>2/. ĐĂNG KÝ NGUYỆN VỌNG XÉT TUYỂN ĐẠI HỌC</b>
<fieldset style="width:550px; height:270px;padding:8px 30px 8px 5px;">
<fieldset style="border:none;border-top:7px solid lightgray;border-right:7px solid lightgray;height:245px; margin:0;padding:6px 8px 0 0;">
<fieldset style="height:110px; margin:0;padding:20px 12px 0 12px;">
 ĐĂNG KÝ NGUYỆN VỌNG:
<br><br>
<label for="nguyenvong">Lựa chọn các nguyện vọng:</label>
<select id="nguyenvong">
<option>Đại học Bách Khoa TPHCM</option>
<option>Đại học Y Khoa TPHCM</option>
<option selected>Đại học Tôn Đức Thắng</option>
<option>Đại học Nguyễn Tất Thành</option></select><br>
<input type="submit" value="Gửi truy vấn">
 </fieldset>
</fieldset>
</fieldset>
</form>
</fieldset>
</body>
</html>` },
        { title: 'Chí 2', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<fieldset>
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN THI TỐT NGHIỆP 12<br>Năm Học 2026 – 2027</h2></center>
<form action="/action_page.php">
<img src="hinhanh.jpg" width="200" height="110" style="float:right;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li><label for="tenhs">Họ và tên:</label><input id="tenhs"></li>
<li><label for="gtnam">Nam:</label><input type="checkbox" id="gtnam"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <label for="gtnu">nữ:</label><input type="checkbox" id="gtnu"></li>
<li><label for="dtoc">Dân tộc:</label><input id="dtoc"></li>
<li><label for="nsinh">Ngày, tháng, năm sinh:</label><input id="nsinh"></li>
<li><label for="sdt">Số điện thoại liên lạc:</label><input id="sdt"></li>
</ol>
<b>2/. ĐĂNG KÝ NGUYỆN VỌNG XÉT TUYỂN ĐẠI HỌC</b>
<fieldset style="width:550px;height:270px;padding:8px 30px 8px 5px;">
<fieldset style="border:none;border-top:7px solid lightgray;border-right:7px solid lightgray;height:245px;margin:0;padding:6px 8px 0 0;">
<fieldset style="height:110px;margin:0;padding:20px 12px 0 12px;">
ĐĂNG KÝ NGUYỆN VỌNG:<br><br>
<label for="chontruong">Lựa chọn các nguyện vọng:</label>
<select id="chontruong">
<option>Đại học Bách Khoa TPHCM</option>
<option>Đại học Y Khoa TPHCM</option>
<option selected>Đại học Tôn Đức Thắng</option>
<option>Đại học Nguyễn Tất Thành</option>
</select><br><input type="submit" value="Gửi truy vấn">
</fieldset></fieldset></fieldset>
</form></fieldset>
</body>
</html>` },
        { title: 'Chí 3', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<fieldset>
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN THI TỐT NGHIỆP 12<br>Năm Học 2026 – 2027</h2></center>
<form action="/action_page.php">
<img src="hinhanh.jpg" width="200" height="110" style="float:right;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li><label for="tenhs">Họ và tên:</label><input id="tenhs"></li>
<li><label for="gtnam">Nam:</label><input type="checkbox" id="gtnam" name="gioitinh" value="Nam" onclick="document.getElementById('gtnu').checked=false"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<label for="gtnu">nữ:</label><input type="checkbox" id="gtnu" name="gioitinh" value="Nữ" onclick="document.getElementById('gtnam').checked=false"></li>
<li><label for="dtoc">Dân tộc:</label><input id="dtoc"></li>
<li><label for="nsinh">Ngày, tháng, năm sinh:</label><input id="nsinh"></li>
<li><label for="sdt">Số điện thoại liên lạc:</label><input id="sdt"></li>
</ol>
<b>2/. ĐĂNG KÝ NGUYỆN VỌNG XÉT TUYỂN ĐẠI HỌC</b>
<fieldset style="width:550px;height:270px;padding:8px 30px 8px 5px;">
<fieldset style="border:none;border-top:7px solid lightgray;border-right:7px solid lightgray;height:245px;margin:0;padding:6px 8px 0 0;">
<fieldset style="height:110px;margin:0;padding:20px 12px 0 12px;">
ĐĂNG KÝ NGUYỆN VỌNG:<br><br>
<label for="chontruong">Lựa chọn các nguyện vọng:</label>
<select id="chontruong">
<option>Đại học Bách Khoa TPHCM</option>
<option>Đại học Y Khoa TPHCM</option>
<option selected>Đại học Tôn Đức Thắng</option>
<option>Đại học Nguyễn Tất Thành</option>
</select><br><input type="submit" value="Gửi truy vấn">
</fieldset></fieldset></fieldset>
</form></fieldset>
</body>
</html>` },
        { title: 'Tỷ', text: String.raw`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>
<body style="font-family:'Times New Roman';font-size:20px;">
<b>Tạo form đăng ký sau:</b>
<fieldset style="width:1100px;height:800px;padding:20px;">
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN LỚP 10<br>Năm Học 2026 – 2027</h2></center>
<form action="/action_page.php">
<img src="logo.png" width="130" height="110" style="float:right;margin-right:40px;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li><label for="hovaten">Họ và tên:</label>
<input type="text" id="hovaten"></li>
<li><label for="nam10">Nam:</label>
<input type="checkbox" id="nam10"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
<label for="nu10">nữ:</label>
<input type="checkbox" id="nu10"></li>
<li><label for="dantoc10">Dân tộc:</label>
<input type="text" id="dantoc10"></li>
<li><label for="ngaysinh10">Ngày, tháng, năm sinh:</label>
<input type="text" id="ngaysinh10"></li>
<li><label for="lienlac">Số điện thoại liên lạc:</label>
<input type="text" id="lienlac"></li>
<li>Điểm tổng kết lớp 9 năm học 2025 – 2026:</li>
</ol>
<table border="1" cellspacing="0" cellpadding="5" style="width:94%;margin-left:30px;border-collapse:collapse;table-layout:fixed;">
<tr style="height:45px;text-align:center;">
<td>Môn</td>
<td>Văn</td>
<td>Toán</td>
<td>Anh văn</td>
<td>KHTN</td>
<td>Lịch sử<br>Địa lý</td>
<td>GDCD</td>
<td>Công nghệ</td>
<td>Tin học</td>
</tr>
<tr style="height:45px;">
<td>Điểm TB<br>cuối năm</td>
<td></td><td></td><td></td><td></td>
<td></td><td></td><td></td><td></td>
</tr>
</table>
<br>
<b>2/. ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ</b>
<br><br>

<fieldset style="float:right;width:380px;height:240px;padding:15px;font-size:12px;">
<fieldset style="height:190px;border:1px solid lightgray;padding:12px;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ
<br><br>
<label for="chonmonphai">CÁC MÔN HỌC LỰA CHỌN:</label><br>
<select id="chonmonphai" style="width:100%;font-size:12px;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br>
<input type="submit" value="ĐĂNG KÝ">
</fieldset>
</fieldset>

<fieldset style="width:620px;height:190px;padding:8px 15px 8px 5px;">
<fieldset style="border:none;border-top:5px solid lightgray;border-right:5px solid lightgray;height:170px;margin:0;padding:6px 8px 0 0;">
<fieldset style="height:140px;margin:0;padding:15px 12px 0 12px;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ
<br><br>
<label for="chonmontrai">CÁC MÔN HỌC LỰA CHỌN:</label><br>
<select id="chonmontrai" style="width:100%;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br>
<input type="submit" value="ĐĂNG KÝ">
</fieldset>
</fieldset>
</fieldset>
</form>
</fieldset>
</body>
</html>` },
        { title: 'Tỷ 2', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<b>Tạo form đăng ký sau:</b>
<fieldset style="width:1100px;height:800px;padding:20px;">
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN LỚP 10<br>Năm Học 2026 – 2027</h2></center>
<form action="/action_page.php">
<img src="logo.png" width="130" height="110" style="float:right;margin-right:40px;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li><label for="hovaten">Họ và tên:</label><input id="hovaten"></li>
<li><label for="nam10">Nam:</label><input type="checkbox" id="nam10"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <label for="nu10">nữ:</label><input type="checkbox" id="nu10"></li>
<li><label for="dantoc10">Dân tộc:</label><input id="dantoc10"></li>
<li><label for="ngaysinh10">Ngày, tháng, năm sinh:</label><input id="ngaysinh10"></li>
<li><label for="lienlac">Số điện thoại liên lạc:</label><input id="lienlac"></li>
<li>Điểm tổng kết lớp 9 năm học 2025 – 2026:</li>
</ol>
<table border="1" cellpadding="5" style="width:94%;margin-left:30px;border-collapse:collapse;table-layout:fixed;">
<tr style="height:45px;text-align:center;"><td>Môn</td><td>Văn</td><td>Toán</td><td>Anh văn</td><td>KHTN</td><td>Lịch sử<br>Địa lý</td><td>GDCD</td><td>Công nghệ</td><td>Tin học</td></tr>
<tr style="height:45px;"><td>Điểm TB<br>cuối năm</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table><br>
<b>2/. ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ</b><br><br>
<fieldset style="float:right;width:380px;height:240px;padding:15px;font-size:12px;">
<fieldset style="height:190px;border:1px solid lightgray;padding:12px;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ<br><br>
<label for="chonmonphai">CÁC MÔN HỌC LỰA CHỌN:</label><br>
<select id="chonmonphai" style="width:100%;font-size:12px;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br><input type="submit" value="ĐĂNG KÝ">
</fieldset></fieldset>
<fieldset style="width:620px;height:190px;padding:8px 15px 8px 5px;">
<fieldset style="border:none;border-top:5px solid lightgray;border-right:5px solid lightgray;height:170px;margin:0;padding:6px 8px 0 0;">
<fieldset style="height:140px;margin:0;padding:15px 12px 0 12px;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ<br><br>
<label for="chonmontrai">CÁC MÔN HỌC LỰA CHỌN:</label><br>
<select id="chonmontrai" style="width:100%;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br><input type="submit" value="ĐĂNG KÝ">
</fieldset></fieldset></fieldset>
</form></fieldset>
</body>
</html>` },
        { title: 'Chí hoàn thiện', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<fieldset>
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN THI TỐT NGHIỆP 12<br>Năm Học 2026 – 2027</h2></center>
<form>
<img src="https://png.pngtree.com/thumb_back/fh260/background/20241113/pngtree-an-open-book-with-a-tree-growing-from-it-flying-birds-image_16591912.jpg" width="200" height="110" style="float:right;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li>Họ và tên:<input></li>
<li>Nam:<input type="checkbox" onclick="this.nextElementSibling.checked=false"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; nữ:<input type="checkbox" onclick="this.previousElementSibling.checked=false"></li>
<li>Dân tộc:<input></li>
<li>Ngày, tháng, năm sinh:<input></li>
<li>Số điện thoại liên lạc:<input></li>
</ol>
<b>2/. ĐĂNG KÝ NGUYỆN VỌNG XÉT TUYỂN ĐẠI HỌC</b>
<fieldset style="width:550px;height:270px;padding:8px 30px 8px 5px;">
<fieldset style="border:0;border-top:7px solid lightgray;border-right:7px solid lightgray;height:245px;margin:0;padding:6px 8px 0 0;">
<fieldset style="height:110px;margin:0;padding:20px 12px 0;">
ĐĂNG KÝ NGUYỆN VỌNG:<br><br>
Lựa chọn các nguyện vọng:
<select>
<option>Đại học Bách Khoa TPHCM</option>
<option>Đại học Y Khoa TPHCM</option>
<option selected>Đại học Tôn Đức Thắng</option>
<option>Đại học Nguyễn Tất Thành</option>
</select><br><button>Gửi truy vấn</button>
</fieldset></fieldset></fieldset>
</form></fieldset>
</body>
</html>` },
        { title: 'Tỷ hoàn thiện', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<b>Tạo form đăng ký sau:</b>
<fieldset style="width:1100px;height:800px;padding:20px;">
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN LỚP 10<br>Năm Học 2026 – 2027</h2></center>
<form>
<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWVLX8iWvT40_ueA8kbg52_ZbCraIk0pQ1jvy8pQjGFQ&s=10" width="130" height="110" style="float:right;margin-right:40px;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li>Họ và tên:<input></li>
<li>Nam:<input type="checkbox" onclick="this.nextElementSibling.checked=false"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; nữ:<input type="checkbox" onclick="this.previousElementSibling.checked=false"></li>
<li>Dân tộc:<input></li>
<li>Ngày, tháng, năm sinh:<input></li>
<li>Số điện thoại liên lạc:<input></li>
<li>Điểm tổng kết lớp 9 năm học 2025 – 2026:</li>
</ol>
<table border="1" cellpadding="5" style="width:94%;margin-left:30px;border-collapse:collapse;table-layout:fixed;">
<tr style="height:45px;text-align:center;"><td>Môn</td><td>Văn</td><td>Toán</td><td>Anh văn</td><td>KHTN</td><td>Lịch sử<br>Địa lý</td><td>GDCD</td><td>Công nghệ</td><td>Tin học</td></tr>
<tr style="height:45px;"><td>Điểm TB<br>cuối năm</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table><br>
<b style="font-size:20px;">2/. ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ</b><br><br>
<fieldset style="float:right;width:380px;height:240px;padding:10px;border:1px solid black;font-size:13px;">
<fieldset style="height:190px;padding:10px;border:1px solid lightgray;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ<br><br>
CÁC MÔN HỌC LỰA CHỌN:<br>
<select style="width:100%;font-size:13px;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br><button>ĐĂNG KÝ</button>
</fieldset></fieldset>
<fieldset style="width:620px;height:190px;padding:10px;border:1px solid black;font-size:18px;">
<fieldset style="border:0;border-right:5px solid lightgray;height:170px;padding:10px;margin:0;">
<fieldset style="height:120px;padding:10px;margin:0;border:1px solid lightgray;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ<br><br>
CÁC MÔN HỌC LỰA CHỌN:<br>
<select style="width:100%;font-size:16px;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br><button>ĐĂNG KÝ</button>
</fieldset></fieldset></fieldset>` },
        { title: 'Tỷ gọn hoàn thiện', text: String.raw`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Times New Roman';font-size:20px;">
<b>Tạo form đăng ký sau:</b>
<fieldset style="width:1100px;height:800px;padding:20px;">
<center><h2 style="font-size:20px;">PHIẾU ĐĂNG KÝ CHỌN TỔ HỢP MÔN LỚP 10<br>Năm Học 2026 – 2027</h2></center>
<form>
<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWVLX8iWvT40_ueA8kbg52_ZbCraIk0pQ1jvy8pQjGFQ&s=10" width="130" height="110" style="float:right;margin-right:40px;">
<b>I/ THÔNG TIN HỌC SINH</b>
<ol>
<li>Họ và tên:<input></li>
<li>Nam:<input type="checkbox" onclick="this.nextElementSibling.checked=false"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; nữ:<input type="checkbox" onclick="this.previousElementSibling.checked=false"></li>
<li>Dân tộc:<input></li>
<li>Ngày, tháng, năm sinh:<input></li>
<li>Số điện thoại liên lạc:<input></li>
<li>Điểm tổng kết lớp 9 năm học 2025 – 2026:</li>
</ol>
<table border="1" cellpadding="5" style="width:94%;margin-left:30px;border-collapse:collapse;table-layout:fixed;">
<tr style="height:45px;text-align:center;"><td>Môn</td><td>Văn</td><td>Toán</td><td>Anh văn</td><td>KHTN</td><td>Lịch sử<br>Địa lý</td><td>GDCD</td><td>Công nghệ</td><td>Tin học</td></tr>
<tr style="height:45px;"><td>Điểm TB<br>cuối năm</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table><br>
<b style="font-size:20px;">2/. ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ</b><br><br>
<fieldset style="width:620px;height:190px;padding:10px;border:1px solid black;font-size:18px;">
<fieldset style="border:0;border-right:5px solid lightgray;height:170px;padding:10px;margin:0;">
<fieldset style="height:120px;padding:10px;margin:0;border:1px solid lightgray;">
ĐĂNG KÝ CÁC MÔN HỌC LỰA CHỌN VÀ CỤM CHUYÊN ĐỀ<br><br>
CÁC MÔN HỌC LỰA CHỌN:<br>
<select style="width:100%;font-size:16px;">
<option>CÁC PHƯƠNG ÁN</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)</option>
<option>Lý, Hóa, Sinh, Tin học (Khoa học máy tính)b</option>
<option>Địa, GDKT&amp;PL, Lý, Tin học (Tin học ứng dụng)</option>
<option>Địa, GDKT&amp;PL, Công nghệ (Thiết kế&amp;CN), Tin học (Tin học ứng dụng)</option>
</select><br><button>ĐĂNG KÝ</button>
</fieldset></fieldset></fieldset>
</form>
</fieldset>
</body>
</html>` }
    ];

    const opener = document.getElementById('museum-notes-open');
    if (!opener) return;
    let dialog;

    function buildDialog() {
        dialog = document.createElement('dialog');
        dialog.className = 'museum-notes';
        dialog.id = 'ghi-chu-bao-tang';
        dialog.setAttribute('aria-labelledby', 'museum-notes-title');
        const header = document.createElement('header');
        header.className = 'museum-notes__header';
        const title = document.createElement('h2');
        title.id = 'museum-notes-title';
        title.textContent = '📝 Ghi chú';
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'museum-notes__close';
        close.setAttribute('aria-label', 'Đóng ghi chú');
        close.autofocus = true;
        close.textContent = '×';
        close.addEventListener('click', () => dialog.close());
        header.append(title, close);
        const body = document.createElement('div');
        body.className = 'museum-notes__body';
        const status = document.createElement('p');
        status.className = 'museum-notes__status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');

        notes.forEach((note, index) => {
            const section = document.createElement('section');
            const toolbar = document.createElement('div');
            toolbar.className = 'museum-notes__toolbar';
            const heading = document.createElement('h3');
            heading.textContent = note.title;
            const copy = document.createElement('button');
            copy.type = 'button';
            copy.textContent = 'ok';
            copy.setAttribute('aria-label', 'ok — Sao chép ' + note.title.toLowerCase());
            copy.addEventListener('click', async () => {
                copy.disabled = true;
                try {
                    await copyText(note.text);
                    status.textContent = 'Đã sao chép đầy đủ ' + note.title.toLowerCase() + '.';
                } catch (_) {
                    status.textContent = 'Chưa sao chép được. Bạn có thể chọn văn bản trong khung để sao chép.';
                } finally {
                    copy.disabled = false;
                }
            });
            const code = document.createElement('pre');
            code.tabIndex = 0;
            code.setAttribute('aria-label', 'Nội dung ' + note.title.toLowerCase());
            code.textContent = note.text;
            code.id = 'museum-notes-code-' + index;
            code.hidden = true;
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'museum-notes__toggle';
            toggle.textContent = 'Xóa app';
            toggle.setAttribute('aria-label', 'Xóa app ' + note.title.toLowerCase());
            toggle.setAttribute('aria-controls', code.id);
            toggle.setAttribute('aria-expanded', 'false');
            toggle.addEventListener('click', () => {
                code.hidden = !code.hidden;
                toggle.textContent = code.hidden ? 'Xóa app' : 'Thu gọn';
                toggle.setAttribute('aria-label', toggle.textContent + ' ' + note.title.toLowerCase());
                toggle.setAttribute('aria-expanded', String(!code.hidden));
            });
            const actions = document.createElement('div');
            actions.className = 'museum-notes__actions';
            actions.append(toggle, copy);
            toolbar.append(heading, actions);
            section.append(toolbar, code);
            body.append(section);
        });
        header.append(status);
        dialog.append(header, body);
        dialog.addEventListener('click', event => {
            const rect = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
        });
        dialog.addEventListener('close', () => {
            status.textContent = '';
            document.querySelector('#nav-item-bao-tang > a')?.focus();
        });
        document.body.append(dialog);
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(text); return; } catch (_) { /* Try the local fallback. */ }
        }
        const field = document.createElement('textarea');
        field.value = text;
        field.readOnly = true;
        field.className = 'museum-notes__copy-buffer';
        dialog.append(field);
        try {
            field.select();
            if (!document.execCommand('copy')) throw new Error('copy failed');
        } finally {
            field.remove();
        }
    }

    opener.addEventListener('click', event => {
        event.preventDefault();
        if (typeof window.dongTatCaDropdown === 'function') window.dongTatCaDropdown();
        if (!dialog) buildDialog();
        if (!dialog.open) dialog.showModal();
    });
})();
