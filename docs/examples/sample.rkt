#lang racket

(require racket/list
         racket/string
         racket/match
         racket/contract)

(provide factorial
         fibonacci
         make-stack
         stack-push
         stack-pop
         stack-empty?
         process-items)

;; ── Data structures ──────────────────────────────────────────────────────────

(struct stack (items) #:transparent)

(define (make-stack)
  (stack '()))

(define (stack-push s item)
  (stack (cons item (stack-items s))))

(define (stack-pop s)
  (if (null? (stack-items s))
      (error "stack-pop: empty stack")
      (values (car (stack-items s))
              (stack (cdr (stack-items s))))))

(define (stack-empty? s)
  (null? (stack-items s)))

;; ── Math functions ───────────────────────────────────────────────────────────

(define/contract (factorial n)
  (-> natural? natural?)
  (cond
    [(= n 0) 1]
    [(= n 1) 1]
    [else    (* n (factorial (- n 1)))]))

(define (fibonacci n)
  (let loop ([i n] [a 0] [b 1])
    (if (= i 0)
        a
        (loop (- i 1) b (+ a b)))))

;; ── Higher-order utilities ───────────────────────────────────────────────────

(define (process-items items transform filter-pred)
  (filter filter-pred
          (map transform items)))

(define (compose . fns)
  (lambda (x)
    (fold-right (lambda (f acc) (f acc)) x fns)))

(define (curry f . args)
  (lambda rest
    (apply f (append args rest))))

;; ── Macros ───────────────────────────────────────────────────────────────────

(define-syntax while
  (syntax-rules ()
    [(while condition body ...)
     (let loop ()
       (when condition
         body ...
         (loop)))]))

(define-syntax swap!
  (syntax-rules ()
    [(swap! a b)
     (let ([tmp a])
       (set! a b)
       (set! b tmp))]))

;; ── Configuration ────────────────────────────────────────────────────────────

(define app-version "1.0.0")
(define max-iterations 1000)
(define default-timeout 30)

;; ── Entry point ──────────────────────────────────────────────────────────────

(module+ main
  (displayln (format "10! = ~a" (factorial 10)))
  (displayln (format "fib(20) = ~a" (fibonacci 20)))
  (let* ([s  (make-stack)]
         [s1 (stack-push s 1)]
         [s2 (stack-push s1 2)]
         [s3 (stack-push s2 3)])
    (displayln (format "Stack: ~a" (stack-items s3)))))
