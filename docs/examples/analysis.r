readings <- data.frame(
  sensor = c("lab-a", "lab-a", "lab-b"),
  celsius = c(21.4, 22.1, 19.8)
)

aggregate(celsius ~ sensor, readings, mean)
