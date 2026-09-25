import { useState } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import {
  useCharacters,
  useLightCones,
  useNewsEvents,
  useRelics,
} from '../hooks/useWikiData';
import { db } from '../db/db';
import {
  ACQUISITION_TYPES,
  BODY_TYPES,
  ELEMENT_IDS,
  GENDERS,
  NEWS_EVENT_TYPES,
  PATH_IDS,
  RELIC_CATEGORIES,
  RELIC_SLOTS,
  type Character,
  type LightCone,
  type NewsEvent,
  type RelicSet,
} from '../db/types';
import {
  validateDateRange,
  validateEntryFields,
  validateRelatedIds,
} from '../lib/entryValidation';
import {
  ACQUISITION_LABEL,
  BODY_TYPE_LABEL,
  ELEMENT_META,
  GENDER_LABEL,
  NEWS_TYPE_META,
  PATH_META,
  RELIC_CATEGORY_META,
  RELIC_SLOT_LABEL,
} from '../lib/meta';

type EntryType = 'character' | 'lightCone' | 'newsEvent' | 'relic';

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'character', label: '角色' },
  { value: 'lightCone', label: '光锥' },
  { value: 'relic', label: '遗器' },
  { value: 'newsEvent', label: '资讯事件' },
];

interface FieldDef {
  name: string;
  label: string;
  kind: 'text' | 'date' | 'textarea' | 'choice' | 'image';
  options?: { value: string; label: string }[];
  /** choice 字段的合法取值白名单（保存前校验） */
  values?: readonly string[];
  required?: boolean;
  /** 空值保存为 undefined（可选字段） */
  optional?: boolean;
  /** 编辑时锁定不可改（主键 id） */
  lockOnEdit?: boolean;
}

function choice(meta: Record<string, unknown>): { value: string; label: string }[] {
  return Object.entries(meta).map(([value, m]) => ({
    value,
    label: typeof m === 'string' ? m : String((m as { label: unknown }).label),
  }));
}

const CHARACTER_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '名称', kind: 'text', required: true },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
    ],
    values: ['5', '4'],
  },
  { name: 'path', label: '命途', kind: 'choice', required: true, options: choice(PATH_META), values: PATH_IDS },
  { name: 'element', label: '战斗属性', kind: 'choice', required: true, options: choice(ELEMENT_META), values: ELEMENT_IDS },
  { name: 'faction', label: '派系', kind: 'text' },
  { name: 'camp', label: '阵营', kind: 'text' },
  { name: 'gender', label: '性别', kind: 'choice', required: true, options: choice(GENDER_LABEL), values: GENDERS },
  { name: 'bodyType', label: '体型', kind: 'choice', required: true, options: choice(BODY_TYPE_LABEL), values: BODY_TYPES },
  { name: 'releaseDate', label: '实装日期', kind: 'date', required: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7）', kind: 'text', required: true },
  { name: 'avatar', label: '头像图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '角色简介', kind: 'textarea', optional: true },
];

const LIGHT_CONE_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '名称', kind: 'text', required: true },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
      { value: '3', label: '3★' },
    ],
    values: ['5', '4', '3'],
  },
  { name: 'path', label: '命途', kind: 'choice', required: true, options: choice(PATH_META), values: PATH_IDS },
  {
    name: 'acquisition',
    label: '获取方式',
    kind: 'choice',
    optional: true,
    options: choice(ACQUISITION_LABEL),
    values: ACQUISITION_TYPES,
  },
  { name: 'releaseDate', label: '实装日期（可选）', kind: 'date', optional: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7）', kind: 'text', optional: true },
  { name: 'image', label: '光锥图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '光锥描述', kind: 'textarea', optional: true },
];

const NEWS_EVENT_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'type', label: '事件类型', kind: 'choice', required: true, options: choice(NEWS_TYPE_META), values: NEWS_EVENT_TYPES },
  { name: 'title', label: '标题', kind: 'text', required: true },
  { name: 'date', label: '开始日期', kind: 'date', required: true },
  { name: 'endDate', label: '结束日期（可选）', kind: 'date', optional: true },
  { name: 'version', label: '版本（如 3.7，可选）', kind: 'text', optional: true },
  { name: 'description', label: '说明（可选）', kind: 'textarea', optional: true },
  { name: 'relatedCharacterId', label: '关联角色（可选）', kind: 'choice', optional: true, options: [] },
  { name: 'relatedLightConeId', label: '关联光锥（可选）', kind: 'choice', optional: true, options: [] },
];

