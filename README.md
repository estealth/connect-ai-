<h1 align="center">🧠 SHIN AI v1.0</h1>

<p align="center">
  <strong>나만의 1인기업 AI 에이전트</strong><br/>
  100% Local · 100% Offline · VS Code 확장 프로그램
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license" />
  <img src="https://img.shields.io/badge/engine-Ollama%20%7C%20LM%20Studio-orange" alt="engine" />
  <img src="https://img.shields.io/badge/use-Personal-purple" alt="personal" />
</p>

---

## 🧠 Overview

SHIN AI는 [Connect AI](https://github.com/estealth/connect-ai-)를 기반으로 커스터마이징한 **1인기업 전용 로컬 AI 코딩 에이전트**입니다.

외부 클라우드 없이 Ollama/LM Studio를 통해 **100% 오프라인**으로 동작하며, VS Code 안에서 코드 작성, 파일 관리, 지식 정리, 자동화를 수행합니다.

---

## ✨ Core Features

| 기능 | 설명 |
|------|------|
| 🤖 **AI 채팅** | VS Code 사이드바에서 로컬 LLM과 대화 |
| 📂 **파일 생성/편집/삭제** | AI가 직접 프로젝트 파일을 관리 |
| 🧠 **자율 지식 구조화** | 원시 데이터를 자동으로 Markdown 위키로 정리 |
| ☁️ **GitHub 자동 동기화** | 파일 변경 시 자동 git add/commit/push |
| 🔗 **모델 자동 감지** | Ollama/LM Studio 모델을 자동 인덱싱 |
| 💼 **에이전트 팀** | CEO, Developer, Designer 등 역할별 전문 에이전트 |
| ⏰ **24시간 자율 사이클** | 30분 이상 비활성 시 자동 태스크 실행 |
| 📋 **비서 브릿지** | 텔레그램 연동 일일 브리핑 |

---

## 🛠️ Setup

### 1. 엔진 설치

**LM Studio (권장)**
1. [lmstudio.ai](https://lmstudio.ai/) 에서 설치
2. 원하는 모델 로드 (Gemma 3, Llama 3, Qwen Coder 등)
3. Developer 탭에서 Start Server 클릭

**Ollama**
```bash
# Windows: winget install Ollama.Ollama
# Mac: brew install ollama
ollama pull gemma3
```

### 2. 확장 프로그램 빌드 & 설치

```bash
cd my-connect-ai
npm install
npm run compile
npx vsce package
```

생성된 `.vsix` 파일을 VS Code에서 설치:
- `Ctrl+Shift+P` → **Extensions: Install from VSIX**

### 3. 설정

VS Code 설정(`Ctrl+,`)에서 "SHIN AI" 검색:
- **AI 서버 주소**: 기본 `http://127.0.0.1:11434`
- **기본 모델**: 비워두면 자동 감지
- **뇌 폴더 경로**: 기본 `~/.shin-ai-brain`

---

## 🏗️ Project Structure

```
my-connect-ai/
├── src/
│   ├── extension.ts       # 메인 확장 프로그램 로직
│   ├── agents.ts           # 에이전트 정의 (CEO, Developer 등)
│   ├── paths.ts            # 경로 관리
│   └── system-specs.ts     # 시스템 스펙 감지
├── assets/                 # 아이콘, 이미지
├── package.json            # VS Code 확장 매니페스트
└── tsconfig.json
```

---

## 🔒 Privacy

- **Zero Cloud API** — 외부 클라우드 통신 없음
- **Zero Telemetry** — 모든 연산 100% 로컬
- **개인 전용** — 나만의 AI 워크스테이션

---

## 📜 License

MIT — Based on [Connect AI](https://github.com/estealth/connect-ai-) by [Jay](https://github.com/wonseokjung)

<p align="center">
  <strong>Built for personal use by SHIN</strong>
</p>
