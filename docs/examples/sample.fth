\ Forth sample file

VARIABLE counter
0 counter !

42 CONSTANT answer

: SQUARE ( n -- n*n )
  DUP * ;

: CUBE ( n -- n*n*n )
  DUP SQUARE * ;

: COUNTDOWN ( n -- )
  BEGIN
    DUP .
    1 -
    DUP 0 =
  UNTIL
  DROP CR ;

: FACTORIAL ( n -- n! )
  DUP 1 > IF
    DUP 1 - RECURSE *
  ELSE
    DROP 1
  THEN ;

: BUMP-COUNTER ( -- )
  1 counter +! ;

: .COUNTER ( -- )
  ." Counter = " counter @ . CR ;

5 SQUARE .
3 CUBE .
5 FACTORIAL .
