# Java Class

> Java class file viewer — JVM major/minor version, Java release mapping, first class reference, file size, and constant-pool count.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.class` |
| MIME type | `application/java-vm` |
| Binary / Text | Binary |
| Common use | Compiled Java bytecode, JVM-based language output (Kotlin, Scala, Groovy) |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Java version | ✅ | Major version mapped to Java release (Java 1 through Java 24+) |
| Magic number | ✅ | 0xCAFEBABE signature verified |
| JVM version numbers | ✅ | Major and minor version shown |
| Class name | ⚠️ | Best-effort first `CONSTANT_Class` reference from the constant pool |
| Superclass | ❌ | Class header fields after the constant pool are not parsed |
| Interfaces | ❌ | Interface table is not parsed |
| Access flags | ❌ | Access flags are not parsed |
| Referenced classes | ❌ | Constant-pool class references are not listed yet |
| File size | ✅ | Bytecode file size |
| Source view | ✅ | Raw binary view is available |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Java version, class name when found, major/minor version, constant-pool count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Editing | ❌ | Binary format |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Bytecode instructions are not disassembled (no `javap`-style output)
- Field and method signatures are not shown
- Superclass, interfaces, access flags, and referenced class lists are not shown yet

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Method list | Med | Med | Parse method_info entries from class file |
| Field list | Med | Med | Parse field_info entries |
| Class header details | Med | Med | Parse access flags, this_class, super_class, and interfaces after constant pool |
| Disassembly | Low | Hard | Decode bytecode opcodes per method |
