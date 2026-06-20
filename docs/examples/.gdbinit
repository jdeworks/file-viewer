# GDB initialization file

# Source GEF (GDB Enhanced Features)
source ~/.gef.py

# Display settings
set print pretty on
set print array on
set print array-indexes on
set print object on
set print static-members on
set print vtbl on
set print demangle on
set demangle-style auto
set print thread-events off

# Pagination and confirmation
set pagination off
set confirm off

# Disassembly
set disassembly-flavor intel

# History
set history save on
set history size 10000
set history filename ~/.gdb_history
set history expansion on

# Follow fork
set follow-fork-mode child
set detach-on-fork off

# Python scripting
python
import os
import sys
sys.path.insert(0, os.path.expanduser('~/.gdb/python'))
end

# Safe auto-load paths
add-auto-load-safe-path /usr/lib
add-auto-load-safe-path /home/user/projects

# Custom commands
define plist
    python
    node = gdb.parse_and_eval($arg0)
    count = 0
    while int(node) != 0 and count < 20:
        print(node.dereference())
        node = node['next']
        count += 1
    end
end

define hook-stop
    echo ----------------\n
end
