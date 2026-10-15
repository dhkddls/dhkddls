/**
 * @file 브라우저 localStorage와 게임 객체를 연결합니다. 저장소 실패가 플레이를 중단시키지 않게 합니다.
 * JSON 문자열 → Adventure 복구와 Adventure → JSON 저장을 이곳에서만 수행합니다.
 */

import { Adventure } from "./engine.mjs";

// 저장 형식이 v3가 되어도 기존 기록을 찾도록 브라우저 저장 키의 이름은 유지합니다.
const SAVE_KEY = "ashen-oath.v1";

/** 저장소 접근 실패를 처리해 저장 기능 없이도 플레이를 이어갑니다. */
export class SaveRepository {
  // 실제 localStorage 또는 테스트용 메모리 저장소를 제공하는 함수입니다.
  #storageProvider;
  // 최근 저장소 접근 성공 여부. 화면의 저장 불가 안내에 사용합니다.
  #available = true;

  /** 저장소를 반환하는 함수를 받습니다. 접근 자체가 거부될 수 있어 실제 접근은 try 안에서 수행합니다. */
  constructor(storageProvider = () => globalThis.localStorage) {
    this.#storageProvider = storageProvider;
  }

  /** 가장 최근 읽기·쓰기 시도가 가능했는지 나타냅니다. 다음 저장 성공 시 true로 되돌아갑니다. */
  get available() {
    return this.#available;
  }

  /** JSON을 검증·복구하고 손상된 기록만 제거합니다. 저장소 접근 실패와 새 게임은 모두 null이지만 available로 구분합니다. */
  load() {
    try {
      const storage = this.#storageProvider();
      const raw = storage.getItem(SAVE_KEY);
      const adventure = SaveRepository.decode(raw);
      // 저장 내용이 존재하지만 해석할 수 없을 때만 제거합니다. 기록이 없는 정상 첫 실행과 구분합니다.
      if (raw && !adventure) storage.removeItem(SAVE_KEY);
      this.#available = true;
      return adventure;
    } catch {
      this.#available = false;
      return null;
    }
  }

  /** 클래스 객체 자체 대신 일반 스냅샷을 JSON으로 저장합니다. 권한·용량 오류는 false로 알리고 플레이는 유지합니다. */
  save(adventure) {
    try {
      this.#storageProvider().setItem(
        SAVE_KEY,
        JSON.stringify(adventure.toSnapshot()),
      );
      this.#available = true;
    } catch {
      this.#available = false;
    }
    return this.#available;
  }

  /** JSON 문법 오류와 게임 기록 오류를 null로 통일합니다. 유효한 JSON이어도 가능한 진행인지는 Adventure가 검사합니다. */
  static decode(raw) {
    try {
      return Adventure.fromSnapshot(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
