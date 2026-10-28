#!/bin/sh
# ear-core tests. Its own venv (numpy only, installed offline from the local
# uv cache), the native library built fresh, then every test against the real
# model on disk. A test whose model or tape is missing says so and is not run.
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  uv venv -q --python 3.12 .venv
  uv pip install -q --offline --python .venv/bin/python -r requirements.txt
fi
make -s
exec .venv/bin/python -m unittest discover -s tests -t . -v "$@"
