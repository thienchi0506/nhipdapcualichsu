from pathlib import Path
import subprocess,sys
HERE=Path(__file__).resolve().parent
for name in ['verify_combat.py','verify_edges.py','verify_legacy_switch.py','verify_performance.py','verify_cycles.py']:
 print('RUN '+name,flush=True)
 result=subprocess.run([sys.executable,'-X','utf8',str(HERE/name)])
 print('EXIT '+name+' '+str(result.returncode),flush=True)
