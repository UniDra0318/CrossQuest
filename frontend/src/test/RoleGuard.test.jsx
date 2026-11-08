import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RoleGuard } from '../App';
import * as AuthContext from '../contexts/AuthContext';

describe('RoleGuard Component', () => {
  it('redirects unauthenticated users to /login', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ currentUser: null });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route 
            path="/admin" 
            element={
              <RoleGuard roles={['admin']}>
                <div>Protected Admin Content</div>
              </RoleGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('redirects unauthorized role to their canonical role home', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      currentUser: { role: 'trainee', name: 'Rafael Dizon' } 
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/home" element={<div>Trainee Home Page</div>} />
          <Route 
            path="/admin" 
            element={
              <RoleGuard roles={['admin']}>
                <div>Protected Admin Content</div>
              </RoleGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Trainee Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
  });

  it('renders protected children when role is authorized', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ 
      currentUser: { role: 'admin', name: 'Master Authority' } 
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route 
            path="/admin" 
            element={
              <RoleGuard roles={['admin']}>
                <div>Protected Admin Content</div>
              </RoleGuard>
            } 
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
  });
});
