const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const ts = require('typescript');
const cache = {};
function load(name) {
  if(cache[name]) return cache[name];
  const mod={exports:{}};
  const text=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext('(function(require,module,exports){'+text+'\n})',{structuredClone})(n=>load(n.replace('./','')),mod,mod.exports);
  return cache[name]=mod.exports;
}
const {initGame,playNextGala}=load('sim');
const {audiencePercents,nominationTargets}=load('popularity');
const {mulberry32}=load('rng');
let rounds=0, positive=0, negative=0, conflict=0, multi=0, finalRounds=0;
for(let seed=1;seed<=100;seed++) {
  let state=initGame(Array.from({length:10+seed%16},(_,i)=>'Persona '+i),seed);
  assert(Object.values(state.popularity).every(p=>p===50));
  while(!state.finished) {
    const before=JSON.stringify(state), previous=state;
    state=playNextGala(state);
    assert.equal(JSON.stringify(previous),before);
    assert.equal(JSON.stringify(playNextGala(previous)),JSON.stringify(state),'seed reproducibility');
    assert.equal(state.houseRounds.length,previous.houseRounds.length+1);
    const round=state.houseRounds.at(-1);rounds++;
    assert(round.events.length>=1&&round.events.length<=4);
    const expected={...previous.popularity};
    for(const event of round.events) {
      positive+=event.positive;negative+=!event.positive;conflict+=event.conflict;multi+=event.participantIds.length>=4;
      assert.equal(new Set(event.participantIds).size,event.participantIds.length);
      assert(event.participantIds.every(id=>previous.activeIds.includes(id)));
      for(const change of event.changes) {
        assert.equal(change.before,expected[change.id]);
        assert.equal(change.after,change.before+change.delta);
        assert(change.after>=0&&change.after<=100);
        assert(event.positive ? change.delta>=0 : change.delta<=0);
        expected[change.id]=change.after;
      }
    }
    assert.equal(JSON.stringify(state.popularity),JSON.stringify(expected));
    assert.equal(JSON.stringify(round.popularity),JSON.stringify(expected));
    for(const id of previous.eliminatedIds) assert.equal(state.popularity[id],previous.popularity[id]);
    const vote=state.publicVotes.at(-1);
    if(vote) {
      assert(Math.abs(Object.values(vote.percents).reduce((a,b)=>a+b,0)-100)<1e-8);
      assert(Object.values(vote.percents).every(p=>p>=0&&p<=100));
    }
    const gala=state.galas.at(-1);
    if(gala&&gala.galaNumber===round.galaNumber) {
      assert.equal(gala.nominations.length,state.activeIds.length);
      for(const nom of gala.nominations) {
        assert(!Object.keys(nom.points).includes(nom.fromId));
        if(gala.events.immunity) assert(!Object.keys(nom.points).includes(gala.events.immunity.winnerId));
      }
    }
    if(state.finished) finalRounds++;
    assert(rounds<5000,'season must terminate');
  }
}
assert(positive&&negative&&conflict&&multi&&finalRounds===100);
const random=mulberry32(123);
let lowTotal=0,highTotal=0,lowLosses=0,highLosses=0,highWins=0;
for(let i=0;i<10000;i++) {
  const result=audiencePercents(['low','mid','high'],{low:15,mid:50,high:85},random);
  lowTotal+=result.low;highTotal+=result.high;
  if(result.low>result.mid&&result.low>result.high)lowLosses++;
  if(result.high>result.mid&&result.high>result.low)highLosses++;
  const final=audiencePercents(['low','mid','high'],{low:15,mid:50,high:85},random,true);
  if(final.high>final.mid&&final.high>final.low)highWins++;
}
assert(lowTotal>highTotal*3&&lowLosses>highLosses*3&&highWins>7000);
const argument=[{conflict:true,participantIds:['from','rival']}];
let biased=0,baseline=0;
for(let i=0;i<10000;i++) {
  const eligible=['rival','a','b','c','d','e','f','g'];
  if(nominationTargets('from',eligible,1,argument,random)[0]==='rival')biased++;
  if(nominationTargets('from',eligible,1,[],random)[0]==='rival')baseline++;
}
assert(biased>baseline*3);
console.log(JSON.stringify({seasons:100,rounds,events:{positive,negative,conflict,multi},evictionAverage:{low:lowTotal/10000,high:highTotal/10000},lowLosses,highLosses,highWins,argumentFirstChoice:biased/10000,baselineFirstChoice:baseline/10000}));
