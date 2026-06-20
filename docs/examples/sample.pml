mtype = { MSG, ACK };
chan ch = [2] of { mtype };

proctype Sender() {
  do
    :: ch!MSG -> printf("Sent MSG\n")
  od
}

proctype Receiver() {
  mtype m;
  do
    :: ch?m ->
      atomic {
        printf("Got %e\n", m);
        ch!ACK
      }
  od
}

init {
  run Sender();
  run Receiver()
}

ltl liveness { []<>(len(ch) == 0) }
