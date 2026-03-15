/**
 * dockSuggestions.ts — Context-aware suggestion chips for AgentDock
 *
 * Chips change based on the current research lifecycle phase:
 * - idle: preset shortcuts for quick research launch
 * - running: progress view + stop control
 * - complete: result actions (view, improve, retry, deploy)
 */

export interface SuggestionChip {
  label: string;
  presetId?: string;
  action?: string;
  variant?: 'default' | 'primary' | 'danger';
}

export const IDLE_CHIPS: SuggestionChip[] = [
  { label: '암호화폐 예측', presetId: 'crypto_market' },
  { label: 'DeFi 리스크', presetId: 'defi_risk' },
  { label: '이상거래 탐지', presetId: 'fraud_detection' },
  { label: '시계열 분석', presetId: 'time_series' },
];

export const RUNNING_CHIPS: SuggestionChip[] = [
  { label: '진행 상황 보기 →', action: 'viewRunning' },
  { label: '중단', action: 'stop', variant: 'danger' },
];

export const COMPLETE_CHIPS: SuggestionChip[] = [
  { label: '결과 보기 →', action: 'viewResults' },
  { label: '개선하기', action: 'improve' },
  { label: '재실행', action: 'retry' },
  { label: '배포', action: 'deploy', variant: 'primary' },
];
