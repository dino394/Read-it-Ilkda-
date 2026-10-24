# 읽다 (Read-it)

**읽고 싶은 글을 모으고, 편안하게 이어 읽는 개인 자료실**

읽다(Read-it)는 웹페이지, 텍스트, 파일을 한곳에 저장하고 관리할 수 있는 개인용 웹 애플리케이션입니다. 저장한 자료를 검색하고 분류할 수 있으며, 읽기 진행률과 위치를 기록해 원하는 곳에서 다시 읽을 수 있습니다.

단순한 자료 저장을 넘어, 개인의 읽기 경험을 지속적으로 관리할 수 있는 서비스를 목표로 개발했습니다.

## 🔗 배포 주소

- **웹사이트:** https://read-it-ilkda.dino393894.workers.dev/
- **백엔드 API:** https://read-it-server.onrender.com/
- **GitHub:** https://github.com/dino394/Read-it-Ilkda-

## ✨ 주요 기능

### 1. 자료 수집 및 관리
- 웹페이지 URL을 통한 콘텐츠 가져오기
- 텍스트 직접 추가
- TXT 및 Markdown 파일 가져오기
- 자료 검색, 필터링 및 정렬
- 자료 수정, 삭제 및 일괄 관리
- 즐겨찾기 및 읽음 상태 관리

### 2. 개인화된 읽기 환경
- 글자 크기 조절
- 다크 모드
- 읽기 위치 및 진행률 저장
- 읽지 않음, 읽는 중, 완독 상태 표시

### 3. 계정 및 데이터 관리
- 회원가입 및 로그인
- 서버 API를 통한 문서 조회 및 관리
- 브라우저 LocalStorage를 활용한 읽기 관련 상태 관리
- JSON 백업 및 복원

## 🛠 기술 스택

| 구분 | 기술 |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| 인증 및 보안 | JWT, bcrypt, URL 검증 |
| 웹 콘텐츠 처리 | Cheerio |
| 브라우저 저장소 | LocalStorage |
| 배포 | Netlify, Render |
| 버전 관리 | Git, GitHub |

## 🏗 프로젝트 구조

