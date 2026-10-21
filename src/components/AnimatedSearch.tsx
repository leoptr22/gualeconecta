import { useEffect, useState } from 'react';
import { InputAdornment, TextField, useMediaQuery } from '@mui/material';
import Search from '@mui/icons-material/Search';

const suggestions = ['Buscá una promo cerca…', 'Buscá planes para el finde…', 'Buscá un comercio…', 'Buscá cursos y talleres…'];

/** Search hints stop while typing, focusing, or when reduced motion is requested. */
export function AnimatedSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(suggestions[0]);

  useEffect(() => {
    if (reducedMotion || focused || value) return;
    let index = 0;
    let length = suggestions[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const text = suggestions[index];
      length += deleting ? -1 : 1;
      setHint(text.slice(0, length));
      let delay = deleting ? 32 : 65;
      if (length === 0) {
        index = (index + 1) % suggestions.length;
        deleting = false;
        delay = 250;
      } else if (length === text.length && !deleting) {
        deleting = true;
        delay = 2400;
      }
      timer = setTimeout(tick, delay);
    };
    setHint(suggestions[0]);
    timer = setTimeout(tick, 2400);
    return () => clearTimeout(timer);
  }, [reducedMotion, focused, value]);

  return <TextField
    className="animated-search"
    placeholder={focused || reducedMotion ? 'Buscá un comercio, evento o promo…' : hint}
    value={value}
    onChange={event => onChange(event.target.value)}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    fullWidth
    slotProps={{ htmlInput: { 'aria-label': 'Buscar publicaciones' }, input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
  />;
}
