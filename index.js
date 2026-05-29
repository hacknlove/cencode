/*
  heX ([0-9]->[g-p] and last character upperCase)


  integer positive: 'x'heX
  integer negatie: 'X'heX
  float positive: 'q'heXheX -> hex.hex -> dec.dec 
  float negative: 'Q'heXheX -> hex.hex -> dec.dec 
  false: '0'
  true: '1'
  NaN: '2
  -Infinity: '3'
  +Infinity: '4'
  undefined: '5'
  string: (heX with the length)string
  null: '!'
  array: '_'anyanyany'.'
  object: '('stringanystringanystringany'.'
  set: 's'anyanyany'.'
  map: 'S'anyanyanyanyanyany'.'
  date: 'Z'hex (miliseconds)
  bytes: 'v'heX string(base64)
  plugin: ')'anyanyany'.' parameters to be passed to the plugin, after deserialized
*/

const mapHexEncode = {
  0: 'g',
  1: 'h',
  2: 'i',
  3: 'j',
  4: 'k',
  5: 'l',
  6: 'm',
  7: 'n',
  8: 'o',
  9: 'p',
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  e: 'e',
  f: 'f',
  '.': '.',
};
const mapHexDecode = {
  g: 0,
  h: 1,
  i: 2,
  j: 3,
  k: 4,
  l: 5,
  m: 6,
  n: 7,
  o: 8,
  p: 9,
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  e: 'e',
  f: 'f',
};
const integerRegexp = /^([a-p]*[A-P])(.*)$/;
const floatRegexp = /^([g-p]*[G-P])([g-p]*[G-P])(.*)$/;

const UNDEFINED = 'U';
const BOOLEAN_FALSE = '0';
const BOOLEAN_TRUE = '1';
const ARRAY = 'V';
const NULL = 'u';
const BUFFER = 'R';
const DATE = 'Z';
const FLOAT_NEGATIVE = 't';
const FLOAT_POSITIVE = 'T';
const INFINITY = 'y';
const NEGATIVE_INFINITY = 'Y';
const INTEGER_NEGATIVE = 'x';
const INTEGER_POSITIVE = 'X';
const SET = 's';
const MAP = 'S';
const OBJECT = 'v';
const PLUGIN = 'z';

const END_SEPARATOR = '.';
const NAN = 'n';

const pluginsEncode = [];
const pluginsDecode = {};

function encode(x) {
  switch (typeof x) {
    case 'string':
      return encodeString(x);
    case 'number':
      return encodeNumber(x);
    case 'boolean':
      return encodeBoolean(x);
    case 'undefined':
      return encodeUndefined(x);
    case 'object':
      return encodeObject(x);
    case 'function':
      throw new Error('functions cannot be encoded');
  }
}

function encodeString(x) {
  return encodeInteger(x.length) + x;
}
function encodeNumber(x) {
  if (Number.isInteger(x)) {
    return (x < 0 ? INTEGER_NEGATIVE : INTEGER_POSITIVE) + encodeInteger(x);
  }
  if (Number.isFinite(x)) {
    return (x < 0 ? FLOAT_NEGATIVE : FLOAT_POSITIVE) + encodeFloat(x);
  }
  if (Number.isNaN(x)) {
    return NAN;
  }
  return x < 0
    ? NEGATIVE_INFINITY // -Infinity
    : INFINITY; // +Infinity
}

function encodeBoolean(x) {
  return x ? BOOLEAN_TRUE : BOOLEAN_FALSE;
}

function encodeUndefined() {
  return UNDEFINED;
}

function encodeObject(x) {
  if (Array.isArray(x)) {
    return ARRAY + x.map(encode).join('') + END_SEPARATOR;
  }

  if (x === null) {
    return NULL;
  }

  if (x instanceof Set) {
    return SET + Array.from(x).map(encode).join('') + END_SEPARATOR;
  }

  if (x instanceof Map) {
    return MAP + Array.from(x.entries()).map(encodeKeyValue).join('') + END_SEPARATOR;
  }

  if (x instanceof Date) {
    return DATE + encodeInteger(x.getTime());
  }

  if (x instanceof Uint8Array) {
    return BUFFER + encodeString(bytesToBase64Url(x));
  }

  const plugin = x.__urlize || pluginsEncode.find(plugin => plugin.match(x));

  if (plugin) {
    return PLUGIN + [plugin.name, ...plugin.values(x)].map(encode).join('') + END_SEPARATOR;
  }

  return OBJECT + Object.entries(x).map(encodeKeyValue).join('') + END_SEPARATOR;
}

function encodeInteger(x) {
  const hex = Array.from(x.toString(16));
  const last = hex.length - 1;
  return Array.from(hex)
    .map((x, i) => (i === last ? mapHexEncode[x].toUpperCase() : mapHexEncode[x]))
    .join('');
}

function encodeFloat(x) {
  return Array.from(x.toString(10))
    .map(c => mapHexEncode[c])
    .join('')
    .replace(/(.)\./, (total, s) => s.toUpperCase())
    .replace(/.$/, s => s.toUpperCase());
}
function encodeKeyValue([x, y]) {
  return encode(x) + encode(y);
}

