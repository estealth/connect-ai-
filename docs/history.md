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
| package name | `connect-ai-lab` | `shin-ai-agent` |
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

<!-- 다음 작업 기록은 여기 아래에 추가 -->
