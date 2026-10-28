import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

# 10 Front feather tips and their flame orientation angles:
# Direction of flight is approx angle of feather tip:
front_tips = [
    (1, (10, -38), -157.2, 1.25),
    (2, (38, 8), -165.3, 1.20),
    (3, (72, 55), -170.9, 1.15),
    (4, (112, 102), -175.4, 1.10),
    (5, (155, 150), -179.6, 1.05),
    (6, (205, 198), 175.8, 1.00),
    (7, (258, 246), 170.5, 0.95),
    (8, (318, 295), 163.3, 0.90),
    (9, (382, 344), 151.3, 0.85),
    (10, (448, 390), 130.9, 0.80)
]

# 7 Back feather tips and their flame orientation angles:
# Tips face towards right/back:
back_tips = [
    (1, (830, 52), 25.0, 1.05),
    (2, (840, 115), 18.0, 1.10),
    (3, (838, 178), 10.0, 1.10),
    (4, (826, 238), 2.0, 1.05),
    (5, (804, 296), -8.0, 1.00),
    (6, (776, 350), -18.0, 0.95),
    (7, (744, 398), -30.0, 0.90)
]

print(f"Front tips: {len(front_tips)}, Back tips: {len(back_tips)}")
