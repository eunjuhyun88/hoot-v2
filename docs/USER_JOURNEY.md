# HOOT Protocol — User Journey Specification

## 전체 구조

```
HOOT 홈 (/)
├── Magnet Studio (/studio)  ← 연구자/개발자
│   ├── Research (/research) ← 연구 실행 + 관찰
│   │   └── Research Lab (/research-lab) ← 실험 줌인
│   ├── Models (/models) ← 학습된 모델 관리
│   │   └── Model Detail (/model-detail?modelId=xxx)
│   └── Ontology (/ontology) ← 연구 고급 설정
├── GPU Network (/network)   ← GPU 기여자
└── Protocol (/protocol)     ← 토큰홀더/참여자
```

---

## Journey A: 연구자 (Researcher)

### A1. HOOT 홈 → Magnet Studio 진입

**화면:** HOOT 홈 (/)
**유저 상태:** 첫 방문 또는 재방문
**보이는 것:**
- HOOT Protocol 헤더 + 1줄 설명
- 3개 pillar 카드 (Magnet Studio / GPU Network / Protocol)
- 각 카드에 현재 상태 요약 표시

**Magnet Studio 카드 상태별:**
| 유저 상태 | 카드 표시 | CTA |
|-----------|-----------|-----|
| 연구 없음 | "AI 자율 연구 시작" | → /studio |
| 연구 진행 중 | "ETH price prediction 실행 중 (47%)" | → /studio |
| 연구 완료 | "DeFi risk analysis 완료 — 모델 3개 생성" | → /studio |

**전환:** Magnet Studio 카드 클릭 → `/studio`

---

### A2. Magnet Studio — 연구 시작

**화면:** Magnet Studio (/studio)
**유저 상태:** 연구를 시작하려는 상태
**보이는 것:**
- ← HOOT 뒤로가기
- 헤더: "Magnet Studio" + 설명
- [진행 중 연구가 있으면] LIVE 히어로 배너 → 클릭 시 /research
- Research 카드:
  - 입력: "연구 주제 입력..."
  - 추천 태그 (클릭 → 입력에 채움)
  - "고급 설정 →" 링크 → /ontology
  - 배지: "N running"
- Models 카드:
  - 최근 모델 1~2개 미리보기 (이름 + 메트릭)
  - "모델 허브 →" 링크 → /models
  - 배지: "N models"
- 최근 연구 섹션:
  - 완료된 연구 주제 리스트 (최대 3개)
  - 각 항목: 주제 + 메트릭 + "다시 연구" / "결과 보기"

**액션 플로우:**

```
[주제 입력] → "시작 →" 버튼 클릭
  → dashboardStore.startResearch(topic)
  → 자동으로 /research 페이지로 이동
  → AgentBar에 "연구를 시작합니다!" 메시지

[고급 설정 →] 클릭
  → /ontology 페이지로 이동
  → 브랜치/데이터셋/평가 설정 후 "Launch Research"
  → /research 페이지로 이동

[LIVE 히어로] 클릭
  → /research 페이지로 이동 (현재 진행 중인 연구)

[최근 연구 > "다시 연구"] 클릭
  → /ontology?topic=이전주제 (이전 설정 프리로드)

[최근 연구 > "결과 보기"] 클릭
  → /models?topic=이전주제 (해당 연구 모델 필터)
```

---

### A3. Research — 연구 관찰

**화면:** Research (/research)
**유저 상태:** 연구가 진행 중이거나 완료된 상태
**AgentBar:** 숨김 (이 페이지는 자체 UI가 풀스크린)

**현재 컴포넌트:**
- 프롬프트 바 (상단): 주제, 진행률, 일시정지/중지 버튼
- 브랜치 리스트 (좌측)
- 차트 그리드 (중앙): Convergence, Scatter, Effect, Experiment Map, Lineage, Mesh
- 컨텍스트 패널 (우측 상단): 연구 요약 + 버튼들
- 리서치 터미널 (우측 하단): 실험 로그

