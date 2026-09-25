import { Link } from 'react-router-dom';
import { SparkIcon } from '../components/icons';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <SparkIcon className="size-10 text-gold-500" />
      <h1 className="mt-5 font-display text-5xl font-bold text-slate-100">404</h1>
      <p className="mt-3 text-sm text-slate-400">
        此页面尚未在星图上标记，请返回首页重新导航。
      </p>
      <Link
        to="/"
        className="chamfer-sm mt-8 bg-gold-500 px-5 py-2.5 text-sm font-semibold text-space-950 transition hover:bg-gold-400"
      >
        返回首页
      </Link>
    </div>
  );
}
