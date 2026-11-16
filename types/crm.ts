export type Role = "ADMIN" | "SALES_REP";
export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "NEGOTIATION"
  | "WON"
  | "LOST";
export type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "STAGE_CHANGE";
export type LeadCategory = "HOT" | "WARM" | "COLD";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Company = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  city: string | null;
  createdAt: string;
  _count?: { contacts: number };
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  company: { id: string; name: string; city?: string | null } | null;
};

export type Lead = {
  id: string;
  title: string;
  contactId: string;
  dealValue: number;
  stage: LeadStage;
  ownerId: string;
  expectedCloseDate: string | null;
  source: string | null;
  lostReason: string | null;
  aiScore: number | null;
  aiCategory: LeadCategory | null;
  aiReasons: string[];
  aiScoredAt: string | null;
  scoreStale: boolean;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  owner: { id: string; name: string; email: string };
};

export type Activity = {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  leadId: string | null;
  assignedUserId: string;
  completed: boolean;
  createdAt: string;
  lead?: { id: string; title: string } | null;
  assignedUser?: { id: string; name: string };
};

export type LeadDetail = Lead & {
  activities: Activity[];
  tasks: Task[];
};

export type ScoreResult = {
  score: number;
  category: LeadCategory;
  reasons: string[];
  cached: boolean;
};

export type EmailDraft = {
  subject: string;
  body: string;
};
