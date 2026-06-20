(ns myapp.core
  (:require [clojure.string :as str]
            [clojure.set :as set]))

(def app-version "1.0.0")

(defonce request-count (atom 0))

(defrecord Person [name age email])

(defprotocol Greetable
  (greet [this])
  (farewell [this]))

(defmacro with-logging [label & body]
  `(do
     (println "START:" ~label)
     (let [result# (do ~@body)]
       (println "END:" ~label)
       result#)))

(defn add [a b]
  (+ a b))

(defn greet-person [person]
  (str "Hello, " (:name person) "!"))

(defn process-items [items]
  (->> items
       (filter odd?)
       (map #(* % %))
       (reduce +)))

(defn -main [& args]
  (swap! request-count inc)
  (println "App version:" app-version)
  (println "Sum of squares of odd 1-10:" (process-items (range 1 11))))
