import 'package:flutter/material.dart';
import 'dart:async';

enum Status { pending, active, inactive }

typedef Callback = void Function(String message);

class Reading {
  Reading(this.sensor, this.celsius);

  final String sensor;
  final double celsius;
}

abstract class Sensor {
  String get name;
  Stream<Reading> readings();
}

class LabSensor extends Sensor {
  LabSensor(this.name);

  @override
  final String name;

  @override
  Stream<Reading> readings() async* {
    yield Reading(name, 21.4);
    yield Reading(name, 19.8);
  }
}

extension ReadingExtension on Reading {
  String get formatted => '${sensor}: ${celsius}°C';
}

void main() async {
  final sensor = LabSensor('lab-a');
  await for (final reading in sensor.readings()) {
    print(reading.formatted);
  }
}
