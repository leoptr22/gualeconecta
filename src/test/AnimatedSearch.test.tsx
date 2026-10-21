import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AnimatedSearch } from '../components/AnimatedSearch';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('changes hints and stops animation while focused without changing the search value', () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  render(<AnimatedSearch value="" onChange={onChange} />);
  const input = screen.getByRole('textbox', { name: 'Buscar publicaciones' });
  const initial = input.getAttribute('placeholder');
  act(() => vi.advanceTimersByTime(2700));
  expect(input.getAttribute('placeholder')).not.toBe(initial);
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.focus(input);
  const focused = input.getAttribute('placeholder');
  act(() => vi.advanceTimersByTime(12000));
  expect(input.getAttribute('placeholder')).toBe(focused);
  fireEvent.change(input, { target: { value: 'panadería' } });
  expect(onChange).toHaveBeenCalledWith('panadería');
});

it('uses a static hint with reduced motion', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({ matches:true, addEventListener:vi.fn(), removeEventListener:vi.fn() })));
  render(<AnimatedSearch value="" onChange={vi.fn()} />);
  const input = screen.getByRole('textbox', { name: 'Buscar publicaciones' });
  const initial = input.getAttribute('placeholder');
  act(() => vi.advanceTimersByTime(12000));
  expect(input.getAttribute('placeholder')).toBe(initial);
  expect(vi.getTimerCount()).toBe(0);
});
