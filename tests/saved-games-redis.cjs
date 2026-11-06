const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const os = require('node:os'), assert = require('node:assert/strict'), ts = require('typescript');
let testFetch;
const root = path.resolve(__dirname, '..'), cache = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (!path.extname(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { esModuleInterop: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})', { structuredClone, process, Buffer, Request, Response, Uint8Array, AbortSignal, fetch: (...args) => testFetch(...args) })(name => name.startsWith('@/') ? load('src/'+name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file),name)) : require(name), mod, mod.exports);
  return mod.exports;
}
(async () => {
 const keys=['VERCEL','GH_SAVE_DIR','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'];
 const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try {
  keys.forEach(k=>delete process.env[k]); process.env.VERCEL='1';
  const {initGame}=load('src/lib/sim.ts');
  const {storeGame,restoreGame}=load('src/lib/saveRepository.ts');
  const {POST}=load('src/app/api/saves/route.ts');
  const progress={withdrawalStep:0,repechageStep:0,evictStep:0,evictDoneForGala:null,finalPhase:'third',finalStep:0,finalDoneForGala:null,revealNomCount:0,showDefinitives:false,showLeaderSave:false,eventsSeen:true,resultView:'journey',showTable:false,reviewGalaNumber:null};
  const snapshot={version:1,state:initGame(Array.from({length:14},(_,i)=>'Persona '+i),123),progress};
  await assert.rejects(storeGame(snapshot),/no está configurado/);
  const missing=await POST(new Request('https://test',{method:'POST',body:JSON.stringify(snapshot)}));
  assert.equal(missing.status,503);assert.match((await missing.json()).error,/no está configurado/);
  // Both accepted credential pairs use the same REST protocol; no real network calls.
  for(const pair of [['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'],['KV_REST_API_URL','KV_REST_API_TOKEN']]) {
   process.env[pair[0]]='https://redis.example.test';process.env[pair[1]]='test-only';
   const data=new Map();let collision=true,commands=0;
   testFetch=async(url,options)=>{
    assert.equal(url,'https://redis.example.test');assert.equal(options.headers.Authorization,'Bearer test-only');
    assert.equal(options.cache,'no-store');const command=JSON.parse(options.body);commands++;
    if(command[0]==='SET') {
     assert.equal(command.length,4,'no expiration');assert.equal(command[3],'NX');
     if(collision){collision=false;return Response.json({result:null});}
     if(data.has(command[1]))return Response.json({result:null});
     data.set(command[1],command[2]);return Response.json({result:'OK'});
    }
    assert.equal(command[0],'GET');return Response.json({result:data.get(command[1])??null});
   };
   const code=await storeGame(snapshot);assert.match(code,/^[A-Z0-9]{8}$/);
   assert.equal(commands,2,'retries a collision');
   assert.equal(JSON.stringify(await restoreGame(code)),JSON.stringify(snapshot));
   assert.equal(await restoreGame('00000000'),null);
   const codes=await Promise.all(Array.from({length:10},()=>storeGame(snapshot)));
   assert.equal(new Set([code,...codes]).size,11);
   testFetch=async()=>Response.json({error:'failed'});
   await assert.rejects(storeGame(snapshot),/command failed/);
   testFetch=async()=>new Response('',{status:503});
   await assert.rejects(storeGame(snapshot),/request failed/);
   testFetch=async()=>{throw new Error('Network unavailable');};
   await assert.rejects(restoreGame(code),/Network unavailable/);
   delete process.env[pair[0]];delete process.env[pair[1]];
  }
  console.log('PASS: Vercel missing configuration, both Redis credential pairs, collision retries, durable snapshots, concurrent codes, absent codes, and storage failure without disk fallback.');
 } finally { for(const key of keys) {if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];} }
})().catch(error=>{console.error(error);process.exitCode=1;});
