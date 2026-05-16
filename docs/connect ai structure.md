# Connect AI (SHIN AI) — 프로젝트 구조 분석서

> **원본**: `estealth/connect-ai-` (Connect AI v2.89.157)  
> **커스텀**: SHIN AI v1.0.0  
> **분석일**: 2026-05-16  
> **기술 스택**: TypeScript + VS Code Extension API + Ollama/LM Studio + esbuild

---

## 1. 프로젝트 개요

VS Code 확장 프로그램 형태의 **100% 로컬 AI 코딩 에이전트**. Ollama 또는 LM Studio에서 실행되는 로컬 LLM과 통신하여, 파일 생성/편집/삭제, 터미널 명령 실행, 지식 관리, GitHub 자동 동기화 등을 수행한다.

### 핵심 기술

| 기술 | 용도 |
|------|------|
| **TypeScript** | 메인 확장 프로그램 로직 (63.7%) |
| **VS Code Extension API** | IDE 통합 (사이드바, 웹뷰, 명령 팔레트) |
| **Ollama API** | 로컬 LLM 추론 (`/api/chat`, `/api/tags`) |
| **LM Studio API** | OpenAI 호환 로컬 추론 (`/v1/chat/completions`) |
| **esbuild** | TypeScript 번들링 (빠른 빌드) |
| **HTML/CSS/JS** | 웹뷰 UI (채팅, 대시보드, 오피스 뷰) |
| **Python** | 도구 스크립트 (YouTube API, 텔레그램, 캘린더 등) |
| **Git** | 지식 자동 백업 (brain → GitHub) |
| **axios** | HTTP 클라이언트 (LLM API 호출) |
| **jsdom** | HTML 파싱 (웹 스크래핑 기능) |

---

## 2. 디렉토리 구조

```
my-connect-ai/
│
├── src/                          # ★ 핵심 소스 코드
│   ├── extension.ts              # ★★★ 메인 파일 (1.1MB, 21,722줄, 365개 함수)
│   ├── agents.ts                 # ★★ 에이전트 정의 (10개 에이전트)
│   ├── paths.ts                  # ★ 경로 관리 (뇌 폴더, 회사 폴더)
│   ├── system-specs.ts           # 시스템 스펙 감지 (RAM, CPU, GPU)
│   └── MrBeast_Premium_10.md     # 참고 자료 (MrBeast 전략 분석)
│
├── assets/                       # 리소스 파일
│   ├── icon.png                  # ★ 확장 프로그램 아이콘
│   ├── map.jpeg                  # 오피스 맵 배경 (2.7MB)
│   ├── force-graph.min.js        # 지식 그래프 시각화 라이브러리
│   ├── agents/                   # 에이전트 프로필 이미지 (5개)
│   ├── brain-seeds/              # ★ 뇌 초기 템플릿 (28개 .md)
│   ├── prompts/                  # ★★ LLM 시스템 프롬프트 (10개)
│   ├── tool-seeds/               # ★★ 도구 시드 스크립트 (40개 .py/.md)
│   │   ├── business/             #   비즈니스 도구 (PayPal 매출 등)
│   │   ├── developer/            #   개발자 도구 (웹 초기화, 린트 등)
│   │   ├── editor/               #   에디터 도구 (음악 생성, 비디오)
│   │   ├── secretary/            #   비서 도구 (텔레그램, 캘린더)
│   │   └── youtube/              #   YouTube 도구 (트렌드, 분석, 업로드)
│   ├── webview/                  # ★ 웹뷰 UI 파일
│   │   ├── sidebar.html          #   채팅 사이드바 (342KB)
│   │   ├── dashboard.css/js      #   회사 대시보드
│   │   ├── api-panel.css/js      #   API 연결 패널
│   │   ├── revenue-dashboard.*   #   매출 대시보드
│   │   └── sidebar-brand.css     #   사이드바 브랜딩
│   └── pixel/                    # 픽셀 아트 에셋 (캐릭터, 인테리어)
│       ├── characters/           #   에이전트 캐릭터 스프라이트
│       └── modernexteriors-win/  #   외부 건물 타일셋
│
├── scripts/                      # 유틸리티 스크립트
│   └── cycle.js                  # ★ 24시간 자율 사이클 (IDE 외부 실행)
│
├── _company/                     # 회사 에이전트 도구
│   └── agents/developer/tools/
│       └── neon-survivor-kit/    # 개발자 도구 키트
│
├── .claude/                      # Claude AI 설정
├── .secondbrain/                 # 세컨드 브레인 데이터
├── .vscode/                      # VS Code 워크스페이스 설정
│
├── out/                          # ★ 빌드 출력
│   └── extension.js              # 번들된 확장 코드 (1.4MB)
│
├── docs/                         # 프로젝트 문서
│   ├── history.md                # 작업 히스토리
│   └── knowhow.md                # 기술 노하우
│
├── package.json                  # ★★★ VS Code 확장 매니페스트
├── tsconfig.json                 # TypeScript 설정
├── package-lock.json             # npm 의존성 잠금
├── system_schema.json            # 에이전트 시스템 스키마
├── .gitignore                    # Git 무시 목록
├── .vscodeignore                 # VSIX 패키징 무시 목록
├── LICENSE                       # MIT 라이선스
├── README.md                     # 프로젝트 설명
├── ARCHITECTURE.md               # 아키텍처 문서 (원본)
├── EDUCATIONAL_SLIDES.md         # 교육 슬라이드
├── PRESENTATION.md               # 프레젠테이션
├── SHOWCASE_GUIDE.md             # 쇼케이스 가이드
└── shin-ai-agent-1.0.0.vsix     # 빌드된 설치 파일 (11MB)
```

