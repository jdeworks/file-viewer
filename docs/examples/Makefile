APP := file-viewer
SRC := src/main.c src/ui.c src/parser.c
BUILD := build
DIST := dist
CC ?= gcc
CFLAGS := -Wall -Wextra -O2
VERSION := 1.0.0

.PHONY: all clean test serve install dist lint

all: $(BUILD)/$(APP)

$(BUILD)/$(APP): $(SRC)
	mkdir -p $(BUILD)
	$(CC) $(CFLAGS) -o $@ $(SRC)

test:
	node tests/movediff.test.mjs

serve:
	cd docs && python3 -m http.server 8000

install: $(BUILD)/$(APP)
	install -m 755 $(BUILD)/$(APP) /usr/local/bin/$(APP)

dist: all
	mkdir -p $(DIST)
	tar -czf $(DIST)/$(APP)-$(VERSION).tar.gz -C $(BUILD) $(APP)

lint:
	clang-tidy $(SRC) -- $(CFLAGS)

clean:
	rm -rf $(BUILD) $(DIST)
