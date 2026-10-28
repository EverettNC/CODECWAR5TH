# ear-core native library: every .c under csrc/ into one dylib that ctypes loads.
CC ?= clang
CFLAGS ?= -O3 -march=native -ffp-contract=off -fPIC -std=c11 -Wall -Wextra -Wno-unused-parameter
LDFLAGS ?= -shared -framework Accelerate
SRC := $(shell find csrc -name '*.c' 2>/dev/null | sort)
HDR := $(shell find csrc -name '*.h' 2>/dev/null | sort)
LIB := earcore/libearcore.dylib

all: $(LIB)

$(LIB): $(SRC) $(HDR)
	@if [ -z "$(SRC)" ]; then echo "no C sources yet"; else $(CC) $(CFLAGS) $(SRC) $(LDFLAGS) -o $@; fi

clean:
	rm -f $(LIB)

.PHONY: all clean