---

## 3. 핵심 파일 상세 분석

### ★★★ `src/extension.ts` — 프로젝트의 심장

| 항목 | 값 |
|------|-----|
| 크기 | 1,080,443 bytes (1.1MB) |
| 줄 수 | 21,722줄 |
| 함수 수 | 약 365개 |
| 클래스 수 | 8개 |

**왜 중요한가?**: 확장 프로그램의 거의 모든 로직이 이 단일 파일에 집중되어 있다. 새 기능을 추가하거나 동작을 수정할 때 반드시 이 파일을 다뤄야 한다.

#### 주요 기능 블록 (라인 범위별)

| 라인 범위 | 기능 | 주요 함수 |
|-----------|------|-----------|
| 1–500 | **Git 유틸리티** | `gitExec`, `gitExecSafe`, `validateGitRemoteUrl` |
| 519–600 | **Python 감지** | `_detectPythonCmd`, `_isPythonMissing` |
| 659–760 | **설정 & 프롬프트 로딩** | `getConfig`, `_loadPrompt`, `_loadToolSeed` |
| 795–920 | **오피스 월드 맵** | `buildWorldDeskPositions` (에이전트 위치) |
| 916–1100 | **회사 구조 관리** | `_migrateCompanyToSubdir`, `getCompanyMetrics` |
| 1132–1450 | **에이전트 고용/활성 관리** | `markAgentHired`, `setAgentActive`, `listInstalledModels` |
| 1496–1750 | **회사 설정 & 텔레그램** | `readCompanyConfig`, `sendTelegramReport` |
| 1749–5000 | **핵심 AI 파이프라인** | CEO 분류기, 플래너, 스페셜리스트 디스패치 |
| 5067–5270 | **뇌 폴더 초기 구조 생성** | `ensureCompanyStructure` |
| 5270–5600 | **지식 검색 (RAG)** | `readRelevantBrainContext`, `readGraphRagBrainContext` |
| 5600–6000 | **에이전트 메모리 & 스킬** | `appendAgentMemory`, `saveAgentSkill` |
| 6384–7260 | **도구 시스템** | `listAgentTools`, `_seedAgentToolsIfMissing` |
| 7258–7510 | **대화 로그 & 세션** | `appendConversationLog`, `makeSessionDir` |
| 7508–7850 | **스페셜리스트 프롬프트 빌드** | `buildSpecialistPrompt`, `_safeGitAutoSync` |
| **7850–9000** | **★ `activate()` 함수** | 확장 프로그램 진입점. 모든 커맨드 등록 |
| 9146–9950 | **지식 그래프 시각화** | `buildKnowledgeGraph`, `showBrainNetwork` |
| 10303–10700 | **승인 패널 & YouTube 대시보드** | `ApprovalsPanelProvider`, `YouTubeDashboardProvider` |
| 10666–11540 | **회사 대시보드** | `CompanyDashboardPanel` (매출, KPI, 채용) |
| 11558–12530 | **API 연결 & OAuth** | `ApiConnectionsPanel`, YouTube OAuth 플로우 |
| **12536–15760** | **★ 오피스 패널** | `OfficePanel` — 픽셀 아트 가상 오피스 |
| 15759–21722 | **★ 사이드바 채팅** | `SidebarChatProvider` — 메인 채팅 UI |

