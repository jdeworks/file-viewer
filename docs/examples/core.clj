(ns sample.core
  (:require [clojure.string :as str]))

(defn slugs [titles]
  (map #(-> %
            str/lower-case
            (str/replace #"[^a-z0-9]+" "-")
            (str/replace #"(^-|-$)" ""))
       titles))

(println (slugs ["File Viewer", "Sample Catalog"]))
