export function Footer() {
  return (
    <footer className="border-t border-space-600/40 bg-space-900/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          星穹铁道资料站 · 粉丝学习项目，与 miHoYo / HoYoverse
          无关，游戏相关内容版权归原厂商所有
        </p>
        <p className="font-display tracking-[0.25em]">
          REACT · TAILWIND · DEXIE / INDEXEDDB
        </p>
      </div>
    </footer>
  );
}
