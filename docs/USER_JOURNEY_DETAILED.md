# HOOT Protocol — User Journey & Flow Specification

> Last updated: 2026-03-16
> Branch: feat/agent-studio
> Status: Implementation complete, visual QA pending

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Actor Definitions](#2-actor-definitions)
3. [Page Inventory](#3-page-inventory)
4. [Journey A: Researcher](#4-journey-a-researcher)
5. [Journey B: GPU Contributor](#5-journey-b-gpu-contributor)
6. [Journey C: Token Holder](#6-journey-c-token-holder)
7. [Journey D: Guest (Unconnected)](#7-journey-d-guest)
8. [Cross-Journey Flows](#8-cross-journey-flows)
9. [Navigation Map](#9-navigation-map)
10. [State-Based UI Variations](#10-state-based-ui-variations)
11. [Stage Gate System](#11-stage-gate-system)

---

## 1. System Overview

### Architecture: HOOT Protocol = 3 Pillars

```
                    ┌─────────────────────────────────┐
                    │         HOOT Protocol            │
                    │        (Home: /)                 │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌────────────────┐ ┌──────────┐ ┌──────────────┐
     │ Magnet Studio  │ │   GPU    │ │   Protocol   │
     │  /studio       │ │ Network  │ │   /protocol  │
     │                │ │ /network │ │              │
     │ ┌──────┐       │ │          │ │ Burn, Bond,  │
     │ │Resrch│→Model │ │ Register │ │ PPAP, Reward │
     │ └──────┘  Hub  │ │ Earn     │ │              │
     └────────────────┘ └──────────┘ └──────────────┘
```

### Route Map

| Route | Page | Parent Pillar | Full-Screen |
|-------|------|---------------|-------------|
| `/` | HOOT Home (Dashboard) | — | No |
| `/studio` | Magnet Studio | Magnet Studio | No |
| `/models` | Model Hub | Magnet Studio | No |
| `/model-detail?modelId=xxx` | Model Detail | Magnet Studio | No |
| `/ontology` | Research Ontology | Magnet Studio | No |
| `/research` | Autoresearch | Magnet Studio | Yes |
| `/research-lab` | Research Zoom Lab | Magnet Studio | Yes |
| `/network` | GPU Network | GPU Network | Yes |
| `/protocol` | Protocol | Protocol | No |
| `/pipeline` | Pipeline Demo | — | No |

---

## 2. Actor Definitions

### Actor A: Researcher (연구자)
- **Goal**: AI 모델을 자율적으로 학습시키고 배포
- **Primary flow**: Home → Studio → Research → Models → Deploy
- **Key pages**: Studio, Ontology, Research, Models, Model Detail

### Actor B: GPU Contributor (GPU 제공자)
- **Goal**: 유휴 GPU를 제공하고 보상 수령
- **Primary flow**: Home → Network → Register → Earn → Claim
- **Key pages**: Network, Protocol (rewards)

### Actor C: Token Holder (토큰 홀더)
- **Goal**: HOOT 토큰 스테이킹, 소각, 거버넌스 참여
- **Primary flow**: Home → Protocol → Burn/Bond/PPAP
- **Key pages**: Protocol, Network (monitoring)

### Actor D: Guest (비연결 사용자)
- **Goal**: 플랫폼 탐색, 실시간 연구 관찰
- **Primary flow**: Home → Browse → Connect Wallet
- **Key pages**: Home, Studio (read-only)

---

## 3. Page Inventory

### 3.1 HOOT Home (`/`)

```
┌──────────────────────────────────────────────────────┐
│  [Logo] HOOT PROTOCOL    [Wallet Connect]            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Magnet   │  │   GPU    │  │ Protocol │          │
│  │ Studio   │  │ Network  │  │          │          │
│  │ X jobs   │  │ N nodes  │  │ $X TVL   │          │
│  │ Y models │  │ M GPUs   │  │ K bonds  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                │
│       ▼              ▼              ▼                │
│    /studio        /network      /protocol            │
│                                                      │
│  ── Activity Feed ──────────────────────             │
│  [event1] [event2] [event3] ...                      │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| Logo | navigate | `/` (self) |
| Magnet Studio 카드 | navigate | `/studio` |
| GPU Network 카드 | navigate | `/network` |
| Protocol 카드 | navigate | `/protocol` |
| Activity Feed 항목 | — | read-only |

---

### 3.2 Magnet Studio (`/studio`)

```
┌──────────────────────────────────────────────────────┐
│  ← HOOT                                             │
│  Magnet Studio                                       │
│  AI 자율 연구 · 모델 학습 · 배포                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ LIVE (conditional) ─────────────────────────┐   │
│  │ [pulse] LIVE  {topic}  ████░░ 67%  보기 →    │   │
│  └──────────────────────────────────────────┬────┘   │
│                                             │        │
│  ┌─ Research Card ──────────────────────────┤        │
│  │ [icon] Research          {N} running     │        │
│  │ 주제를 입력하면 AI가 자동으로 ...          │        │
│  │ ┌─────────────────────────┬────────┐    │        │
│  │ │ 연구 주제 입력...        │ 시작 → │    │        │
│  │ └─────────────────────────┴────────┘    │        │
│  │ [hint1] [hint2] [hint3]                  │        │
│  │ 고급 설정 →                               │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  ┌─ Models Card ────────────────────────────┐        │
│  │ [icon] Models          {N} models        │        │
│  │ 연구로 학습된 모델 확인 · 배포 · 공유     │        │
│  │ 모델 허브 →                               │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  ── 연구 활동 ──────────────────────────────         │
│  [●] ETH prediction completed    연구 →  14:32      │
│  [●] New model published         모델 →  14:28      │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination | Condition |
|---------|--------|-------------|-----------|
| ← HOOT | navigate | `/` | always |
| LIVE 배너 | navigate | `/research` | heroJob exists |
| 시작 → (submit) | startResearch() | `/research?topic=xxx` | topicInput filled |
| Topic hint chip | fill input | — | always |
| 고급 설정 → | navigate | `/ontology` | always |
| Models 카드 | navigate | `/models` | always |
| 활동 항목 (research) | navigate | `/research` | event.type = research |
| 활동 항목 (model) | navigate | `/models` | event.type = model |

---

### 3.3 Model Hub (`/models`)

```
┌──────────────────────────────────────────────────────┐
│  MODEL HUB                        [+ New Research]   │
│  Models                                              │
│  Trained by autonomous research. Ready to deploy.    │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────┐                              │
│  │ 🔍 Search models   │                              │
│  └────────────────────┘                              │
│  [All] [Prediction] [Classification] [NLP] ...       │
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Model 1 │ │ Model 2 │ │ Model 3 │               │
│  │ 1.231bp │ │ 84.7%   │ │ 91.2%   │               │
│  │ PyTorch │ │ Sklearn │ │ BERT    │               │
│  └────┬────┘ └────┬────┘ └────┬────┘               │
│       │            │            │                     │
│       ▼            ▼            ▼                     │
│    /model-detail?modelId=xxx                         │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| + New Research | navigate | `/studio` |
| Model 카드 click | navigate | `/model-detail?modelId={id}` |
| Search input | filter (local) | — |
| Filter chips | filter (local) | — |

---

### 3.4 Model Detail (`/model-detail?modelId=xxx`)

```
┌──────────────────────────────────────────────────────┐
│  Studio / Models / {model.slug}                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  {model.name}                   [♡ 38]  [Use this ▼]│
│  {model.slug}                           ┌───────────┤
│  [Prediction] [PyTorch] [MIT]           │ Deploy    ││
│                                          │ Download  ││
│  ┌─────────────────────────────┐        │ Fork &   ││
│  │[Card][Exp][Bench][Play][API]│        │ Retrain  ││
│  ├─────────────────────────────┤        └───────────┤
│  │                             │                     │
│  │  Tab content area           │  ┌─ Sidebar ──────┐│
│  │                             │  │ Stats, Spark   ││
│  │                             │  │ Quick actions   ││
│  │                             │  └────────────────┘│
│  └─────────────────────────────┘                     │
└──────────────────────────────────────────────────────┘

     Deploy Modal                Download Modal
  ┌──────────────────┐       ┌──────────────────┐
  │ Deploy Model     │       │ Download Model   │
  │ Endpoint URL:    │       │ model.pt  142MB  │
  │ api.hoot.net/... │       │ config.json 2KB  │
  │                  │       │ tokenizer  512KB │
  │ [취소] [배포확인] │       │ [닫기] [전체DL]  │
  └──────────────────┘       └──────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| Breadcrumb "Studio" | navigate | `/studio` |
| Breadcrumb "Models" | navigate | `/models` |
| Like button | local state | — |
| Deploy | open modal | deployModal |
| Download | open modal | downloadModal |
| Fork & Retrain | navigate | `/ontology` |
| Deploy modal "배포 확인" | close + switch tab | API tab |
| Tab buttons | local switch | — |

---

### 3.5 Research Ontology (`/ontology`)

```
┌──────────────────────────────────────────────────────┐
│  [←] Research Ontology           [Launch Research ▶] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Preset chips: [Quick] [Balanced] [Deep] [Custom]    │
│                                                      │
│  Branch Strategy                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Arch     │ │ Hyper    │ │ Feature  │            │
│  │ ✓ on    │ │ ✓ on    │ │ ✗ off   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  Dataset                                             │
│  ┌──────────────────────────────────┐               │
│  │ CSV Upload / API endpoint        │               │
│  └──────────────────────────────────┘               │
│                                                      │
│  Evaluation                                          │
│  Metric: val_bpb | Target: < 1.0                    │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| ← Back | navigate | `/studio` |
| Launch Research | start job + navigate | `/research?topic=xxx` |
| Preset chips | local state | — |
| Branch toggles | local state | — |
| CSV upload | file picker | — |

---

### 3.6 Autoresearch (`/research`) — Full-Screen

```
┌──────────────────────────────────────────────────────────────┐
│ [PromptBar: topic | progress | pause | stop | new]          │
├──────┬───────────────┬───────────────┬───────────┬──────────┤
│Active│ Convergence   │               │           │ Stats    │
│ Ops  │ Chart         │               │           │ 34 Nodes │
│#12 ▼ │ val_bpb       │               │           │ 53% Hit  │
│#13   │ over exps     │               │           │          │
├──────┼───────┬───────┼───────┬───────┼───────────┤          │
│Branch│Stream │Scatter│Effect │       │ Context   │          │
│ List │       │       │       │       │ Panel     │          │
│      │       │       │       │       │           │          │
│      ├───────┼───────┼───────┤       │           │          │
│      │Treemap│Lineage│ Mesh  │       │ Terminal  │          │
│      │       │       │       │       │           │          │
├──────┴───────┴───────┴───────┴───────┴───────────┴──────────┤
│ [Footer: avgDuration | totalGpuTime | bestFrontier]         │
└──────────────────────────────────────────────────────────────┘
      ◄─── drag resize ───►                 ◄─── drag resize ───►

Bloomberg-style: 2px gap, 4px border-radius, draggable column dividers
```

**CTAs:**
| Element | Action | Destination | Condition |
|---------|--------|-------------|-----------|
| Stop | stopJob() | — | running |
| Pause | togglePause() | — | running |
| New Research | reset() | idle state | any |
| Deploy (on complete) | navigate | `/model-detail?modelId=xxx` | complete |
| Retrain (on complete) | startJob() | `/research` (new) | complete |
| Improve (on complete) | startJob() | `/research` (new) | complete |
| Focus button (per tile) | open modal | enlarged view | running |
| Resize handle (left) | drag | resize columns | running |
| Resize handle (right) | drag | resize columns | running |

---

### 3.7 GPU Network (`/network`) — Full-Screen

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────────────────────┐  ┌──────────────────┐ │
│  │                          │  │ [GPU][Bond][Jobs] │ │
│  │    3D Globe / HUD        │  │ [Swarms][Feed]    │ │
│  │    Network Viz           │  ├──────────────────┤ │
│  │                          │  │                  │ │
│  │    Nodes: 34             │  │ Active Swarms    │ │
│  │    Active: 12            │  │ ┌──────────────┐ │ │
│  │    Flows: 89             │  │ │ job-abc12    │→│ │
│  │                          │  │ │ training 3n  │ │ │
│  │                          │  │ └──────────────┘ │ │
│  │                          │  │                  │ │
│  │                          │  │ Mesh Stats       │ │
│  │                          │  │ Workers / Results│ │
│  └──────────────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| Job 카드 click | navigate | `/research?jobId=xxx` |
| Bond panel modal | open contractModal | in-page modal |
| Trust gauge | display only | — |
| Worker select | local state | — |
| Tab switches | local state | — |

---

### 3.8 Protocol (`/protocol`)

```
┌──────────────────────────────────────────────────────┐
│  HOOT Protocol                                       │
│  [$12.4M TVL] [847K Burned] [2,341 Bonds] [847 Trust]│
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐                          │
│  │ Burn     │  │ Job      │                          │
│  │ Panel    │  │ Creator  │                          │
│  │ [소각]   │  │ [생성]   │                          │
│  └──────────┘  └──────────┘                          │
│                                                      │
│  Token Flow | PPAP Pipeline | Reward Distribution    │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │ 🌐 Active Jobs 보기            →     │            │
│  │ 🔬 새 연구 시작                →     │            │
│  └──────────────────────────────────────┘            │
│                                                      │
│  ── Protocol Events (Live) ─────────────             │
│  [event1] [event2] [event3] ...                      │
└──────────────────────────────────────────────────────┘
```

**CTAs:**
| Element | Action | Destination |
|---------|--------|-------------|
| Burn panel 소각 | open contractModal | in-page modal |
| Job Creator 생성 | open contractModal | in-page modal |
| Active Jobs 보기 | navigate | `/network` |
| 새 연구 시작 | navigate | `/studio` |
| Event feed item | open eventModal | in-page modal |

---

## 4. Journey A: Researcher

### A-1. First Research (신규 연구)

```
  ┌──────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
  │ Home │────▶│ Studio │────▶│ Research │────▶│ Complete │
  │  /   │     │ /studio│     │/research │     │          │
  └──────┘     └───┬────┘     └──────────┘     └────┬─────┘
                   │                                 │
                   │ topicInput                      ├──▶ Deploy → /model-detail
                   │ + "시작 →"                       ├──▶ Retrain → /research (new)
                   │                                 └──▶ Improve → /research (new)
                   │
                   └──▶ "고급 설정 →" ──▶ /ontology ──▶ "Launch" ──▶ /research
```

**Sequence Diagram:**
```
Actor        Home        Studio       Ontology     Research     ModelDetail
  │            │            │            │            │            │
  │──click────▶│            │            │            │            │
  │ "Studio"   │            │            │            │            │
  │            │──navigate─▶│            │            │            │
  │            │            │            │            │            │
  │            │  Option A: Quick Start  │            │            │
  │            │  type topic + "시작→"   │            │            │
  │            │            │──────────────navigate──▶│            │
  │            │            │  topic param            │            │
  │            │            │            │            │            │
  │            │  Option B: Advanced     │            │            │
  │            │  "고급 설정 →"           │            │            │
  │            │            │──navigate─▶│            │            │
  │            │            │            │──Launch───▶│            │
  │            │            │            │  topic+job │            │
  │            │            │            │            │            │
  │            │            │            │    [연구 진행중...]      │
  │            │            │            │            │            │
  │            │            │            │  Complete  │            │
  │            │            │            │  "Deploy"  │            │
  │            │            │            │            │──navigate─▶│
  │            │            │            │            │  modelId   │
```

### A-2. Model Management (모델 관리)

```
  ┌────────┐     ┌────────┐     ┌─────────────┐
  │ Studio │────▶│ Models │────▶│ Model Detail │
  │/studio │     │/models │     │/model-detail │
  └────────┘     └────────┘     └──────┬──────┘
   Models 카드     카드 click            │
                                        ├──▶ Deploy modal → API tab
                                        ├──▶ Download modal → file list
                                        └──▶ Fork & Retrain → /ontology
```

**Sequence Diagram:**
```
Actor      Studio      Models       ModelDetail    Ontology
  │          │           │              │             │
  │──click──▶│           │              │             │
  │"Models"  │           │              │             │
  │          │──navigate─▶│              │             │
  │          │           │              │             │
  │          │  click card              │             │
  │          │           │──navigate───▶│             │
  │          │           │  modelId     │             │
  │          │           │              │             │
  │          │  "Use this model"        │             │
  │          │           │              │             │
  │          │  [Deploy]               │             │
  │          │           │      open modal            │
  │          │           │      "배포 확인"            │
  │          │           │      → switch to API tab   │
  │          │           │              │             │
  │          │  [Fork & Retrain]        │             │
  │          │           │              │──navigate──▶│
  │          │           │              │             │
  │          │           │              │  Launch     │
  │          │           │              │  → /research│
```

### A-3. Iterative Research (반복 연구)

```
  Research (complete)
       │
       ├──▶ Retrain ──▶ reset + startJob ──▶ /research (새 실험)
       │     같은 주제, 새 config
       │
       ├──▶ Improve ──▶ reset + startJob ──▶ /research (개선 실험)
       │     "{topic} (improved: {instruction})"
       │
       └──▶ Deploy ──▶ /model-detail?modelId=xxx
              모델 상세 → 배포/다운로드
```

---

## 5. Journey B: GPU Contributor

### B-1. GPU Registration & Monitoring

```
  ┌──────┐     ┌──────────┐     ┌──────────────┐
  │ Home │────▶│ Network  │────▶│ My GPU Tab   │
  │  /   │     │ /network │     │              │
  └──────┘     └──────────┘     │ Node status  │
   GPU Network                   │ GPU metrics  │
   카드 click                    │ Job history  │
                                 └──────┬───────┘
                                        │
                                        ├──▶ Job click → /research?jobId=xxx
                                        │    (내 GPU가 처리중인 연구 확인)
                                        │
                                        └──▶ Bond & Trust tab
                                             contractModal (staking)
```

**Sequence Diagram:**
```
Actor       Home       Network        Research
  │           │          │               │
  │──click───▶│          │               │
  │"Network"  │          │               │
  │           │──nav────▶│               │
  │           │          │               │
  │           │  [Jobs tab]              │
  │           │          │               │
  │           │  click job card          │
  │           │          │──navigate────▶│
  │           │          │  jobId param   │
  │           │          │               │
  │           │  [Bond & Trust tab]      │
  │           │          │               │
  │           │  click Bond action       │
  │           │          │               │
  │           │  contractModal opens     │
  │           │  confirm TX              │
  │           │  modal closes            │
```

### B-2. Reward Flow

```
  Network (/network)
       │
       ├──▶ Jobs tab → job cards → /research?jobId=xxx
       │
       ├──▶ Bond & Trust → contractModal (stake/unstake)
       │
       └──▶ Swarms tab → mesh stats, worker board
            (monitoring only, no external navigation)

  Protocol (/protocol)
       │
       └──▶ Reward Distribution panel (display)
            └──▶ "Active Jobs 보기" → /network
```

---

## 6. Journey C: Token Holder

### C-1. Token Operations

```
  ┌──────┐     ┌──────────┐     ┌──────────────┐
  │ Home │────▶│ Protocol │────▶│ Burn Panel   │──▶ contractModal
  │  /   │     │/protocol │     │ Job Creator  │──▶ contractModal
  └──────┘     └──────────┘     │ Token Flow   │    (display)
   Protocol                      │ PPAP Pipeline│    (display)
   카드 click                    │ Reward Dist  │    (display)
                                 └──────┬───────┘
                                        │
                                        ├──▶ "Active Jobs 보기" → /network
                                        └──▶ "새 연구 시작" → /studio
```

**Sequence Diagram:**
```
Actor       Home       Protocol      contractModal    Network    Studio
  │           │          │               │              │          │
  │──click───▶│          │               │              │          │
  │"Protocol" │          │               │              │          │
  │           │──nav────▶│               │              │          │
  │           │          │               │              │          │
  │           │  [Burn panel]            │              │          │
  │           │  input amount            │              │          │
  │           │  click "소각"             │              │          │
  │           │          │──open────────▶│              │          │
  │           │          │   confirm TX  │              │          │
  │           │          │◀─close───────│              │          │
  │           │          │               │              │          │
  │           │  [Cross links]           │              │          │
  │           │  "Active Jobs 보기"       │              │          │
  │           │          │────────────────navigate─────▶│          │
  │           │  "새 연구 시작"           │              │          │
  │           │          │─────────────────────navigate──────────▶│
```

---

## 7. Journey D: Guest

### D-1. Exploration Flow

```
  ┌──────┐     ┌──────────┐
  │ Home │     │ Browse   │
  │  /   │     │ pages    │
  └──┬───┘     └──────────┘
     │
     ├──▶ Studio (view research input, try demo)
     ├──▶ Network (view globe, see live nodes)
     └──▶ Protocol (view stats, see TVL)
          │
          └──▶ "Connect Wallet" → wallet modal
               → unlocks full features
```

**State: Not Connected**
- Dashboard: "Connect wallet to unlock full dashboard" 메시지
- Studio: 연구 입력 가능 (demo mode)
- Network: 글로브 관찰 가능, GPU 등록 불가
- Protocol: 통계 관찰 가능, 소각/본딩 불가

---

## 8. Cross-Journey Flows

### 8.1 Complete Navigation Graph

```
                            ┌─────────────┐
                     ┌──────│  Dashboard  │──────┐
                     │      │     /       │      │
                     │      └──────┬──────┘      │
                     │             │              │
                     ▼             ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  Studio  │  │ Network  │  │ Protocol │
              │ /studio  │  │ /network │  │/protocol │
              └──┬───┬───┘  └────┬─────┘  └──┬───┬───┘
                 │   │           │            │   │
        ┌────────┘   │           │            │   └──────────┐
        ▼            ▼           │            │              ▼
  ┌──────────┐ ┌──────────┐     │            │        ┌──────────┐
  │ Ontology │ │  Models  │     │            │        │  Studio  │
  │/ontology │ │ /models  │     │            │        │  (link)  │
  └────┬─────┘ └────┬─────┘     │            │        └──────────┘
       │             │           │            │
       ▼             ▼           │            ▼
  ┌──────────┐ ┌──────────────┐ │      ┌──────────┐
  │ Research │ │ Model Detail │ │      │ Network  │
  │/research │ │/model-detail │ │      │  (link)  │
  └────┬─────┘ └──────┬───────┘ │      └──────────┘
       │               │        │
       └───────────────┘        │
              ▲                 │
              │                 │
              └─────────────────┘
                job card click
```

### 8.2 Cross-Page Link Matrix

| From ╲ To | Home | Studio | Models | Detail | Ontology | Research | Network | Protocol |
|-----------|------|--------|--------|--------|----------|----------|---------|----------|
| **Home** | — | Pillar | — | — | — | — | Pillar | Pillar |
| **Studio** | ← HOOT | — | Card | — | 고급설정 | 시작→ | — | — |
| **Models** | — | New Rsrch | — | Card click | — | — | — | — |
| **Detail** | — | Breadcrumb | Breadcrumb | — | Fork | — | — | — |
| **Ontology** | — | ← Back | — | — | — | Launch | — | — |
| **Research** | — | — | — | Deploy | — | Retrain/Improve | — | — |
| **Network** | — | — | — | — | — | Job click | — | — |
| **Protocol** | — | 새연구 | — | — | — | — | Active Jobs | — |

---

## 9. Navigation Map

### NavBar (Global)

```
[Logo: HOOT PROTOCOL] ──▶ /

[Magnet Studio] ──▶ /studio     (active on: studio, research, models, model-detail)
[Models]        ──▶ /models     (active on: models)
[Network]       ──▶ /network    (active on: network)
[Protocol]      ──▶ /protocol   (active on: protocol)

[Research Indicator] ──▶ /research    (visible when AI active)
[Wallet Connect] ──▶ wallet dropdown
```

### AgentBar Visibility

| Page | AgentBar | Reason |
|------|----------|--------|
| Dashboard | Visible | standard page |
| Studio | Visible | standard page |
| Models | Visible | standard page |
| Model Detail | Visible | standard page |
| Ontology | Visible | standard page |
| Protocol | Visible | standard page |
| **Research** | **Hidden** | full-screen, own terminal |
| **Research Lab** | **Hidden** | full-screen |
| **Network** | **Hidden** | full-screen, own HUD |

---

## 10. State-Based UI Variations

### Research Page States

| State | PromptBar | Grid Layout | Available Actions |
|-------|-----------|-------------|-------------------|
| `idle` | Topic input + launch | 2-column (onboard + context) | Launch, New Research |
| `setup` | Setup message | 5-column grid | Stop |
| `running` | Progress + ETA | 5-column grid | Stop, Pause |
| `complete` | Results summary | 5-column grid | Deploy, Retrain, Improve |

### Dashboard State Variations

| Wallet | Running Jobs | UI |
|--------|-------------|-----|
| Not connected | — | 3 pillars + "Connect wallet" CTA |
| Connected | None | 3 pillars + stats |
| Connected | Active | 3 pillars + stats + activity feed |

### Studio State Variations

| Condition | UI Element |
|-----------|-----------|
| heroJob exists | LIVE 배너 표시 (click → /research) |
| No heroJob | LIVE 배너 숨김 |
| Running jobs > 0 | Research 카드에 "{N} running" 배지 |
| Events exist | 연구 활동 섹션 표시 |

---

## 11. Stage Gate System

Progressive disclosure — 페이지 접근 제어:

```
Stage 1: [Dashboard]
          │
Stage 2: [Dashboard, Studio, Research, Research-Lab, Ontology]
          │
Stage 3: [+ Models, Model-Detail]
          │
Stage 4: [+ Network]
          │
Stage 5: [+ Protocol, Pipeline]  ← Default (all pages visible)
```

**Guard behavior**: Stage에 포함되지 않은 페이지 접근 시 → `/` (Dashboard)로 redirect

---

## Appendix: File References

| Component | File Path |
|-----------|-----------|
| Router | `src-svelte/lib/stores/router.ts` |
| Stage Store | `src-svelte/lib/stores/stageStore.ts` |
| Dashboard Store | `src-svelte/lib/stores/dashboardStore.ts` |
| Job Store | `src-svelte/lib/stores/jobStore.ts` |
| App Shell | `src-svelte/App.svelte` |
| NavBar | `src-svelte/lib/layout/NavBar.svelte` |
| AgentBar | `src-svelte/lib/components/AgentBar.svelte` |
| Dashboard Page | `src-svelte/lib/pages/DashboardPage.svelte` |
| Studio Page | `src-svelte/lib/pages/StudioPage.svelte` |
| Models Page | `src-svelte/lib/pages/ModelsPage.svelte` |
| Model Detail | `src-svelte/lib/pages/ModelDetailPage.svelte` |
| Ontology Page | `src-svelte/lib/pages/OntologyPage.svelte` |
| Research Page | `src-svelte/lib/pages/AutoresearchPage.svelte` |
| Network View | `src-svelte/lib/pages/NetworkView.svelte` |
| Protocol Page | `src-svelte/lib/pages/EconomicsPage.svelte` |

---

## Appendix: relaxed-engelbart Patterns (향후 통합 참고)

| Pattern | Description | Status |
|---------|-------------|--------|
| Phase State Machine | `studioStore` (IDLE→CREATE→SETUP→RUNNING→COMPLETE→PUBLISH) | relaxed-engelbart에 구현됨, agent-studio는 라우터 기반 유지 |
| Model Publish Wizard | 3-step: Review → VTR Sim → Mint | 향후 ModelDetail에 적용 가능 |
| Agent Dock/Sheet | 하단 입력 + Apple Maps 스타일 sheet | 향후 AgentBar 고도화 시 참고 |
| Store Sync | `studioStore.syncFromJobStore()` on mount | 향후 페이지 복구 시 참고 |