---

### ★★★ `package.json` — 확장 프로그램 매니페스트

**왜 중요한가?**: VS Code가 확장 프로그램을 인식하고 동작시키는 핵심 설정 파일. 모든 커맨드, 키바인딩, 설정 항목, 사이드바 정의가 여기에 선언된다.

#### 등록된 커맨드 (주요)

| 커맨드 ID | 기능 |
|-----------|------|
| `connect-ai-lab.focusChat` | 채팅 사이드바 포커스 (Cmd+L) |
| `connect-ai-lab.explainSelection` | 선택 코드 설명 |
| `connectAiLab.openOffice` | 가상 오피스 열기 |
| `connectAiLab.showBrainNetwork` | 지식 그래프 시각화 |
| `connectAiLab.tasks.refresh` | 태스크 새로고침 |
| `connectAiLab.apiConnections.open` | API 연결 패널 |
| `connectAiLab.revenueDashboard.open` | 매출 대시보드 |

#### VS Code 설정 항목

| 키 | 기본값 | 용도 |
|----|--------|------|
| `connectAiLab.ollamaUrl` | `http://127.0.0.1:11434` | LLM 서버 주소 |
| `connectAiLab.defaultModel` | (자동감지) | 사용 모델 |
| `connectAiLab.localBrainPath` | `~/.shin-ai-brain` | 뇌 폴더 |
| `connectAiLab.requestTimeout` | 300초 | AI 응답 타임아웃 |
| `connectAiLab.autoCycleEnabled` | true | 자율 사이클 |
| `connectAiLab.dailyBriefingTime` | "09:00" | 일일 브리핑 |
| `connectAiLab.secondBrainRepo` | (빈값) | GitHub 백업 레포 |
| `connectAiLab.secretaryBridgeMode` | "off" | 비서 브릿지 모드 |

---

### ★★ `src/agents.ts` — 에이전트 정의

**왜 중요한가?**: 에이전트 팀의 구성을 결정한다. 새 에이전트를 추가하거나 역할을 변경할 때 이 파일을 수정한다.

#### 에이전트 목록

| ID | 이름 | 역할 | 색상 |
|----|------|------|------|
| `ceo` | CEO | Chief Executive Agent | #F8FAFC |
| `youtube` | 레오 | Head of YouTube | #FF4444 |
| `instagram` | Instagram | Head of Instagram | #E1306C |
| `designer` | Designer | Lead Designer | #A78BFA |
| `developer` | 코다맨 | 시니어 풀스택 엔지니어 | #22D3EE |
| `business` | 민 | 비즈니스 전략 | #F5C518 |
| `secretary` | 하나 | 개인 비서 | #84CC16 |
| `editor` | 루나 | Sound Director & Composer | #F472B6 |
| `writer` | Writer | Copywriter | #FBBF24 |
| `researcher` | Researcher | Trend & Data Researcher | #60A5FA |

#### AgentDef 인터페이스

```typescript
interface AgentDef {
  id: string;            // 고유 ID
  name: string;          // 표시 이름
  role: string;          // 역할 설명
  emoji: string;         // 이모지 아이콘
  color: string;         // 테마 컬러
  specialty: string;     // 전문 분야
  tagline: string;       // 한 줄 소개
  profileImage?: string; // 프로필 이미지 파일명
  persona?: string;      // 성격/말투 설정
}
```

---

### ★ `src/paths.ts` — 경로 관리

**왜 중요한가?**: 뇌 폴더(`~/.shin-ai-brain`)와 회사 폴더(`_company`)의 위치를 결정한다. 모든 데이터 저장/읽기의 기준점.

