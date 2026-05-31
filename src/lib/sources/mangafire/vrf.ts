function atobBytes(data: string) {
  return Buffer.from(data, 'base64');
}

function btoaBytes(data: Uint8Array) {
  return Buffer.from(data).toString('base64');
}

function rc4(key: Uint8Array, input: Uint8Array) {
  const state = Array.from({ length: 256 }, (_, index) => index);
  let j = 0;

  for (let i = 0; i < 256; i += 1) {
    j = (j + state[i] + key[i % key.length]) & 0xff;
    [state[i], state[j]] = [state[j], state[i]];
  }

  const output = new Uint8Array(input.length);
  let i = 0;
  j = 0;
  for (let y = 0; y < input.length; y += 1) {
    i = (i + 1) & 0xff;
    j = (j + state[i]) & 0xff;
    [state[i], state[j]] = [state[j], state[i]];
    const keyByte = state[(state[i] + state[j]) & 0xff];
    output[y] = input[y] ^ keyByte;
  }
  return output;
}

function transform(
  input: Uint8Array,
  seed: Uint8Array,
  prefix: Uint8Array,
  prefixLength: number,
  schedule: Array<(value: number) => number>
) {
  const output: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    if (i < prefixLength) output.push(prefix[i]);
    output.push(schedule[i % 10]((input[i] ^ seed[i % 32]) & 0xff) & 0xff);
  }
  return Uint8Array.from(output);
}

const scheduleC = [
  (c: number) => c - 48 + 256,
  (c: number) => c - 19 + 256,
  (c: number) => c ^ 241,
  (c: number) => c - 19 + 256,
  (c: number) => c + 223,
  (c: number) => c - 19 + 256,
  (c: number) => c - 170 + 256,
  (c: number) => c - 19 + 256,
  (c: number) => c - 48 + 256,
  (c: number) => c ^ 8
];

const scheduleY = [
  (c: number) => (c << 4) | (c >>> 4),
  (c: number) => c + 223,
  (c: number) => (c << 4) | (c >>> 4),
  (c: number) => c ^ 163,
  (c: number) => c - 48 + 256,
  (c: number) => c + 82,
  (c: number) => c + 223,
  (c: number) => c - 48 + 256,
  (c: number) => c ^ 83,
  (c: number) => (c << 4) | (c >>> 4)
];

const scheduleB = [
  (c: number) => c - 19 + 256,
  (c: number) => c + 82,
  (c: number) => c - 48 + 256,
  (c: number) => c - 170 + 256,
  (c: number) => (c << 4) | (c >>> 4),
  (c: number) => c - 48 + 256,
  (c: number) => c - 170 + 256,
  (c: number) => c ^ 8,
  (c: number) => c + 82,
  (c: number) => c ^ 163
];

const scheduleJ = [
  (c: number) => c + 223,
  (c: number) => (c << 4) | (c >>> 4),
  (c: number) => c + 223,
  (c: number) => c ^ 83,
  (c: number) => c - 19 + 256,
  (c: number) => c + 223,
  (c: number) => c - 170 + 256,
  (c: number) => c + 223,
  (c: number) => c - 170 + 256,
  (c: number) => c ^ 83
];

const scheduleE = [
  (c: number) => c + 82,
  (c: number) => c ^ 83,
  (c: number) => c ^ 163,
  (c: number) => c + 82,
  (c: number) => c - 170 + 256,
  (c: number) => c ^ 8,
  (c: number) => c ^ 241,
  (c: number) => c + 82,
  (c: number) => c + 176,
  (c: number) => (c << 4) | (c >>> 4)
];

const rc4Keys = {
  l: 'u8cBwTi1CM4XE3BkwG5Ble3AxWgnhKiXD9Cr279yNW0=',
  g: 't00NOJ/Fl3wZtez1xU6/YvcWDoXzjrDHJLL2r/IWgcY=',
  B: 'S7I+968ZY4Fo3sLVNH/ExCNq7gjuOHjSRgSqh6SsPJc=',
  m: '7D4Q8i8dApRj6UWxXbIBEa1UqvjI+8W0UvPH9talJK8=',
  F: '0JsmfWZA1kwZeWLk5gfV5g41lwLL72wHbam5ZPfnOVE='
};

const seeds32 = {
  A: 'pGjzSCtS4izckNAOhrY5unJnO2E1VbrU+tXRYG24vTo=',
  V: 'dFcKX9Qpu7mt/AD6mb1QF4w+KqHTKmdiqp7penubAKI=',
  N: 'owp1QIY/kBiRWrRn9TLN2CdZsLeejzHhfJwdiQMjg3w=',
  P: 'H1XbRvXOvZAhyyPaO68vgIUgdAHn68Y6mrwkpIpEue8=',
  k: '2Nmobf/mpQ7+Dxq1/olPSDj3xV8PZkPbKaucJvVckL0='
};

const prefixKeys = {
  O: 'Rowe+rg/0g==',
  v: '8cULcnOMJVY8AA==',
  L: 'n2+Og2Gth8Hh',
  p: 'aRpvzH+yoA==',
  W: 'ZB4oBi0='
};

export function generateVrf(input: string) {
  let bytes = Buffer.from(input, 'utf8');
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.l), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.A), atobBytes(prefixKeys.O), 7, scheduleC));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.g), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.V), atobBytes(prefixKeys.v), 10, scheduleY));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.B), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.N), atobBytes(prefixKeys.L), 9, scheduleB));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.m), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.P), atobBytes(prefixKeys.p), 7, scheduleJ));
  bytes = Buffer.from(rc4(atobBytes(rc4Keys.F), bytes));
  bytes = Buffer.from(transform(bytes, atobBytes(seeds32.k), atobBytes(prefixKeys.W), 5, scheduleE));

  return btoaBytes(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
