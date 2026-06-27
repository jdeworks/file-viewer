# Temperature analysis plot
set terminal pngcairo size 800,600
set output 'plot.png'
set title 'Temperature over Time'
set xlabel 'Time (days)'
set ylabel 'Temperature (°C)'
set key top left
set xrange [0:30]
set yrange [-5:40]
set grid
set style data lines

# Constants and fitted model
a = 5
period = 24.0
f(x) = a * sin(2*pi*x/period)      # daily oscillation model
envelope(x, k) = a * exp(-k*x)     # decaying envelope

# Shared setup
load 'common.gp'

plot 'data.csv' using 1:2 with lines title 'Sensor 1', \
     'data.csv' using 1:3 with linespoints title 'Sensor 2', \
     f(x) title 'model'

set title 'Surface'; splot 'grid.dat' using 1:2:3 with pm3d title 'surface'

call 'finish.gp'
