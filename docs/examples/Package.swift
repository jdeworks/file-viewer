// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MySwiftApp",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
    ],
    products: [
        .executable(name: "MySwiftApp", targets: ["MySwiftApp"]),
        .library(name: "MySwiftLib", targets: ["MySwiftLib"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.3.0"),
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
    ],
    targets: [
        .executableTarget(
            name: "MySwiftApp",
            dependencies: [
                .product(name: "ArgumentParser", package: "swift-argument-parser"),
                .product(name: "Vapor", package: "vapor"),
            ]
        ),
        .target(name: "MySwiftLib"),
        .testTarget(
            name: "MySwiftAppTests",
            dependencies: ["MySwiftLib"]
        ),
    ],
    swiftLanguageVersions: [.v5]
)
