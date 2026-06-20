; Fennel sample - a simple game state manager
(local lume (require :lume))
(local inspect (require :inspect))
(local json (require :dkjson))
(import-macros {: defn : when-let} :macros.core)

(local default-config
  {:width 800
   :height 600
   :title "My Game"
   :fps 60})

(var current-scene nil)
(var scenes {})
(var running? true)

(fn make-scene [name init-fn update-fn draw-fn]
  "Create a new scene table."
  {:name name
   :init init-fn
   :update update-fn
   :draw draw-fn
   :active false})

(fn register-scene [scene]
  (tset scenes scene.name scene))

(fn switch-scene [name]
  (when current-scene
    (when (. current-scene :exit)
      ((. current-scene :exit))))
  (set current-scene (. scenes name))
  (when current-scene
    ((. current-scene :init))))

(fn update [dt]
  (when (and current-scene running?)
    ((. current-scene :update) dt)))

(fn draw []
  (when current-scene
    ((. current-scene :draw))))

(fn load-config [path]
  (let [file (io.open path :r)
        content (: file :read :*a)
        config (json.decode content)]
    (: file :close)
    (lume.merge default-config config)))

(fn clamp [val min-val max-val]
  (math.max min-val (math.min max-val val)))

(fn lerp [a b t]
  (+ a (* (- b a) (clamp t 0 1))))

(lambda make-vec2 [x y]
  {:x x :y y})

(fn vec2-add [a b]
  (make-vec2 (+ a.x b.x) (+ a.y b.y)))

(fn vec2-length [v]
  (math.sqrt (+ (* v.x v.x) (* v.y v.y))))

(macro with-scene [name & body]
  `(do
     (switch-scene ,name)
     ,...))

(macro timed [label & body]
  `(let [start# (love.timer.getTime)]
     ,...
     (print (.. ,label ": " (- (love.timer.getTime) start#) "s"))))

; Main game loop helpers
(fn init-game [config-path]
  (local cfg (load-config config-path))
  (love.window.setMode cfg.width cfg.height)
  (love.window.setTitle cfg.title)
  cfg)

(each [_ scene (pairs scenes)]
  (when scene.active
    (print (.. "Active scene: " scene.name))))

(for [i 1 10]
  (print i))

(while running?
  (update (love.timer.getDelta))
  (draw))

{: make-scene
 : register-scene
 : switch-scene
 : update
 : draw
 : clamp
 : lerp
 : make-vec2
 : vec2-add
 : vec2-length
 : init-game}
