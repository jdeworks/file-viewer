#!/usr/bin/awk -f
# Word frequency counter with CSV output support
# Usage: awk -f sample.awk [-v csv=1] [files...]

BEGIN {
    FS = "[ \t\n]+"
    OFS = ","
    IGNORECASE = 0
    if (csv) print "word,count"
}

# Skip blank lines and comment lines
/^[[:space:]]*$/ { next }
/^#/ { next }

{
    for (i = 1; i <= NF; i++) {
        word = tolower($i)
        # Remove punctuation at start/end
        gsub(/^[^a-z]+|[^a-z]+$/, "", word)
        if (length(word) > 0)
            freq[word]++
    }
    total_lines++
    total_words += NF
}

END {
    if (total_lines == 0) {
        print "No input" > "/dev/stderr"
        exit 1
    }

    # Sort and output
    for (word in freq) {
        if (csv)
            printf "%s%s%d\n", word, OFS, freq[word]
        else
            printf "%-30s %d\n", word, freq[word]
    }

    if (!csv) {
        print "---" > "/dev/stderr"
        printf "Lines: %d  Words: %d  Unique: %d\n", \
            total_lines, total_words, length(freq) > "/dev/stderr"
    }
}

# Helper: pad string to width
function pad(s, w,    r) {
    r = s
    while (length(r) < w) r = r " "
    return r
}

# Helper: max of two numbers
function max(a, b) {
    return a > b ? a : b
}
