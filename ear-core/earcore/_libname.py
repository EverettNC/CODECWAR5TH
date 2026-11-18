"""The name of ear-core's C library: libearcore.dylib on a Mac, libearcore.so elsewhere.

Both decoder.py and features/_native.py load it from the earcore folder.
`make` and `pip install` (build_native.py) both build it there under this name.
"""

from __future__ import annotations

import sys

LIB_NAME = "libearcore.dylib" if sys.platform == "darwin" else "libearcore.so"
