import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

target_back = '            <!-- II. SỐNG CÁNH UỐN CONG & CÁC DẢI HOA VĂN HÌNH HỌC ĐÔNG SƠN MẶT TRONG -->'
target_front = '            <!-- ========================================================================= -->\n            <!-- II. 2 HÀNG LÔNG VŨ NGẮN (COVERT FEATHERS) XẾP LỚP NHƯ VẢY RỒNG           -->'

print("target_back found:", text.find(target_back))
print("target_front found:", text.find(target_front))
