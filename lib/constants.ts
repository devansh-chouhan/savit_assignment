export const STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const OPEN_STAGES: Stage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
];

export const ACTIVITY_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE"] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  STAGE_CHANGE: "Stage change",
};

export const SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "IndiaMart",
  "Cold Call",
  "Trade Show",
  "Google Ads",
];

export const CITIES = ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad"];

export function stageLabel(stage: string) {
  return STAGE_LABELS[stage as Stage] ?? stage;
}
