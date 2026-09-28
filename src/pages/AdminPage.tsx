import { useEffect, useMemo, useState } from 'react';
import { AdminForm } from '../components/admin/AdminForm';
import { EntryList, type AnyEntry } from '../components/admin/EntryList';
import { HealthCheckPanel } from '../components/admin/HealthCheckPanel';
import { PageHeader } from '../components/ui/PageHeader';
import { confirmDialog, alertDialog } from '../lib/dialog';
import {
  useCharacters,
  useLightCones,
  useNewsEvents,
  useRelics,
} from '../hooks/useWikiData';
import { db } from '../db/db';
import { makeImageKey, compressImageFile } from '../lib/imageRef';
import {
  checkWikiData,
  type HealthIssue,
} from '../lib/healthCheck';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Character, LightCone, NewsEvent, RelicSet } from '../db/types';
import {
  collectEntryFieldErrors,
  collectRelatedIdErrors,
  validateDateRange,
} from '../lib/entryValidation';
import {
  ENTRY_TYPES,
  buildEntry,
  emptyForm,
  entryLabel,
  entryToForm,
  fieldsFor,
  imageKeyOf,
  RELATED_FIELD,
  tableFor,
  type EntryType,
  type FieldDef,
  type FormState,
  type RelatedNames,
} from './admin/schema';

