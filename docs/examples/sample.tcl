#!/usr/bin/env tclsh
# sample.tcl — demonstration Tcl/Tk script

package require Tcl 8.6
package require Tk 8.6
package provide SampleApp 1.0

namespace eval ::app {
    variable version "1.0.0"
    variable debug false
}

namespace eval ::app::ui {
    variable mainWindow .
}

# Initialize the application
proc ::app::init {} {
    variable version
    puts "SampleApp v$version starting..."
    ::app::ui::buildWindow
}

# Build the main window
proc ::app::ui::buildWindow {} {
    wm title . "Sample Tk Application"
    wm geometry . 640x480

    set frame [frame .mainframe -padding 10]
    pack $frame -fill both -expand true

    button $frame.btnHello -text "Say Hello" -command {::app::sayHello "World"}
    button $frame.btnQuit  -text "Quit"      -command {exit 0}

    pack $frame.btnHello $frame.btnQuit -side left -padx 5
}

# Display a greeting
proc ::app::sayHello {name} {
    tk_messageBox -message "Hello, $name!" -title "Greeting" -type ok
}

# Read a config file
proc ::app::loadConfig {path} {
    if {![file exists $path]} {
        return {}
    }
    set fh [open $path r]
    set data [read $fh]
    close $fh
    return $data
}

# Parse key=value pairs
proc ::app::parseConfig {data} {
    set result [dict create]
    foreach line [split $data "\n"] {
        set line [string trim $line]
        if {$line eq "" || [string index $line 0] eq "#"} continue
        if {[regexp {^(\w+)\s*=\s*(.*)$} $line _ key value]} {
            dict set result $key $value
        }
    }
    return $result
}

variable configPath "~/.sampleapp/config"
variable appTitle   "Sample Tcl/Tk App"

source lib/utils.tcl
source lib/network.tcl

::app::init
