"""Run every Playwright test + the preview sync check. Exit code 1 if anything fails (used by CI before deploy)."""
import glob, subprocess, sys, pathlib
root=pathlib.Path(__file__).resolve().parent.parent
bad=[]
for t in sorted(glob.glob(str(root/'tools'/'tests'/'test_*.py'))):
    r=subprocess.run([sys.executable,t],capture_output=True,text=True,timeout=900,cwd=str(root))
    out=r.stdout+r.stderr
    ok=r.returncode==0 and 'ALL PASS' in out and not any(l.startswith('FAIL ') for l in out.splitlines())
    print(('PASS ' if ok else 'FAIL ')+pathlib.Path(t).name,flush=True)
    if not ok: print(out[-2500:]); bad.append(t)
r=subprocess.run([sys.executable,str(root/'tools'/'sync-preview.py'),'--check'],capture_output=True,text=True,cwd=str(root))
print(('PASS ' if r.returncode==0 else 'FAIL ')+'sync-preview --check',r.stdout.strip())
if r.returncode: bad.append('sync-preview')
sys.exit(1 if bad else 0)
