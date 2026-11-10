import glob
import os

# Fix Python 3.11 importlib.metadata crash on legacy .egg directories lacking PKG-INFO
for egg_info in glob.glob("/usr/local/lib/python*/site-packages/*.egg/EGG-INFO"):
    pkg_info = os.path.join(egg_info, "PKG-INFO")
    if not os.path.exists(pkg_info):
        try:
            with open(pkg_info, "w") as f:
                f.write("Metadata-Version: 2.1\nName: charm-crypto\nVersion: 0.62\n")
        except Exception:
            pass