const RELIC_FIELDS: FieldDef[] = [
  { name: 'id', label: 'ID', kind: 'text', required: true, lockOnEdit: true },
  { name: 'name', label: '套装名称', kind: 'text', required: true },
  { name: 'category', label: '类别', kind: 'choice', required: true, options: choice(RELIC_CATEGORY_META), values: RELIC_CATEGORIES },
  {
    name: 'rarity',
    label: '稀有度',
    kind: 'choice',
    required: true,
    options: [
      { value: '5', label: '5★' },
      { value: '4', label: '4★' },
      { value: '3', label: '3★' },
      { value: '2', label: '2★' },
    ],
    values: ['5', '4', '3', '2'],
  },
  { name: 'effect2', label: '二件套效果', kind: 'textarea', required: true },
  { name: 'effect4', label: '四件套效果（位面饰品无）', kind: 'textarea', optional: true },
  { name: 'releaseDate', label: '实装日期（可选）', kind: 'date', optional: true },
  { name: 'releaseVersion', label: '实装版本（如 3.7，可选）', kind: 'text', optional: true },
  { name: 'image', label: '套装图片（URL 或上传本地图片）', kind: 'image', optional: true },
  { name: 'description', label: '套装说明（可选）', kind: 'textarea', optional: true },
  // 六个部位的名称与描述：名称非空的部位才会写入 pieces
  ...RELIC_SLOTS.flatMap((slot) => [
    { name: `piece_${slot}_name`, label: `${RELIC_SLOT_LABEL[slot]}部件名称（可选）`, kind: 'text' as const },
    { name: `piece_${slot}_desc`, label: `${RELIC_SLOT_LABEL[slot]}部件描述（可选）`, kind: 'textarea' as const },
  ]),
];

function fieldsFor(type: EntryType): FieldDef[] {
  switch (type) {
    case 'character':
      return CHARACTER_FIELDS;
    case 'lightCone':
      return LIGHT_CONE_FIELDS;
    case 'relic':
      return RELIC_FIELDS;
    case 'newsEvent':
      return NEWS_EVENT_FIELDS;
  }
}

type FormState = Record<string, string>;

function emptyForm(type: EntryType): FormState {
  const form: FormState = {};
  for (const field of fieldsFor(type)) {
    form[field.name] =
      field.kind === 'choice' && field.required && field.options?.length
        ? field.options[0].value
        : '';
  }
  return form;
}

function buildEntry(
  type: EntryType,
  form: FormState,
): Character | LightCone | NewsEvent | RelicSet {
  const trim = (name: string) => form[name]?.trim() ?? '';
  switch (type) {
    case 'character':
      return {
        id: trim('id'),
        name: trim('name'),
        rarity: Number(form.rarity) as Character['rarity'],
        path: form.path as Character['path'],
        element: form.element as Character['element'],
        faction: trim('faction'),
        camp: trim('camp'),
        gender: form.gender as Character['gender'],
        bodyType: form.bodyType as Character['bodyType'],
        releaseDate: trim('releaseDate'),
        releaseVersion: trim('releaseVersion'),
        avatar: trim('avatar') || undefined,
        description: trim('description') || undefined,
      };
    case 'lightCone':
      return {
        id: trim('id'),
        name: trim('name'),
        rarity: Number(form.rarity) as LightCone['rarity'],
        path: form.path as LightCone['path'],
        acquisition: (trim('acquisition') || undefined) as LightCone['acquisition'],
        releaseDate: trim('releaseDate') || undefined,
        releaseVersion: trim('releaseVersion') || undefined,
        image: trim('image') || undefined,
        description: trim('description') || undefined,
      };
    case 'newsEvent':
      return {
        id: trim('id'),
        type: form.type as NewsEvent['type'],
        title: trim('title'),
        date: trim('date'),
        endDate: trim('endDate') || undefined,
        version: trim('version') || undefined,
        description: trim('description') || undefined,
        relatedCharacterId: trim('relatedCharacterId') || undefined,
        relatedLightConeId: trim('relatedLightConeId') || undefined,
      };
    case 'relic': {
      const pieces = RELIC_SLOTS.map((slot) => ({
        slot,
        name: trim(`piece_${slot}_name`),
        description: trim(`piece_${slot}_desc`) || undefined,
      })).filter((piece) => piece.name);
      return {
        id: trim('id'),
        name: trim('name'),
        category: form.category as RelicSet['category'],
        rarity: Number(form.rarity) as RelicSet['rarity'],
        effect2: trim('effect2'),
        effect4: trim('effect4') || undefined,
        releaseDate: trim('releaseDate') || undefined,
        releaseVersion: trim('releaseVersion') || undefined,
        pieces: pieces.length > 0 ? pieces : undefined,
        image: trim('image') || undefined,
        description: trim('description') || undefined,
      };
    }
  }
}

