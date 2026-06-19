# Java Class

> Java class file viewer — JVM major/minor version, class name, superclass, interfaces, access flags, and referenced class list.

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
| Class name | ✅ | Fully qualified name from constant pool |
| Superclass | ✅ | Parent class name |
| Interfaces | ✅ | List of implemented interfaces |
| Access flags | ✅ | public, final, abstract, interface, enum, annotation, synthetic |
| Referenced classes | ✅ | Class references from constant pool |
| File size | ✅ | Bytecode file size |
| Source view | ✅ | Raw hex view available |
| Diff | ❌ | Binary format |
| Metadata | ✅ | Java version, class name, access flags |

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

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Method list | Med | Med | Parse method_info entries from class file |
| Field list | Med | Med | Parse field_info entries |
| Disassembly | Low | Hard | Decode bytecode opcodes per method |
