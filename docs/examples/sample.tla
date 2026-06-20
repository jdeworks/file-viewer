---- MODULE TrafficLight ----
VARIABLES state, count
CONSTANTS MaxCount
ASSUME MaxCount > 0
Init == /\ state = "red" /\ count = 0
Next == IF state = "red" THEN state' = "green" /\ count' = count + 1
        ELSE state' = "red" /\ count' = count
Spec == Init /\ [][Next]_<<state, count>>
THEOREM Spec => [](state \in {"red","green"})
====
