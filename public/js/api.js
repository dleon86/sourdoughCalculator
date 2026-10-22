// Thin wrapper around fetch. Uses relative URLs, so it always talks to the
// server that served the page (the old app hard-coded the wrong port).

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach the server. Is `npm start` running?', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields);
  return data;
}

const resource = (name) => ({
  list: () => request('GET', `/${name}`),
  get: (id) => request('GET', `/${name}/${id}`),
  create: (body) => request('POST', `/${name}`, body),
  update: (id, body) => request('PUT', `/${name}/${id}`, body),
  remove: (id) => request('DELETE', `/${name}/${id}`),
});

export const recipes = resource('recipes');
export const bakes = resource('bakes');
