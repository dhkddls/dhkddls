/**
 * @file 글자 크기를 적용하고 브라우저에 보관합니다. 모험 저장·불러오기와 독립된 화면 설정입니다.
 */

import { getElement } from "./dom.mjs";

export class ReadingSettings {
  static STORAGE_KEY = "ashen-oath.reading.v1";
  static SIZES = [90, 100, 115, 130];

  #storageProvider;

  /** 저장소 접근은 읽고 쓸 때 시도해 차단된 브라우저에서도 게임을 시작할 수 있게 합니다. */
  constructor(storageProvider = () => globalThis.localStorage) {
    this.#storageProvider = storageProvider;
  }

  /** 허용된 값만 복구하고, select의 키보드·터치 변경을 즉시 화면에 적용합니다. */
  start() {
    const select = getElement("text-size");
    let size = 100;
    try {
      const saved = Number(
        this.#storageProvider().getItem(ReadingSettings.STORAGE_KEY),
      );
      if (ReadingSettings.SIZES.includes(saved)) size = saved;
    } catch {
      this.#showStorageWarning(true);
    }
    this.#apply(size);
    select.addEventListener("change", () => {
      const nextSize = Number(select.value);
      if (!ReadingSettings.SIZES.includes(nextSize)) return;
      this.#apply(nextSize);
      try {
        this.#storageProvider().setItem(
          ReadingSettings.STORAGE_KEY,
          String(nextSize),
        );
        this.#showStorageWarning(false);
      } catch {
        this.#showStorageWarning(true);
      }
    });
  }

  /** CSS의 rem 글자 크기를 함께 조절합니다. 화면 너비·그림·기력 등 게임 수치는 바꾸지 않습니다. */
  #apply(size) {
    document.documentElement.style.setProperty("--text-scale", String(size / 100));
    getElement("text-size").value = String(size);
  }

  /** 저장소가 막혀도 크기 조절은 유지하며 다음 접속에 보관되지 않을 수 있음을 알립니다. */
  #showStorageWarning(visible) {
    getElement("reading-settings-message").hidden = !visible;
    const select = getElement("text-size");
    if (visible) select.setAttribute("aria-describedby", "reading-settings-message");
    else select.removeAttribute("aria-describedby");
  }
}
