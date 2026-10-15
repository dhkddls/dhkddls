# 잿빛 서약 — 종이 울리지 않는 마을

한국어 중세 판타지 이야기형 TRPG의 플레이 가능한 첫 번째 모험입니다. 세 출신, d20 판정, 두 곳까지의 장소 조사, 세 결말, 세계관 기록서, 자동 저장, 모험 기록 내보내기를 제공합니다. 약 10–15분 분량입니다.

## 실행

별도 패키지 설치 없이 Python 3와 최신 브라우저만 있으면 됩니다.

```bash
cd /workspace/dhkddls/ashen-oath
python3 -m http.server 8000 --bind 0.0.0.0
```

브라우저에서 서버의 8000번 포트를 엽니다. 로컬 컴퓨터에서는 `http://localhost:8000`입니다. 클라우드에서는 사용하는 실행 환경의 포트 접근 기능을 이용하세요. ES 모듈을 사용하므로 HTML 파일을 직접 더블 클릭하지 말고 HTTP 서버로 실행합니다. 실행 환경에 따라 외부 접속 제공 여부는 다릅니다.

## 플레이

1. 기사·서기관·길잡이 중 출신을 고릅니다.
2. 본문을 읽고 행동을 선택합니다. 필요한 d20 판정은 자동으로 진행됩니다.
3. 「여정」에서 목표와 단서, 「세계관」에서 배경, 「기록」에서 이전 선택을 확인합니다.
4. 마지막 선택 후 모험 기록을 Markdown으로 내려받을 수 있습니다.

진행은 현재 브라우저의 로컬 저장소에 저장됩니다. 계정 동기화와 서버 저장은 없습니다. 다시 시작은 확인창을 거쳐 진행을 초기화합니다. 저장소 사용이 제한되면 화면 아래에 알림이 표시됩니다. 키보드로 버튼과 대화상자를 조작할 수 있고 기록서 탭은 좌우 방향키로 이동할 수 있습니다.

## 코드 구조와 읽는 순서

`app.mjs`의 `GameApplication`에서 시작하면 **선택 → 게임 진행 → 저장 → 화면 갱신** 흐름을 볼 수 있습니다. 각 클래스는 아래 책임만 맡으며, 상속 대신 객체 조합을 사용합니다. 게임 규칙과 저장·화면 처리를 분리해 브라우저 없이도 규칙을 검사할 수 있습니다.

| 파일                     | 클래스 / 내용                           | 책임                                               |
| ------------------------ | --------------------------------------- | -------------------------------------------------- |
| `app.mjs`                | `GameApplication`                       | 사용자의 행동과 게임·저장·화면 연결                |
| `engine.mjs`             | 도메인 클래스 내보내기                  | 게임 규칙에 접근하는 공개 진입점                   |
| `domain/adventure.mjs`   | `Adventure`                             | 장면 이동, 선택 제한, 단서, 기록, 저장 상태 복구   |
| `domain/character.mjs`   | `Character`                             | 출신, 능력치, 기력, 소지품                         |
| `domain/skill-check.mjs` | `SkillCheck`                            | d20 판정과 성공·실패 계산                          |
| `save-repository.mjs`    | `SaveRepository`                        | 브라우저 저장소 접근, 손상된 저장과 접근 실패 처리 |
| `journal-exporter.mjs`   | `JournalExporter`                       | 모험 기록을 Markdown 문자열로 변환                 |
| `ui/game-view.mjs`       | `GameView`                              | 하위 화면 조합, 대화상자와 이벤트 연결             |
| `ui/character-view.mjs`  | `CharacterView`                         | 캐릭터 정보 표시                                   |
| `ui/story-view.mjs`      | `StoryView`                             | 장면·판정·선택지 표시                              |
| `ui/journal-view.mjs`    | `JournalView`                           | 여정·세계관·기록 탭 표시와 키보드 이동             |
| `ui/dom.mjs`             | DOM 도우미 함수                         | 안전한 텍스트 요소 생성과 파일 다운로드            |
| `data/`                  | `origins.mjs`, `scenes.mjs`, `lore.mjs` | 출신·장면·세계관 데이터                            |

`index.html`과 `style.css`는 화면 구조와 스타일을 담당합니다. 직접 작성한 SVG 풍경을 사용하며 외부 폰트·이미지·CDN 의존성은 없습니다. 상세 세계관은 `WORLD.md`에 있습니다. **결말 스포일러를 포함합니다.**

### 게임 규칙 사용 예시

```js
import { Adventure } from "./engine.mjs";

const adventure = new Adventure("scribe");
adventure.choose("lantern");
console.log(adventure.scene.title); // 빈 의자에 앉은 손님
console.log(adventure.character.health); // 10

const snapshot = adventure.toSnapshot();
const restored = Adventure.fromSnapshot(snapshot);
```

`choose()`는 해당 모험 객체를 갱신합니다. 별개 분기를 살펴보려면 `clone()`으로 복제합니다. 내부 진행 필드는 `#` 비공개 필드로 관리하며, 기록·소지품·저장 스냅샷은 복사본을 반환합니다. `SkillCheck`의 난수 생성기와 `SaveRepository`의 저장소 공급자를 주입하면 테스트에서 주사위와 저장 권한을 제어할 수 있습니다.

### 이야기 수정 위치

- 새 장면이나 선택지: `data/scenes.mjs`. 선택지는 `id`, `label`, `detail`, `next`처럼 의미가 드러나는 객체 필드로 작성합니다.
- 출신 설명과 능력치: `data/origins.mjs`.
- 게임 안 세계관: `data/lore.mjs`. 상세 진행자 설정은 `WORLD.md`.

브라우저의 기존 `ashen-oath.v1` 저장 형식과 키를 유지합니다. 복구할 때는 저장된 기력·단서 값을 그대로 믿지 않고 기록된 선택과 주사위로 진행을 재구성합니다. 이전 기록은 선택지의 `label`로 행동을 식별하므로 이미 저장된 선택지 문구를 바꿀 때는 별도 저장 마이그레이션이 필요합니다.

## 검사

Node.js 20 이상에서 별도 설치 없이 실행합니다.

```bash
cd /workspace/dhkddls/ashen-oath
node --test *.test.mjs
```

`engine.test.mjs`는 2,160개 분기 경로, 판정 경계, 조사 횟수, 상태 격리와 기존 저장 복구를 검사합니다. `services.test.mjs`는 저장 권한·용량 오류와 기록 내보내기를 검사합니다. `fixtures/v1-save.json`은 리팩터링 전 코드에서 저장한 호환성 검증용 기록입니다.

기존 프로필 README와 별개인 하위 프로젝트입니다. GitHub Pages 배포는 아직 설정하지 않았습니다.
