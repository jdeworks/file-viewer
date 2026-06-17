export const phaseRules = [
  {
    phase: 1,
    title: "SYN Phase",
    rule: "SYN must be played first each turn before Signal damage is accepted."
  },
  {
    phase: 2,
    title: "ACK Phase",
    rule: "ACK must precede Signal damage."
  },
  {
    phase: 3,
    title: "Unknown Protocol",
    rule: "ACK must be played each turn to avoid ongoing damage."
  }
];

export const protocolCards = [
  { id: "SYN", type: "Signal", text: "Open a connection. Required first in Phase 1." },
  { id: "ACK", type: "Protocol", text: "Acknowledge the current protocol rule." },
  { id: "Signal", type: "Signal", text: "Deal 30 accepted damage when phase rules are met." }
];
