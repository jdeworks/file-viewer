; sample.scm — demonstration Scheme (R7RS) module

(define-library (sample math)
  (import (scheme base)
          (scheme write)
          (scheme read)
          (srfi 1))
  (export factorial fibonacci gcd-extended make-rational))

(import (scheme base)
        (scheme write)
        (srfi 1))

; Factorial — recursive
(define (factorial n)
  (if (<= n 1)
      1
      (* n (factorial (- n 1)))))

; Fibonacci — tail-recursive with accumulator
(define (fibonacci n)
  (let loop ((i n) (a 0) (b 1))
    (if (= i 0)
        a
        (loop (- i 1) b (+ a b)))))

; Extended GCD
(define (gcd-extended a b)
  (if (= b 0)
      (values a 1 0)
      (let-values (((g x y) (gcd-extended b (modulo a b))))
        (values g y (- x (* (quotient a b) y))))))

; Rational number constructor
(define (make-rational num den)
  (let ((g (gcd (abs num) (abs den))))
    (cons (/ num g) (/ den g))))

; Map a function over a list and filter results
(define (filter-map pred lst)
  (let loop ((remaining lst) (acc '()))
    (cond
      ((null? remaining) (reverse acc))
      ((pred (car remaining))
       (loop (cdr remaining) (cons (car remaining) acc)))
      (else
       (loop (cdr remaining) acc)))))

; Reduce / fold
(define fold-left
  (lambda (f init lst)
    (if (null? lst)
        init
        (fold-left f (f init (car lst)) (cdr lst)))))

; Simple association list helpers
(define (alist-get key alist default)
  (let ((pair (assoc key alist)))
    (if pair (cdr pair) default)))

(define (alist-set key value alist)
  (cons (cons key value)
        (filter (lambda (pair) (not (equal? (car pair) key))) alist)))

; Named constants
(define pi 3.14159265358979)
(define e  2.71828182845905)
(define golden-ratio 1.61803398874989)

; Display examples
(define (run-examples)
  (display "10! = ")
  (display (factorial 10))
  (newline)
  (display "fib(20) = ")
  (display (fibonacci 20))
  (newline))

(run-examples)
