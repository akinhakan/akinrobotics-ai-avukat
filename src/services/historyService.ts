import { ContractAnalysisResult, HistoryItemType } from "../types";

export const saveToHistory = (item: Partial<ContractAnalysisResult> & { type: HistoryItemType }) => {
  const existing = localStorage.getItem('lexguard_history');
  const history = existing ? JSON.parse(existing) : [];
  
  const newItem: ContractAnalysisResult = {
    id: item.id || Math.random().toString(36).substring(2, 11),
    timestamp: item.timestamp || Date.now(),
    type: item.type,
    fileName: item.fileName || 'İsimsiz İşlem',
    riskScore: item.riskScore || 0,
    summary: item.summary || '',
    risks: item.risks || [],
    originalText: item.originalText || '',
    revisedText: item.revisedText || '',
  };

  const newHistory = [newItem, ...history].slice(0, 50); // Son 50 kayıt
  localStorage.setItem('lexguard_history', JSON.stringify(newHistory));
};

export const getHistory = (): ContractAnalysisResult[] => {
  const existing = localStorage.getItem('lexguard_history');
  return existing ? JSON.parse(existing) : [];
};

export const clearHistory = () => {
  localStorage.removeItem('lexguard_history');
};
