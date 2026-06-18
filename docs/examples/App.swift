import Foundation

struct Release: Codable {
    let version: String
    let date: Date
}

let formatter = ISO8601DateFormatter()
let release = Release(version: "2.4.0", date: formatter.date(from: "2026-06-18T10:00:00Z")!)

print("Release \(release.version)")
