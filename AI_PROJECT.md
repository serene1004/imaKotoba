# AI 프로젝트 프로필

## 프로젝트

- 목적: 짧은 일본어 문장과 감정, 선택 한국어 의미를 남기는 개인 기록 서비스 **いまことば (Ima Kotoba)**.
- 언어 / 프레임워크 / 런타임: TypeScript, React, React Router, Vite 기반 브라우저 SPA. Supabase Auth·Postgres, Chart.js를 사용합니다. Node.js 버전은 저장소에 별도 고정되어 있지 않습니다.
- 패키지 관리자 / 버전: pnpm 11.17.0 (`package.json`의 `packageManager`). 의존성 버전은 `pnpm-lock.yaml`을 기준으로 합니다.
- 주요 디렉터리: `src/pages` 화면, `src/features/journal` 상태·저장 처리, `src/components` 공용 UI·차트, `src/data` 감정 목록, `src/types` 공용 타입, `src/lib` Supabase 클라이언트, `public` 정적 자산, `supabase` DB 스키마.
- 아키텍처와 데이터 흐름: `src/App.tsx`가 인증·체험 모드와 접근 경계를 관리합니다. `src/features/journal/JournalApp.tsx`는 저널 화면 라우팅·초안·다이얼로그를, `useJournalEntries.ts`는 기록 조회·저장·삭제와 비동기 상태를, `journalSelectors.ts`는 날짜·통계·그룹화를 담당합니다. `guestStorage.ts`는 체험 기록의 검증·읽기·쓰기를 처리합니다. 로그인 사용자는 브라우저에서 Supabase의 `journal_entries`에 접근하며 DB의 RLS로 사용자별 접근을 제한합니다. 체험 기록은 LocalStorage의 `ima-kotoba:guest-entries`, 체험 모드·이름은 SessionStorage의 `ima-kotoba:guest-mode`·`ima-kotoba:guest-name`을 사용합니다. 체험 기록을 계정으로 이전하는 기능은 현재 없습니다.
- UI 기준: `.impeccable.md`의 한국어 사용자 대상 모바일 중심 개인 일기 디자인을 참고합니다. 일본어 본문이 주가 되고 한국어는 보조이며, 차분한 중립색·절제된 인디고·충분한 여백을 유지합니다.

## 소유권과 경계

- 자동 생성 파일 및 원본 정의: `dist/`는 `pnpm run build`로 생성합니다. `node_modules/`, `.pnpm-store/`, `*.tsbuildinfo`는 의존성·빌드 산출물입니다. 직접 수정하지 않습니다. 의존성을 바꿀 때만 패키지 관리자로 `pnpm-lock.yaml`을 갱신합니다. 별도 코드·데이터 생성 스크립트는 없습니다.
- 재생성 시 보존할 데이터: LocalStorage의 체험 기록과 Supabase의 개인 기록은 사용자 데이터입니다. 검증을 위해 초기화·삭제하거나 덮어쓰지 않습니다. 정적 자산은 `public/`의 원본을 수정합니다.
- API / DB 스키마 / 마이그레이션 규칙: `supabase/schema.sql`은 `journal_entries` 테이블과 SELECT·INSERT·DELETE RLS 정책을 정의하는 초기 설정 SQL입니다. 일본어는 1~150자, 한국어는 NULL 또는 150자 이하이며 감정값은 스키마의 허용 목록을 따릅니다. UPDATE 정책과 마이그레이션 도구·이력 디렉터리는 없습니다. 기존 DB에 초기 SQL을 재실행하지 말고, 스키마 변경 시 기존 데이터 보존·적용 순서·복구 방법을 함께 정리합니다. 원격 DB 적용은 명시 요청이 있을 때만 수행합니다.
- 인증·권한·민감 데이터 경계: `src/lib/supabase.ts`가 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 사용하며 체험 모드에서도 앱 초기화에 필요합니다. Google OAuth 진입점은 `src/App.tsx`입니다. 클라이언트의 사용자 구분만으로 권한을 보장하지 말고 DB의 RLS를 유지합니다. `VITE_` 값은 브라우저에 공개되므로 `service_role`·OAuth secret을 넣지 않습니다.
- 비밀값: `.env.local`, `.client/`의 인증 자료와 개인 기록은 출력·커밋·로그·외부 전송하지 않습니다. 환경 변수 이름과 예시는 `.env.example`만 참고합니다.
- 외부 부작용: Supabase 데이터 변경, OAuth·Vercel 설정 변경과 배포는 명시 요청 범위에서만 수행합니다. 변경과 1차 확인 결과를 사용자가 직접 검증한 뒤 별도 요청하면 커밋·푸시·배포를 진행합니다.

## 에이전트 설정

