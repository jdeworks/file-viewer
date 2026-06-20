! Factor concatenative language sample
USING: io kernel math sequences ;
IN: demo

! A word to square a number
: square ( n -- n^2 ) dup * ;

! A word to cube a number
: cube ( n -- n^3 ) dup dup * * ;

! A word to compute the sum of squares
: sum-of-squares ( a b -- n ) [ square ] bi@ + ;

! A symbol for a sentinel value
SYMBOL: +done+

! A tuple for a 2D point
TUPLE: point x y ;

! A tuple for a rectangle
TUPLE: rect origin extent ;

! A constant
CONSTANT: max-iterations 1000

! Print squares from 1 to 5
: print-squares ( -- )
  5 [1,b] [ square . ] each ;

! Main entry
: main ( -- )
  "Hello from Factor!" print
  print-squares ;
