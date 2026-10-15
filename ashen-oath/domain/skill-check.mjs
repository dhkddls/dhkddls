export class SkillCheck {
  static DICE_SIDES = 20;

  #random;

  constructor(random = Math.random) {
    this.#random = random;
  }

  resolve(choice, character) {
    const roll = Math.floor(this.#random() * SkillCheck.DICE_SIDES) + 1;
    const bonus = character.bonusFor(choice.check.stat);
    const success = this.#isSuccess(roll, bonus, choice.check.dc);
    return {
      roll,
      bonus,
      dc: choice.check.dc,
      stat: choice.check.stat,
      success,
      text: success ? choice.success : choice.failure,
    };
  }

  #isSuccess(roll, bonus, difficulty) {
    if (roll === SkillCheck.DICE_SIDES) return true;
    if (roll === 1) return false;
    return roll + bonus >= difficulty;
  }
}
