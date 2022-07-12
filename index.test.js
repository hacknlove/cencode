const { cencode, pluginsEncode, sign, decencode, pluginsDecode, verify } = require('./')

function doTests (originals) {
  for (const original of originals) {
    const encoded = cencode(original)
    const decoded = decencode(encoded)

    expect(encoded).not.toEqual(original)
    expect(decoded).toEqual(original)
  }
}

describe('cencode', () => {
  it('encode strings', () => {
    doTests(['', 'HOLA MUNDO', 'lore ipsum, noseque, nosecuantos, tralari, tralara'.repeat(80), 'https://example.com/path?query'])
  })

  it('encode integers', () => {
    doTests([5, -7, 0, 42, 420, 40000, 1234567890])
  })

  it('encode floats', () => {
    doTests([0.5, -0.7, 42.42, -14.14, 512.214, -893453.98374987214])
  })

  it('encodes other numbers', () => {
    doTests([Infinity, -Infinity, NaN])
  })

  it('encodes booleans, null and undefined', () => {
    doTests([undefined, null, false, true])
  })
 
  it('encodes arrays', () => {
    doTests([[], ['hola', 'adios'], [1, [2, 2], [[3, [3, 3]]]], ['URL', 'https://example.com/path?query']])
  })

  it('encodes objects', () => {
    doTests([{}, {hola: 'hola', adios: 'adios'}, {uno: 1, dos: { dos: 2 }, tres: { tres: { tres: 3 } } } ])
  })

  it('encodes sets', () => {
    doTests([ new Set(), new Set(['hola', 'adios']), new Set([1, new Set([2, 2]), new Set([ new Set([3, new Set([3, 3]) ]) ]) ]) ])
  })

  it('encodes maps', () => {
    doTests([
      new Map(),
      new Map([['hola', 'hola'], ['adios', 'adios']]),
      new Map([[new Map(), new Map()]])
    ])
  })

  it('encodes buffer', () => {
    doTests([
      Buffer.from([]),
      Buffer.from([1,2,3,4,5,6])
    ])
  })

  it('uses plugins', () => {
    expect(pluginsDecode).not.toBeUndefined()
    pluginsEncode.push({
      name: 'URL',
      match: x => x instanceof URL,
      values: x => [x.toString()]
    })
    pluginsDecode.URL = x => new URL(x)

    doTests([new URL('https://example.com/path?query')])
  })

  it('signs and verifies', () => {
    const original = { foo: ['bar', 42] }
    const signed = sign(original, x => x.length)
    const verification = verify(signed, (signature, data) => data.length === signature ? data : false)

    expect(verification).toEqual(original)
  })
})