"""Create the persistent Android release key outside the source tree.

Set JAME_SIGNING_DIR to the private directory that should contain release.jks
and password.txt. Existing credentials are never overwritten.
"""

from pathlib import Path
import os
import secrets
import subprocess


signing_dir = Path(os.environ["JAME_SIGNING_DIR"]).resolve()
keystore = signing_dir / "release.jks"
password_file = signing_dir / "password.txt"

signing_dir.mkdir(parents=True, exist_ok=True)
if keystore.exists() or password_file.exists():
    raise SystemExit("Signing credentials already exist; nothing was overwritten.")

password = secrets.token_hex(20)
environment = os.environ.copy()
environment["JAME_ANDROID_KEY_PASSWORD"] = password

subprocess.run(
    [
        "keytool",
        "-genkeypair",
        "-v",
        "-keystore",
        str(keystore),
        "-alias",
        "jame",
        "-keyalg",
        "RSA",
        "-keysize",
        "4096",
        "-validity",
        "10000",
        "-storepass:env",
        "JAME_ANDROID_KEY_PASSWORD",
        "-keypass:env",
        "JAME_ANDROID_KEY_PASSWORD",
        "-dname",
        "CN=Jame al Tafasir Mansour, O=Jame al Tafasir Mansour, C=IR",
    ],
    check=True,
    env=environment,
)
password_file.write_text(password, encoding="utf-8")

print(f"Android release key created in: {signing_dir}")
print("Keep this directory private and back it up for all future updates.")
