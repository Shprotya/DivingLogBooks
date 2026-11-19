import { isValidId, asString, escapeRegex } from '../../src/utils/request_helpers';

// Unit tests: these check single functions on their own, with no database or HTTP requests

describe('isValidId', () => {
    it('accepts a 24-character hex id', () => {
        expect(isValidId('6aca99d3625ea0ef88f87fb4')).toBe(true);
    });

    it('rejects ids that are too short, too long or not hex', () => {
        expect(isValidId('abc')).toBe(false);
        expect(isValidId('6aca99d3625ea0ef88f87fb4a')).toBe(false);
        expect(isValidId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
    });
});

describe('asString', () => {
    it('returns plain strings unchanged', () => {
        expect(asString('wreck')).toBe('wreck');
    });

    it('returns undefined for anything that is not a string', () => {
        expect(asString(['wreck', 'reef'])).toBeUndefined();
        expect(asString({ $gt: '' })).toBeUndefined();
        expect(asString(undefined)).toBeUndefined();
    });
});

describe('escapeRegex', () => {
    it('leaves normal text unchanged', () => {
        expect(escapeRegex('grey seal')).toBe('grey seal');
    });

    it('escapes special regex characters', () => {
        expect(escapeRegex('.*')).toBe('\\.\\*');
        expect(escapeRegex('(')).toBe('\\(');
    });

    it('makes the pattern match the text literally', () => {
        const pattern = new RegExp(escapeRegex('.*'));
        expect(pattern.test('.*')).toBe(true);
        expect(pattern.test('anything')).toBe(false);
    });
});