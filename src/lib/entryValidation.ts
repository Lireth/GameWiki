/**
 * 条目校验纯逻辑（管理页表单与 JSON 导入共用，独立于 React 便于测试）。
 * 返回第一条错误的提示文案，全部通过时返回 null。
 */

/** data URL 形式图片的长度上限（≈1MB 二进制经 base64 编码后的规模） */
export const MAX_IMAGE_DATA_URL_LENGTH = 1_400_000;

export interface EntryFieldSpec {
  name: string;
  label: string;
  kind: 'text' | 'date' | 'textarea' | 'choice' | 'image';
  /** choice 字段的合法取值白名单 */
  values?: readonly string[];
  required?: boolean;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 单字段校验：返回错误文案或 null */
function validateFieldValue(
  field: EntryFieldSpec,
  rawValue: string | undefined,
): string | null {
  const value = (rawValue ?? '').trim();
  if (field.required && !value) return `请填写「${field.label}」`;
  if (!value) return null;
  if (field.kind === 'date' && !DATE_PATTERN.test(value)) {
    return `「${field.label}」格式应为 YYYY-MM-DD`;
  }
  if (field.kind === 'choice' && field.values && !field.values.includes(value)) {
    return `「${field.label}」的取值无效，请重新选择`;
  }
  if (
    field.kind === 'image' &&
    value.startsWith('data:') &&
    value.length > MAX_IMAGE_DATA_URL_LENGTH
  ) {
    return `「${field.label}」图片超过 1MB 上限，请压缩后再上传`;
  }
  return null;
}

/** 字段级校验：必填、日期格式、枚举白名单、图片 data URL 体积（返回第一条错误） */
export function validateEntryFields(
  fields: readonly EntryFieldSpec[],
  form: Record<string, string>,
): string | null {
  for (const field of fields) {
    const message = validateFieldValue(field, form[field.name]);
    if (message) return message;
  }
  return null;
}

/** 逐字段收集全部错误：field.name → 错误文案（供表单内联展示，无错误时为空对象） */
export function collectEntryFieldErrors(
  fields: readonly EntryFieldSpec[],
  form: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const message = validateFieldValue(field, form[field.name]);
    if (message) errors[field.name] = message;
  }
  return errors;
}

/** 跨字段校验：结束日期不得早于开始日期（缺省值视为通过） */
export function validateDateRange(
  start: string | undefined,
  end: string | undefined,
): string | null {
  const startValue = (start ?? '').trim();
  const endValue = (end ?? '').trim();
  if (startValue && endValue && endValue < startValue) {
    return '「结束日期」不能早于「开始日期」';
  }
  return null;
}

/** 关联存在性校验：关联的角色 / 光锥 / 遗器 id 必须真实存在 */
export function validateRelatedIds(
  form: Record<string, string>,
  characterIds: ReadonlySet<string>,
  lightConeIds: ReadonlySet<string>,
  relicIds: ReadonlySet<string>,
): string | null {
  const relChar = form.relatedCharacterId?.trim();
  if (relChar && !characterIds.has(relChar)) {
    return '关联角色的 ID 不存在，请重新选择';
  }
  const relCone = form.relatedLightConeId?.trim();
  if (relCone && !lightConeIds.has(relCone)) {
    return '关联光锥的 ID 不存在，请重新选择';
  }
  const relRelic = form.relatedRelicId?.trim();
  if (relRelic && !relicIds.has(relRelic)) {
    return '关联遗器的 ID 不存在，请重新选择';
  }
  return null;
}

/** 逐字段收集关联错误：field → 错误文案（无错误时为空对象），供表单内联展示 */
export function collectRelatedIdErrors(
  form: Record<string, string>,
  characterIds: ReadonlySet<string>,
  lightConeIds: ReadonlySet<string>,
  relicIds: ReadonlySet<string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const check = (field: string, ids: ReadonlySet<string>, label: string) => {
    const value = form[field]?.trim();
    if (value && !ids.has(value)) {
      errors[field] = `关联${label}的 ID 不存在，请重新选择`;
    }
  };
  check('relatedCharacterId', characterIds, '角色');
  check('relatedLightConeId', lightConeIds, '光锥');
  check('relatedRelicId', relicIds, '遗器');
  return errors;
}

/** 别名文本解析（每行一个，兼容逗号 / 顿号分隔）：去空、去重；全空时为 undefined */
export function parseAliases(raw: string | undefined): string[] | undefined {
  const list = [
    ...new Set(
      (raw ?? '')
        .split(/[\n,，、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  return list.length > 0 ? list : undefined;
}
