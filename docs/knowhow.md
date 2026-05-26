# SHIN AI — 기술 노하우

> 프로젝트 작업 중 발견한 기술적 팁, 주의사항, 트러블슈팅 경험을 기록합니다.  
> 나중에 같은 문제를 만났을 때 빠르게 해결하기 위한 참고 자료입니다.

---

## 프로젝트 구조

### 핵심 아키텍처
- **VS Code Extension** (TypeScript) — Ollama/LM Studio 로컬 LLM과 통신
- 메인 로직이 `src/extension.ts` **단일 파일 (1.1MB)** 에 집중되어 있음
- 에이전트 정의만 `src/agents.ts`로 분리, 경로 관리는 `src/paths.ts`
- 빌드: `esbuild`로 번들링 → `out/extension.js`

### 파일별 역할
| 파일 | 역할 | 크기 |
|------|------|------|
| `src/extension.ts` | 전체 확장 로직 (UI, API, 도구, 채팅 등) | 1.1MB |
| `src/agents.ts` | 에이전트 정의 (CEO, Developer, Designer 등) | 6.7KB |
| `src/paths.ts` | 뇌 폴더/회사 폴더 경로 결정 로직 | 3KB |
| `src/system-specs.ts` | OS/시스템 스펙 감지 | 3.5KB |

---

## 빌드 & 패키징

### 빌드 명령어
```bash
npm run compile
# = esbuild src/extension.ts --bundle --platform=node --external:vscode --outfile=out/extension.js
```

### VSIX 패키징
```bash
npx @vscode/vsce package --allow-missing-repository --baseContentUrl . --baseImagesUrl .
```

> [!IMPORTANT]
> - `--allow-missing-repository` : package.json에 repository URL이 없어도 허용
> - `--baseContentUrl . --baseImagesUrl .` : README 이미지 경로 에러 방지
> - README.md에 `<img src="assets/...">` 같은 상대 이미지 경로가 있으면 VSIX 패키징이 실패함 → 제거하거나 baseImagesUrl 옵션 필요

### PowerShell에서 npm 실행 시 주의
```powershell
# npm.ps1이 실행 정책에 막힐 수 있음 → npm.cmd 직접 호출
& "C:\Program Files\nodejs\npm.cmd" install

# 새 터미널에서 PATH 갱신 필요 시:
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
```

---

## Windows 관련 이슈

### 긴 파일 경로 문제
- `assets/pixel/` 하위에 200자 이상 파일명이 있어 clone 시 체크아웃 실패
- **해결**: `git clone -c core.longpaths=true` 또는 클론 후 `git config core.longpaths true`

### 한글 인코딩
- PowerShell 기본 인코딩이 cp949 → 한글/이모지 출력 시 `UnicodeEncodeError` 발생
- **해결**: Python 스크립트로 파일 처리 시 반드시 `encoding="utf-8"` 명시, print에 이모지(✅ 등) 사용 금지

---

## 리브랜딩 포인트

### 브랜딩 변경 시 수정해야 할 위치
1. **`package.json`** — name, displayName, publisher, description, commands.category, viewsContainers.activitybar.title, configuration.title
2. **`src/extension.ts`** — UI 텍스트 내 "Connect AI" 문자열
3. **`src/paths.ts`** — 뇌 폴더 이름 (`.connect-ai-brain` → `.shin-ai-brain`)
4. **`README.md`** — 전체 문서

### 설정 키는 변경하지 않음
- `shinAi.*` 설정 키는 그대로 유지 (변경 시 기존 설정 호환성 깨짐)
- 사용자에게 보이는 title/description만 변경

---

## 에이전트 시스템

### 에이전트 구조 (`src/agents.ts`)
```typescript
interface AgentDef {
  id: string;        // 고유 ID (ceo, developer 등)
  name: string;      // 표시 이름
  role: string;      // 역할 설명
  emoji: string;     // 이모지 아이콘
  color: string;     // 테마 컬러 (HEX)
  specialty: string; // 전문 분야
  tagline: string;   // 한 줄 소개
  profileImage?: string;  // 프로필 이미지 (assets/agents/)
  persona?: string;       // 성격/말투 설정
}
```

### 기본 에이전트 목록
`CEO` → `YouTube` → `Instagram` → `Designer` → `Developer` → `Business` → `Secretary` → `Editor` → `Writer` → `Researcher`

### 새 에이전트 추가 방법
1. `src/agents.ts`의 `AGENTS` 객체에 새 항목 추가
2. `AGENT_ORDER` 배열에 ID 추가
3. `SPECIALIST_IDS` 배열에 ID 추가 (CEO 제외)
4. (선택) `assets/agents/`에 프로필 이미지 추가
5. `npm run compile` 후 VSIX 재빌드

---

## 설정 항목 (VS Code Settings)

| 설정 키 | 기본값 | 설명 |
|---------|--------|------|
| `shinAi.ollamaUrl` | `http://127.0.0.1:11434` | AI 서버 주소 |
| `shinAi.defaultModel` | (빈값=자동감지) | 사용할 모델명 |
| `shinAi.localBrainPath` | `~/.shin-ai-brain` | 뇌 폴더 경로 |
| `shinAi.requestTimeout` | 300 | AI 응답 타임아웃(초) |
| `shinAi.autoCycleEnabled` | true | 자율 사이클 ON/OFF |
| `shinAi.dailyBriefingTime` | "09:00" | 일일 브리핑 시각 |
| `shinAi.secondBrainRepo` | (빈값) | 뇌 GitHub 백업 레포 |

---

<!-- 새 노하우는 여기 아래에 추가 -->
