# Flow Completion Specification

## Context

agent-studio worktree의 전체 페이지 플로우 감사 결과, 다수의 dead-end와 미완성 CTA가 발견됨.
relaxed-engelbart worktree에서 구현된 고급 패턴(상태 머신, 모델 퍼블리시, Agent Sheet)을 참고하여 설계.

---

## relaxed-engelbart에서 차용할 패턴

| 패턴 | 출처 | agent-studio 적용 |
|------|------|-------------------|
| **Phase 상태 머신** | `studioStore.ts` (IDLE→CREATE→SETUP→RUNNING→COMPLETE→PUBLISH) | 향후 Studio 리팩터링 시 적용. 현재는 라우터 기반 유지 |
| **Research 완료 → 3 액션** | `ResearchComplete.svelte` (Deploy/Retrain/Improve) | AutoresearchPage에 완료 시 3버튼 추가 |
| **Model Publish 위저드** | `StudioPublish.svelte` (Review→VTR Sim→Mint) | ModelDetailPage Deploy 액션에 간소화 버전 적용 |
| **Agent Dock 상태 아이콘** | `AgentDock.svelte` (🔬🌐📦💰) | AgentBar에 상태별 아이콘 추가 (향후) |
| **이벤트 기반 컴포넌트** | Child dispatch → Parent handles | ModelDetailPage 액션 버튼에 적용 |
| **Legacy route redirect** | `/research` → studio, `/ontology` → studio | 현재는 개별 페이지 유지, 향후 통합 시 적용 |

---

## 수정 대상: 전체 Dead-End / 미완성 플로우

### CRITICAL (즉시 수정)

#### 1. ModelDetailPage — Deploy/Download/Fork 버튼
- **현재**: closeDropdown()만 호출, 아무 동작 없음
- **수정**: Deploy → 배포 확인 모달, Download → 다운로드 모달, Fork → ontology로 이동
- **참고**: relaxed-engelbart의 StudioPublish 3단계 위저드

#### 2. AutoresearchPage — handleDeploy 플레이스홀더
- **현재**: `alert('Deploy 준비 중')` — dead end
- **수정**: `/models` 또는 `/model-detail?modelId=xxx`로 네비게이션
- **참고**: relaxed-engelbart의 ResearchComplete 3버튼 패턴

#### 3. ModelsPage — "New Research" 버튼 잘못된 타겟
- **현재**: `router.navigate('research')`
- **수정**: `router.navigate('studio')` (Studio에서 주제 입력)

#### 4. StudioPage — "고급 설정" 링크 누락
- **현재**: 연구 카드에 고급 설정 접근 불가
- **수정**: "고급 설정 →" 링크 추가 → ontology 페이지로 이동

### HIGH (기능 보완)

#### 5. NetworkView — Job 카드 클릭 불가
- **현재**: job-card div에 on:click 없음
- **수정**: 클릭 시 `/research?jobId=xxx`로 이동

#### 6. NetworkView — Reward Claim 없음
- **현재**: Pool B 수익 표시만, claim 버튼 없음
- **수정**: "Claim" 버튼 + contractModal 연동

#### 7. EconomicsPage — 크로스 페이지 링크 없음
- **현재**: 완전히 자체 완결, 외부 이동 없음
- **수정**: "Active Jobs 보기" → network, "새 연구 시작" → studio 링크 추가

#### 8. StudioPage — 연구 활동 항목 액션 없음
- **현재**: 활동 리스트가 읽기 전용
- **수정**: 각 항목에 "결과 보기" → research/model-detail 링크

#### 9. OntologyPage — Back 버튼 타겟
- **현재**: `router.navigate('dashboard')`
- **수정**: `router.navigate('studio')` (Studio로 돌아가기)

---

## 페이지별 완성 네비게이션 맵

```
HOOT Home (/)
  ├── Magnet Studio → /studio
  │     ├── [주제 입력] → /research?topic=xxx
  │     ├── [고급 설정] → /ontology
  │     ├── [Models 카드] → /models
  │     └── [활동 항목] → /research?jobId=xxx 또는 /model-detail?modelId=xxx
  │
  ├── Models → /models
  │     ├── [모델 카드] → /model-detail?modelId=xxx
  │     └── [New Research] → /studio
  │
  ├── Network → /network
  │     ├── [Job 카드] → /research?jobId=xxx
  │     ├── [Reward Claim] → contractModal
  │     └── [Bond/Trust] → contractModal
  │
  └── Protocol → /protocol
        ├── [Burn] → contractModal
        ├── [Job Create] → contractModal
        ├── [Active Jobs] → /network
        └── [새 연구] → /studio

/research (AutoresearchPage)
  ├── [완료 시 Deploy] → /model-detail?modelId=xxx
  ├── [완료 시 Retrain] → /research (새 연구)
  └── [완료 시 Improve] → /research (개선 연구)

/model-detail?modelId=xxx
  ├── [Deploy] → 배포 모달 (URL 생성)
  ├── [Download] → 다운로드 모달
  ├── [Fork] → /ontology?fork=modelId
  └── [← Models] → /models

/ontology
  ├── [Launch Research] → /research?topic=xxx
  └── [← Back] → /studio
```

---

## Implementation Order

1. ModelDetailPage 3 액션 (Deploy/Download/Fork)
2. AutoresearchPage 완료 플로우
3. ModelsPage + StudioPage 네비게이션 수정
4. NetworkView Job 클릭 + Claim
5. EconomicsPage 크로스링크
6. OntologyPage back 타겟 수정