**컨텍스트 패널 버튼 동선:**

| 버튼 | 현재 | 변경 |
|------|------|------|
| Launch | 새 연구 시작 | → /studio (새 주제 입력) |
| Deploy | alert("coming soon") | → /models (배포 준비 안내) |
| Retrain | 리셋 + 재시작 | → /ontology?fork=현재연구ID (설정 수정 후 재시작) |
| Improve | 새 연구 시작 | → /ontology?base=현재연구ID (기존 결과 기반 개선) |

**연구 완료 시 화면 변화:**

```
연구 100% 완료
  → 프롬프트 바: "연구 완료!" 표시
  → 컨텍스트 패널 변경:
    - "연구 완료" 상태 표시
    - "결과 요약" (best metric, 총 실험 수, keep 수)
    - [모델 허브에서 보기] → /models?topic=현재주제
    - [새 연구 시작] → /studio
    - [설정 수정 후 재실행] → /ontology?fork=현재연구ID
  → 터미널: "Research complete. Best model: xxx (1.271 bpb)"
```

---

### A4. Models — 결과 확인

**화면:** Models (/models)
**유저 상태:** 연구 완료 후 모델 확인, 또는 직접 접근

**현재 보이는 것 + 추가:**
- 페이지 헤더: "Model Hub" + "New Research" 버튼
- [추가] 상단: "최근 학습 완료" 섹션 (연구에서 자동 생성된 모델, 최대 3개)
  - 각 카드에 "from: ETH price prediction" 연구 출처 표시
- 검색 + 필터
- [추가] 정렬: Best Metric / Downloads / Newest 드롭다운
- 모델 카드 그리드
  - [추가] 각 카드에 "Deploy" 퀵 버튼 (호버 시 표시)
  - 카드 클릭 → /model-detail?modelId=xxx

---

### A5. Model Detail — 배포/사용

**화면:** Model Detail (/model-detail?modelId=xxx)
**유저 상태:** 특정 모델의 상세 확인 + 사용

**"Use this model" 드롭다운 동선:**

| 옵션 | 액션 |
|------|------|
| Deploy | 모달: 엔드포인트 URL 생성 시뮬레이션 → "배포 완료! API 키: xxx" |
| Download | 모달: 파일 선택 (weights, config, tokenizer) → 다운로드 시뮬레이션 |
| Fork | → /ontology?fork=modelId (이 모델 기반으로 새 연구 설정) |

**[추가] 연구 출처 링크:**
- 헤더 아래: "Trained from: ETH price prediction (2h 34m, 147 experiments)"
- 클릭 → /research?jobId=원본연구ID

**탭별 동선:**

| 탭 | 컨텐츠 | 동선 |
|----|--------|------|
| Model Card | README 문서 | 읽기 전용 |
| Experiments | 실험 히스토리 테이블 | 행 클릭 → 해당 실험 상세 펼침 |
| Benchmark | 다른 모델 대비 성능 비교 | 읽기 전용, 차트 |
| Playground | 입력/출력 시뮬레이션 | 텍스트 입력 → mock 결과 표시 |
| API | API 문서 + 코드 예시 | 복사 버튼, 언어 선택 탭 |

---

## Journey B: GPU 기여자 (Contributor)

### B1. HOOT 홈 → GPU Network 진입

**GPU Network 카드 상태별:**
| 유저 상태 | 카드 표시 | CTA |
|-----------|-----------|-----|
| GPU 미등록, 지갑 미연결 | "유휴 GPU로 보상 획득" | → /network |
| GPU 미등록, 지갑 연결됨 | "GPU 등록하고 보상 시작" | → /network |
| GPU 등록됨, 온라인 | "node-seoul-1 온라인 · 14.7 HOOT 수익" | → /network |
| GPU 등록됨, 오프라인 | "node-seoul-1 오프라인 — 재연결 필요" | → /network |

