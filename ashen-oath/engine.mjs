/**
 * @file 게임 규칙을 가져오는 공개 진입점. 필요한 클래스를 한 경로에서 import하도록 다시 내보냅니다.
 * 실제 구현은 domain/에 있으며, 여기서는 객체를 만들거나 게임을 실행하지 않습니다.
 */

// 게임 규칙의 공개 진입점. 이야기 데이터와 브라우저 UI는 별도 모듈입니다.
export { Adventure } from "./domain/adventure.mjs";
export { Character } from "./domain/character.mjs";
export { SkillCheck } from "./domain/skill-check.mjs";
export { CombatSession } from "./domain/combat-session.mjs";
export { ExperiencePolicy } from "./domain/experience-policy.mjs";
export { CampaignResolution } from "./domain/campaign-resolution.mjs";
export { StatusEffects } from "./domain/status-effects.mjs";
