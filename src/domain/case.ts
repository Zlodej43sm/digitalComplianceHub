/** Planning contracts only. Server transition enforcement is implemented in Phase 4. */
export type WorkspaceRole = 'client' | 'manager' | 'compliance';
export type Role = WorkspaceRole | 'demo-admin';
export type CaseStatus =
  | 'Draft'
  | 'Submitted'
  | 'ManagerReview'
  | 'ComplianceReview'
  | 'AwaitingClient'
  | 'Approved'
  | 'Rejected';

export const statusLabels: Record<CaseStatus, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  ManagerReview: 'Manager review',
  ComplianceReview: 'Compliance review',
  AwaitingClient: 'Awaiting client',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

/** These describe future persisted entities; Phase 1 stores no customer records. */
export interface CaseRecord {
  id: string;
  bankId: string;
  organizationId: string;
  title: string;
  status: CaseStatus;
  revision: number;
  assignedManagerId: string;
  assignedOfficerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  caseId: string;
  bankId: string;
  organizationId: string;
  version: number;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  mediaType: string;
  uploadedBy: string;
  uploadedAt: string;
}
