const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const os = require('node:os'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { esModuleInterop: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})', { structuredClone, process, Buffer, Request, Response, Uint8Array })(name => name.startsWith('@/') ? load('src/'+name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file),name)) : require(name), mod, mod.exports);
  return mod.exports;
}
(async () => {
  // Test data lives only in a fresh system temp directory, never in real saved games.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-save-test-'));
  const oldDirectory = process.env.GH_SAVE_DIR; process.env.GH_SAVE_DIR = directory;
  try {
    const { initGame, playNextGala } = load('src/lib/sim.ts');
    const { isSavedGame } = load('src/lib/savedGame.ts');
    const { storeGame, restoreGame } = load('src/lib/saveRepository.ts');
    const { POST } = load('src/app/api/saves/route.ts');
    const { GET } = load('src/app/api/saves/[code]/route.ts');
    let state = initGame(Array.from({ length: 20 }, (_,i) => 'Persona '+i), 808, { finalSize: 4 });
    while (state.gala <= 8) state = playNextGala(state);
    const progress = { withdrawalStep: 0, repechageStep: 0, evictStep: 3, evictDoneForGala: 7,
      finalPhase: 'fourth', finalStep: 0, finalDoneForGala: null, revealNomCount: 2,
      showDefinitives: false, showLeaderSave: false, eventsSeen: true,
      resultView: 'journey', showTable: false, reviewGalaNumber: 4 };
    const snapshot = { version: 1, state, progress };
    assert(isSavedGame(snapshot));
    const first = await storeGame(snapshot);
    assert.match(first,/^[A-Z0-9]{8}$/);
    assert.equal(JSON.stringify(await restoreGame(first)),JSON.stringify(snapshot),'full state and partial reveal round-trip');
    const restored = await restoreGame(first);
    assert.equal(JSON.stringify(playNextGala(restored.state)),JSON.stringify(playNextGala(state)),'continuation remains deterministic');
    assert.equal(restored.state.galas.length,state.galas.length,'past gala reviews retained');
    const next = { ...snapshot, state: playNextGala(state), progress: { ...progress, evictStep: 0 } };
    const codes = await Promise.all(Array.from({length:12},()=>storeGame(next)));
    assert.equal(new Set([first,...codes]).size,13,'concurrent saves never overwrite codes');
    assert.equal((await restoreGame(first)).state.gala,state.gala,'old code still identifies old snapshot');
    assert.equal((await restoreGame(codes[0])).state.gala,next.state.gala);
    assert.equal(await restoreGame('../bad'),null);
    const result = await GET(new Request('http://test/api/saves/'+first),{params:Promise.resolve({code:first.toLowerCase()})});
    assert.equal(result.status,200); assert.equal(JSON.stringify(await result.json()),JSON.stringify(snapshot));
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.equal((await GET(new Request('http://test'),{params:Promise.resolve({code:'INVALID!'})})).status,400);
    assert.equal((await GET(new Request('http://test'),{params:Promise.resolve({code:'00000000'})})).status,404);
    assert.equal((await POST(new Request('http://test',{method:'POST',body:'bad json'}))).status,400);
    assert.equal((await POST(new Request('http://test',{method:'POST',body:JSON.stringify({version:1})}))).status,400);
    const saved = await POST(new Request('http://test',{method:'POST',body:JSON.stringify(snapshot)}));
    assert.equal(saved.status,201); assert.match((await saved.json()).code,/^[A-Z0-9]{8}$/);
    while (!state.finished) state = playNextGala(state);
    for (const phase of ['fourth','third','winner','done']) {
      const final = { version:1,state,progress:{...progress,finalPhase:phase,finalStep:5} };
      const code = await storeGame(final);
      assert.equal(JSON.stringify(await restoreGame(code)),JSON.stringify(final),'final reveal phase retained');
    }
    console.log('PASS: full histories, exact reveal snapshot, deterministic continuation, unique concurrent codes, old saves, final phases, API errors and case-insensitive load.');
  } finally {
    if (oldDirectory === undefined) delete process.env.GH_SAVE_DIR; else process.env.GH_SAVE_DIR = oldDirectory;
    // Keep temp fixtures isolated; do not touch production saves.
  }
})().catch(error => { console.error(error); process.exitCode=1; });
