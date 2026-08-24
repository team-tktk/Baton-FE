# Baton-FE

Baton 프론트엔드 프로젝트입니다.

## Git 브랜치 전략

이 프로젝트는 이슈를 별도로 생성하지 않고, 작업 브랜치와 Pull Request를 중심으로 협업합니다.

### 주요 브랜치

- `main`: 배포 가능한 안정 버전을 관리합니다.
- `develop`: 개발 중인 기능을 통합하는 기본 브랜치입니다.

직접 `main` 또는 `develop` 브랜치에서 작업하지 않습니다. 모든 작업은 `develop`에서 새 작업 브랜치를 생성하여 진행합니다.

### 작업 브랜치 이름

이슈 번호 없이 작업 내용을 바로 이해할 수 있도록 간단하고 직관적으로 작성합니다.

```text
<type>/<short-description>
```

| Type | 용도 | 예시 |
| --- | --- | --- |
| `feat` | 새로운 기능 | `feat/login` |
| `fix` | 버그 수정 | `fix/header-layout` |
| `refactor` | 코드 구조 개선 | `refactor/auth` |
| `style` | UI 및 스타일 수정 | `style/main-page` |
| `docs` | 문서 수정 | `docs/readme` |
| `chore` | 설정 및 기타 작업 | `chore/eslint` |

브랜치 이름은 영문 소문자와 하이픈(`-`)을 사용합니다.

## 작업 흐름

1. 최신 `develop` 브랜치로 이동합니다.
2. `develop`을 기준으로 작업 브랜치를 생성합니다.
3. 작업 완료 후 원격 저장소에 브랜치를 푸시합니다.
4. 작업 브랜치에서 `develop` 브랜치로 Pull Request를 생성합니다.
5. 리뷰 및 확인이 끝나면 Pull Request를 병합합니다.

```bash
git switch develop
git pull origin develop
git switch -c feat/login

# 작업 및 커밋 후
git push -u origin feat/login
```

## Pull Request 규칙

- PR의 대상 브랜치는 `develop`으로 설정합니다.
- 제목만 보고도 작업 내용을 알 수 있도록 간결하게 작성합니다.
- 본문에는 주요 변경 사항과 확인 방법을 작성합니다.
- 관련 이슈 연결은 생략합니다.
- 리뷰와 확인이 끝난 뒤 병합합니다.

### PR 예시

```text
제목: feat: 로그인 화면 구현

주요 변경 사항
- 로그인 폼 UI 구현
- 입력값 검증 추가

확인 방법
- 로그인 화면 렌더링 확인
- 이메일 및 비밀번호 입력 검증 확인
```
