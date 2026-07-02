# XML

> Collapsible XML element tree with XPath filtering, attribute display, structural DOM diff, JSON export, and platform DOMParser validation.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xml`, `.xsd`, `.xsl`, `.xslt`, `.rss`, `.atom`, `.wsdl`, `.pom`, `.csproj`, `.props`, `.targets`, `.resx` |
| MIME type | `application/xml`, `text/xml` |
| Binary / Text | Text |
| Common use | Configuration, data interchange, RSS/Atom feeds, SVG graphics, SOAP APIs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible element tree | ✅ | Tag names, attributes, and text content shown |
| Attribute display | ✅ | Attributes shown inline on the element node |
| XPath query panel | ✅ | Native `document.evaluate()` filters/highlights matching elements |
| Namespace display | ✅ | Root namespace URI shown in metadata |
| Parse error | ✅ | Browser DOMParser surfaces position and message |
| Source view | ✅ | Monaco editor with XML syntax highlighting |
| Structural diff | ✅ | DOM-level diff via `xmldiff.js` |
| Text diff | ✅ | Standard line diff also available |
| Metadata | ✅ | Root element, element/attribute/comment counts, namespace count, character count, POM dependency count |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to JSON | ✅ | Recursive element-to-object mapping with `@attribute` and `#text` conventions |

## Known-File Enhancement

XML files get Layer-3 known-file plugins for 25 common XML-based configs, including Maven POM/settings, Ant, AndroidManifest, Android strings, .NET `csproj`/MSBuild props, NuGet, Log4j/Logback, PHPUnit, Psalm, Checkstyle, SpotBugs, ClickHouse, sitemap, Xcode scheme, and JetBrains workspace files.

## Real-World Examples

- [`sample.xml`](../examples/sample.xml) — example XML document

## Known Limitations

- XSLT transformation is not applied; XSL/XSLT files are inspected as XML/source
- Very large XML files may be slow to tree-render; source view handles any size
- SVG is normally handled by the dedicated SVG/image path, not the generic XML type

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| XML Schema validation (XSD) | Low | Hard | Validate against a provided XSD |
| Format / pretty-print | Low | Easy | Re-indent the source on save |
| Known-plugin index docs | Low | Easy | Generate the plugin list from `docs/types/text/xml/known/` |
