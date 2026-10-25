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
const {audiencePercents,nominationTargets,buildNominations,protectedPairs}=load('popularity');
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
    assert(round.events.length>=4&&round.events.length<=8);
    assert.equal(new Set(round.events.map(e=>e.title)).size, round.events.length);
    assert.equal(new Set(state.couples.flat()).size, state.couples.flat().length, 'one partner per contestant');
    for(const pair of previous.couples) {
      if(pair.every(id=>previous.activeIds.includes(id)) && !round.events.some(e=>e.effect==='breakup'&&pair.every(id=>e.participantIds.includes(id))))
        assert(state.couples.some(p=>pair.every(id=>p.includes(id))),'couples persist until breakup');
    }
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
      const protections = protectedPairs(state, round.events);
      for(const pact of round.events.filter(event=>event.effect==='pact')) {
        const votes=gala.nominations.filter(n=>pact.participantIds.includes(n.fromId));
        const common=state.activeIds.filter(id=>votes.every(n=>id!==n.fromId && id!==gala.events.immunity?.winnerId && !protections.some(g=>g.includes(n.fromId)&&g.includes(id))));
        if(common.length >= (state.activeIds.length===4 ? 2 : 3))
          for(const vote of votes) assert.equal(Object.keys(vote.points).sort().join(),Object.keys(votes[0].points).sort().join(),'pact shares targets when feasible');
      }
      for(const nom of gala.nominations) {
        const required=state.activeIds.length===4 ? 2 : 3;
        assert.equal(Object.keys(nom.points).length,required,'complete ballot');
        assert.equal(Object.values(nom.points).sort().join(),required===2?'1,2':'1,2,3');
        const protectedId=id=>protections.some(group=>group.includes(nom.fromId)&&group.includes(id));
        const available=state.activeIds.filter(id=>id!==nom.fromId&&id!==gala.events.immunity?.winnerId&&!protectedId(id));
        const protectedVotes=Object.entries(nom.points).filter(([id])=>protectedId(id));
        assert.equal(protectedVotes.length, Math.max(0,required-available.length),'only unavoidable protected votes');
        for(const [,pts] of protectedVotes) assert(pts<=protectedVotes.length,'lowest points go to protected targets');
        for(const target of Object.keys(nom.points))
          assert(state.activeIds.includes(target),'target is still active');
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

// Directed scenarios: pact coordination, temporary protection expiry and persistent couples.
const fixture=initGame(Array.from({length:10},(_,i)=>'Test '+i),123);
const ids=fixture.activeIds;
const [a,b,c,d,e,f]=ids;
const event=(effect,participantIds)=>({effect,participantIds,conflict:false,changes:[],positive:true,title:effect,description:''});
const pact=event('pact',[a,b,c]);
fixture.couples=[[a,d]];
let votes=buildNominations(fixture,[3,2,1],e,[pact,event('connection',[b,f])],mulberry32(1));
const coordinated=votes.filter(n=>[a,b,c].includes(n.fromId));
assert.equal(Object.keys(coordinated[0].points).length,3);
for(const n of coordinated) {
  assert.equal(Object.keys(n.points).sort().join(),Object.keys(coordinated[0].points).sort().join());
  assert(Object.keys(n.points).every(id=>![a,b,c,d,e,f].includes(id)));
  assert.equal(Object.values(n.points).sort().join(),'1,2,3');
}
const smallGame=initGame(Array.from({length:4},(_,i)=>'Short '+i),234);
const [x,y,z,w]=smallGame.activeIds;
votes=buildNominations(smallGame,[2,1],undefined,[event('romance',[x,y])],mulberry32(2));
assert(!votes.find(n=>n.fromId===x).points[y]);
assert(!votes.find(n=>n.fromId===y).points[x]);
assert.equal(protectedPairs(smallGame,[]).length,0,'temporary links expire next gala');
smallGame.couples=[[x,y]];
assert(protectedPairs(smallGame,[]).some(pair=>pair.includes(x)&&pair.includes(y)));
smallGame.couples=[];
assert.equal(protectedPairs(smallGame,[event('breakup',[x,y])]).length,0,'breakup removes couple protection');
votes=buildNominations(smallGame,[2,1],w,[event('pact',[x,y,z])],mulberry32(3));
for(const n of votes.filter(n=>[x,y,z].includes(n.fromId))) assert.equal(Object.keys(n.points).length,2,'complete ballot even if all eligible targets are protected');
const {templates}=load('houseEventCatalog');
const {moreEvents}=load('moreEvents');
assert(templates.length+moreEvents.length>=100);
console.log('PASS: '+(templates.length+moreEvents.length)+' unique event templates; 4–8 events; pacts, couples, breakups, temporary connections, immunity and complete ballots with lowest points for protected targets.');
// Repesca opcional: una vuelta, límites por reparto y exclusión de votos en la gala de regreso.
const windows=new Map();
let comebacks=0,secondExits=0;
for(let size=10;size<=25;size++) {
  const observed=new Set();windows.set(size,observed);
  for(let seed=1;seed<=25;seed++) {
    let state=initGame(Array.from({length:size},(_,i)=>'Return '+i),seed,{repechage:true});
    const scheduled=state.repechageAfterEvictions;
    assert(scheduled>=3&&scheduled<=Math.min(8,size-6));
    observed.add(scheduled);
    let returned,returnGala,returnRecord;
    while(!state.finished) {
      const previous=state;
      state=playNextGala(state);
      assert.equal(new Set(state.activeIds).size,state.activeIds.length);
      assert.equal(new Set(state.eliminatedIds).size,state.eliminatedIds.length);
      assert(state.activeIds.every(id=>!state.eliminatedIds.includes(id)));
      if(state.repechage&&!previous.repechage) {
        comebacks++;
        returned=state.repechage.returnedId;
        returnGala=state.repechage.galaNumber;
        returnRecord=JSON.stringify(state.repechage);
        const gala=state.galas.at(-1);
        assert.equal(state.repechage.evictionNumber,scheduled);
        assert.equal(state.repechage.candidateIds.length,scheduled);
        assert(state.activeIds.length>=7,'returns no later than six residents remain before return');
        assert(state.activeIds.includes(returned));
        assert(!state.eliminatedIds.includes(returned));
        assert.equal(state.timeline[returned][returnGala-1],'Repesca');
        assert.equal(gala.nominations.length,state.activeIds.length-1);
        assert(!gala.nominations.some(n=>n.fromId===returned));
        assert(gala.nominations.every(n=>!(returned in n.points)&&Object.keys(n.points).length===3));
        assert(!gala.finalNominees.includes(returned));
        assert(!gala.provisionalNominees.includes(returned));
        assert.notEqual(gala.events.immunity?.winnerId,returned);
        assert.notEqual(gala.events.leader?.leaderId,returned);
        assert.equal(JSON.stringify(gala.events.repechage),returnRecord);
        assert(Math.abs(Object.values(state.repechage.percents).reduce((a,b)=>a+b,0)-100)<1e-8);
        for(let col=0;col<returnGala-1;col++) assert.equal(state.timeline[returned][col],previous.timeline[returned][col]??'');
      } else if(returned) {
        assert.equal(JSON.stringify(state.repechage),returnRecord,'only one comeback');
        const gala=state.galas.at(-1);
        if(gala.galaNumber===returnGala+1) assert(gala.nominations.some(n=>n.fromId===returned),'can nominate next gala');
      }
    }
    assert(state.repechage,'enabled comeback always happens');
    if(state.eliminatedIds.includes(returned)) {
      secondExits++;
      assert(state.timeline[returned].slice(returnGala).includes('Expulsado'));
    }
  }
}
assert.equal(comebacks,400);
assert(secondExits>0);
assert(windows.get(10).has(3)&&windows.get(10).has(4));
assert(windows.get(11).has(3)&&windows.get(11).has(5));
let disabled=initGame(Array.from({length:10},(_,i)=>'Disabled '+i),7);
while(!disabled.finished){disabled=playNextGala(disabled);assert(!disabled.repechage);}
console.log('PASS: '+comebacks+' enabled seasons (10–25 contestants), disabled option, timing windows, voting exemption, next-gala eligibility and '+secondExits+' subsequent evictions.');