# Java Bytecode (.class)

> Compiled Java class files containing JVM bytecode — structured metadata view with class info, methods, and constants.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.class` |
| MIME type | `application/java-vm` |
| Binary / Text | Binary |
| Created by | Oracle / Sun Microsystems (JVM specification) |
| Common use | Compiled Java classes executed by the JVM |
| Spec / Docs | [JVM Specification](https://docs.oracle.com/javase/specs/jvms/se21/html/index.html) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Structured metadata panel | ✅ | Class name, superclass, interfaces, access flags |
| Java version display | ✅ | Major/minor version decoded to Java release (e.g. 61 → Java 17) |
| Methods and fields list | ✅ | Name, descriptor, access flags for each |
| Constants summary | ✅ | Constant pool entry count and type breakdown |
| Full decompile to Java source | ❌ | Would require a vendored decompiler (e.g. Fernflower) |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Any editing | ❌ | Binary bytecode; no editor provided |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — all `.class` files use the same bytecode viewer.

## Real-World Examples

- [`HelloWorld.class`](../examples/HelloWorld.class) — minimal compiled class demonstrating metadata extraction

## Known Limitations

- No decompilation to Java source; only structural metadata is shown
- Inner class relationships (outer/inner class links) not visualised
- Annotation metadata from the constant pool is listed but not decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Full Java decompilation | High | Hard | Requires vendoring Fernflower or similar WASM decompiler |
| Bytecode instruction listing | Med | Med | Decode `Code` attributes per method |
| Annotation decoding | Low | Med | Parse `RuntimeVisibleAnnotations` attribute |
