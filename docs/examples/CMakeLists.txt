cmake_minimum_required(VERSION 3.20)
project(MyApp VERSION 1.2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)
find_package(ZLIB OPTIONAL_COMPONENTS)

add_subdirectory(src)
add_subdirectory(tests)

add_executable(myapp src/main.cpp src/app.cpp)
add_library(mylib STATIC src/lib.cpp src/utils.cpp)

target_link_libraries(myapp
  PRIVATE mylib
  PRIVATE OpenSSL::SSL
  PRIVATE Threads::Threads
)

target_include_directories(myapp PRIVATE ${PROJECT_SOURCE_DIR}/include)

install(TARGETS myapp DESTINATION bin)
