import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, ipToInt, intToIp, prefixFromMask, prefixForHosts, split, ipType } from "../src/subnet.js";

test("ida e volta de IP para número", () => {
  assert.equal(intToIp(ipToInt("192.168.10.255")), "192.168.10.255");
  assert.equal(ipToInt("255.255.255.255"), 4294967295);
});

test("rejeita IP inválido", () => {
  assert.throws(() => ipToInt("300.1.1.1"));
  assert.throws(() => ipToInt("10.0.0"));
});

test("/24 clássico", () => {
  const r = calculate("192.168.0.77/24");
  assert.equal(r.network, "192.168.0.0");
  assert.equal(r.broadcast, "192.168.0.255");
  assert.equal(r.firstHost, "192.168.0.1");
  assert.equal(r.lastHost, "192.168.0.254");
  assert.equal(r.usableHosts, 254);
  assert.equal(r.ipType, "privado (RFC 1918)");
});

test("aceita máscara decimal", () => {
  assert.equal(calculate("10.20.30.40 255.255.252.0").prefix, 22);
  assert.equal(prefixFromMask("255.255.255.192"), 26);
  assert.throws(() => prefixFromMask("255.0.255.0"));
});

test("/31 e /32 seguem a RFC 3021", () => {
  assert.equal(calculate("10.0.0.0/31").usableHosts, 2);
  assert.equal(calculate("8.8.8.8/32").usableHosts, 1);
});

test("divide /24 em quatro /26", () => {
  const nets = split("192.168.1.0/24", 26).map((n) => n.network);
  assert.deepEqual(nets, ["192.168.1.0", "192.168.1.64", "192.168.1.128", "192.168.1.192"]);
});

test("prefixo mínimo para N hosts", () => {
  assert.equal(prefixForHosts(50), 26);
  assert.equal(prefixForHosts(254), 24);
  assert.equal(prefixForHosts(255), 23);
});

test("tipos de endereço", () => {
  assert.equal(ipType(ipToInt("172.20.1.1")), "privado (RFC 1918)");
  assert.equal(ipType(ipToInt("172.32.1.1")), "público");
  assert.equal(ipType(ipToInt("100.64.0.1")), "CGNAT (RFC 6598)");
});
