import { afterEach,it,expect } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { CityCarousel } from '../components/CityCarousel';
afterEach(cleanup);
it('cambia la foto mediante controles y teclado, con créditos reales',()=>{render(<CityCarousel/>);expect(screen.getByText('El río, siempre cerca.')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Foto siguiente'}));expect(screen.getByText('Nuestra costanera.')).toBeInTheDocument();fireEvent.keyDown(screen.getByRole('region',{name:'Fotografías de Gualeguaychú'}),{key:'ArrowLeft'});expect(screen.getByText('El río, siempre cerca.')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Foto: Ezarate'})).toHaveAttribute('href',expect.stringContaining('commons.wikimedia.org'));});
