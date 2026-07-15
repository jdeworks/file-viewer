# Stage 5 design — Protocol Codex

Protocol Codex is a branching roguelike deck-builder with combat, elites, events, shops, rests,
rewards, relics, potions, ascension, prestige, daily/custom seeds, and resumable combat checkpoints.

The Refused Connection is fought through the normal deck engine. Its changing handshake determines
whether damage is accepted: lead with SYN when requested, establish ACK first when requested, and
adapt to the mutating final phase. Base phase HP is 60/80/60; ascension may legitimately scale it.
No separate state changes the baseline encounter.

Three optional challenge keys divert a successful veteran negotiation into the multi-phase Kernel of
Refusal superboss. This bonus fight uses the same deck engine and owns the true-ending path.

The core test contract is:

- a run, not a hub shortcut, reaches the finale;
- a zero-ascension finale starts at 60 HP;
- the active handshake is explained in the combat banner;
- correct card sequencing can win and three keys can trigger the superboss.
