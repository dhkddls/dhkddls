import { ORIGINS } from "../data/origins.mjs";

export class Character {
  static MAX_HEALTH = 10;
  static MIN_HEALTH = 1;

  #originId;
  #health = Character.MAX_HEALTH;
  #items;

  constructor(originId = "warden") {
    if (!Object.hasOwn(ORIGINS, originId)) throw new Error("알 수 없는 출신");
    this.#originId = originId;
    this.#items = [this.origin.item];
  }

  get originId() {
    return this.#originId;
  }
  get origin() {
    return ORIGINS[this.#originId];
  }
  get health() {
    return this.#health;
  }
  get items() {
    return [...this.#items];
  }
  get isWounded() {
    return this.#health === Character.MIN_HEALTH;
  }

  bonusFor(stat) {
    return this.origin.stats[stat];
  }

  takeDamage(amount) {
    this.#health = Math.max(Character.MIN_HEALTH, this.#health - amount);
  }

  addItem(item) {
    if (item && !this.#items.includes(item)) this.#items.push(item);
  }

  clone() {
    const character = new Character(this.#originId);
    character.#health = this.#health;
    character.#items = [...this.#items];
    return character;
  }
}
