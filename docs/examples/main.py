from dataclasses import dataclass
from statistics import mean


@dataclass
class Reading:
    sensor: str
    celsius: float


def summarize(readings: list[Reading]) -> dict[str, float]:
    by_sensor: dict[str, list[float]] = {}
    for reading in readings:
        by_sensor.setdefault(reading.sensor, []).append(reading.celsius)
    return {sensor: round(mean(values), 2) for sensor, values in by_sensor.items()}


if __name__ == "__main__":
    data = [
        Reading("lab-a", 21.4),
        Reading("lab-a", 22.1),
        Reading("lab-b", 19.8),
    ]
    print(summarize(data))
