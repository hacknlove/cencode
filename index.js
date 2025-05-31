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
  buffer: 'v'heX string(base64)
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
    return (x < 0 ? 'X' : 'x') + encodeInteger(x);
  }
  if (Number.isFinite(x)) {
    return (x < 0 ? 'Q' : 'q') + encodeFloat(x);
  }
  if (Number.isNaN(x)) {
    return '2';
  }
  return x < 0
    ? '3' // -Infinity
    : '4'; // +Infinity
}

function encodeBoolean(x) {
  return x
    ? '1' // true
    : '0'; // false
}

function encodeUndefined() {
  return '5';
}

function encodeObject(x) {
  if (Array.isArray(x)) {
    return '_' + x.map(encode).join('') + '.';
  }

  if (x === null) {
    return '!';
  }

  if (x instanceof Set) {
    return 's' + Array.from(x).map(encode).join('') + '.';
  }

  if (x instanceof Map) {
    return 'S' + Array.from(x.entries()).map(encodeKeyValue).join('') + '.';
  }

  if (x instanceof Date) {
    return 'Z' + encodeInteger(x.getTime());
  }

  if (typeof Buffer !== undefined && x instanceof Buffer) {
    return 'v' + encodeString(x.toString('base64url'));
  }

  const plugin = x.__urlize || pluginsEncode.find(plugin => plugin.match(x));

  if (plugin) {
    return ')' + [plugin.name, ...plugin.values(x)].map(encode).join('') + '.';
  }

  return '(' + Object.entries(x).map(encodeKeyValue).join('') + '.';
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
    case '0':
      return [false, x.substr(1)];
    case '1':
      return [true, x.substr(1)];
    case '2':
      return [NaN, x.substr(1)];
    case '3':
      return [-Infinity, x.substr(1)];
    case '4':
      return [Infinity, x.substr(1)];
    case '5':
      return [undefined, x.substr(1)];
    case '!':
      return [null, x.substr(1)];
    case 'x':
      return decodeInteger(x.substr(1));
    case 'X':
      return decodeInteger(x.substr(1), true);
    case 'q':
      return decodeFloat(x.substr(1));
    case 'Q':
      return decodeFloat(x.substr(1), true);
    case '(':
      return decodeObject(x.substr(1));
    case '_':
      return decodeArray(x.substr(1));
    case 's':
      return decodeSet(x.substr(1));
    case 'S':
      return decodeMap(x.substr(1));
    case 'Z':
      return decodeDate(x.substr(1));
    case 'v':
      if (typeof Buffer !== undefined) {
        return decodeBuffer(x.substr(1));
      }
      throw new Error('Buffer not defined');
    case ')':
      return decodePlugin(x.substr(1));
  }
  if (mapHexDecode[x[0].toLowerCase()] !== undefined) {
    return decodeString(x);
  }
  throw new Error(`Unknown type: ${x.substr(10)}...`);
}

function decodeInteger(x, isNegative) {
  const parsed = x.match(/^([a-p]*[A-P])(.*)/);
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
  const parse = x.match(/^([g-p]*[G-P])([g-p]*[G-P])(.*)/);
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
  for (; items[0] && items[0] !== '.'; ) {
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
  for (; items[0] && items[0] !== '.'; ) {
    const [value, rest1] = decode(items);
    array.push(value);
    items = rest1;
  }
  return [array, items.substr(1)];
}

function decodeSet(x) {
  const set = new Set();
  let items = x;
  for (; items[0] && items[0] !== '.'; ) {
    const [value, rest1] = decode(items);
    set.add(value);
    items = rest1;
  }
  return [set, items.substr(1)];
}

function decodeMap(x) {
  const map = new Map();
  let items = x;
  for (; items[0] && items[0] !== '.'; ) {
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

  return [Buffer.from(base64url, 'base64url'), rest];
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
