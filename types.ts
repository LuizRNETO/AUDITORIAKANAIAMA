export type Status = 'pending' | 'waiting' | 'ok' | 'issue' | 'expired' | 'waived';

export interface AuditItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  status: Status;
  notes: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  type: 'PF' | 'PJ';
  name: string;
  doc: string; // CPF or CNPJ
  role: 'buyer' | 'seller';
  items: AuditItem[];
}

export interface PropertyData {
  id: string;
  name: string;
  matricula: string;
  cartorio: string;
  area: string; // in Hectares
  municipio: string;
  items: AuditItem[];
}

export interface AuditState {
  properties: PropertyData[];
  parties: Party[];
  generalNotes: string;
}

export interface AnalysisResult {
  riskLevel: 'Baixo' | 'Médio' | 'Alto';
  summary: string;
  recommendations: string[];
}