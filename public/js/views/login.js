import * as api from '../api.js';
import { h, showFieldErrors } from '../ui.js';

export function loginView(onSignedIn) {
  const form = h('form', {
    class: 'login-form',
    onsubmit: async (e) => {
      e.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        await api.session.login(form.password.value);
        onSignedIn();
      } catch (err) {
        showFieldErrors(form, { password: err.message });
        form.password.select();
      } finally {
        button.disabled = false;
      }
    },
  },
  h('div', { class: 'field' },
    h('label', { for: 'login-password' }, 'Password'),
    h('input', { id: 'login-password', name: 'password', type: 'password', autocomplete: 'current-password', required: true, autofocus: true })),
  h('button', { type: 'submit', class: 'btn' }, 'Sign in'));

  return h('section', { class: 'page login' },
    h('img', { src: 'img/icon-192.png', alt: '', width: 72, height: 72 }),
    h('h1', {}, 'Bread Log'),
    h('p', { class: 'muted' }, 'Sign in once on this device and it stays signed in for six months.'),
    form);
}
