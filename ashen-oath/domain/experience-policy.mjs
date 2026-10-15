/**
 * @file 성장에 관한 규칙 모음. 인스턴스 상태가 없어 static 메서드로 계산합니다.
 * 요청한 규칙은 플레이어가 적보다 높으면 경험치 증가, 낮으면 감소하는 방향입니다.
 */

export class ExperiencePolicy {
  // 각 인덱스+1 레벨이 시작되는 누적 경험치. 변경을 막기 위해 배열을 freeze합니다.
  static LEVEL_THRESHOLDS = Object.freeze([
    0, 80, 200, 380, 620, 950, 1400, 2000,
  ]);
  // 경계 배열 길이로 최대 레벨을 정해 두 설정이 따로 어긋나지 않게 합니다.
  static MAX_LEVEL = ExperiencePolicy.LEVEL_THRESHOLDS.length;

  /** 경계와 해당 막의 상한으로 레벨을 계산합니다. 기존 전투의 수치를 보존하려고 상한을 인수로 받습니다. */
  static levelFor(totalExperience, levelCap = ExperiencePolicy.MAX_LEVEL) {
    let level = 1;
    for (const threshold of ExperiencePolicy.LEVEL_THRESHOLDS.slice(1)) {
      if (totalExperience < threshold || level >= levelCap) break;
      level++;
    }
    return level;
  }

  /** 현재 레벨 시작점 이후의 경험치와 다음 레벨까지의 구간 크기를 반환합니다. 최고 레벨은 required=null입니다. */
  static progress(totalExperience, levelCap = ExperiencePolicy.MAX_LEVEL) {
    const level = ExperiencePolicy.levelFor(totalExperience, levelCap);
    const start = ExperiencePolicy.LEVEL_THRESHOLDS[level - 1];
    const next =
      level >= levelCap ? null : ExperiencePolicy.LEVEL_THRESHOLDS[level];
    return {
      current: totalExperience - start,
      required: next === null ? null : next - start,
    };
  }

  /**
   * 기본 경험치에 레벨 차이 배율을 곱하고 반올림합니다. 플레이어가 높을수록 더 받는 사용자 지정 방향입니다.
   * 예: 기본 100에서 플레이어가 두 레벨 높으면 150, 두 레벨 낮으면 50입니다.
   */
  static reward(monster, playerLevel) {
    // 플레이어가 더 높으면 증가, 더 낮으면 감소하는 사용자 지정 규칙입니다.
    const difference = playerLevel - monster.level;
    // 한 레벨마다 0.25를 가감하고 최소 0.25~최대 2로 제한합니다. 플레이어 Lv.5 대 적 Lv.1이면 2배입니다.
    const multiplier = Math.min(2, Math.max(0.25, 1 + difference * 0.25));
    return {
      amount: Math.round(monster.experience * multiplier),
      base: monster.experience,
      multiplier,
      playerLevel,
      monsterLevel: monster.level,
    };
  }

  /** 차이가 없으면 null, 있으면 상대가 높은지 낮은지에 맞는 안내 문장을 반환합니다. reward()와 차이의 방향이 다릅니다. */
  static warning(monster, playerLevel) {
    // 경고에서는 양수=적이 더 강함을 뜻하게 계산합니다. 경험치 계산의 플레이어−적과 의도적으로 반대입니다.
    const difference = monster.level - playerLevel;
    if (difference === 0) return null;
    if (difference > 0) {
      return `권장 Lv.${monster.level} · 현재 Lv.${playerLevel}. 적이 ${difference}레벨 높습니다. 패배 위험이 있고 경험치도 감소하므로 훈련과 회복 후 도전을 권합니다.`;
    }
    return `권장 Lv.${monster.level} · 현재 Lv.${playerLevel}. 적이 ${-difference}레벨 낮습니다. 현재 성장 규칙에 따라 획득 경험치가 증가합니다.`;
  }
}
