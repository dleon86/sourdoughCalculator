// Small validation helpers. Each returns the cleaned value or records an
// error message under the field name, so a route can report every problem
// at once instead of failing on the first.

export class Validator {
  constructor(body) {
    this.body = body ?? {};
    this.errors = {};
  }

  fail(field, message) {
    this.errors[field] = message;
    return undefined;
  }

  text(field, { required = false, max = 2000 } = {}) {
    const value = this.body[field];
    if (value == null || value === '') {
      return required ? this.fail(field, 'Required') : '';
    }
    if (typeof value !== 'string') return this.fail(field, 'Must be text');
    const trimmed = value.trim();
    if (required && !trimmed) return this.fail(field, 'Required');
    if (trimmed.length > max) return this.fail(field, `Keep it under ${max} characters`);
    return trimmed;
  }

  number(field, { required = false, min = -Infinity, max = Infinity, integer = false } = {}) {
    const value = this.body[field];
    if (value == null || value === '') {
      return required ? this.fail(field, 'Required') : null;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return this.fail(field, 'Must be a number');
    if (integer && !Number.isInteger(n)) return this.fail(field, 'Must be a whole number');
    if (n < min) return this.fail(field, `Must be at least ${min}`);
    if (n > max) return this.fail(field, `Must be at most ${max}`);
    return n;
  }

  date(field) {
    const value = this.body[field];
    if (value == null || value === '') return this.fail(field, 'Required');
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return this.fail(field, 'Use YYYY-MM-DD');
    }
    return value;
  }

  flours(field) {
    const value = this.body[field];
    if (!Array.isArray(value) || value.length === 0) return this.fail(field, 'Add at least one flour');
    const cleaned = [];
    for (const flour of value) {
      const name = typeof flour?.name === 'string' ? flour.name.trim() : '';
      const pct = Number(flour?.pct);
      if (!name || !Number.isFinite(pct) || pct < 0) {
        return this.fail(field, 'Each flour needs a name and a percentage of 0 or more');
      }
      cleaned.push({ name, pct });
    }
    return cleaned;
  }

  get ok() {
    return Object.keys(this.errors).length === 0;
  }
}

export function badRequest(res, errors) {
  return res.status(400).json({ error: 'Some fields need fixing', fields: errors });
}
