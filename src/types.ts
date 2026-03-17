export interface MasterContract {
  id: string;
  type: string; // 'Satış', 'Kiralama', 'BDHS', 'NDA' vs.
  name: string;
  content: string;
}

export type AIProvider = 'GOOGLE' | 'OPENAI' | 'ANTHROPIC';

export interface CompanyContext {
  companyName: string;
  address: string; 
  taxInfo: string; 
  representative: string; 
  phone?: string; 
  email?: string; 
  industry: string;
  operationalStyle: string; 
  redLines: string; 
  preferredJurisdiction: string;
  
  // YENİ: Ürün ve Hizmet Bilgisi (Mevzuat Uyumu İçin)
  productPortfolio: string;

  // Sağlayıcı ve Model Ayarları
  activeProvider: AIProvider; 
  apiKeys: {
      google?: string;
      openai?: string;
      anthropic?: string;
  };
  preferredModel?: string; 
  
  masterContracts: MasterContract[];
  customRules: CustomRule[];
  temporaryContract?: string;
  isTemporaryContractActive?: boolean;
}

export interface CustomRule {
  id: string;
  content: string; // The rule text or temporary contract content
  category: string; // e.g., "Genel", "Satış", "Geçici Sözleşme"
  isActive: boolean; // Toggle for including in prompt
  dateAdded: number;
  isTemporaryContract?: boolean; // New flag to distinguish temporary contracts
}

// --- AUTH TYPES ---
export type UserRole = 'ADMIN' | 'LAWYER' | 'INTERN' | 'PENDING';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  username?: string;
}

// --- VERSION CONTROL ---
export interface DraftVersion {
  id: string;
  timestamp: number;
  content: string;
  instruction: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type HistoryItemType = 'ANALYSIS' | 'COMPARISON' | 'DRAFT' | 'FILL';

export interface ContractAnalysisResult {
  id: string; // Unique ID for history
  timestamp: number;
  type?: HistoryItemType;
  fileName?: string;
  riskScore: number; 
  summary: string;
  risks: { severity: 'High' | 'Medium' | 'Low'; description: string; suggestion: string }[];
  originalText: string;
  revisedText: string;
}

export interface DiffAnalysisResult {
  summary: string;
  changes: {
    location: string;
    changeType: 'Addition' | 'Deletion' | 'Modification';
    impact: 'Positive' | 'Neutral' | 'Negative' | 'Critical';
    analysis: string;
    recommendation: 'Accept' | 'Reject' | 'Negotiate';
  }[];
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  category: string;
  lastUpdated: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  KNOWLEDGE_BASE = 'KNOWLEDGE_BASE',
  CONTRACT_REVIEW = 'CONTRACT_REVIEW',
  DRAFTER = 'DRAFTER',
  SMART_FILLER = 'SMART_FILLER',
  CLAUSE_LIBRARY = 'CLAUSE_LIBRARY',
  COMPARATOR = 'COMPARATOR',
  HISTORY = 'HISTORY',
  USER_MANUAL = 'USER_MANUAL',
  TEMPORARY_CONTRACTS = 'TEMPORARY_CONTRACTS',
  ADMIN_PANEL = 'ADMIN_PANEL'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: { title: string; uri: string }[]; // Grounding Sources
}