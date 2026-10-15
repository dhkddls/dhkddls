/**
 * @file d20 주사위와 이야기 선택의 성공 판정. 전투에서도 같은 roll()을 사용합니다.
 * 난수 함수를 주입할 수 있어 테스트와 저장 복구에서 주사위 결과를 재현할 수 있습니다.
 */

export class SkillCheck {
  // d20의 면 수. 생성과 유효성 검사에서 동일한 값을 사용합니다.
  static DICE_SIDES = 20;

  // 0 이상 1 미만을 반환하는 난수 공급 함수입니다.
  #random;

  /** 0 이상 1 미만 값을 주는 함수를 받습니다. 기본은 Math.random이며 테스트에서는 고정 함수를 넣습니다. */
  constructor(random = Math.random) {
    this.#random = random;
  }

  /** choice.check의 stat·dc로 판정하고 주사위, 보정, 성공 여부, 해당 결과 문장을 함께 반환합니다. */
  resolve(choice, character) {
    const roll = this.roll();
    const bonus = character.bonusFor(choice.check.stat);
    const success = this.#isSuccess(roll, bonus, choice.check.dc);
    return {
      roll,
      bonus,
      dc: choice.check.dc,
      stat: choice.check.stat,
      success,
      text: success ? choice.success : choice.failure,
      // 감소량이 있을 때만 부가 정보를 남겨 이전 저장의 결과 구조를 보존합니다.
      ...(character.statusPenaltyFor(choice.check.stat)
        ? {
            baseBonus: character.baseStats[choice.check.stat],
            statusPenalty: character.statusPenaltyFor(choice.check.stat),
          }
        : {}),
    };
  }

  /** 난수에 20을 곱해 버린 뒤 1을 더하면 1~20입니다. 잘못된 난수 공급자는 오류로 드러냅니다. */
  roll() {
    const roll = Math.floor(this.#random() * SkillCheck.DICE_SIDES) + 1;
    if (!Number.isInteger(roll) || roll < 1 || roll > SkillCheck.DICE_SIDES) {
      throw new RangeError("주사위 값은 1~20이어야 합니다.");
    }
    return roll;
  }

  /** 자연 20·자연 1을 합계보다 먼저 적용합니다. 그 외에는 합계가 난이도 이상이면 성공입니다. */
  #isSuccess(roll, bonus, difficulty) {
    if (roll === SkillCheck.DICE_SIDES) return true;
    if (roll === 1) return false;
    return roll + bonus >= difficulty;
  }
}
