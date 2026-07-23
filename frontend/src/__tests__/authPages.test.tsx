import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

describe('authentication pages', () => {
  it('exposes recovery without public demo credentials', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('link',{name:/forgot password/i})).toHaveAttribute('href','/forgot-password');
    expect(screen.queryByText(/quick demo/i)).not.toBeInTheDocument();
  });
  it('provides semantic registration fields and honors accessible track', () => {
    render(<MemoryRouter initialEntries={['/register?track=neurodivergent']}><RegisterPage /></MemoryRouter>);
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('autocomplete','name');
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('maxlength','254');
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('autocomplete','new-password');
    expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
  });
});
