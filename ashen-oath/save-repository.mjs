import { Adventure } from "./engine.mjs";

const SAVE_KEY = "ashen-oath.v1";

/** 저장소 접근 실패를 처리해 저장 기능 없이도 플레이를 이어갑니다. */
export class SaveRepository {
  #storageProvider;
  #available = true;

  constructor(storageProvider = () => globalThis.localStorage) {
    this.#storageProvider = storageProvider;
  }

  get available() {
    return this.#available;
  }

  load() {
    try {
      const storage = this.#storageProvider();
      const raw = storage.getItem(SAVE_KEY);
      const adventure = SaveRepository.decode(raw);
      if (raw && !adventure) storage.removeItem(SAVE_KEY);
      this.#available = true;
      return adventure;
    } catch {
      this.#available = false;
      return null;
    }
  }

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

  static decode(raw) {
    try {
      return Adventure.fromSnapshot(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
