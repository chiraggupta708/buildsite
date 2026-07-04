export type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  order: number;
  siteId: string;
  phaseId: string | null;
  labourId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  phase: { id: string; name: string } | null;
  labour: { id: string; name: string } | null;
};

export type Phase = { id: string; name: string };
export type Labour = { id: string; name: string };