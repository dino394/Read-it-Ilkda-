# 읽다 (Read-it)

**읽고 싶은 글을 모으고, 편안하게 이어 읽을 수 있는 개인 자료실**

읽다는 웹페이지, 텍스트, 파일을 한곳에 모아 관리하고 읽을 수 있도록 만든 개인용 웹 애플리케이션입니다. 자료를 검색하고 분류하는 기능부터 읽던 위치와 진행률을 저장하는 기능까지 제공합니다.

## 주요 기능

- **자료 가져오기:** 웹페이지 URL, 텍스트, TXT 및 MD 파일
- **자료 관리:** 검색, 필터링, 정렬, 수정, 삭제 및 일괄 관리
- **읽기 환경:** 다크 모드, 글자 크기 조절
- **읽기 기록:** 즐겨찾기, 읽음 상태, 읽기 진행률 및 위치 저장
- **데이터 관리:** 브라우저 새로고침 후 자료 유지, 백업 내보내기 및 복원

## 기술 스택

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- 웹 콘텐츠 처리: Cheerio
- 데이터 저장: Browser LocalStorage
- 배포: Netlify, Render
- 버전 관리: Git, GitHub

## 배포 주소

- 웹사이트: https://read-it-ilkda.netlify.app/
- 백엔드 서버: https://read-it-server.onrender.com/

## 로컬 실행 방법

### 1. 저장소 복제

```bash
git clone https://github.com/dino394/Read-it-Ilkda-.git
cd Read-it-Ilkda-
```

### 2. 프런트엔드 실행

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 엽니다.

### 3. 백엔드 실행

백엔드 서버 디렉터리로 이동한 뒤 의존성을 설치하고 서버를 실행합니다.

```bash
npm install
npm start
```

실제 실행 명령어와 서버 설정은 프로젝트의 `package.json` 및 환경 변수 설정에 맞게 확인해야 합니다.

## 프로젝트에서 배운 점

- React와 TypeScript를 활용한 컴포넌트 기반 UI 구현
- LocalStorage를 이용한 데이터 저장 및 복원 기능 구현
- **Node.js와 Express를 활용한 백엔드 서버 구축 및 API 개발**
- **프런트엔드와 백엔드 간 API 통신 및 데이터 처리**
- **웹페이지 콘텐츠를 가져오는 서버 기능 구현과 URL 보안 검사**
- **백엔드 서버 배포 및 운영 환경 설정 경험**
- Netlify와 Render를 활용한 프런트엔드 및 백엔드 배포
- Git과 GitHub를 활용한 버전 관리 및 코드 배포
- 기능 구현부터 테스트, 디버깅, 배포까지 웹 서비스 개발 과정 경험


## 향후 개선 방향

- 모바일 환경의 사용성 개선
- 읽기 화면의 접근성 및 편의성 향상
- 데이터 저장과 복원 과정의 안정성 개선
