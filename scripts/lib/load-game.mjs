/* Loads the Sreadle game script from index.html into a Node vm with a stubbed
   DOM, and returns the game's internal functions for tooling and tests.
   The game script is a single IIFE; we append an export hook inside it so the
   harness can reach DAYS, generateDay, buildChart, chartToElements, and the
   other internals without modifying index.html itself. */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function makeCtx2d() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      if (p === 'getImageData') return () => ({ data: [] });
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

class El {
  constructor() {
    this.style = {};
    this.dataset = {};
    this.children = [];
    this._attrs = {};
    this.classList = {
      add() {}, remove() {}, toggle() {},
      contains() { return false; }
    };
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; }
  removeAttribute(k) { delete this._attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); return c; }
  querySelector() { return new El(); }
  querySelectorAll() { return []; }
  getContext() { return makeCtx2d(); }
  getBoundingClientRect() { return { width: 360, height: 200, left: 0, top: 0, right: 360, bottom: 200 }; }
  click() {}
  focus() {}
  select() {}
  setSelectionRange() {}
  scrollIntoView() {}
}

export function extractScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('index.html: no <script> block found');
  return m[1];
}

const EXPORT_HOOK = `
;globalThis.__SREADLE = {
  DAYS: DAYS,
  AUTHORED_RHYTHMS: AUTHORED_RHYTHMS,
  generateDay: generateDay,
  getDay: getDay,
  buildChart: buildChart,
  makeHelpers: makeHelpers,
  compileMeasure: compileMeasure,
  defFromElements: defFromElements,
  chartToElements: chartToElements,
  sanitizeRhythm: sanitizeRhythm,
  mulberry32: mulberry32
};
})();`;

export function loadGame(indexPath) {
  const html = readFileSync(indexPath, 'utf8');
  let src = extractScript(html);
  const tail = '})();';
  const idx = src.lastIndexOf(tail);
  if (idx < 0) throw new Error('index.html: script does not end with the expected IIFE close');
  src = src.slice(0, idx) + EXPORT_HOOK + src.slice(idx + tail.length);

  const byId = new Map();
  const documentStub = {
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, new El());
      return byId.get(id);
    },
    createElement() { return new El(); },
    querySelector() { return new El(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    body: new El(),
    documentElement: new El()
  };

  const storage = new Map();
  const localStorageStub = {
    getItem(k) { return storage.has(k) ? storage.get(k) : null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
    clear() { storage.clear(); }
  };

  const sandbox = {
    console,
    document: documentStub,
    localStorage: localStorageStub,
    navigator: {},
    location: { search: '', hash: '', href: 'http://localhost/' },
    performance,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
    innerWidth: 390,
    innerHeight: 844,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URLSearchParams,
    URL
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.scrollTo = () => {};

  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'index.html<script>' });
  if (!sandbox.__SREADLE) throw new Error('index.html: export hook did not run');
  return sandbox.__SREADLE;
}
