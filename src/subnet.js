// Lógica da calculadora. Sem DOM aqui, assim dá para testar no Node.
// IPv4 é só um número de 32 bits, então tudo vira conta com bits.

export function ipToInt(ip) {
  const parts = String(ip).trim().split(".");
  if (parts.length !== 4) throw new Error("o IP precisa ter 4 partes");
  return parts.reduce((acc, part) => {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) throw new Error(`octeto inválido: ${part}`);
    return ((acc << 8) | Number(part)) >>> 0;
  }, 0);
}

export function intToIp(n) {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
}

export function maskFromPrefix(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("prefixo entre 0 e 32");
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export function prefixFromMask(mask) {
  const n = ipToInt(mask);
  const prefix = n.toString(2).padStart(32, "0").indexOf("0");
  const p = prefix === -1 ? 32 : prefix;
  if (maskFromPrefix(p) !== n) throw new Error("máscara inválida, os 1 precisam vir todos juntos");
  return p;
}

export function toBinary(n) {
  return n.toString(2).padStart(32, "0").match(/.{8}/g).join(".");
}

export function ipClass(n) {
  const first = n >>> 24;
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D (multicast)";
  return "E (reservada)";
}

const RANGES = [
  ["10.0.0.0", 8, "privado (RFC 1918)"],
  ["172.16.0.0", 12, "privado (RFC 1918)"],
  ["192.168.0.0", 16, "privado (RFC 1918)"],
  ["127.0.0.0", 8, "loopback"],
  ["169.254.0.0", 16, "link-local (APIPA)"],
  ["100.64.0.0", 10, "CGNAT (RFC 6598)"],
  ["192.0.2.0", 24, "documentação (RFC 5737)"],
  ["198.51.100.0", 24, "documentação (RFC 5737)"],
  ["203.0.113.0", 24, "documentação (RFC 5737)"],
];

export function ipType(n) {
  for (const [net, prefix, label] of RANGES) {
    const mask = maskFromPrefix(prefix);
    if (((n & mask) >>> 0) === ipToInt(net)) return label;
  }
  return "público";
}

export function parseInput(text) {
  // aceita "192.168.0.10/24" ou "192.168.0.10 255.255.255.0"
  const value = String(text).trim();
  let ip, prefix;
  if (value.includes("/")) {
    const [a, b] = value.split("/");
    ip = a;
    prefix = Number(b);
  } else {
    const [a, b] = value.split(/\s+/);
    ip = a;
    prefix = b ? prefixFromMask(b) : 24;
  }
  maskFromPrefix(prefix); // só para validar, lança erro se estiver fora de 0 a 32
  return { ip: ipToInt(ip), prefix };
}

export function calculate(text) {
  const { ip, prefix } = parseInput(text);
  const mask = maskFromPrefix(prefix);
  const wildcard = ~mask >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  let first, last, usable;
  if (prefix >= 31) {
    // /31 é ponto a ponto (RFC 3021) e /32 é um host só, sem rede nem broadcast "gastos"
    first = network;
    last = broadcast;
    usable = total;
  } else {
    first = network + 1;
    last = broadcast - 1;
    usable = total - 2;
  }
  return {
    ip: intToIp(ip),
    prefix,
    mask: intToIp(mask),
    wildcard: intToIp(wildcard),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(first),
    lastHost: intToIp(last),
    totalAddresses: total,
    usableHosts: usable,
    ipClass: ipClass(ip),
    ipType: ipType(ip),
    binary: { ip: toBinary(ip), mask: toBinary(mask), network: toBinary(network) },
  };
}

export function split(text, newPrefix) {
  // divide uma rede em sub-redes menores, ex. um /24 em quatro /26
  const { ip, prefix } = parseInput(text);
  if (newPrefix <= prefix || newPrefix > 32) throw new Error("o novo prefixo precisa ser maior que o atual");
  const count = 2 ** (newPrefix - prefix);
  if (count > 1024) throw new Error("mais de 1024 sub-redes, escolha um prefixo menor");
  const base = (ip & maskFromPrefix(prefix)) >>> 0;
  const size = 2 ** (32 - newPrefix);
  return Array.from({ length: count }, (_, i) => calculate(`${intToIp(base + i * size)}/${newPrefix}`));
}

export function prefixForHosts(hosts) {
  // menor rede que comporta N hosts (contando rede e broadcast)
  for (let p = 30; p >= 0; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
  throw new Error("número de hosts grande demais");
}
