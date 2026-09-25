import { describe, expect, it } from 'vitest';
import {
  characterLink,
  eventLink,
  lightConeLink,
  newsMonthLink,
  versionLink,
} from './links';

describe('eventLink', () => {
  it('角色关联优先，其次光锥，无关联时为 null', () => {
    expect(eventLink({ relatedCharacterId: 'seele' })).toBe('/characters/seele');
    expect(eventLink({ relatedLightConeId: 'lc1' })).toBe('/light-cones/lc1');
    expect(
      eventLink({ relatedCharacterId: 'seele', relatedLightConeId: 'lc1' }),
    ).toBe('/characters/seele');
    expect(eventLink({})).toBeNull();
  });
});

describe('其它链接助手', () => {
  it('versionLink / characterLink / lightConeLink', () => {
    expect(versionLink('3.7')).toBe('/versions/3.7');
    expect(characterLink('seele')).toBe('/characters/seele');
    expect(lightConeLink('lc1')).toBe('/light-cones/lc1');
  });

  it('newsMonthLink 生成日历对应月份的链接（月份去前导零）', () => {
    expect(newsMonthLink('2026-09-25')).toBe('/news?y=2026&m=9');
    expect(newsMonthLink('2026-01-05')).toBe('/news?y=2026&m=1');
  });
});
