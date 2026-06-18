#include <iostream>
#include <vector>

struct Vertex {
  double x;
  double y;
  double z;
};

double z_sum(const std::vector<Vertex>& vertices) {
  double total = 0.0;
  for (const auto& vertex : vertices) total += vertex.z;
  return total;
}

int main() {
  std::vector<Vertex> triangle{{0, 0, 0}, {1, 0, 0.5}, {0, 1, 1}};
  std::cout << "z sum: " << z_sum(triangle) << "\n";
}
