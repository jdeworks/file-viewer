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
plot 'data.csv' using 1:2 with lines title 'Sensor 1', \
     'data.csv' using 1:3 with linespoints title 'Sensor 2'
