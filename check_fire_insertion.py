import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Check defs insertion point
pos_defs_end = text.find('</defs>')
print("pos_defs_end:", pos_defs_end)

# 2. Check back wing insertion point:
# In bird-wing-back, find end of lac-back-feather-1
pos_back_f1 = text.find('id="lac-back-feather-1"')
pos_back_spar = text.find('id="lac-wing-back-spar-patterns"')
print("pos_back_f1:", pos_back_f1)
print("pos_back_spar:", pos_back_spar)

# 3. Check front wing insertion point:
# In bird-wing-front, find end of lac-primary-feather-1 / start of lac-wing-covert-scales
pos_front_coverts = text.find('id="lac-wing-covert-scales"')
pos_front_coverts_comm = text.rfind('<!-- ===', 0, pos_front_coverts)
print("pos_front_coverts_comm:", pos_front_coverts_comm)
