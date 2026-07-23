import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NavigationEffects } from './navigation-effects';

function NavigationFixture() {
  const navigate = useNavigate();
  return (
    <>
      <NavigationEffects />
      <button onClick={() => void navigate('/next')}>Next</button>
      <button onClick={() => void navigate('/next#target')}>Hash</button>
      <main tabIndex={-1}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/next" element={<div id="target">Target</div>} />
        </Routes>
      </main>
    </>
  );
}

describe('NavigationEffects', () => {
  it('scrolls new pathname navigation to the top and focuses main', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <NavigationFixture />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' }),
    );
    expect(document.querySelector('main')).toHaveFocus();
  });

  it('respects a valid hash target without forcing top scroll', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    render(
      <MemoryRouter>
        <NavigationFixture />
      </MemoryRouter>,
    );
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Hash' }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
