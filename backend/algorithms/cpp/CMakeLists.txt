cmake_minimum_required(VERSION 3.15)

project(mars_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

find_package(Python COMPONENTS Interpreter Development.Module REQUIRED)

execute_process(
    COMMAND ${Python_EXECUTABLE} -m pybind11 --cmakedir
    OUTPUT_VARIABLE pybind11_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_QUIET
)

find_package(pybind11 CONFIG REQUIRED)

pybind11_add_module(
    mars_engine
    src/mars_graph.cpp
    src/bindings.cpp
)

target_include_directories(
    mars_engine PRIVATE
    ${PROJECT_SOURCE_DIR}/include
)
