use strict;
use warnings;

my @events = (
  { level => 'info', message => 'started' },
  { level => 'warn', message => 'retrying' },
);

for my $event (@events) {
  print uc($event->{level}) . ": $event->{message}\n";
}