function decode(x) {
  const type = x[0];

  switch (type) {
    case BOOLEAN_FALSE:
      return [false, x.substr(1)];
    case BOOLEAN_TRUE:
      return [true, x.substr(1)];
    case NAN:
      return [NaN, x.substr(1)];
    case NEGATIVE_INFINITY:
      return [-Infinity, x.substr(1)];
    case INFINITY:
      return [Infinity, x.substr(1)];
    case UNDEFINED:
      return [undefined, x.substr(1)];
    case NULL:
      return [null, x.substr(1)];
    case INTEGER_POSITIVE:
      return decodeInteger(x.substr(1));
    case INTEGER_NEGATIVE:
      return decodeInteger(x.substr(1), true);
    case FLOAT_POSITIVE:
      return decodeFloat(x.substr(1));
    case FLOAT_NEGATIVE:
      return decodeFloat(x.substr(1), true);
    case OBJECT:
      return decodeObject(x.substr(1));
    case ARRAY:
      return decodeArray(x.substr(1));
    case SET:
      return decodeSet(x.substr(1));
    case MAP:
      return decodeMap(x.substr(1));
    case DATE:
      return decodeDate(x.substr(1));
    case BUFFER:
      return decodeBuffer(x.substr(1));
    case PLUGIN:
      return decodePlugin(x.substr(1));
  }
  if (mapHexDecode[x[0].toLowerCase()] !== undefined) {
    return decodeString(x);
  }
  throw new Error(`Unknown type: ${x.substr(10)}...`);
}

function decodeInteger(x, isNegative) {
  const parsed = x.match(integerRegexp);
  if (!parsed) {
    throw new Error(`Wrong integer at ${x.substr(0, 10)}...`);
  }

  return [
    parseInt(
      (isNegative ? '-' : '') +
        Array.from(parsed[1].toLowerCase())
          .map(x => mapHexDecode[x])
          .join(''),
      16
    ),
    parsed[2],
  ];
}

function decodeFloat(x, isNegative) {
  const parse = x.match(floatRegexp);
  if (!parse) {
    throw new Error(`Wrong float at ${x.substr(0, 10)}...`);
  }

  return [
    parseFloat(
      (isNegative ? '-' : '') +
        Array.from(parse[1].toLowerCase())
          .map(x => mapHexDecode[x])
          .join('') +
        '.' +
        Array.from(parse[2].toLowerCase())
          .map(x => mapHexDecode[x])
          .join('')
    ),
    parse[3],
  ];
}

function decodeObject(x) {
  const object = {};
  let items = x;
  for (; items[0] && items[0] !== END_SEPARATOR; ) {
    const [key, rest1] = decodeString(items);
    const [value, rest2] = decode(rest1);

    object[key] = value;

    items = rest2;
  }
  return [object, items.substr(1)];
}

function decodeArray(x) {
  const array = [];
  let items = x;
  for (; items[0] && items[0] !== END_SEPARATOR; ) {
    const [value, rest1] = decode(items);
    array.push(value);
    items = rest1;
  }
  return [array, items.substr(1)];
}

function decodeSet(x) {
  const set = new Set();
  let items = x;
  for (; items[0] && items[0] !== END_SEPARATOR; ) {
    const [value, rest1] = decode(items);
    set.add(value);
    items = rest1;
  }
  return [set, items.substr(1)];
}

function decodeMap(x) {
  const map = new Map();
  let items = x;
  for (; items[0] && items[0] !== END_SEPARATOR; ) {
    const [key, rest1] = decode(items);
    const [value, rest2] = decode(rest1);
    map.set(key, value);
    items = rest2;
  }
  return [map, items.substr(1)];
}

function decodeDate(x) {
  const [integer, rest] = decodeInteger(x);
  return [new Date(integer), rest];
}

function decodeString(x) {
  const [length, rest] = decodeInteger(x);
  return [rest.substr(0, length), rest.substr(length)];
}

function decodePlugin(x) {
  const [name, rest1] = decodeString(x);
  const plugin = pluginsDecode[name];

  if (!plugin) {
    throw new Error(`Missing plugin ${name}`);
  }

  const [params, rest2] = decodeArray(rest1);

  return [plugin(...params), rest2];
}

function decodeBuffer(x) {
  const [base64url, rest] = decodeString(x);

  return [base64UrlToBytes(base64url), rest];
}

function bytesToBase64Url(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(base64url) {
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64url, 'base64url'));
  }

  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function main(x) {
  const [value, rest] = decode(x);

  if (rest) {
    throw new Error(`Extra characters ${x.substr(0, 10)}...`);
  }
  return value;
}

exports.decencode = main;
exports.cencode = x => encode(x).replace(/\.*$/, '');
exports.sign = function sign(x, signing) {
  const serialized = encode(x).replace(/\.+$/, '');
  const signature = signing(serialized);

  if (!signature.then) {
    return encode(signature) + serialized;
  }
  return signature.then(signature => encode(signature) + serialized);
};
exports.verify = function verify(x, cb) {
  const [signature, serializedData] = decode(x);
  const verification = cb(signature, serializedData);

  if (!verification) {
    throw new Error('Invalid signature');
  }

  if (verification instanceof Promise) {
    return verification.then(v => {
      if (!v) {
        throw new Error('Invalid signature');
      }
      return main(serializedData);
    });
  }

  return main(serializedData);
};

exports.pluginsEncode = pluginsEncode;
exports.pluginsDecode = pluginsDecode;