---

### B2. Network — GPU 등록 + 관리

**화면:** Network (/network)
**AgentBar:** 숨김 (풀스크린 UI)

**사이드 패널 상태별 표시:**

#### GPU 미등록 시 (My GPU 탭):
```
┌─────────────────────────┐
│  🖥️  내 GPU 등록하기     │
│                         │
│  유휴 GPU를 HOOT 네트워크│
│  에 등록하고 연구에 기여  │
│  하여 HOOT 보상을 받으세 │
│  요.                    │
│                         │
│  필요 사양:             │
│  · NVIDIA GPU (8GB+)    │
│  · 안정적 인터넷 연결    │
│  · Docker 설치          │
│                         │
│  ┌─────────────────┐    │
│  │  GPU 등록 시작 → │    │
│  └─────────────────┘    │
│                         │
│  등록 가이드 보기        │
└─────────────────────────┘
```
- "GPU 등록 시작" 클릭 → 등록 모달:
  1. 지갑 연결 확인 (미연결 시 연결 유도)
  2. 노드 이름 입력
  3. GPU 정보 자동 감지 (mock)
  4. Bond 최소 금액 확인
  5. "등록" → mock 트랜잭션 → "등록 완료!"

#### GPU 등록됨 (My GPU 탭):
```
┌─────────────────────────┐
│  node-seoul-1  ● ONLINE │
│  T3 · 1x GPU · BOTH     │
│                         │
│  TRUST: 69/100          │
│  ┌───────────────────┐  │
│  │ ████████░░░░ 69%  │  │
│  └───────────────────┘  │
│  개선: 안정성 유지, 검증 │
│  성공률 높이기           │
│                         │
│  EARNINGS (POOL B)      │
│  ┌────┬────┬────┬────┐  │
│  │2.03│5.39│16.7│140 │  │
│  │job │day │7d  │tot │  │
│  └────┴────┴────┴────┘  │
│                         │
│  ┌─────────────────┐    │
│  │  보상 수령 →     │    │
│  └─────────────────┘    │
│                         │
│  ACTIVITY LOG           │
│  · 02:34 train #47 ✓   │
│  · 02:33 eval #46 ✓    │
│  · 02:31 claim 2.03    │
└─────────────────────────┘
```

**다른 탭 동선:**
| 탭 | 주요 액션 |
|----|-----------|
| Bond & Trust | 본드 추가/해제, 트러스트 스코어 확인 |
| Jobs | 할당된 job 보기, job 클릭 → /research?jobId=xxx |
| Swarms | 참여 중인 스웜 상태, 워커 보드 |
| Feed | 실험 결과 피드 (읽기 전용) |

---

## Journey C: 프로토콜 참여자 (Token Holder)

### C1. HOOT 홈 → Protocol 진입

**Protocol 카드 상태별:**
| 유저 상태 | 카드 표시 | CTA |
|-----------|-----------|-----|
| 지갑 미연결 | "HOOT 프로토콜 참여" | → /protocol (연결 유도) |
| 지갑 연결, 토큰 없음 | "HOOT 토큰 획득하기" | → /protocol |
| 지갑 연결, 토큰 있음 | "2,341 HOOT · $12.4M TVL" | → /protocol |
| 보상 수령 가능 | "89.45 HOOT 수령 가능!" | → /protocol |

---

### C2. Protocol — 토큰 활용

**화면:** Protocol (/protocol)

**Burn 패널 동선:**
```
Burn 패널
  → HOOT 수량 입력
  → MAX 버튼 → 보유 전량
  → 크레딧 환산 표시 (TIER 기반 rate)
  → [Burn HOOT] 클릭
    → 지갑 미연결 시: "지갑을 먼저 연결하세요" + 연결 버튼
    → 지갑 연결됨: 확인 모달 → mock 트랜잭션 → "Burn 완료!"
    → 크레딧 잔고 업데이트 표시
```

