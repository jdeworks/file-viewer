# R sample script: data analysis utilities
# Demonstrates library imports, function definitions, and assignments

library(stats)
library(utils)
require(methods)

# ── Constants ──────────────────────────────────────────────────────────────────
CONFIDENCE_LEVEL <- 0.95
MAX_ITER <- 1000
SEED <- 42

# ── Helper functions ───────────────────────────────────────────────────────────

#' Compute the mean and standard deviation of a numeric vector
summarize_vector <- function(x, na.rm = TRUE) {
  list(
    n     = length(x),
    mean  = mean(x, na.rm = na.rm),
    sd    = sd(x, na.rm = na.rm),
    min   = min(x, na.rm = na.rm),
    max   = max(x, na.rm = na.rm)
  )
}

#' Normalize a numeric vector to [0, 1]
normalize <- function(x) {
  rng <- range(x, na.rm = TRUE)
  (x - rng[1]) / (rng[2] - rng[1])
}

#' Simple linear regression — returns intercept and slope
simple_lm <- function(x, y) {
  n <- length(x)
  x_bar <- mean(x)
  y_bar <- mean(y)
  slope <- sum((x - x_bar) * (y - y_bar)) / sum((x - x_bar)^2)
  intercept <- y_bar - slope * x_bar
  list(intercept = intercept, slope = slope)
}

#' Clip values to [lo, hi]
clip <- function(x, lo = 0, hi = 1) {
  pmax(pmin(x, hi), lo)
}

# ── Main analysis ──────────────────────────────────────────────────────────────
set.seed(SEED)

x_vals <- seq(0, 10, length.out = 100)
y_vals <- 2.5 * x_vals + 1.2 + rnorm(100, sd = 0.8)

summary_x <- summarize_vector(x_vals)
summary_y <- summarize_vector(y_vals)

cat("X summary:\n")
cat("  mean =", summary_x$mean, "  sd =", summary_x$sd, "\n")

cat("Y summary:\n")
cat("  mean =", summary_y$mean, "  sd =", summary_y$sd, "\n")

fit <- simple_lm(x_vals, y_vals)
cat(sprintf("Regression: y = %.4f * x + %.4f\n", fit$slope, fit$intercept))

y_norm <- normalize(y_vals)
y_clipped <- clip(y_norm, lo = 0.1, hi = 0.9)
cat("Normalized range: [", min(y_norm), ",", max(y_norm), "]\n")
cat("Clipped range:    [", min(y_clipped), ",", max(y_clipped), "]\n")
