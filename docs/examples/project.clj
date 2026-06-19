(defproject my-clojure-app "0.3.1"
  :description "A sample Clojure web application using Compojure and Ring"
  :url "https://github.com/example/my-clojure-app"
  :license {:name "MIT License"
            :url "https://opensource.org/licenses/MIT"}

  :dependencies [[org.clojure/clojure "1.11.1"]
                 [compojure "1.7.0"]
                 [ring/ring-core "1.10.0"]
                 [ring/ring-jetty-adapter "1.10.0"]
                 [cheshire "5.12.0"]
                 [com.github.seancorfield/next.jdbc "1.3.894"]
                 [org.postgresql/postgresql "42.6.0"]
                 [environ "1.2.0"]]

  :plugins [[lein-ring "0.12.6"]
            [lein-environ "1.2.0"]]

  :main my-clojure-app.core

  :ring {:handler my-clojure-app.handler/app}

  :profiles {:dev {:dependencies [[ring/ring-mock "0.4.0"]
                                  [clj-http "3.12.3"]]
                   :env {:database-url "jdbc:postgresql://localhost/myapp_dev"}}
             :test {:env {:database-url "jdbc:postgresql://localhost/myapp_test"}}
             :uberjar {:aot :all
                       :jvm-opts ["-Dclojure.compiler.direct-linking=true"]}}

  :target-path "target/%s"
  :source-paths ["src"]
  :test-paths ["test"])
