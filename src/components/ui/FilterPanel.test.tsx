/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FacetChip,
  ListSearchBox,
  RarityFacetRow,
  ViewAllRow,
} from './FilterPanel';

afterEach(cleanup);

describe('FacetChip', () => {
  it('渲染激活态、计数与 aria 标记，点击触发回调', () => {
    const onClick = vi.fn();
    render(<FacetChip active count={3} onClick={onClick}>测试</FacetChip>);

    const chip = screen.getByRole('button', { name: /测试/ });
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chip.textContent).toContain('(3)');

    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('非激活时 aria-pressed 为 false', () => {
    render(<FacetChip active={false} count={0} onClick={() => {}}>项</FacetChip>);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('ViewAllRow', () => {
  it('仅收藏过滤生效时，「查看全部」不再显示为激活（此前两者同时高亮）', () => {
    render(
      <ViewAllRow
        allCount={5}
        hasAnyFilter={false}
        clearFilters={() => {}}
        favOnly
        favCount={2}
        onToggleFav={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /查看全部/ }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: /只看收藏/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('未传收藏相关 props 时只渲染「查看全部」', () => {
    render(<ViewAllRow allCount={4} hasAnyFilter clearFilters={() => {}} />);
    expect(screen.getByRole('button', { name: /查看全部/ }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('button', { name: /只看收藏/ })).toBeNull();
  });
});

describe('RarityFacetRow', () => {
  it('stars 形式渲染星形图标组并带 ariaLabel', () => {
    const onToggle = vi.fn();
    render(
      <RarityFacetRow
        rarities={[5, 4]}
        selected={['5']}
        countOf={() => 1}
        onToggle={onToggle}
      />,
    );
    expect(screen.getByRole('button', { name: '5星' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '4星' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '4星' }));
    expect(onToggle).toHaveBeenCalledWith('4');
  });

  it('text 形式渲染「5★」文本', () => {
    render(
      <RarityFacetRow
        rarities={[2, 3]}
        selected={[]}
        countOf={() => 0}
        onToggle={() => {}}
        display="text"
      />,
    );
    expect(screen.getByRole('button', { name: /2★/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /3★/ })).toBeTruthy();
  });
});

describe('ListSearchBox', () => {
  it('输入即时回显，防抖后同步 setQ', () => {
    vi.useFakeTimers();
    try {
      const setQ = vi.fn();
      render(<ListSearchBox q="" setQ={setQ} placeholder="搜索…" />);
      const input = screen.getByPlaceholderText('搜索…') as HTMLInputElement;

      fireEvent.change(input, { target: { value: '希儿' } });
      expect(input.value).toBe('希儿');
      expect(setQ).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);
      expect(setQ).toHaveBeenCalledWith('希儿');
    } finally {
      vi.useRealTimers();
    }
  });
});
