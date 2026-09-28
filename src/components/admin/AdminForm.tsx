import type { FieldDef } from '../../pages/admin/schema';
import type { FormState } from '../../pages/admin/schema';
import { useEntityImage } from '../../hooks/useEntityImage';
import { Panel } from '../ui/Panel';

const inputClass =
  'w-full border border-space-600/60 bg-space-850/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-gold-500/60 focus:outline-none';

/** 表单图片预览：URL / idb: 引用统一经 useEntityImage 解析 */
function ImageFieldPreview({ src }: { src: string | undefined }) {
  const resolved = useEntityImage(src);
  if (!resolved) return null;
  return (
    <img
      src={resolved}
      alt="预览"
      className="size-9 shrink-0 border border-space-600/60 object-cover"
    />
  );
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface AdminFormProps {
  fields: FieldDef[];
  form: FormState;
  fieldErrors: Record<string, string>;
  editingId: string | null;
  isDirty: boolean;
  notice: string | null;
  /** 关联实体等动态选项（依赖当前数据）由父级提供 */
  optionsFor: (field: FieldDef) => FieldOption[];
  setField: (name: string, value: string) => void;
  /** 本地图片上传（压缩 + 写 images 表 + 回填 idb: 引用），逻辑在 AdminPage */
  onImageUpload: (file: File, fieldName: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

/** 管理页左侧表单：字段渲染与内联错误展示，保存逻辑在 AdminPage */
export function AdminForm({
  fields,
  form,
  fieldErrors,
  editingId,
  isDirty,
  notice,
  optionsFor,
  setField,
  onImageUpload,
  onSave,
  onCancelEdit,
}: AdminFormProps) {
  return (
    <Panel className="p-5 md:p-6" ticks>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">
          {editingId ? '编辑条目' : '新增条目'}
          {isDirty && (
            <span className="ml-2 border border-gold-500/50 px-1.5 py-0.5 align-middle text-[10px] font-normal text-gold-300">
              未保存
            </span>
          )}
        </h2>
        {editingId && (
          <button
            type="button"
            onClick={onCancelEdit}
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
                        if (file) void onImageUpload(file, field.name);
                      }}
                    />
                  </label>
                  <ImageFieldPreview src={form[field.name]} />
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
              {fieldErrors[field.name] && (
                <span className="mt-1 block text-xs text-red-400">
                  {fieldErrors[field.name]}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          className="chamfer-xs bg-gold-500 px-4 py-2 text-sm font-semibold text-space-950 transition hover:bg-gold-400"
        >
          {editingId ? '保存修改' : '新增条目'}
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="chamfer-xs border border-space-600/60 px-4 py-2 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-300"
        >
          重置
        </button>
      </div>
    </Panel>
  );
}