- 설정 경로: `.codex/config.toml`, `.codex/agents/planner.toml`, `.codex/agents/developer.toml`, `.codex/agents/reviewer.toml`.
- 역할별 모델·추론 수준: planner와 developer는 `gpt-6-luna` / `high`, reviewer는 `gpt-6.1-sol` / `high`. 역할 파일을 변경하면 이 프로필과 README의 역할 표도 함께 갱신합니다.
- 호출 순서와 수정 범위: 메인이 확정 요구사항과 범위를 전달 → planner가 읽기 전용 조사·수용 기준·미결정 사항 보고 → developer가 할당된 파일 구현·검증 → reviewer가 `serene-harness/review-checklist.md`에 따라 읽기 전용 검토. `Critical`·`Major`는 developer 수정·검증 후 reviewer가 재검토합니다. 메인은 최종 diff와 검증 결과를 직접 확인합니다. 작은 작업은 메인이 처리할 수 있고 사용자가 역할 분담을 지정하면 따릅니다.
- 동시 실행과 격리: `.codex/config.toml`의 `max_concurrent_threads_per_session = 3`. 수정 담당은 한 명으로 두고 독립 조사만 병렬화합니다. 병렬 구현이 필요하면 파일·인터페이스를 분리하거나 별도 worktree를 사용합니다. 같은 파일을 동시에 수정하지 않습니다.
- 실행 환경: 설정 파일은 자동 실행 파이프라인이 아니며 메인이 호출을 조율합니다. 모델·역할 사용 가능 여부는 실행 환경에서 확인합니다. planner·reviewer의 읽기 전용 규칙은 작업 지침이며 파일 권한 격리는 아닙니다.

## 검증 명령

| 범위 | 명령 | 비고 |
| --- | --- | --- |
| 전체 검증 | `pnpm run lint` 및 `pnpm run build` | 두 명령을 각각 실행합니다. `verify` 스크립트는 없습니다. |
| 린트 | `pnpm run lint` | ESLint, Airbnb·TypeScript·React Hooks·접근성 규칙 |
| 포맷 | 미설정 | 포맷 검사 스크립트·Prettier 설정 없음 |
| 타입 검사 | `pnpm exec tsc -b` | `build`에도 포함됩니다. 빌드를 실행했다면 중복 실행할 필요가 없습니다. |
| 단위 테스트 | `node --experimental-strip-types --test src/features/journal/guestStorage.test.js src/features/journal/journalSelectors.test.js` | Node.js 내장 러너와 TypeScript stripping으로 저장소·날짜 경계·집계를 검사합니다. Node.js 22.23.4에서 검증했으며 `test` 스크립트는 없습니다. |
| 통합 / E2E | 미설정 | 자동화 스크립트 없음. 변경한 사용자 흐름을 수동 확인합니다. |
| 빌드 | `pnpm run build` | `tsc -b && vite build`, 결과는 `dist/` |
| 생성 코드·데이터 검사 | 해당 없음 | 별도 생성·검사 스크립트 없음 |
| 로컬 동작 | `pnpm dev` | `http://localhost:9050`, strictPort 사용. 환경 변수 필요 |
| 빌드 미리보기 | `pnpm preview` | 빌드 산출물의 로컬 확인 |

## 참고할 기존 예시

- 대표 기능·인증·라우팅: `src/App.tsx`, `src/features/journal/JournalApp.tsx`.
- 작성 폼·오류 처리: `src/pages/JournalWrite.tsx`, `src/features/journal/useJournalEntries.ts`의 조회·저장·삭제별 오류 처리. 기존 예시는 참고 대상이며 모든 실패 경로의 안전성을 보장하는 것은 아닙니다.
- DB 접근: `src/lib/supabase.ts`, `src/features/journal/useJournalEntries.ts`, `supabase/schema.sql`.
- UI 패턴: `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/Toast.tsx`, `src/components/journal/JournalHeader.tsx`, `src/styles.css`.
- 통계·과거 기록: `src/pages/JournalProfile.tsx`, `src/components/charts/`.

## 완료 기준

- 요청한 동작과 기존 UX를 충족하고 체험·로그인 사용자의 저장 경계를 유지합니다. 요청 밖의 기능과 리팩터링은 추가하지 않습니다.
- 코드·의존성·빌드 설정 변경: `pnpm run lint`와 `pnpm run build`를 필수로 실행하고 변경한 흐름을 확인합니다. UI 변경은 모바일·데스크톱과 키보드 조작을 확인합니다. 인증·DB 변경은 두 사용자 간 RLS 격리, 체험 모드, 로딩·실패 상태와 데이터 보존을 관련 범위에서 확인하고 원격 검증 미실행 시 명시합니다.
- 문서·에이전트 지침만 변경: 링크·파일 경로, 실제 스크립트·역할 설정과의 일치, TOML 수정 시 구문, `git diff --check`와 최종 diff를 확인합니다. 앱 린트·빌드는 생략할 수 있습니다.
- 테스트 정책: 기록 저장·검증 또는 날짜·통계 로직을 변경하면 위 단위 테스트 명령을 실행합니다. 그 밖의 추가 테스트의 작성·실행은 사용자 요청에 따릅니다. 존재하지 않는 `pnpm verify`, `pnpm test`, `pnpm format:check`를 사용하거나 통과했다고 보고하지 않습니다.
- 알려진 기존 실패 또는 기술 부채: 2026-11-24 Node.js 22.23.4에서 린트·빌드·단위 테스트 7건이 통과했습니다. Vite의 500 kB 초과 번들 경고는 남아 있으며, 실제 OAuth·원격 RLS는 미검증입니다. 이후 변경은 해당 작업에서 실행한 검사 결과를 별도로 보고합니다.
- 사용 중인 검증 도구가 보고하는 항목: ESLint, TypeScript, Vite. 리뷰와 완료 보고는 `AGENTS.md` 및 `serene-harness/review-checklist.md` 형식을 따릅니다.
