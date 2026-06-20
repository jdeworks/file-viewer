#!/usr/bin/sed -f
# Sed script: normalize and clean log files
# Usage: sed -f sample.sed input.log

# Remove blank lines
/^[[:space:]]*$/d

# Remove comment-only lines (lines starting with #)
/^[[:space:]]*#/d

# Strip trailing whitespace
s/[[:space:]]\+$//

# Normalize CRLF to LF
s/\r$//

# Replace ISO timestamps with a placeholder label
s/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}/[TIMESTAMP]/g

# Mask IPv4 addresses
s/\([0-9]\{1,3\}\.\)\{3\}[0-9]\{1,3\}/[IP]/g

# Uppercase log levels
s/\b\(debug\|info\|warn\|error\|fatal\)\b/\U\1/gI

# Replace multiple spaces with a single space
s/  \+/ /g

# Delete lines containing "TRACE" level (verbose)
/\[TRACE\]/d

# Address range: delete lines 1 through 5 (file header)
1,5d

# Insert separator after section headers
/^=\{3,\}/a\
---

# Transliterate uppercase A-Z to lowercase a-z in tag field
# (for lines that start with a tag like [ERROR])
/^\[[A-Z]\+\]/y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/

# Branch: if line already processed (has our placeholder), skip further edits
/\[TIMESTAMP\]/{
    b done
}

# Label for branching
:done

# Append a newline after each section boundary line
/^--- SECTION/a\