**Job Creator 패널 동선:**
```
Job Creator 패널
  → 연구 주제 입력 (또는 프리셋 선택)
  → 예상 비용 (크레딧) 표시
  → [Create Job] 클릭
    → 확인 모달: "X 크레딧으로 연구 생성?"
    → 확인 → mock → "Job 생성 완료!"
    → /research 페이지로 이동
```

**보상 수령 동선:**
```
Reward Distribution 섹션
  → Pool B (GPU): 89.45 HOOT
  → Pool A (Creator): 23.12 HOOT
  → [보상 수령] 버튼 클릭
    → 확인 모달: "112.57 HOOT를 수령합니다"
    → mock 트랜잭션 → "수령 완료!"
    → 잔고 업데이트
```

---

## 페이지 간 연결 맵 (모든 동선)

```
HOOT 홈 (/)
  │
  ├──[Magnet Studio 카드]──→ /studio
  │   │
  │   ├──[주제 입력 + 시작]──→ /research
  │   ├──[고급 설정]──→ /ontology ──[Launch]──→ /research
  │   ├──[LIVE 히어로]──→ /research
  │   ├──[Models 카드]──→ /models
  │   ├──[최근 연구 > 다시]──→ /ontology?topic=xxx
  │   └──[최근 연구 > 결과]──→ /models?topic=xxx
  │
  ├──[GPU Network 카드]──→ /network
  │   │
  │   ├──[GPU 등록]──→ 등록 모달 → mock → 완료
  │   ├──[보상 수령]──→ 수령 모달 → mock → 완료
  │   └──[Job 클릭]──→ /research?jobId=xxx
  │
  └──[Protocol 카드]──→ /protocol
      │
      ├──[Burn HOOT]──→ 확인 모달 → mock → 완료
      ├──[Create Job]──→ 확인 모달 → /research
      └──[보상 수령]──→ 확인 모달 → mock → 완료

/research (연구 페이지)
  │
  ├──[Launch]──→ /studio
  ├──[Deploy]──→ /models (배포 안내)
  ├──[Retrain]──→ /ontology?fork=연구ID
  ├──[Improve]──→ /ontology?base=연구ID
  └──[완료 > 모델 보기]──→ /models?topic=주제

/models (모델 허브)
  │
  ├──[카드 클릭]──→ /model-detail?modelId=xxx
  ├──[Deploy 퀵버튼]──→ /model-detail?modelId=xxx&tab=api
  └──[New Research]──→ /studio

/model-detail (모델 상세)
  │
  ├──[Deploy]──→ 배포 모달 (URL 생성)
  ├──[Download]──→ 다운로드 모달
  ├──[Fork]──→ /ontology?fork=modelId
  ├──[연구 출처 링크]──→ /research?jobId=xxx
  └──[← Models]──→ /models

/ontology (연구 설정)
  │
  ├──[← 뒤로]──→ /studio
  ├──[프리셋]──→ 설정 자동 채움
  ├──[이전 설정 불러오기]──→ 선택 → 설정 로드
  └──[Launch Research]──→ 확인 모달 → /research
```

---

## 우선순위 (구현 순서)

### Phase 1: 핵심 동선 연결 (Critical Path)
1. Studio → Research 시작 플로우 연결 확인
2. Research 완료 시 → Models CTA 추가
3. Model Detail Deploy/Download/Fork 구현
4. Ontology 진입점 연결 (Studio + Research)

### Phase 2: GPU 기여자 온보딩
5. Network My GPU 미등록 상태 UI
6. GPU 등록 모달 플로우
7. 보상 수령 CTA

### Phase 3: Protocol 활성화
8. Burn mock 트랜잭션 완성
9. Job Creator → Research 연결
10. 보상 수령 플로우

### Phase 4: 발견 & 디스커버리
11. HOOT 홈 카드 상태별 메시지
12. Models "최근 학습 완료" 섹션
13. 활동 피드 클릭 네비게이션
