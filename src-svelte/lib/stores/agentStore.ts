import { writable, derived, get } from 'svelte/store';
import { router } from './router.ts';
import { jobStore } from './jobStore.ts';
import { jobState } from './jobState.ts';
import { wallet } from './walletStore.ts';
import { dashboardStore } from './dashboardStore.ts';

/* ─── Types ─── */

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: number;
  /** Optional action buttons rendered below the message */
  actions?: AgentAction[];
  /** Optional metadata for rendering rich content */
  meta?: {
    type?: 'status' | 'nav' | 'research' | 'model' | 'error';
    progress?: number;
    route?: string;
  };
}

export interface AgentAction {
  label: string;
  /** Callback key — resolved in the store */
  key: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

/* ─── Intent Matching ─── */

interface IntentMatch {
  intent: string;
  params: Record<string, string>;
}

const INTENT_PATTERNS: { pattern: RegExp; intent: string; paramKeys?: string[] }[] = [
  // Navigation
  { pattern: /^(모델|models?)\s*(보여|페이지|보기|go|show)?/i, intent: 'nav:models' },
  { pattern: /^(네트워크|network)\s*(보여|페이지|보기|go|show)?/i, intent: 'nav:network' },
  { pattern: /^(프로토콜|protocol)\s*(보여|페이지|보기|go|show)?/i, intent: 'nav:protocol' },
  { pattern: /^(스튜디오|studio|마그넷|magnet)/i, intent: 'nav:studio' },
  { pattern: /^(홈|home|대시보드|dashboard)/i, intent: 'nav:dashboard' },

  // Research control
  { pattern: /^(일시\s*정지|멈춰|pause|stop)\s*(리서치|research)?/i, intent: 'research:pause' },
  { pattern: /^(재개|resume|계속|continue)/i, intent: 'research:resume' },
  { pattern: /^(중지|종료|stop|end)\s*(리서치|research)?/i, intent: 'research:stop' },
  { pattern: /^(상태|status|지금\s*어때|현황)/i, intent: 'research:status' },

  // Research start — catch-all for topic input
  { pattern: /^(.{4,})$/i, intent: 'research:start', paramKeys: ['topic'] },
];

function matchIntent(input: string): IntentMatch | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const { pattern, intent, paramKeys } of INTENT_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) {
      const params: Record<string, string> = {};
      if (paramKeys) {
        paramKeys.forEach((key, i) => {
          params[key] = m[i + 1] || trimmed;
        });
      }
      return { intent, params };
    }
  }
  return null;
}

