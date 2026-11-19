// Helpers shared by the site and dive code, so the same logic isn't written twice

// A MongoDB ObjectId is exactly 24 hex characters
export const isValidId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Query values can be arrays or objects in Express, so only accept plain strings
export const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);

// Escapes characters like . or * so user input is treated as plain text in a regex
export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');