# Java Bytecode (.class)

> Compiled Java class files containing JVM bytecode — lightweight class metadata view from the header and constant pool.

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
| Structured metadata panel | ✅ | Class name, Java version, file size, and constant pool count |
| Java version display | ✅ | Major/minor version decoded to Java release (e.g. 61 → Java 17) |
| Constant pool parse | ✅ | Walks enough of the constant pool to find class names and entry count |
| Methods and fields list | ❌ | Member tables are not parsed yet |
| Access flags / interfaces | ❌ | Class-body metadata after the constant pool is not decoded yet |
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

- [`sample.class`](../examples/sample.class) — minimal compiled class demonstrating metadata extraction

## Known Limitations

- No decompilation to Java source; only structural metadata is shown
- Methods, fields, interfaces, and access flags are not decoded yet
- Inner class relationships (outer/inner class links) not visualised
- Annotation metadata is not decoded

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Method / field table parsing | Med | Med | Decode member counts, descriptors, and access flags after the constant pool |
| Full Java decompilation | High | Hard | Requires vendoring Fernflower or similar WASM decompiler |
| Bytecode instruction listing | Med | Med | Decode `Code` attributes per method |
| Annotation decoding | Low | Med | Parse `RuntimeVisibleAnnotations` attribute |