| 함수 | 기능 |
|------|------|
| `_getBrainDir()` | 뇌 폴더 경로 반환 (설정 우선, 기본 `~/.shin-ai-brain`) |
| `getCompanyDir()` | 회사 폴더 경로 반환 (기본 `<brain>/_company/`) |
| `_expandTilde()` | `~/` 경로를 홈 디렉토리로 확장 |
| `_resolvePathInput()` | 사용자 입력 경로를 안전하게 정규화 |

---

### ★ `src/system-specs.ts` — 시스템 스펙 감지

**왜 중요한가?**: 사용자 PC의 RAM/CPU를 분석해서 적절한 LLM 모델 크기를 자동 추천한다. Apple Silicon 감지도 포함.

| 함수 | 기능 |
|------|------|
| `getSystemSpecs()` | OS, RAM, CPU, GPU 정보 수집 (캐시됨) |
| `estimateModelMemoryGB()` | 모델 ID로 필요 메모리 추정 (4-bit GGUF 기준) |

---

### ★ `scripts/cycle.js` — 24시간 자율 사이클

**왜 중요한가?**: VS Code가 꺼져 있어도 독립적으로 LLM을 호출해 회사 업무를 자동 수행한다. cron/Task Scheduler로 스케줄링 가능.

**동작 흐름**:
1. Ollama 또는 LM Studio 자동 감지
2. 뇌 폴더에서 identity, goals, decisions 읽기
3. LLM에 "우선순위 작업 1개 수행" 요청
4. 결과를 `sessions/auto-<timestamp>/`에 저장
5. 일일 대화 로그에 추가

---

### ★★ `assets/prompts/` — LLM 시스템 프롬프트

**왜 중요한가?**: AI 에이전트의 행동 방식과 출력 형식을 결정하는 프롬프트 템플릿. AI의 "성격"을 정의한다.

| 파일 | 용도 |
|------|------|
| `system.md` | 전체 시스템 프롬프트 (4.4KB) |
| `ceo-planner.md` | CEO 작업 계획 프롬프트 |
| `ceo-classifier.md` | 사용자 입력 분류 프롬프트 |
| `ceo-chat.md` | CEO 일반 대화 프롬프트 |
| `ceo-report.md` | CEO 보고서 생성 프롬프트 |
| `confer.md` | 에이전트 간 회의 프롬프트 |
| `secretary-telegram.md` | 비서 텔레그램 연동 프롬프트 |
| `secretary-triage.md` | 비서 우선순위 분류 |
| `skill-distill.md` | 스킬 추출 프롬프트 |
| `decisions-extract.md` | 의사결정 추출 프롬프트 |

---

### ★★ `assets/tool-seeds/` — 에이전트 도구 스크립트

**왜 중요한가?**: 각 에이전트가 실제로 실행할 수 있는 Python 스크립트. AI가 판단해서 자동 실행한다.

| 디렉토리 | 파일 수 | 주요 도구 |
|----------|---------|-----------|
| `youtube/` | 16 | 트렌드 분석, 채널 분석, 댓글 수집, 경쟁사 분석, 자동 기획 |
| `developer/` | 10 | 웹 초기화, 프리뷰, 린트/테스트, PWA 설정, 팩 적용 |
| `editor/` | 6 | 음악 스튜디오 설정, 음악 생성, 뮤직→비디오 |
| `secretary/` | 6 | 텔레그램 설정/알림, Google 캘린더 읽기/쓰기 |
| `business/` | 2 | PayPal 매출 조회 |

---

### ★ `assets/webview/` — UI 파일

| 파일 | 크기 | 용도 |
|------|------|------|
| `sidebar.html` | 342KB | 메인 채팅 사이드바 UI (HTML+인라인 CSS/JS) |
| `dashboard.css` | 74KB | 회사 대시보드 스타일 |
| `dashboard.js` | 69KB | 회사 대시보드 로직 |
| `revenue-dashboard.*` | 31KB | 매출 대시보드 |
| `api-panel.*` | 11KB | API 연결 설정 패널 |
| `sidebar-brand.css` | 4KB | 사이드바 브랜딩 스타일 |

---

## 4. 아키텍처 흐름도

