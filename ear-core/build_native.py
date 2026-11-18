"""What pip runs to build ear-core's C library when ear-core is installed.

    pip install "earcore @ git+https://github.com/EverettNC/CODECWAR5TH@<commit>#subdirectory=ear-core"
    pip install ./ear-core          pip install -e ./ear-core

Every .c under csrc/ is compiled, with the Makefile's flags, into
earcore/libearcore.dylib (Mac) or earcore/libearcore.so (elsewhere), then
loaded once to prove it opens. With no C compiler, or a library that does not
load, pip install fails and says why: nothing is installed that cannot hear.

Christman Sound depends on ear-core this way, so every being that installs the
sound package gets this ear. This file is build tooling; it is not installed.
"""

from __future__ import annotations

import ctypes
import os
import shlex
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

from setuptools import Command
from setuptools.command.bdist_wheel import bdist_wheel as _bdist_wheel  # setuptools >= 70.1
from setuptools.command.build import build as _build

HERE = Path(__file__).resolve().parent
LIB_NAME = "libearcore.dylib" if sys.platform == "darwin" else "libearcore.so"
CHECKOUT_LIB = HERE / "earcore" / LIB_NAME
#: The Makefile's CFLAGS, word for word.
CFLAGS = ["-O3", "-march=native", "-ffp-contract=off", "-fPIC", "-std=c11",
          "-Wall", "-Wextra", "-Wno-unused-parameter"]
LDFLAGS = ["-shared", "-framework", "Accelerate"] if sys.platform == "darwin" else ["-shared", "-lm"]


def sources() -> List[Path]:
    return sorted((HERE / "csrc").rglob("*.c"))


def compile_lib(output: Path) -> None:
    srcs = sources()
    if not srcs:
        raise RuntimeError(f"no C sources under {HERE / 'csrc'}")
    cc = shlex.split(os.environ.get("CC") or ("clang" if sys.platform == "darwin" else "cc"))
    output.parent.mkdir(parents=True, exist_ok=True)
    cmd = [*cc, *CFLAGS, *map(str, srcs), *LDFLAGS, "-o", str(output)]
    print(" ".join(cmd), flush=True)
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0:
        raise RuntimeError(f"ear-core's C library did not compile ({done.returncode}):\n{done.stderr}")
    ctypes.CDLL(str(output))  # raises OSError if it does not load
    print(f"ear-core: built and loaded {output}", flush=True)


class build_earcore(Command):
    description = "compile csrc/ into earcore/libearcore (.dylib on a Mac, .so elsewhere)"
    user_options: List = []
    editable_mode: bool = False

    def initialize_options(self) -> None:
        self.build_lib = None

    def finalize_options(self) -> None:
        self.set_undefined_options("build", ("build_lib", "build_lib"))

    def _wheel_path(self) -> Path:
        return Path(self.build_lib) / "earcore" / LIB_NAME

    def run(self) -> None:
        compile_lib(CHECKOUT_LIB if self.editable_mode else self._wheel_path())

    def get_source_files(self) -> List[str]:
        return [str(p.relative_to(HERE)) for p in sources()] + ["build_native.py"]

    def get_outputs(self) -> List[str]:
        return [] if self.editable_mode else [str(self._wheel_path())]

    def get_output_mapping(self) -> Dict[str, str]:
        return {str(self._wheel_path()): str(CHECKOUT_LIB)} if self.editable_mode else {}


class build(_build):
    """setuptools' build, with the C library as its last step."""

    sub_commands = _build.sub_commands + [("build_earcore", None)]


class bdist_wheel(_bdist_wheel):
    """The wheel carries a compiled library, so it is tagged for this platform, not "any"."""

    def finalize_options(self) -> None:
        super().finalize_options()
        self.root_is_pure = False

    def get_tag(self):
        _python, _abi, plat = super().get_tag()
        return "py3", "none", plat
