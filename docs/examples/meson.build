project('myapp', ['c', 'cpp'],
  version : '1.2.0',
  default_options : ['warning_level=3', 'cpp_std=c++17'])

# Dependencies
zlib_dep = dependency('zlib', version : '>=1.2.11')
thread_dep = dependency('threads')
gtest_dep = dependency('gtest', main : true, required : false)
fmt_dep = dependency('fmt', version : '>=9.0')

# Include directories
inc = include_directories('include')

# Shared library
mylib = shared_library('mylib',
  sources : ['src/mylib.c', 'src/helper.c'],
  include_directories : inc,
  dependencies : [zlib_dep, thread_dep],
  version : '1.2.0',
  soversion : '1',
  install : true)

# Main executable
executable('myapp',
  sources : ['src/main.cpp', 'src/app.cpp'],
  include_directories : inc,
  link_with : mylib,
  dependencies : [fmt_dep],
  install : true)

# CLI tool
executable('myapp-cli',
  sources : ['src/cli.cpp'],
  include_directories : inc,
  link_with : mylib,
  install : true)

# Subdirectories
subdir('tests')
subdir('docs')
subdir('data')

# Tests
test('basic-test', executable('test_basic', 'tests/test_basic.cpp',
  dependencies : gtest_dep,
  link_with : mylib))

test('integration-test', executable('test_integration', 'tests/test_integration.cpp',
  dependencies : gtest_dep,
  link_with : mylib))

test('unit-test', executable('test_unit', 'tests/test_unit.cpp',
  dependencies : gtest_dep,
  link_with : mylib))

install_data('data/config.json', install_dir : get_option('datadir') / 'myapp')