```
사용자 입력 (VS Code 채팅)
        │
        ▼
┌─────────────────────┐
│  SidebarChatProvider │  ← assets/webview/sidebar.html
│  (L15759~21722)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  CEO Classifier      │  ← assets/prompts/ceo-classifier.md
│  (입력 분류)         │
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
[일반 대화]  [작업 요청]
    │         │
    ▼         ▼
CEO Chat   CEO Planner → Specialist Dispatch
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                Developer  YouTube   Designer ...
                    │         │         │
                    ▼         ▼         ▼
              tool-seeds/  tool-seeds/  (프롬프트 기반)
              Python 실행  Python 실행
                    │
                    ▼
            ┌──────────────┐
            │  결과 저장    │
            │  뇌 폴더     │  → ~/.shin-ai-brain/
            │  Git 동기화  │  → GitHub auto-push
            └──────────────┘
```

---

## 5. 사용된 외부 의존성

### npm 패키지 (`package.json`)

| 패키지 | 버전 | 용도 |
|--------|------|------|
| **axios** | ^1.15.0 | HTTP 클라이언트 (LLM API 호출) |
| **jsdom** | ^29.0.2 | HTML DOM 파싱 (웹 스크래핑) |

### 개발 의존성

| 패키지 | 용도 |
|--------|------|
| **esbuild** | 빠른 TypeScript 번들링 |
| **typescript** | TypeScript 컴파일러 |
| **@types/vscode** | VS Code API 타입 정의 |
| **@types/node** | Node.js 타입 정의 |
| **@vercel/ncc** | (미사용, 레거시) |

### 외부 라이브러리 (번들 포함)

| 파일 | 용도 |
|------|------|
| `assets/force-graph.min.js` | 지식 그래프 시각화 (force-directed graph) |
| LimeZu Modern Interiors/Exteriors | 픽셀 아트 에셋 (오피스 뷰) |

---

## 6. 기능별 핵심 파일 매핑

| 기능 | 핵심 파일 |
|------|-----------|
| **채팅 UI** | `extension.ts` (SidebarChatProvider) + `assets/webview/sidebar.html` |
| **AI 추론** | `extension.ts` (callLLM 관련 함수) + Ollama/LM Studio |
| **에이전트 관리** | `agents.ts` + `extension.ts` (hire/active 로직) |
| **파일 조작** | `extension.ts` (CREATE/EDIT/DELETE 액션 핸들러) |
| **뇌 폴더 관리** | `paths.ts` + `extension.ts` (ensureBrainDir, brain-seeds) |
| **지식 검색 (RAG)** | `extension.ts` (readRelevantBrainContext, GraphRAG) |
| **Git 동기화** | `extension.ts` (_safeGitAutoSync) |
| **가상 오피스** | `extension.ts` (OfficePanel) + `assets/pixel/` + `assets/map.jpeg` |
| **도구 실행** | `extension.ts` (tool system) + `assets/tool-seeds/*.py` |
| **텔레그램** | `extension.ts` (sendTelegramReport) + `assets/tool-seeds/secretary/` |
| **대시보드** | `extension.ts` (CompanyDashboardPanel) + `assets/webview/dashboard.*` |
| **자율 사이클** | `scripts/cycle.js` (IDE 외부) + `extension.ts` (IDE 내부) |
| **지식 그래프** | `extension.ts` (showBrainNetwork) + `assets/force-graph.min.js` |

---

## 7. 커스터마이징 시 우선순위

### 반드시 이해해야 할 파일 (Tier 1)
1. **`package.json`** — 모든 커맨드와 설정이 여기서 시작
2. **`src/extension.ts`** — 모든 로직의 본체. `activate()` 함수(L7850)가 진입점
3. **`src/agents.ts`** — 에이전트 추가/수정의 유일한 위치

### 자주 수정하게 될 파일 (Tier 2)
4. **`assets/prompts/*.md`** — AI 행동 방식 튜닝
5. **`assets/tool-seeds/**/*.py`** — 새 도구 추가
6. **`src/paths.ts`** — 데이터 저장 경로 변경
7. **`assets/webview/sidebar.html`** — 채팅 UI 커스텀

### 참고용 파일 (Tier 3)
8. **`scripts/cycle.js`** — 자율 사이클 커스텀
9. **`system_schema.json`** — 에이전트 능력 정의 스키마
10. **`src/system-specs.ts`** — 하드웨어 감지 로직

---

<!-- 업데이트 시 이 문서도 함께 갱신할 것 -->
