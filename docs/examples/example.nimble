# Package
version       = "0.5.2"
author        = "Jane Developer"
description   = "A high-performance HTTP server library for Nim"
license       = "MIT"
srcDir        = "src"
bin           = @["httpserver"]

# Dependencies
requires "nim >= 1.6.0"
requires "asyncdispatch >= 0.3.0"
requires "httputils >= 0.2.1"
requires "chronos >= 3.0.0"

task test, "Run the test suite":
  exec "nim c -r tests/test_server.nim"

task docs, "Generate documentation":
  exec "nim doc --project --index:on --outdir:docs src/httpserver.nim"