function entryToForm(
  type: EntryType,
  entry: Character | LightCone | NewsEvent | RelicSet,
): FormState {
  const data = entry as unknown as Record<string, unknown>;
  const form = emptyForm(type);
  for (const field of fieldsFor(type)) {
    const value = data[field.name];
    form[field.name] = value === undefined || value === null ? '' : String(value);
  }
  // 遗器部位列表拆回表单字段
  if (type === 'relic' && Array.isArray(data.pieces)) {
    for (const piece of data.pieces as { slot: string; name: string; description?: string }[]) {
      form[`piece_${piece.slot}_name`] = piece.name;
      form[`piece_${piece.slot}_desc`] = piece.description ?? '';
    }
  }
  return form;
}

function entryLabel(
  entry: Character | LightCone | NewsEvent | RelicSet,
): string {
  return 'name' in entry ? entry.name : (entry as NewsEvent).title;
}

function entrySummary(
  type: EntryType,
  entry: Character | LightCone | NewsEvent | RelicSet,
): string {
  if (type === 'character') {
    const c = entry as Character;
    return `${c.rarity}★ · ${PATH_META[c.path].label} · ${ELEMENT_META[c.element].label} · v${c.releaseVersion} · ${c.releaseDate}`;
  }
  if (type === 'lightCone') {
    const lc = entry as LightCone;
    return `${lc.rarity}★ · ${PATH_META[lc.path].label}${lc.acquisition ? ` · ${ACQUISITION_LABEL[lc.acquisition]}` : ''}${lc.releaseVersion ? ` · v${lc.releaseVersion}` : ''}`;
  }
  if (type === 'relic') {
    const r = entry as RelicSet;
    return `${RELIC_CATEGORY_META[r.category].label} · ${r.rarity}★${r.releaseVersion ? ` · v${r.releaseVersion}` : ''}`;
  }
  const event = entry as NewsEvent;
  return `${NEWS_TYPE_META[event.type].label} · ${event.date}${event.endDate ? ` 至 ${event.endDate}` : ''}`;
}

const inputClass =
  'w-full border border-space-600/60 bg-space-850/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none';

