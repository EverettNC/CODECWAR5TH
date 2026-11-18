# ear-core native library: every .c under csrc/ into one shared library that ctypes loads.
# libearcore.dylib on a Mac, libearcore.so elsewhere (earcore/_libname.py says the same).
# pip install builds the same library with the same flags (build_native.py).
CC ?= clang
CFLAGS ?= -O3 -march=native -ffp-contract=off -fPIC -std=c11 -Wall -Wextra -Wno-unused-parameter
ifeq ($(shell uname -s),Darwin)
LDFLAGS ?= -shared -framework Accelerate
LIB := earcore/libearcore.dylib
else
LDFLAGS ?= -shared -lm
LIB := earcore/libearcore.so
endif
SRC := $(shell find csrc -name '*.c' 2>/dev/null | sort)
HDR := $(shell find csrc -name '*.h' 2>/dev/null | sort)

all: $(LIB)

$(LIB): $(SRC) $(HDR)
	@if [ -z "$(SRC)" ]; then echo "no C sources yet"; else $(CC) $(CFLAGS) $(SRC) $(LDFLAGS) -o $@; fi

clean:
	rm -f earcore/libearcore.dylib earcore/libearcore.so

.PHONY: all clean
