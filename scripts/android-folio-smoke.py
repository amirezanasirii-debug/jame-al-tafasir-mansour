"""Exercise the signed release through Android's public accessibility tree."""
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(["adb", *args], timeout=35)

def find(label, tap=False):
    deadline=time.monotonic()+65
    last=""
    while time.monotonic()<deadline:
        try:
            adb("shell","uiautomator","dump","/sdcard/folio-ui.xml")
            data=adb("exec-out","cat","/sdcard/folio-ui.xml")
            tree=ET.fromstring(data)
        except (subprocess.SubprocessError, ET.ParseError):
            time.sleep(1)
            continue
        last=" | ".join((n.get("text") or n.get("content-desc") or "") for n in tree.iter("node"))
        for n in tree.iter("node"):
            if not any(label in (n.get(k) or "") for k in ("text","content-desc")):
                continue
            rect=list(map(int,re.findall(r"-?\d+",n.get("bounds",""))))
            if len(rect)!=4 or rect[0]>=rect[2] or rect[1]>=rect[3]:continue
            if tap:adb("shell","input","tap",str((rect[0]+rect[2])//2),str((rect[1]+rect[3])//2))
            return
        time.sleep(1)
    raise RuntimeError("Missing visible control "+label+"; visible labels: "+last[:1200])

adb("shell","svc","wifi","disable")
adb("shell","svc","data","disable")
find("ادامهٔ کاوش",tap=True)
find("پنل شواهد")
Path("folio-android.png").write_bytes(adb("exec-out","screencap","-p"))
find("تدوین",tap=True)
find("یادداشت تازه")
Path("folio-frames.txt").write_bytes(adb("shell","dumpsys","gfxinfo","org.jamealtafasir.mobile"))
print("Offline Android 16 home, evidence sheet and notebook traversed")
