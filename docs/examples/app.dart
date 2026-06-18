class Reading {
  Reading(this.sensor, this.celsius);

  final String sensor;
  final double celsius;
}

void main() {
  final readings = [Reading('lab-a', 21.4), Reading('lab-b', 19.8)];
  for (final reading in readings) {
    print('${reading.sensor}: ${reading.celsius}');
  }
}