export function AdminPage() {
  useDocumentTitle('数据管理');
  const characters = useCharacters();
  const lightCones = useLightCones();
  const newsEvents = useNewsEvents();
  const relics = useRelics();

  const [entryType, setEntryType] = useState<EntryType>('character');
  const [form, setForm] = useState<FormState>(() => emptyForm('character'));
  /** 表单基线：与 form 不一致即视为有未保存修改 */
  const [baseline, setBaseline] = useState<FormState>(() => emptyForm('character'));
  /** 字段级校验错误（保存时收集，修改对应字段后清除） */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 条目列表的关键词过滤 */
  const [listQuery, setListQuery] = useState('');
  /** 最近一次保存 / 删除的成功提示（数秒后自动消失） */
  const [notice, setNotice] = useState<string | null>(null);
  /** 数据健康检查结果（null = 尚未检查） */
  const [healthIssues, setHealthIssues] = useState<HealthIssue[] | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  );

  // 有未保存修改时拦截页面关闭 / 刷新
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /** 丢弃未保存修改前的确认；确认无效（用户取消）时返回 false */
  const confirmDiscard = async (): Promise<boolean> => {
    if (!isDirty) return true;
    return confirmDialog({
      title: '放弃未保存的修改？',
      message: '当前表单有未保存的修改，确定放弃吗？',
      danger: true,
    });
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const runHealthCheck = async () => {
    const imageIds = new Set((await db.images.toArray()).map((image) => image.id));
    setHealthIssues(
      checkWikiData({ characters, lightCones, relics, newsEvents, imageIds }),
    );
  };

  const fields = fieldsFor(entryType);
  const entries: AnyEntry[] =
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

  /** 关联实体 id → 名称（资讯条目摘要展示用，找不到时回退显示 id） */
  const relatedNames: RelatedNames = useMemo(
    () => ({
      character: new Map(characters.map((c) => [c.id, c.name])),
      lightCone: new Map(lightCones.map((lc) => [lc.id, lc.name])),
      relic: new Map(relics.map((r) => [r.id, r.name])),
    }),
    [characters, lightCones, relics],
  );

  const setField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // 修改字段后清除该字段的内联校验错误
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const switchType = async (type: EntryType) => {
    if (type !== entryType && !(await confirmDiscard())) return;
    const empty = emptyForm(type);
    setEntryType(type);
    setForm(empty);
    setBaseline(empty);
    setEditingId(null);
    setFieldErrors({});
    setListQuery('');
  };

  const startEdit = async (entry: AnyEntry) => {
    if (editingId !== entry.id && !(await confirmDiscard())) return;
    const next = entryToForm(entryType, entry);
    setForm(next);
    setBaseline(next);
    setEditingId(entry.id);
    setFieldErrors({});
  };

  const cancelEdit = () => {
    const empty = emptyForm(entryType);
    setForm(empty);
    setBaseline(empty);
    setEditingId(null);
    setFieldErrors({});
  };

  const save = async () => {
    // 字段级 / 跨字段校验：收集为字段级错误内联展示（纯逻辑见 lib/entryValidation.ts）
    const errors = collectEntryFieldErrors(fields, form);
    if (entryType === 'newsEvent') {
      const rangeError = validateDateRange(form.date, form.endDate);
      if (rangeError) errors.endDate = rangeError;
      Object.assign(
        errors,
        collectRelatedIdErrors(
          form,
          new Set(characters.map((c) => c.id)),
          new Set(lightCones.map((lc) => lc.id)),
          new Set(relics.map((r) => r.id)),
        ),
      );
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    const entry = buildEntry(entryType, form);
    try {
      if (!editingId) {
        // 新增时若 id 已存在，提示覆盖
        if (await tableFor(entryType).get(entry.id)) {
          const confirmed = await confirmDialog({
            title: '覆盖现有条目？',
            message: `ID「${entry.id}」已存在，保存将覆盖现有条目，是否继续？`,
            danger: true,
          });
          if (!confirmed) return;
        }
      }
      if (entryType === 'character') await db.characters.put(entry as Character);
      else if (entryType === 'lightCone') await db.lightCones.put(entry as LightCone);
      else if (entryType === 'relic') await db.relics.put(entry as RelicSet);
      else await db.newsEvents.put(entry as NewsEvent);
      cancelEdit();
      showNotice(`已保存「${entryLabel(entry)}」`);
    } catch (error) {
      void alertDialog(
        `${error instanceof Error ? error.message : String(error)}`,
        '保存失败',
      );
    }
  };

  const remove = async (entry: AnyEntry, label: string) => {
    const id = entry.id;
    const confirmed = await confirmDialog({
      title: '确认删除？',
      message: `确认删除「${label}」（${id}）？此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    });
    if (!confirmed) return;
    const imageKey = imageKeyOf(entryType, entry);
    const relatedField =
      entryType === 'newsEvent' ? null : RELATED_FIELD[entryType];
    try {
      await db.transaction(
        'rw',
        [db.characters, db.lightCones, db.newsEvents, db.relics, db.images],
        async () => {
          await tableFor(entryType).delete(id);
          // 同步清除资讯事件中的悬挂关联，避免日历条目跳转到不存在的详情页
          if (relatedField) {
            const linked = await db.newsEvents
              .filter((event) => event[relatedField] === id)
              .toArray();
            if (linked.length) {
              await db.newsEvents.bulkPut(
                linked.map((event) => {
                  const rest: Record<string, unknown> = { ...event };
                  delete rest[relatedField];
                  return rest as unknown as NewsEvent;
                }),
              );
            }
          }
          if (imageKey) await db.images.delete(imageKey);
        },
      );
      showNotice(
        `已删除「${label}」${
          entryType !== 'newsEvent' ? '，相关资讯事件的关联已同步清除' : ''
        }`,
      );
      if (editingId === id) cancelEdit();
    } catch (error) {
      void alertDialog(
        `${error instanceof Error ? error.message : String(error)}`,
        '删除失败',
      );
    }
  };

  const optionsFor = (field: FieldDef) => {
    if (field.name === 'relatedCharacterId') {
      return characters.map((c) => ({ value: c.id, label: c.name }));
    }
    if (field.name === 'relatedLightConeId') {
      return lightCones.map((lc) => ({ value: lc.id, label: lc.name }));
    }
    if (field.name === 'relatedRelicId') {
      return relics.map((r) => ({ value: r.id, label: r.name }));
    }
    return field.options ?? [];
  };

  /**
   * 本地图片上传：压缩后以 Blob 存入 images 表，字段保存 idb: 引用 ——
   * 业务记录不再内联 1MB 级 data URL，列表页全表读取保持轻量。
   * 上传不会立刻删除被替换的旧图（取消编辑时旧引用仍有效）。
   */
  const readImage = async (file: File, fieldName: string) => {
    try {
      const blob = await compressImageFile(file);
      const key = makeImageKey();
      await db.images.put({ id: key, blob });
      setField(fieldName, `idb:${key}`);
    } catch (error) {
      void alertDialog(
        `${error instanceof Error ? error.message : String(error)}`,
        '图片处理失败',
      );
    }
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
              onClick={() => void switchType(type.value)}
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
        <AdminForm
          fields={fields}
          form={form}
          fieldErrors={fieldErrors}
          editingId={editingId}
          isDirty={isDirty}
          notice={notice}
          optionsFor={optionsFor}
          setField={setField}
          onImageUpload={(file, fieldName) => void readImage(file, fieldName)}
          onSave={() => void save()}
          onCancelEdit={cancelEdit}
        />

        <EntryList
          entryType={entryType}
          entries={entries}
          visibleEntries={visibleEntries}
          editingId={editingId}
          listQuery={listQuery}
          relatedNames={relatedNames}
          onQueryChange={setListQuery}
          onStartEdit={(entry) => void startEdit(entry)}
          onRemove={(entry, label) => void remove(entry, label)}
        />
      </div>

      {/* 健康检查 */}
      <HealthCheckPanel issues={healthIssues} onRun={() => void runHealthCheck()} />
    </div>
  );
}
