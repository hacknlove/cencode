const { cencode, pluginsEncode, sign, decencode, pluginsDecode, verify } = require('./');

function doTests(originals) {
  for (const original of originals) {
    const encoded = cencode(original);
    const decoded = decencode(encoded);

    expect(encoded).not.toEqual(original);
    expect(decoded).toEqual(original);
  }
  return true;
}

describe('cencode', () => {
  it('encode strings', () =>
    expect(
      doTests([
        '',
        'HOLA MUNDO',
        'lore ipsum, noseque, nosecuantos, tralari, tralara'.repeat(80),
        'https://example.com/path?query',
      ])
    ).toBe(true));

  it('encode integers', () => expect(doTests([5, -7, 0, 42, 420, 40000, 1234567890])).toBe(true));

  it('encode floats', () =>
    expect(doTests([0.5, -0.7, 42.42, -14.14, 512.214, -893453.98374987214])).toBe(true));

  it('encodes other numbers', () => expect(doTests([Infinity, -Infinity, NaN])).toBe(true));

  it('encodes booleans, null and undefined', () =>
    expect(doTests([undefined, null, false, true])).toBe(true));

  it('encodes arrays', () =>
    expect(
      doTests(
        [],
        ['hola', 'adios'],
        [1, [2, 2], [[3, [3, 3]]]],
        ['URL', 'https://example.com/path?query']
      )
    ).toBe(true));

  it('encodes objects', () =>
    expect(
      doTests([
        {},
        { hola: 'hola', adios: 'adios' },
        { uno: 1, dos: { dos: 2 }, tres: { tres: { tres: 3 } } },
      ])
    ).toBe(true));

  it('encodes sets', () =>
    expect(
      doTests([
        new Set(),
        new Set(['hola', 'adios']),
        new Set([1, new Set([2, 2]), new Set([new Set([3, new Set([3, 3])])])]),
      ])
    ).toBe(true));

  it('encodes maps', () =>
    expect(
      doTests([
        new Map(),
        new Map([
          ['hola', 'hola'],
          ['adios', 'adios'],
        ]),
        new Map([[new Map(), new Map()]]),
      ])
    ).toBe(true));

  it('encodes buffer', () =>
    expect(doTests([Buffer.from([]), Buffer.from([1, 2, 3, 4, 5, 6])])).toBe(true));

  it('uses plugins', () => {
    expect(pluginsDecode).not.toBeUndefined();
    pluginsEncode.push({
      name: 'URL',
      match: x => x instanceof URL,
      values: x => [x.toString()],
    });
    pluginsDecode.URL = x => new URL(x);

    expect(doTests([new URL('https://example.com/path?query')])).toBe(true);
  });

  it('signs and verifies', () => {
    const original = { foo: ['bar', 42] };
    const signed = sign(original, x => x.length);
    const verification = verify(signed, (signature, data) =>
      data.length === signature ? data : false
    );

    expect(verification).toEqual(original);
  });
});
