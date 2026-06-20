(module myapp
  :use [janet]
  :export [greet add-nums process])

(import spork/misc :as misc)
(import json)
(use judge)

(def PI 3.14159265)
(def MAX-RETRIES 3)

(var *global-count* 0)

(defn greet
  "Return a greeting string for name."
  [name]
  (string "Hello, " name "!"))

(defn add-nums
  "Add two numbers together."
  [a b]
  (+ a b))

(defn- private-helper
  "Internal helper, not exported."
  [x]
  (* x x))

(defmacro when-positive
  "Run body only if n is positive."
  [n & body]
  ~(if (> ,n 0) (do ,@body)))

(defmacro with-logging
  "Wrap body with logging."
  [label & body]
  ~(do
     (print "Start: " ,label)
     (def result (do ,@body))
     (print "End: " ,label)
     result))

(defn process
  "Process a list of items."
  [items]
  (map private-helper items))

(defn main
  "Entry point."
  [& args]
  (print (greet "World"))
  (print (add-nums 1 2))
  (print (process [1 2 3 4 5])))
