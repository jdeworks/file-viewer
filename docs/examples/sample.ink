// The Lighthouse Mystery - an Ink interactive fiction example
INCLUDE prologue.ink
INCLUDE characters.ink

VAR playerName = "Alex"
VAR suspicion = 0
VAR hasKey = false
VAR visitedLighthouse = false

=== start ===
The storm had been raging for three days when you finally arrived at Dunmore Cove.
The lighthouse keeper, old Morwenna, hadn't been seen since Tuesday.

* [Head to the lighthouse immediately] -> lighthouse_exterior
* [Talk to the locals first] -> village_inn
* [Examine the shore] -> shoreline

=== village_inn ===
The inn smells of salt and old wood. Three fishermen sit by the fire.
~ suspicion = suspicion + 1

= meet_fishermen
One of them, a broad-shouldered man named Callum, looks up as you enter.
"Stranger? You here about Morwenna?" -> callum_conversation

= callum_conversation
"She were right as rain on Monday," Callum says. "Then... gone."
    * [Ask about the lighthouse light] -> light_question
    * [Ask if anyone else was around] -> stranger_question
    + [Leave without asking more] -> lighthouse_exterior

=== light_question ===
"The light went out Tuesday midnight," Callum mutters darkly. "Bad omen."
~ suspicion = suspicion + 2
-> lighthouse_exterior

=== stranger_question ===
"There were a man. City type. Came asking about the old shipwrecks." -> lighthouse_exterior

=== shoreline ===
You find footprints in the sand, leading toward the lighthouse. And away from it.
~ hasKey = false
You also find a rusted key half-buried near a rock.
~ hasKey = true
-> lighthouse_exterior

=== lighthouse_exterior ===
The lighthouse looms above you. The door is locked.
~ visitedLighthouse = true

* {hasKey} [Use the key you found] -> lighthouse_inside
* [Look for another way in] -> cellar_entrance
* [Return to the village] -> village_inn

=== cellar_entrance ===
Around back, a cellar door hangs open. -> lighthouse_inside

=== lighthouse_inside ===
Inside, everything is in order. Almost too much in order.
On the desk: a logbook, open to Tuesday's entry.

= read_logbook
The final entry reads: "They've found the wreck. Must warn —"
The writing stops mid-sentence.
-> ending_mystery

=== ending_mystery ===
The mystery of Morwenna's disappearance deepens.
Your investigation has only just begun.

{ suspicion > 3:
    You have gathered enough clues to suspect foul play.
- else:
    The truth remains elusive.
}

-> END

=== function clamp_suspicion(val, min_val, max_val) ===
~ return MIN(MAX(val, min_val), max_val)
