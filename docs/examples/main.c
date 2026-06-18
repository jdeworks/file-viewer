#include <stdio.h>

static int clamp(int value, int min, int max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

int main(void) {
  int brightness = clamp(128, 0, 100);
  printf("Brightness: %d%%\n", brightness);
  return 0;
}
