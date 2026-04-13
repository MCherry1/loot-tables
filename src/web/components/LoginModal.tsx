/**
 * LoginModal — password entry overlay for unlocking item descriptions.
 *
 * Intentionally minimal per spec §4.2: a lock icon, a password field,
 * Cancel + Enter. No title copy, no "unlock descriptions" messaging.
 * If you know what it's for, you know; everyone else sees Cancel.
 *
 * Wrong password shakes the input and shows an "Incorrect password"
 * hint. The modal stays open so the user can retry.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/authContext';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus the password field when the modal mounts.
    inputRef.current?.focus();
  }, []);

  // Escape key closes the modal.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (loading || password.length === 0) return;
      setLoading(true);
      setError(false);
      const ok = await login(password);
      setLoading(false);
      if (ok) {
        setPassword('');
        onClose();
      } else {
        setError(true);
        setPassword('');
        // Re-focus so the user can type again immediately.
        inputRef.current?.focus();
      }
    },
    [login, loading, password, onClose],
  );

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Password"
      onClick={onClose}
    >
      <form
        className="auth-modal"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-lock-icon" aria-hidden="true">
          {'\uD83D\uDD12'}
        </div>
        <input
          ref={inputRef}
          type="password"
          className={`auth-password-input${error ? ' error' : ''}`}
          placeholder=""
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(false);
          }}
          autoComplete="current-password"
          spellCheck={false}
          disabled={loading}
        />
        {error && (
          <div className="auth-modal-hint" role="alert">
            Incorrect password
          </div>
        )}
        <div className="auth-modal-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || password.length === 0}
          >
            {loading ? 'Unlocking\u2026' : 'Enter'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginModal;
