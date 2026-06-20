import Foundation
import SwiftUI
import Combine

// MARK: - Data Models

struct Coordinate: Codable, Equatable {
  let latitude: Double
  let longitude: Double

  var isValid: Bool {
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  }
}

enum TransportMode: String, CaseIterable, Codable {
  case walking
  case cycling
  case driving
  case transit
}

protocol LocationProvider {
  var currentLocation: Coordinate? { get }
  func requestPermission() async throws
}

// MARK: - View Model

final class MapViewModel: ObservableObject {
  @Published var userLocation: Coordinate?
  @Published var destination: Coordinate?
  @Published var transportMode: TransportMode = .walking
  @Published var isLoading: Bool = false

  @State private var cancellables = Set<AnyCancellable>()

  private let provider: LocationProvider

  init(provider: LocationProvider) {
    self.provider = provider
  }

  func fetchLocation() async {
    isLoading = true
    defer { isLoading = false }
    do {
      try await provider.requestPermission()
      userLocation = provider.currentLocation
    } catch {
      print("Location error: \(error)")
    }
  }

  func distance(to dest: Coordinate) -> Double? {
    guard let loc = userLocation else { return nil }
    let dx = dest.latitude - loc.latitude
    let dy = dest.longitude - loc.longitude
    return sqrt(dx * dx + dy * dy)
  }
}

// MARK: - SwiftUI View

struct MapView: View {
  @StateObject private var viewModel = MapViewModel(provider: MockLocationProvider())

  var body: some View {
    VStack {
      Text("Map Sample")
        .font(.title)
      if let loc = viewModel.userLocation {
        Text("Lat: \(loc.latitude), Lon: \(loc.longitude)")
      } else {
        ProgressView()
      }
    }
    .task {
      await viewModel.fetchLocation()
    }
  }
}

// MARK: - Mock

struct MockLocationProvider: LocationProvider {
  var currentLocation: Coordinate? = Coordinate(latitude: 51.5074, longitude: -0.1278)

  func requestPermission() async throws {
    try await Task.sleep(nanoseconds: 100_000_000)
  }
}

// MARK: - Extensions

extension Coordinate {
  static let london = Coordinate(latitude: 51.5074, longitude: -0.1278)
  static let newYork = Coordinate(latitude: 40.7128, longitude: -74.0060)
}

extension TransportMode {
  var icon: String {
    switch self {
    case .walking: return "figure.walk"
    case .cycling: return "bicycle"
    case .driving: return "car"
    case .transit: return "tram"
    }
  }
}
