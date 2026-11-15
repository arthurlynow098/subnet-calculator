import { calculate, split, prefixForHosts } from "./subnet.js";

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => n.toLocaleString("pt-BR");

const CAMPOS = [
  ["Rede", "network"], ["Broadcast", "broadcast"], ["Máscara", "mask"], ["Wildcard", "wildcard"],
  ["Primeiro host", "firstHost"], ["Último host", "lastHost"], ["Hosts úteis", "usableHosts"],
  ["Total de endereços", "totalAddresses"], ["Classe", "ipClass"], ["Tipo", "ipType"],
];

function el(tag, attrs = {}, text = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  node.textContent = text; // textContent e nunca innerHTML com dado digitado
  return node;
}

function renderBinary(r) {
  const box = $("#binario");
  box.replaceChildren();
  for (const [label, bits] of [["IP", r.binary.ip], ["Máscara", r.binary.mask], ["Rede", r.binary.network]]) {
    const row = el("div", { class: "bin-linha" });
    row.append(el("span", { class: "bin-rotulo" }, label));
    const code = el("code");
    let count = 0;
    for (const ch of bits) {
      if (ch === ".") { code.append("."); continue; }
      code.append(el("span", { class: count < r.prefix ? "bit-rede" : "bit-host" }, ch));
      count++;
    }
    row.append(code);
    box.append(row);
  }
}

function render() {
  $("#erro").textContent = "";
  try {
    const r = calculate($("#ip").value);
    const grid = $("#resultado");
    grid.replaceChildren(el("div", { class: "card-destaque" }, `${r.ip}/${r.prefix}`));
    for (const [label, key] of CAMPOS) {
      const card = el("div", { class: "card" });
      card.append(el("span", {}, label), el("strong", {}, typeof r[key] === "number" ? fmt(r[key]) : r[key]));
      grid.append(card);
    }
    renderBinary(r);
    renderSplit();
    history.replaceState(null, "", `#${encodeURIComponent($("#ip").value.trim())}`);
  } catch (e) {
    $("#erro").textContent = e.message;
  }
}

function renderSplit() {
  const table = $("#tabela");
  table.replaceChildren();
  try {
    const nets = split($("#ip").value, Number($("#novo-prefixo").value));
    const head = el("tr");
    ["#", "Rede", "Primeiro host", "Último host", "Broadcast", "Hosts"].forEach((h) => head.append(el("th", {}, h)));
    table.append(head);
    nets.forEach((n, i) => {
      const tr = el("tr");
      [i + 1, `${n.network}/${n.prefix}`, n.firstHost, n.lastHost, n.broadcast, fmt(n.usableHosts)]
        .forEach((v) => tr.append(el("td", {}, String(v))));
      table.append(tr);
    });
  } catch (e) {
    table.append(el("caption", { class: "mudo" }, e.message));
  }
}

$("#form").addEventListener("submit", (e) => { e.preventDefault(); render(); });
$("#form-divisao").addEventListener("submit", (e) => { e.preventDefault(); renderSplit(); });
$("#form-hosts").addEventListener("submit", (e) => {
  e.preventDefault();
  try {
    const p = prefixForHosts(Number($("#hosts").value));
    $("#resposta-hosts").textContent = `use um /${p}, que comporta ${fmt(2 ** (32 - p) - 2)} hosts`;
  } catch (err) {
    $("#resposta-hosts").textContent = err.message;
  }
});
document.querySelectorAll("[data-ex]").forEach((b) =>
  b.addEventListener("click", () => { $("#ip").value = b.dataset.ex; render(); }));

if (location.hash.length > 1) $("#ip").value = decodeURIComponent(location.hash.slice(1));
render();
