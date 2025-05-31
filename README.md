# cencode

## Quick howto

```
const { cencode, decencode } = require('cencode')

const serialized = cencode(ANYTHING)

const deserializez = decencode(serializez)
```

## Extend

It's possible to enable custom object serialization by using plugins.

Let's see how to add a plugin to serialize/deserialize Urls

```
const { cencode, pluginsEncode, decencode, pluginsDecode } = require('./')

pluginsEncode.push({ name: 'URL', match: x => x instanceof URL, values: x => [x.toString()] })
pluginsDecode.URL = x => new URL(x)
const serialized = cencode(['foo', 12, new URL('https://example.com')])
// -> '_JfooxC)JURLhKhttps://example.com/'

```

## Sign / verify

The `sign` and `verify` function accepts as its second parameter a callback function to add a signature and verify it.

```
const { sign, verify } = require('./')
const kissmyhash = require('kissmyhash')

const signit = (data) => kissmyhash([data, 'SALT'])
const verifyit = (signature, data) => kissmyhash(data, 'SALT') === signature ? data : false

const signed = sign(['foo', { bar: 42 }], signit)

const original = verify(signed, verifyit)
// -> ['foo', { bar: 42 }]
```

# cencode
