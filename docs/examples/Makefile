APP := file-viewer
SRC := src/main.c src/ui.c
BUILD := build

.PHONY: all clean test serve

all: $(BUILD)/$(APP)

$(BUILD)/$(APP): $(SRC)
	mkdir -p $(BUILD)
	$(CC) -Wall -Wextra -O2 -o $@ $(SRC)

test:
	node tests/movediff.test.mjs

serve:
	cd docs && python3 -m http.server 8000

clean:
	rm -rf $(BUILD)
