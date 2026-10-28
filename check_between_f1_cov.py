import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_coverts = text.find('id="lac-wing-covert-scales"')
pos_f1 = text.find('id="lac-primary-feather-1"')
pos_f1_end = text.find('</g>', text.find('</g>', text.find('</g>', pos_f1) + 4) + 4) + 4
print("pos_f1_end:", pos_f1_end)
print("Between f1_end and coverts:")
print(repr(text[pos_f1_end:pos_coverts]))