/* ─── Store ─── */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createAgentStore() {
  const messages = writable<AgentMessage[]>([]);
  const panelOpen = writable(true);
  const inputFocused = writable(false);
  let hasGreeted = false;

  function addMessage(msg: Omit<AgentMessage, 'id' | 'timestamp'>) {
    const full: AgentMessage = { ...msg, id: uid(), timestamp: Date.now() };
    messages.update(arr => [...arr, full]);
    return full.id;
  }

  function agentSay(text: string, opts?: { actions?: AgentAction[]; meta?: AgentMessage['meta'] }) {
    return addMessage({ role: 'agent', text, ...opts });
  }

  function systemSay(text: string) {
    return addMessage({ role: 'system', text });
  }

  /** Send initial greeting based on wallet state */
  function greet() {
    if (hasGreeted) return;
    hasGreeted = true;
    const w = get(wallet);
    const job = get(jobState);

    if (!w.connected) {
      agentSay('HOOT Magnet Studio에 오신 걸 환영합니다! 연구하고 싶은 주제를 입력하거나, 아래 버튼으로 시작해보세요.', {
        actions: [
          { label: '데모 체험', key: 'demo', variant: 'primary' },
          { label: '지갑 연결', key: 'connect-wallet', variant: 'secondary' },
        ],
      });
      return;
    }

    if (job.phase === 'running') {
      const pct = job.totalExperiments > 0
        ? Math.round((job.experiments.filter(e => e.status !== 'pending').length / job.totalExperiments) * 100)
        : 0;
      agentSay(`리서치 "${job.topic}" 실행 중입니다. (${pct}% 완료) 무엇을 도와드릴까요?`, {
        meta: { type: 'status', progress: pct },
        actions: [
          { label: '상태 보기', key: 'status', variant: 'secondary' },
          { label: '일시정지', key: 'pause', variant: 'secondary' },
        ],
      });
      return;
    }

    if (job.phase === 'complete') {
      agentSay(`리서치 "${job.topic}" 완료! 결과를 확인하거나 새 리서치를 시작할 수 있어요.`, {
        actions: [
          { label: '결과 보기', key: 'view-results', variant: 'primary' },
          { label: '새 리서치', key: 'new-research', variant: 'secondary' },
        ],
      });
      return;
    }

    agentSay('안녕하세요! 어떤 주제를 연구할까요?', {
      actions: [
        { label: '+ 새 리서치', key: 'new-research', variant: 'primary' },
        { label: '내 모델 보기', key: 'nav:models', variant: 'secondary' },
      ],
    });
  }

  /** Process user input */
  function send(input: string) {
    const text = input.trim();
    if (!text) return;

    addMessage({ role: 'user', text });

    const match = matchIntent(text);
    if (!match) {
      agentSay('죄송해요, 이해하지 못했어요. 연구 주제를 입력하거나 "상태", "모델", "네트워크" 등을 시도해보세요.');
      return;
    }

    executeIntent(match);
  }

  /** Execute a matched intent */
  function executeIntent(match: IntentMatch) {
    const { intent, params } = match;

    // Navigation
    if (intent === 'nav:models') {
      router.navigate('models');
      agentSay('모델 페이지로 이동합니다.', { meta: { type: 'nav', route: 'models' } });
      return;
    }
    if (intent === 'nav:network') {
      router.navigate('network');
      agentSay('네트워크 페이지로 이동합니다.', { meta: { type: 'nav', route: 'network' } });
      return;
    }
    if (intent === 'nav:protocol') {
      router.navigate('protocol');
      agentSay('프로토콜 페이지로 이동합니다.', { meta: { type: 'nav', route: 'protocol' } });
      return;
    }
    if (intent === 'nav:studio') {
      router.navigate('studio');
      agentSay('Magnet Studio로 이동합니다.', { meta: { type: 'nav', route: 'studio' } });
      return;
    }
    if (intent === 'nav:dashboard') {
      router.navigate('dashboard');
      agentSay('HOOT 홈으로 이동합니다.', { meta: { type: 'nav', route: 'dashboard' } });
      return;
    }

    // Research control
    if (intent === 'research:pause') {
      const job = get(jobState);
      if (job.phase !== 'running') {
        agentSay('현재 실행 중인 리서치가 없습니다.');
        return;
      }
      jobStore.togglePause();
      agentSay(job.paused ? '리서치를 재개합니다.' : '리서치를 일시정지합니다.', {
        actions: [{ label: job.paused ? '일시정지' : '재개', key: job.paused ? 'pause' : 'resume', variant: 'secondary' }],
      });
      return;
    }

    if (intent === 'research:resume') {
      const job = get(jobState);
      if (job.phase !== 'running' || !job.paused) {
        agentSay('재개할 리서치가 없습니다.');
        return;
      }
      jobStore.togglePause();
      agentSay('리서치를 재개합니다.', { meta: { type: 'status' } });
      return;
    }

    if (intent === 'research:stop') {
      const job = get(jobState);
      if (job.phase !== 'running' && job.phase !== 'setup') {
        agentSay('현재 실행 중인 리서치가 없습니다.');
        return;
      }
      jobStore.stopJob();
      agentSay('리서치를 중지했습니다.', {
        actions: [{ label: '새 리서치', key: 'new-research', variant: 'primary' }],
      });
      return;
    }

    if (intent === 'research:status') {
      const job = get(jobState);
      if (job.phase === 'idle') {
        agentSay('현재 실행 중인 리서치가 없습니다. 주제를 입력해서 시작해보세요!');
        return;
      }
      if (job.phase === 'setup') {
        agentSay(`"${job.topic}" 설정 중... ${job.setupMessage || ''}`, { meta: { type: 'status' } });
        return;
      }
      if (job.phase === 'running') {
        const completed = job.experiments.filter(e => e.status !== 'pending').length;
        const pct = job.totalExperiments > 0 ? Math.round((completed / job.totalExperiments) * 100) : 0;
        const best = job.bestMetric === Infinity ? '-' : job.bestMetric.toFixed(4);
        agentSay(
          `"${job.topic}" 실행 중\n` +
          `진행: ${completed}/${job.totalExperiments} (${pct}%)\n` +
          `최고 메트릭: ${best}\n` +
          `브랜치: ${job.branches.length}개${job.paused ? ' (일시정지됨)' : ''}`,
          {
            meta: { type: 'status', progress: pct },
            actions: [
              { label: job.paused ? '재개' : '일시정지', key: job.paused ? 'resume' : 'pause', variant: 'secondary' },
              { label: '리서치 보기', key: 'view-research', variant: 'primary' },
            ],
          }
        );
        return;
      }
      if (job.phase === 'complete') {
        agentSay(`"${job.topic}" 완료! 최고 메트릭: ${job.bestMetric === Infinity ? '-' : job.bestMetric.toFixed(4)}`, {
          meta: { type: 'status', progress: 100 },
          actions: [{ label: '결과 보기', key: 'view-results', variant: 'primary' }],
        });
        return;
      }
    }

    // Research start
    if (intent === 'research:start') {
      const topic = params.topic || 'General Research';
      agentSay(`"${topic}" 리서치를 시작할게요.`, {
        meta: { type: 'research' },
        actions: [
          { label: '바로 시작', key: `start:${topic}`, variant: 'primary' },
          { label: '설정 변경', key: `setup:${topic}`, variant: 'secondary' },
        ],
      });
      return;
    }
  }

  /** Handle action button clicks */
  function handleAction(key: string) {
    if (key === 'demo') {
      dashboardStore.startResearch('DeFi Risk Analysis (Demo)');
      agentSay('데모 리서치를 시작합니다!', { meta: { type: 'research' } });
      return;
    }

    if (key === 'connect-wallet') {
      // Trigger wallet dropdown — dispatch custom event
      window.dispatchEvent(new CustomEvent('agent:open-wallet'));
      agentSay('지갑을 연결해주세요.');
      return;
    }

    if (key === 'new-research') {
      agentSay('어떤 주제를 연구할까요? 자유롭게 입력해주세요!');
      inputFocused.set(true);
      return;
    }

    if (key === 'status') {
      executeIntent({ intent: 'research:status', params: {} });
      return;
    }

    if (key === 'pause') {
      executeIntent({ intent: 'research:pause', params: {} });
      return;
    }

    if (key === 'resume') {
      executeIntent({ intent: 'research:resume', params: {} });
      return;
    }

    if (key === 'view-results' || key === 'view-research') {
      router.navigate('research');
      agentSay('리서치 페이지로 이동합니다.', { meta: { type: 'nav', route: 'research' } });
      return;
    }

    if (key.startsWith('nav:')) {
      const route = key.replace('nav:', '');
      executeIntent({ intent: `nav:${route}`, params: {} });
      return;
    }

    if (key.startsWith('start:')) {
      const topic = key.replace('start:', '');
      dashboardStore.startResearch(topic);
      agentSay(`"${topic}" 리서치를 시작합니다!`, { meta: { type: 'research' } });
      return;
    }

    if (key.startsWith('setup:')) {
      const topic = key.replace('setup:', '');
      router.navigate('ontology', { topic });
      agentSay(`"${topic}" 온톨로지 설정 페이지로 이동합니다.`, { meta: { type: 'nav', route: 'ontology' } });
      return;
    }
  }

  return {
    messages: { subscribe: messages.subscribe },
    panelOpen,
    inputFocused,
    send,
    greet,
    handleAction,
    agentSay,
    systemSay,
  };
}

export const agentStore = createAgentStore();
