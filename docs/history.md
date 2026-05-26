# SHIN AI — 작업 히스토리

> 프로젝트 변경 사항을 날짜별로 기록합니다.  
> 새 기능 추가, 버그 수정, 설정 변경 등 모든 작업을 여기에 남깁니다.

---

## 2026-05-16 (금) — 프로젝트 초기화 & 리브랜딩

### 🔧 작업 내용

#### 1. 레포 클론
- **원본**: `https://github.com/estealth/connect-ai-` (Connect AI v2.89.157)
- **클론 위치**: `C:\Users\SHIN\work\AI\Connect ai lab\my-connect-ai`
- `git clone -c core.longpaths=true` 옵션 사용 (Windows 긴 파일명 대응)
- 원본 git remote 제거 (`git remote remove origin`) → 독립 레포로 전환

#### 2. 리브랜딩 (Connect AI → SHIN AI)

| 항목 | Before | After |
|------|--------|-------|
| package name | `shin-ai` | `shin-ai-agent` |
| displayName | Connect AI ... | SHIN AI — 나만의 1인기업 AI 에이전트 |
| version | 2.89.157 | **1.0.0** |
| publisher | connectailab | shin-ai |
| 커맨드/사이드바/설정 category | Connect AI | SHIN AI |
| 뇌 폴더 경로 | `~/.connect-ai-brain` | `~/.shin-ai-brain` |

**변경된 파일:**
- `package.json` — 전체 identity 교체 (Python 스크립트로 UTF-8 안전하게 처리)
- `src/extension.ts` — "Connect AI" → "SHIN AI" 일괄 치환
- `src/paths.ts` — `.connect-ai-brain` → `.shin-ai-brain`
- `README.md` — 전체 재작성
- `assets/icon.png` — 새 아이콘 생성 (다크 네이비 + 시안 글로우 브레인 로고)

#### 3. 빌드 환경 구축
- **Node.js v24.15.0 LTS** 설치 (`winget install OpenJS.NodeJS.LTS`)
- npm v11.12.1
- `npm install` → 68 packages
- `npm run compile` → `out/extension.js` (1.4MB) 생성 성공

#### 4. VSIX 패키징
- `npx @vscode/vsce package --allow-missing-repository --baseContentUrl . --baseImagesUrl .`
- **생성 파일**: `shin-ai-agent-1.0.0.vsix` (11.09MB, 260 files)

#### 5. Git 커밋
- `SHIN AI v1.0.0 - Initial rebrand from Connect AI`
- 6 files changed, 21820 insertions(+), 21817 deletions(-)

### 📦 주요 파일 위치

| 파일 | 경로 |
|------|------|
| VSIX 설치 파일 | `my-connect-ai/shin-ai-agent-1.0.0.vsix` |
| 메인 소스 | `my-connect-ai/src/extension.ts` (1.1MB) |
| 에이전트 정의 | `my-connect-ai/src/agents.ts` |
| 경로 관리 | `my-connect-ai/src/paths.ts` |
| 패키지 설정 | `my-connect-ai/package.json` |
| 빌드 출력 | `my-connect-ai/out/extension.js` |

### ⚙️ VS Code 설치 방법
```
Ctrl+Shift+P → Extensions: Install from VSIX → shin-ai-agent-1.0.0.vsix 선택
```

---

## 2026-05-16 (금) — 리팩토링 Step 1 (유틸리티 분리)

### 🔧 작업 내용
- **God Object 해소 시작**: `extension.ts`에서 핵심 유틸리티 로직을 `src/utils/`로 분리
- `src/utils/git.ts` 생성 (Git 명령어 실행, 에러 분류, 안전 검사)
- `src/utils/python.ts` 생성 (Python 환경 감지, 서브프로세스 캡처 실행)
- `src/utils/config.ts` 생성 (VS Code 설정값 로드, 프롬프트 및 도구 시드 로딩 캐싱)
- **결과**: `extension.ts` 21,722줄 → 21,402줄 (성공적으로 코드 분리 및 컴파일 통과)

---

## 2026-05-26 (화) — 대시보드 UI 복구 및 시스템 진단 모달 재구현

### 🔧 작업 내용
- **대시보드 버튼 충돌 및 기능 복구**:
  - `src/ui/dashboard-panel.ts` 내 아이디 중복 및 잘못 연결된 액션 정리.
  - "데일리 브리핑 발송" 액션과 "시스템 진단" 버튼 분리.
- **시스템 사양 진단 팝업(모달) 신규 구현**:
  - 기존에 누락되었던 `getSystemSpecs` 백엔드 핸들러를 복구 (`dashboard-panel.ts`).
  - 프론트엔드(`dashboard.js`)에 프로젝트의 수동 DOM 생성 방식(backdrop 패턴)을 준수하는 `showSystemSpecsModal` 작성.
  - 전체 RAM, 가용 여유 RAM, OS 요약, 안전 모델 한도(GB), 권장 모델 티어를 보여주는 팝업창 완성.
- **버전 릴리즈**: v1.0.4 → v1.0.9 까지 점진적 업데이트 및 패키징 완료 (`shin-ai-agent-1.0.9.vsix`).

---

## 2026-05-26 (화) — 시스템 진단에 그래픽카드(GPU) 사양 조회 기능 추가

### 🔧 작업 내용
- **GPU 정보 수집기 추가**: `src/system-specs.ts`에 `getGpuInfo()` 비동기 함수 신규 작성. Windows (PowerShell), macOS (system_profiler), Linux (lspci) 환경에서 GPU 정보를 각각 안전하게 추출하도록 구현.
- **모달 데이터 연동**: `src/ui/dashboard-panel.ts`에서 시스템 진단 시 비동기 GPU 정보를 함께 조회하여 `specs.gpuInfo`로 전달.
- **UI 업데이트**: `assets/webview/dashboard.js`의 `showSystemSpecsModal`에 GPU 사양 항목 렌더링 추가.
- **버전 릴리즈**: v1.0.10 업데이트 및 VSIX 패키징.

---

<!-- 다음 작업 기록은 여기 아래에 추가 -->
