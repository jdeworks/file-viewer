# XML

> Collapsible element tree with attribute display, structural DOM diff, and platform DOMParser validation.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.xml`, `.xsl`, `.xslt`, `.svg`, `.rss`, `.atom` |
| MIME type | `application/xml`, `text/xml` |
| Binary / Text | Text |
| Common use | Configuration, data interchange, RSS/Atom feeds, SVG graphics, SOAP APIs |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Collapsible element tree | ✅ | Tag names, attributes, and text content shown |
| Attribute display | ✅ | Attributes shown inline on the element node |
| Namespace display | ✅ | Root namespace URI shown in metadata |
| Parse error | ✅ | Browser DOMParser surfaces position and message |
| Source view | ✅ | Monaco editor with XML syntax highlighting |
| Structural diff | ✅ | DOM-level diff via `xmldiff.js` |
| Text diff | ✅ | Standard line diff also available |
| Metadata | ✅ | Root element, element count, attribute count, comment count, namespace |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to JSON | ❌ | XML → JSON mapping is ambiguous; not yet implemented |

## Known-File Enhancement

`pom.xml` (Maven) gets a dependency count in the metadata panel.

## Real-World Examples

- [`sample.xml`](../examples/sample.xml) — example XML document

## Known Limitations

- XSLT transformation not applied (would require cross-origin XSL files)
- Very large XML files may be slow to tree-render; source view handles any size

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| XPath query | Med | Med | Filter/highlight nodes by XPath expression |
| Convert to JSON | Med | Med | opinionated XML→JSON mapping (e.g. xml2js-style) |
| XML Schema validation (XSD) | Low | Hard | Validate against a provided XSD |
| Format / pretty-print | Low | Easy | Re-indent the source on save |
