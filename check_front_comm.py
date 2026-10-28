import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_coverts = text.find('id="lac-wing-covert-scales"')
pos_comm = text.rfind('<!-- ===', 0, pos_coverts)
print("pos_comm:", pos_comm)
print(repr(text[pos_comm:pos_coverts]))
print("Preceding 100 chars:")
print(repr(text[pos_comm-100:pos_comm]))
