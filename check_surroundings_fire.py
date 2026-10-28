import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos_back_spar = text.find('id="lac-wing-back-spar-patterns"')
pos_back_spar_comm = text.rfind('<!-- ===', 0, pos_back_spar)
print("Back wing insertion point:")
print(text[pos_back_spar_comm-100:pos_back_spar_comm])

pos_front_coverts = text.find('id="lac-wing-covert-scales"')
pos_front_coverts_comm = text.rfind('<!-- ===', 0, pos_front_coverts)
print("Front wing insertion point:")
print(text[pos_front_coverts_comm-100:pos_front_coverts_comm])
