# R startup configuration
options(
  repos = c(CRAN = "https://cran.rstudio.com/"),
  warn = 1,
  scipen = 999,
  digits = 4
)

# Set default editor
options(editor = "vim")

# Load common packages silently
if (interactive()) {
  suppressMessages(library(usethis))
}

# Custom functions
.ls.objects <- function(pos = 1, pattern, order.by, decreasing = FALSE, head = FALSE, n = 5) {
  napply <- function(names, fn) sapply(names, function(x) fn(get(x, pos = pos)))
  names <- ls(pos = pos, pattern = pattern)
  obj.class <- napply(names, function(x) as.character(class(x))[1])
  obj.mode <- napply(names, mode)
  obj.size <- napply(names, object.size)
  data.frame(obj.class, obj.mode, obj.size, row.names = names)
}