export function AdminPage() {
  const characters = useCharacters();
  const lightCones = useLightCones();
  const newsEvents = useNewsEvents();
  const relics = useRelics();

  const [entryType, setEntryType] = useState<EntryType>('character');
  const [form, setForm] = useState<FormState>(() => emptyForm('character'));
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 条目列表的关键词过滤 */
  const [listQuery, setListQuery] = useState('');
  /** 最近一次保存 / 删除的成功提示（数秒后自动消失） */
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const fields = fieldsFor(entryType);
  const entries: (Character | LightCone | NewsEvent | RelicSet)[] =
    entryType === 'character'
      ? characters
      : entryType === 'lightCone'
        ? lightCones
        : entryType === 'relic'
          ? relics
          : newsEvents;
  const listKeyword = listQuery.trim().toLowerCase();
  const visibleEntries = listKeyword
    ? entries.filter((entry) =>
        `${entryLabel(entry)} ${entry.id}`.toLowerCase().includes(listKeyword),
      )
    : entries;

  const setField = (name: string, value: string) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const switchType = (type: EntryType) => {
    setEntryType(type);
    setForm(emptyForm(type));
    setEditingId(null);
    setListQuery('');
  };

  const startEdit = (entry: Character | LightCone | NewsEvent | RelicSet) => {
    setForm(entryToForm(entryType, entry));
    setEditingId(entry.id);
  };

  const cancelEdit = () => {
    setForm(emptyForm(entryType));
    setEditingId(null);
  };

  const save = async () => {
    // 字段级 / 跨字段 / 关联存在性校验（纯逻辑见 lib/entryValidation.ts）
    const error =
      validateEntryFields(fields, form) ??
      (entryType === 'newsEvent'
        ? validateDateRange(form.date, form.endDate) ??
          validateRelatedIds(
            form,
            new Set(characters.map((c) => c.id)),
            new Set(lightCones.map((lc) => lc.id)),
          )
        : null);
    if (error) {
      alert(error);
      return;
    }
    const entry = buildEntry(entryType, form);
    try {
      if (!editingId) {
        // 新增时若 id 已存在，提示覆盖
        const table =
          entryType === 'character'
            ? db.characters
            : entryType === 'lightCone'
              ? db.lightCones
              : entryType === 'relic'
                ? db.relics
                : db.newsEvents;
        if (await table.get(entry.id)) {
          if (!window.confirm(`ID「${entry.id}」已存在，保存将覆盖现有条目，是否继续？`)) {
            return;
          }
        }
      }
      if (entryType === 'character') await db.characters.put(entry as Character);
      else if (entryType === 'lightCone') await db.lightCones.put(entry as LightCone);
      else if (entryType === 'relic') await db.relics.put(entry as RelicSet);
      else await db.newsEvents.put(entry as NewsEvent);
      cancelEdit();
      showNotice(`已保存「${entryLabel(entry)}」`);
    } catch (error) {
      alert(`保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`确认删除「${label}」（${id}）？此操作不可撤销。`)) return;
    try {
      await db.transaction(
        'rw',
        [db.characters, db.lightCones, db.newsEvents, db.relics],
        async () => {
          if (entryType === 'character') {
            await db.characters.delete(id);
            // 同步清除资讯事件中的悬挂关联，避免日历条目跳转到不存在的详情页
            const linked = await db.newsEvents
              .filter((event) => event.relatedCharacterId === id)
              .toArray();
            if (linked.length) {
              await db.newsEvents.bulkPut(
                linked.map(({ relatedCharacterId: _removed, ...rest }) => rest as NewsEvent),
              );
            }
          } else if (entryType === 'lightCone') {
            await db.lightCones.delete(id);
            const linked = await db.newsEvents
              .filter((event) => event.relatedLightConeId === id)
              .toArray();
            if (linked.length) {
              await db.newsEvents.bulkPut(
                linked.map(({ relatedLightConeId: _removed, ...rest }) => rest as NewsEvent),
              );
            }
          } else if (entryType === 'relic') {
            // 遗器无跨表关联，直接删除
            await db.relics.delete(id);
          } else {
            await db.newsEvents.delete(id);
          }
        },
      );
      showNotice(
        `已删除「${label}」${
          entryType !== 'newsEvent' ? '，相关资讯事件的关联已同步清除' : ''
        }`,
      );
      if (editingId === id) cancelEdit();
    } catch (error) {
      alert(`删除失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const optionsFor = (field: FieldDef): { value: string; label: string }[] => {
    if (field.name === 'relatedCharacterId') {
      return characters.map((c) => ({ value: c.id, label: c.name }));
    }
    if (field.name === 'relatedLightConeId') {
      return lightCones.map((lc) => ({ value: lc.id, label: lc.name }));
    }
    return field.options ?? [];
  };

  /** 本地图片读为 data URL 直接存入记录（IndexedDB 无容量瓶颈；限制 1MB 防止数据膨胀） */
  const readImage = (file: File, fieldName: string) => {
    if (file.size > 1024 * 1024) {
      alert('图片超过 1MB，请压缩后再上传（图片会以 data URL 形式存入本地数据库）。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setField(fieldName, reader.result);
    };
    reader.onerror = () => alert('图片读取失败，请重试。');
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader
        en="Data Manager"
        title="数据管理"
        description="在应用内直接维护角色、光锥与资讯事件数据，保存后所有页面实时更新。录入数据会立即写入浏览器 IndexedDB，建议定期在页脚导出备份。"
      />

      {/* 类型切换 */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ENTRY_TYPES.map((type) => {
          const count =
            type.value === 'character'
              ? characters.length
              : type.value === 'lightCone'
                ? lightCones.length
                : type.value === 'relic'
                  ? relics.length
                  : newsEvents.length;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => switchType(type.value)}
              className={`chamfer-xs border px-3 py-1.5 text-sm transition ${
                entryType === type.value
                  ? 'border-gold-500 bg-gold-500/12 text-gold-300'
                  : 'border-space-600/60 text-slate-400 hover:border-gold-500/50 hover:text-gold-300'
              }`}
            >
              {type.label}
              <span className="ml-1.5 font-display text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* 表单 */}
        <Panel className="p-5 md:p-6" ticks>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingId ? '编辑条目' : '新增条目'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-gold-300 transition hover:text-gold-400"
              >
                取消编辑，新增其它条目
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {notice && (
              <p
                role="status"
                className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 sm:col-span-2"
              >
                {notice}
              </p>
            )}
            {fields.map((field) => {
              const isWide = field.kind === 'textarea' || field.kind === 'image';
              return (
                <label
                  key={field.name}
                  className={`block text-xs text-slate-400 ${isWide ? 'sm:col-span-2' : ''}`}
                >
                  <span>
                    {field.label}
                    {field.required && <span className="ml-1 text-gold-400">*</span>}
                  </span>
                  {field.kind === 'choice' ? (
                    <select
                      value={form[field.name] ?? ''}
                      disabled={field.lockOnEdit && Boolean(editingId)}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className={`${inputClass} mt-1 disabled:opacity-60`}
                    >
                      {field.optional && <option value="">未填写</option>}
                      {optionsFor(field).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.kind === 'date' ? (
                    <input
                      type="date"
                      value={form[field.name] ?? ''}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className={`${inputClass} mt-1`}
                    />
                  ) : field.kind === 'image' ? (
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        value={form[field.name] ?? ''}
                        placeholder="图片 URL，或点击右侧上传"
                        onChange={(e) => setField(field.name, e.target.value)}
                        className={inputClass}
                      />
                      <label className="shrink-0 cursor-pointer border border-space-600/60 px-2.5 py-2 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-300">
                        上传
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) readImage(file, field.name);
                          }}
                        />
                      </label>
                      {form[field.name] && (
                        <img
                          src={form[field.name]}
                          alt="预览"
                          className="size-9 shrink-0 border border-space-600/60 object-cover"
                        />
                      )}
                    </div>
                  ) : field.kind === 'textarea' ? (
                    <textarea
                      value={form[field.name] ?? ''}
                      rows={4}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className={`${inputClass} mt-1 leading-relaxed`}
                    />
                  ) : (
                    <input
                      value={form[field.name] ?? ''}
                      disabled={field.lockOnEdit && Boolean(editingId)}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className={`${inputClass} mt-1 disabled:opacity-60`}
                    />
                  )}
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              className="chamfer-xs bg-gold-500 px-4 py-2 text-sm font-semibold text-space-950 transition hover:bg-gold-400"
            >
              {editingId ? '保存修改' : '新增条目'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="chamfer-xs border border-space-600/60 px-4 py-2 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-300"
            >
              重置
            </button>
          </div>
        </Panel>

        {/* 条目列表 */}
        <Panel className="p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {ENTRY_TYPES.find((type) => type.value === entryType)?.label}列表
            <span className="ml-2 font-display text-xs text-slate-500">
              {listQuery.trim()
                ? `${visibleEntries.length}/${entries.length} 项`
                : `${entries.length} 项`}
            </span>
          </h2>

          <input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="搜索 ID / 名称…"
            aria-label="搜索条目"
            className={`${inputClass} mt-3`}
          />

          {entries.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="暂无数据"
              hint="通过左侧表单新增条目，或使用页脚「导入数据」恢复备份。"
            />
          ) : visibleEntries.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              没有匹配的条目，试试其它关键词。
            </p>
          ) : (
            <ul className="mt-3 max-h-[440px] space-y-2 overflow-y-auto pr-1">
              {visibleEntries.map((entry) => (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 border px-3 py-2 text-sm transition ${
                    editingId === entry.id
                      ? 'border-gold-500/60 bg-gold-500/5'
                      : 'border-space-700/60 bg-space-850/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-slate-200">{entryLabel(entry)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.id} · {entrySummary(entryType, entry)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="shrink-0 text-xs text-gold-300 transition hover:text-gold-400"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(entry.id, entryLabel(entry))}
                    className="shrink-0 text-xs text-slate-500 transition hover:text-red-400"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
