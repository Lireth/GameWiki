import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { Character, LightCone, RelicSet } from '../../db/types';
import {
  useAllVersions,
  useCharacters,
  useLightCones,
  useRelics,
} from '../../hooks/useWikiData';
import {
  characterLink,
  lightConeLink,
  relicLink,
  versionLink,
} from '../../lib/links';
import {
  ELEMENT_META,
  PATH_META,
  RELIC_CATEGORY_META,
} from '../../lib/meta';
import { CloseIcon, SearchIcon } from '../icons';

/** 打开命令面板的自定义事件（导航栏按钮触发，避免跨组件传状态） */
export const OPEN_COMMAND_PALETTE_EVENT = 'open-command-palette';

const MAX_RESULTS = 12;

interface CommandItem {
  /** 稳定 React key（前缀避免角色 / 光锥 / 遗器 id 冲突） */
  key: string;
  label: string;
  /** 分类 / 属性摘要（列表项次行） */
  hint: string;
  to: string;
  /** 参与匹配的全文（名称 + 别名 + id），预先拼接避免每键入一次重算 */
  searchText: string;
}

function characterItems(characters: Character[]): CommandItem[] {
  return characters.map((c) => ({
    key: `c:${c.id}`,
    label: c.name,
    hint: `角色 · ${PATH_META[c.path].label} · ${ELEMENT_META[c.element].label}`,
    to: characterLink(c.id),
    searchText: [c.name, c.id, ...(c.aliases ?? [])].join(' ').toLowerCase(),
  }));
}

function lightConeItems(lightCones: LightCone[]): CommandItem[] {
  return lightCones.map((lc) => ({
    key: `lc:${lc.id}`,
    label: lc.name,
    hint: `光锥 · ${lc.rarity}★ · ${PATH_META[lc.path].label}`,
    to: lightConeLink(lc.id),
    searchText: [lc.name, lc.id, ...(lc.aliases ?? [])].join(' ').toLowerCase(),
  }));
}

function relicItems(relics: RelicSet[]): CommandItem[] {
  return relics.map((r) => ({
    key: `r:${r.id}`,
    label: r.name,
    hint: `遗器 · ${r.rarity}★ · ${RELIC_CATEGORY_META[r.category].label}`,
    to: relicLink(r.id),
    searchText: [r.name, r.id, ...(r.aliases ?? [])].join(' ').toLowerCase(),
  }));
}

/**
 * 版本条目来自数据中实际出现的版本（与版本索引 / 详情页同源，见 useAllVersions），
 * 数据新增版本后无需改动元数据即可直达。
 */
function versionItems(versions: readonly string[]): CommandItem[] {
  return versions.map((version) => ({
    key: `v:${version}`,
    label: `版本 ${version}`,
    hint: '版本详情',
    to: versionLink(version),
    searchText: `版本 ${version} v${version} ${version.split('.')[0]}`.toLowerCase(),
  }));
}

/**
 * 全局快速搜索（Ctrl+K / ⌘K）：聚合角色 / 光锥 / 遗器 / 版本，
 * 键盘上下选择、Enter 直达详情页。数据全部来自本地 IndexedDB，
 * 复用各实体 hooks（useLiveQuery）与 links.ts 导航单一真相。
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const characters = useCharacters();
  const lightCones = useLightCones();
  const relics = useRelics();
  const allVersions = useAllVersions();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(
    () => [
      ...characterItems(characters),
      ...lightConeItems(lightCones),
      ...relicItems(relics),
      ...versionItems(allVersions),
    ],
    [characters, lightCones, relics, allVersions],
  );

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return allItems
      .filter((item) => item.searchText.includes(keyword))
      .slice(0, MAX_RESULTS);
  }, [allItems, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  // 全局快捷键：Ctrl+K / ⌘K 切换面板
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 导航栏按钮触发打开
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () =>
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
  }, []);

  // 打开时聚焦输入框（配合 autoFocus 覆盖重复打开场景）
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const goto = (to: string) => {
    close();
    navigate(to);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      goto(results[activeIndex].to);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-space-950/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="chamfer-xs w-full max-w-xl border border-space-600/60 bg-space-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-space-600/40 px-4 py-3">
          <SearchIcon className="size-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="搜索角色 / 光锥 / 遗器 / 版本…"
            aria-label="搜索关键词"
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="关闭搜索"
            className="shrink-0 text-slate-500 transition hover:text-slate-300"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        {query.trim() === '' ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">
            输入关键词搜索全站条目（支持别名 / 英文名 / ID）
          </p>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">
            没有匹配的条目
          </p>
        ) : (
          <ul className="max-h-[46vh] overflow-y-auto py-1.5" role="listbox">
            {results.map((item, index) => (
              <li key={item.key} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goto(item.to)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition ${
                    index === activeIndex
                      ? 'bg-gold-500/12 text-gold-300'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {item.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 border-t border-space-600/40 px-4 py-2 text-[10px] text-slate-600">
          <span>↑↓ 选择</span>
          <span>Enter 跳转</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
