import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CloseIcon, MenuIcon, SearchIcon } from '../icons';
import { OPEN_COMMAND_PALETTE_EVENT } from '../ui/CommandPalette';

const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/characters', label: '角色图鉴', end: false },
  { to: '/light-cones', label: '光锥图鉴', end: false },
  { to: '/relics', label: '遗器图鉴', end: false },
  { to: '/matrix', label: '命途矩阵', end: false },
  { to: '/news', label: '资讯日历', end: false },
  { to: '/versions', label: '版本', end: false },
  { to: '/favorites', label: '收藏', end: false },
];

/** 打开全局搜索面板（事件由 CommandPalette 监听） */
function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

/** 全局搜索入口：桌面端展示快捷键提示，点击或 Ctrl+K 均可打开 */
function SearchTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={openCommandPalette}
        className="flex items-center gap-2 border-l-2 border-transparent py-2.5 pl-3 text-sm text-slate-400 transition hover:text-slate-100"
      >
        <SearchIcon className="size-4" />
        全局搜索
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      title="全局搜索（Ctrl+K）"
      aria-label="全局搜索"
      className="chamfer-xs flex items-center gap-1.5 border border-space-600/60 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-gold-500/50 hover:text-gold-300"
    >
      <SearchIcon className="size-3.5" />
      <span className="hidden lg:inline">搜索</span>
      <kbd className="hidden font-display text-[10px] tracking-wider text-slate-500 lg:inline">
        CTRL·K
      </kbd>
    </button>
  );
}

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 1.5l2.5 8 8 2.5-8 2.5-2.5 8-2.5-8-8-2.5 8-2.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <LogoMark className="size-6 text-gold-400 drop-shadow-[0_0_6px_rgba(233,180,95,0.45)]" />
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-wide text-slate-100">
          星穹铁道资料站
        </span>
        <span className="mt-0.5 font-display text-[10px] tracking-[0.3em] text-gold-500/80">
          HONKAI · STAR RAIL
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-space-600/40 bg-space-950/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
        <Brand />

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `chamfer-xs px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-gold-500/12 text-gold-300'
                      : 'text-slate-400 hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block">
            <SearchTrigger />
          </div>
          <button
            type="button"
            className="border border-space-600/60 p-2 text-slate-300 hover:text-gold-300 md:hidden"
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-space-600/40 bg-space-950/95 px-4 py-3 md:hidden"
          aria-label="移动端导航"
        >
          <div className="flex flex-col">
            <SearchTrigger compact />
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `border-l-2 py-2.5 pl-3 text-sm transition ${
                    isActive
                      ? 'border-gold-500 text-gold-300'
                      : 'border-transparent text-slate-400 hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
