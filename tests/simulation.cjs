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
    if(state.finalReady) {
      assert.equal(JSON.stringify(gala.finalistIds),JSON.stringify(state.activeIds),'last eviction records all finalists');
      assert.equal(gala.galaNumber,round.galaNumber);
      assert(state.publicVotes.some(v=>v.galaNumber===gala.galaNumber && v.kind==='eviction'));
    }
    if(gala&&gala.galaNumber===round.galaNumber&&!gala.finalistIds) {
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
    assert(scheduled>=4&&scheduled<=Math.min(8,size-6));
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
        assert.equal(state.repechage.candidateIds.length,scheduled-1);
        assert(state.repechage.candidateIds.length>=3);
        assert(state.repechage.candidateIds.every(id=>previous.eliminatedIds.includes(id)));
        assert(!state.repechage.candidateIds.includes(state.publicVotes.at(-1).expelledId));
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
assert.equal(windows.get(10).size,1);
assert(windows.get(10).has(4));
assert(windows.get(11).has(4)&&windows.get(11).has(5));
let disabled=initGame(Array.from({length:10},(_,i)=>'Disabled '+i),7);
while(!disabled.finished){disabled=playNextGala(disabled);assert(!disabled.repechage);}
console.log('PASS: '+comebacks+' enabled seasons (10–25 contestants), disabled option, timing windows, voting exemption, next-gala eligibility and '+secondExits+' subsequent evictions.');
// Withdrawals: full seasons, both phases, replacement ballots, chronology and repechage.
const reserves = Array.from({length:12}, (_,i)=>({name:'Reserve '+i}));
const {withdrawalChance,applyWithdrawal}=load('withdrawals');
assert.equal(withdrawalChance(0),0.03);
assert.equal(withdrawalChance(1),0.015);
assert.equal(withdrawalChance(2),0.0075);
assert.equal(withdrawalChance(3),0);
let beforeWithdrawals=0,afterWithdrawals=0,finalReadyWithdrawals=0,maxWithdrawals=0;
for(let seed=1;seed<=500;seed++) {
  let state=initGame(Array.from({length:10+seed%16},(_,i)=>'Resident '+i),seed,{withdrawals:true,reserves,repechage:seed%2===0});
  assert.equal(state.reserves.length,10);
  let turns=0;
  while(!state.finished) {
    const prev=state;state=playNextGala(state);
    assert(++turns<30,'season terminates');
    assert(state.withdrawals.length<=3);
    assert.equal(state.contestants.length,prev.contestants.length+state.withdrawals.length-prev.withdrawals.length);
    assert.equal(new Set([...state.activeIds,...state.eliminatedIds]).size,state.contestants.length);
    const w=state.withdrawals.at(-1);
    if(state.withdrawals.length>prev.withdrawals.length) {
      if(w.phase==='before')beforeWithdrawals++;else afterWithdrawals++;
      if(state.finalReady)finalReadyWithdrawals++;
      assert(prev.activeIds.length>5);
      assert(state.activeIds.length>=5);
      if(w.phase==='after')assert(state.activeIds.length>5);
      assert.equal(state.timeline[w.replacementId][w.galaNumber-1],'Entra');
      const arrivalGala=state.galas.find(g=>g.galaNumber===w.galaNumber);
      assert(!arrivalGala.nominations.some(n=>n.fromId===w.replacementId || w.replacementId in n.points));
      assert(!state.pendingNominees.includes(w.replacementId));
      assert(prev.activeIds.includes(w.departedId));
      assert(!state.activeIds.includes(w.departedId));
      assert(state.activeIds.includes(w.replacementId));
      const initialCount = Object.values(state.timeline).filter(row=>row[0]==='Entra').length;
      const lateEntry = w.galaNumber - 2 >= Math.ceil((initialCount-state.finalSize)/2);
      assert.equal(state.popularity[w.replacementId],lateEntry?40:50);
      assert.equal(state.houseRounds.find(r=>r.galaNumber===w.galaNumber).popularity[w.replacementId],lateEntry?40:50);
      assert.equal(state.timeline[w.departedId][w.galaNumber-1],'Abandono');
      assert(state.timeline[w.replacementId].slice(0,w.galaNumber-1).every(s=>s===''));
      assert(!state.pendingNominees.includes(w.departedId));
      assert(!state.reserves.some(c=>c.id===w.replacementId));
      const vote=state.publicVotes.find(v=>v.galaNumber===w.galaNumber&&v.kind==='eviction');
      if(vote) {
        assert(!vote.nominees.includes(w.replacementId));
        assert(w.phase==='after'||!vote.nominees.includes(w.departedId));
        const a=state.eliminatedIds.indexOf(w.departedId),b=state.eliminatedIds.indexOf(vote.expelledId);
        if(b!==-1)assert(w.phase==='before'?a<b:a>b,'exit order');
      }
      assert.equal(state.galas.find(g=>g.galaNumber===w.galaNumber).events.withdrawal.departedId,w.departedId);
    }
    const gala=state.galas.at(-1);
    if(gala?.galaNumber===state.gala-1&&gala.nominations.length) {
      for(const ballot of gala.nominations) {
        assert(state.activeIds.includes(ballot.fromId));
        assert.equal(Object.keys(ballot.points).length,state.activeIds.length===4?2:3);
        assert(Object.keys(ballot.points).every(id=>state.activeIds.includes(id)&&id!==ballot.fromId));
      }
    }
    if(state.repechage)assert(state.repechage.candidateIds.every(id=>!state.withdrawals.some(w=>w.departedId===id&&w.galaNumber<=state.repechage.galaNumber)));
  }
  maxWithdrawals=Math.max(maxWithdrawals,state.withdrawals.length);
}
assert(beforeWithdrawals>0&&afterWithdrawals>0);
assert.equal(finalReadyWithdrawals,0);
let withdrawalFixture=initGame(Array.from({length:10},(_,i)=>'Fixture '+i),1,{withdrawals:true,reserves});
for(let i=0;i<4;i++)applyWithdrawal(withdrawalFixture,'before',()=>0);
assert.equal(withdrawalFixture.withdrawals.length,3);
for(const options of [{withdrawals:false,reserves},{withdrawals:true,reserves:[]}]) {
  let state=initGame(Array.from({length:10},(_,i)=>'Fixture '+i),1,options);
  while(!state.finished)state=playNextGala(state);
  assert.equal(state.withdrawals.length,0);
}
console.log('PASS: 500 withdrawal seasons', {beforeWithdrawals,afterWithdrawals,finalReadyWithdrawals,maxWithdrawals});

// Five or fewer residents: neither phase may trigger a withdrawal.
for(const count of [3,4,5])for(const phase of ['before','after']) {
  const state=initGame(Array.from({length:count},(_,i)=>'Resident '+i),1,{withdrawals:true,reserves});
  applyWithdrawal(state,phase,()=>0);
  assert.equal(state.withdrawals.length,0);
}
// A nominated departure is removed before computing this gala's eviction.
let checkedNominatedDeparture=false;
for(let seed=1;seed<=1000&&!checkedNominatedDeparture;seed++) {
  let state=initGame(Array.from({length:10},(_,i)=>'Resident '+i),seed,{withdrawals:true,reserves});
  while(!state.finished) {
    const previous=state;state=playNextGala(state);
    const w=state.withdrawals.at(-1);
    if(state.withdrawals.length>previous.withdrawals.length&&w.phase==='before'&&previous.pendingNominees.includes(w.departedId)) {
      const vote=state.publicVotes.at(-1);
      assert.equal(vote.nominees.length,previous.pendingNominees.length-1);
      assert(!(w.departedId in vote.percents));
      assert(Math.abs(Object.values(vote.percents).reduce((a,b)=>a+b,0)-100)<1e-8);
      checkedNominatedDeparture=true;break;
    }
  }
}
assert(checkedNominatedDeparture);
// Reproduce the engine RNG: current-gala event changes feed directly into its eviction.
const {generateHouseRound}=load('popularity');
let current=playNextGala(initGame(Array.from({length:10},(_,i)=>'Resident '+i),42));
const expectedState=structuredClone(current),eventRand=mulberry32(current.seed+current.gala*99991);
generateHouseRound(expectedState,eventRand);
const expectedVote=audiencePercents(current.pendingNominees,expectedState.popularity,eventRand);
assert.equal(JSON.stringify(playNextGala(current).publicVotes.at(-1).percents),JSON.stringify(expectedVote));
console.log('PASS: arrival exemption, no withdrawals at five or fewer, departed nominee removed, same-gala popularity used.');

// Custom season mechanics across every nomination/final/privilege combination.
const {nominationRules}=load('mechanics');
let customSeasons=0;
const randomModes=new Set(),randomFinals=new Set(),randomRepechages=new Set();
for(const mode of ['traditional','gh24','gh1','positive'])for(const finalSize of [3,4])
for(const leaderPolicy of ['random','always','never'])for(const immunityPolicy of ['random','always','never'])
for(let seed=1;seed<=8;seed++) {
  let state=initGame(Array.from({length:10+seed%4},(_,i)=>'Player '+i),seed,{nominationMode:mode,finalSize,leaderPolicy,immunityPolicy,repechage:true,withdrawals:true,reserves});
  let steps=0;
  while(!state.finished){
    const prev=state;state=playNextGala(state);assert(++steps<30);
    assert.equal(state.finalSize,finalSize);assert.equal(state.nominationMode,mode);
    const gala=state.galas.at(-1);
    if(gala?.galaNumber===state.gala-1&&gala.nominations.length&&!state.finished){
      const rules=nominationRules(mode,state.activeIds.length);
      const eligible=state.activeIds.filter(id=>id!==gala.events.repechage?.returnedId&&id!==gala.events.withdrawal?.replacementId);
      assert.equal(gala.nominations.length,eligible.length);
      assert.equal(!!gala.events.leader,leaderPolicy==='always'||(leaderPolicy==='random'&&!!gala.events.leader));
      if(state.activeIds.length<=5||immunityPolicy==='never')assert(!gala.events.immunity);
      if(state.activeIds.length>5&&immunityPolicy==='always')assert(gala.events.immunity);
      const targets=eligible.filter(id=>id!==gala.events.immunity?.winnerId);
      for(const ballot of gala.nominations){
        assert.equal(Object.values(ballot.points).sort().join(),[...rules.points].sort().join());
        assert(Object.keys(ballot.points).every(id=>targets.includes(id)&&id!==ballot.fromId));
      }
      assert(gala.finalNominees.length>=rules.min);
      const ordered=targets.map(id=>[id,gala.nominationTotals[id]]).sort((a,b)=>mode==='positive'?a[1]-b[1]:b[1]-a[1]);
      const cutoff=ordered[rules.min-1][1];
      const expected=ordered.filter(([,pts])=>mode==='positive'?pts<=cutoff:pts>=cutoff).map(([id])=>id).sort();
      assert.equal([...gala.provisionalNominees].sort().join(),expected.join());
      if(gala.events.leader)assert(!gala.finalNominees.includes(gala.events.leader.savedId));
      if(state.activeIds.length===finalSize+1)assert.equal(rules.points.length,mode==='gh1'||(mode==='traditional'&&finalSize===3)?2:3);
    }
    if(state.finalReady){assert.equal(state.activeIds.length,finalSize);assert(state.activeIds.every(id=>state.timeline[id].at(-1)==='Finalista'));}
    if(state.withdrawals.length>prev.withdrawals.length&&state.withdrawals.at(-1).phase==='before'&&prev.pendingNominees.length===2)
      assert(!prev.pendingNominees.includes(state.withdrawals.at(-1).departedId));
  }
  assert.equal(state.publicVotes.at(-1).nominees.length,finalSize);
  assert.equal(!!state.finalRanking.fourthId,finalSize===4);
  if(finalSize===4)assert.equal(state.timeline[state.finalRanking.fourthId].at(-1),'Cuarto');
  customSeasons++;
}
for(let seed=1;seed<=50;seed++){
 const options={nominationMode:'random',finalSize:'random',repechage:'random'};
 const inputs=Array.from({length:10},(_,i)=>'Random '+i);
 const state=initGame(inputs,seed,options);
 assert.equal(JSON.stringify(state),JSON.stringify(initGame(inputs,seed,options)));
 randomModes.add(state.nominationMode);randomFinals.add(state.finalSize);randomRepechages.add(!!state.repechageAfterEvictions);
}
assert.equal(randomModes.size,4);assert.equal(randomFinals.size,2);assert.equal(randomRepechages.size,2);
// Positive votes always give higher available scores to allies than to non-allies.
const friendly=initGame(['A','B','C','D','E','F'],1,{nominationMode:'positive'});
friendly.couples=[[friendly.activeIds[0],friendly.activeIds[1]]];
const positiveBallots=buildNominations(friendly,[3,2,1],undefined,[],mulberry32(1));
assert.equal(positiveBallots.find(n=>n.fromId===friendly.activeIds[0]).points[friendly.activeIds[1]],3);
// A duel is protected even when the random departure draw picks its first resident.
const duel=initGame(['A','B','C','D','E','F'],1,{withdrawals:true,reserves});
duel.pendingNominees=duel.activeIds.slice(0,2);
const duelIds=[...duel.pendingNominees];applyWithdrawal(duel,'before',()=>0);
assert(!duelIds.includes(duel.withdrawals[0].departedId));assert.equal(duel.pendingNominees.length,2);
console.log('PASS:',customSeasons,'custom seasons; random choices fixed; positive affinity; protected duels; four-person finals.');

// Occasional positive galas: the season setting stays fixed, the gala direction is recorded.
const {galaNominationMode}=load('mechanics');
let occasionalPositive=0,occasionalTraditional=0,positiveLastFour=0,negativeLastFour=0;
for(let seed=1;seed<=100;seed++){
 let state=initGame(Array.from({length:10},(_,i)=>'Mixed '+i),seed,{nominationMode:'randomPositive',leaderPolicy:seed%2?'always':'never',immunityPolicy:'always',repechage:true,withdrawals:true,reserves});
 while(!state.finished){
  const prev=state;state=playNextGala(state);
  assert.equal(state.nominationMode,'randomPositive');
  const gala=state.galas.at(-1);
  if(!gala||gala.galaNumber!==state.gala-1||!gala.nominations.length||state.finished)continue;
  const mode=gala.nominationMode;
  assert.equal(mode,galaNominationMode(state,gala.galaNumber));
  assert.equal(mode,state.houseRounds.at(-1).nominationMode);
  const positive=mode==='positive';positive?occasionalPositive++:occasionalTraditional++;
  if(state.activeIds.length===4)positive?positiveLastFour++:negativeLastFour++;
  const rules=nominationRules(mode,state.activeIds.length);
  for(const ballot of gala.nominations)assert.equal(Object.values(ballot.points).sort().join(),[...rules.points].sort().join());
  const eligible=Object.entries(gala.nominationTotals).filter(([id])=>id!==gala.events.immunity?.winnerId&&id!==gala.events.repechage?.returnedId&&id!==gala.events.withdrawal?.replacementId);
  eligible.sort((a,b)=>positive?a[1]-b[1]:b[1]-a[1]);
  const cut=eligible[rules.min-1][1];
  const expected=eligible.filter(([,v])=>positive?v<=cut:v>=cut).map(([id])=>id).sort();
  assert.equal([...gala.provisionalNominees].sort().join(),expected.join());
  assert.equal(JSON.stringify(playNextGala(prev)),JSON.stringify(state));
  assert(gala.finalNominees.length>=rules.min);
 }
 for(const gala of state.galas)if(gala.nominations.length)assert.equal(gala.nominationMode,galaNominationMode(state,gala.galaNumber));
}
assert(occasionalPositive>0&&occasionalTraditional>occasionalPositive);
assert(positiveLastFour>0&&negativeLastFour>0);
assert(occasionalPositive/(occasionalPositive+occasionalTraditional)>0.10&&occasionalPositive/(occasionalPositive+occasionalTraditional)<0.20);
console.log('PASS: random positive gala histories and ballots',{occasionalPositive,occasionalTraditional,positiveLastFour,negativeLastFour});

// Final stretch is independent of nomination mode and ends exactly at the configured final.
const stretchThresholds={3:new Set(),4:new Set()};
let stretchSeasons=0,saveVotes=0;
assert.throws(()=>initGame(Array.from({length:13},(_,i)=>'P'+i),1,{finalStretch:true}),/14/);
for(const mode of ['traditional','gh24','gh1','positive','randomPositive','random'])for(const finalSize of [3,4])for(let seed=1;seed<=30;seed++){
 let state=initGame(Array.from({length:14+seed%4},(_,i)=>'Stretch '+i),seed,{finalStretch:true,finalSize,nominationMode:mode,leaderPolicy:'always',immunityPolicy:'always',repechage:seed%2===0,withdrawals:true,reserves});
 assert(state.finalStretchAt>=finalSize+1&&state.finalStretchAt<=8);
 stretchThresholds[finalSize].add(state.finalStretchAt);
 let started=false,turns=0;
 while(!state.finished){
  const prev=state;state=playNextGala(state);assert(++turns<30);
  if(prev.finalStretchActive)assert(state.finalStretchActive);
  const round=state.houseRounds.at(-1),gala=state.galas.find(g=>g.galaNumber===round.galaNumber);
  if(gala?.finalStretch){
   if(!started)assert(state.activeIds.length<=state.finalStretchAt);
   started=true;
   assert.equal(gala.nominations.length,0);assert(!gala.events.leader&&!gala.events.immunity);
   assert(state.pendingVoteToSave);assert(round.finalStretch);
   const expected=state.activeIds.filter(id=>id!==gala.events.withdrawal?.replacementId&&id!==gala.events.repechage?.returnedId);
   assert.equal([...gala.finalNominees].sort().join(),[...expected].sort().join());
   assert(expected.every(id=>state.timeline[id][gala.galaNumber-1]==='NominadoPublico'));
  }
  const vote=state.publicVotes.at(-1);
  if(vote?.galaNumber===round.galaNumber&&vote.kind==='eviction'){
   assert.equal(!!vote.voteToSave,prev.pendingVoteToSave);
   if(vote.voteToSave){
    saveVotes++;
    assert.equal(vote.percents[vote.expelledId],Math.min(...Object.values(vote.percents)));
    assert(Math.abs(Object.values(vote.percents).reduce((a,b)=>a+b,0)-100)<1e-8);
   }
  }
 }
 assert(started);assert.equal(state.activeIds.length,finalSize);stretchSeasons++;
}
assert.equal(stretchThresholds[3].size,5);assert.equal(stretchThresholds[4].size,4);assert(saveVotes>0);
console.log('PASS: final stretch', {stretchSeasons,saveVotes});

let pointLeaderRounds = 0, randomLeaderRounds = 0, randomLeaderSkips = 0;
for (const mode of ['traditional','gh1','gh24','positive','randomPositive','random'])
for (const leaderMode of ['save','subtract1','subtract3'])
for (const leaderPolicy of ['always','never','random']) {
 const incompatible = leaderMode==='subtract3' && leaderPolicy!=='never' && ['gh1','gh24'].includes(mode);
 const options = {nominationMode:mode,leaderMode,leaderPolicy,immunityPolicy:'always',repechage:true};
 const names = Array.from({length:14},(_,i)=>'Leader '+i);
 if(incompatible){assert.throws(()=>initGame(names,13009,options),/compatible/);continue;}
 let state=initGame(names,13009,options);
 if(leaderMode==='subtract3'&&leaderPolicy!=='never')assert(!['gh1','gh24'].includes(state.nominationMode));
 while(!state.finished){
  state=playNextGala(state);
  const gala=state.galas.at(-1);
  if(!gala||gala.galaNumber!==state.gala-1||!gala.nominations.length||state.finished)continue;
  const save=gala.events.leader,adjust=gala.events.leaderSubtract;
  assert(!(save&&adjust),'only one leader privilege');
  if(leaderPolicy==='always')assert(save||adjust);
  if(leaderPolicy==='never')assert(!save&&!adjust);
  if(leaderPolicy==='random')(save||adjust)?randomLeaderRounds++:randomLeaderSkips++;
  if(leaderMode==='save'){assert(!adjust);continue;}
  assert(!save);
  if(!adjust)continue;
  pointLeaderRounds++;
  assert(gala.provisionalNominees.includes(adjust.targetId));
  assert(gala.nominations.some(n=>n.fromId===adjust.leaderId));
  assert.equal(adjust.before,gala.nominationTotals[adjust.targetId]);
  const positive=gala.nominationMode==='positive';
  assert.equal(adjust.after-adjust.before,(positive?1:-1)*(leaderMode==='subtract1'?1:3));
  const excluded=[gala.events.immunity?.winnerId,gala.events.repechage?.returnedId,gala.events.withdrawal?.replacementId];
  const totals={...gala.nominationTotals,[adjust.targetId]:adjust.after};
  const eligible=Object.entries(totals).filter(([id])=>!excluded.includes(id)).sort((a,b)=>positive?a[1]-b[1]:b[1]-a[1]);
  const min=nominationRules(gala.nominationMode,state.activeIds.length).min;
  const cutoff=eligible[Math.min(min,eligible.length)-1][1];
  const expected=eligible.filter(([,p])=>positive?p<=cutoff:p>=cutoff).map(([id])=>id).sort();
  assert.equal([...gala.finalNominees].sort().join(),expected.join());
 }
}
assert(pointLeaderRounds&&randomLeaderRounds&&randomLeaderSkips);
console.log('PASS: exclusive leader modes, policies, +/-1 and +/-3, compatibility and nomination recalculation.',{pointLeaderRounds,randomLeaderRounds,randomLeaderSkips});

const {resolveMechanics}=load('mechanics');
const drawnModes=new Set();let randomActions=0,randomOmissions=0;
for(const nominationMode of ['traditional','gh1','gh24','positive','randomPositive','random'])
for(let seed=1;seed<=20;seed++) {
 const resolvedByPolicy=['always','random','never'].map(leaderPolicy=>resolveMechanics({leaderMode:'random',leaderPolicy,nominationMode},seed));
 assert(resolvedByPolicy.every(result=>result.leaderMode===resolvedByPolicy[0].leaderMode),'frequency must not affect mode draw');
 for(const leaderPolicy of ['always','random','never']) {
  const options={leaderMode:'random',leaderPolicy,nominationMode};
  let state=initGame(Array.from({length:10},(_,i)=>'Random leader '+i),seed,options);
  const chosen=state.leaderMode;drawnModes.add(chosen);
  assert.equal(initGame(Array.from({length:10},(_,i)=>'Random leader '+i),seed,options).leaderMode,chosen);
  if(['gh1','gh24'].includes(state.nominationMode))assert.notEqual(chosen,'subtract3');
  while(!state.finished){
   state=playNextGala(state);assert.equal(state.leaderMode,chosen,'one mode for entire season');
   const gala=state.galas.at(-1);
   if(!gala||gala.galaNumber!==state.gala-1||!gala.nominations.length||state.finished)continue;
   const action=gala.events.leader||gala.events.leaderSubtract;
   if(leaderPolicy==='always')assert(action);
   if(leaderPolicy==='never')assert(!action);
   if(leaderPolicy==='random')action?randomActions++:randomOmissions++;
  }
 }
}
assert.equal(drawnModes.size,3);assert(randomActions&&randomOmissions);
console.log('PASS: mode draw independent from gala frequency, fixed for season, all modes reached and GH compatibility respected.');

const {updateRelationships,relationshipScore,rankRelations}=load('relationships');
let relationState=initGame(['A','B','C','D','E','F'],123);
const [ra,rb,rc,rd,re,rf]=relationState.activeIds;
for(const a of relationState.activeIds)for(const b of relationState.activeIds)if(a!==b)assert.equal(relationState.relationships[a][b],50);
function relationshipEvent(effect,positive,conflict,ids=[ra,rb]){return {title:'Test',description:'',participantIds:ids,changes:ids.map(id=>({id,before:50,after:positive?60:40,delta:positive?10:-10})),effect,positive,conflict};}
updateRelationships(relationState,relationshipEvent('connection',true,false));assert.equal(relationState.relationships[ra][rb],60);
updateRelationships(relationState,relationshipEvent(undefined,false,true));assert.equal(relationState.relationships[ra][rb],50);
updateRelationships(relationState,relationshipEvent('pact',true,false));assert.equal(relationState.relationships[ra][rb],50);
for(let i=0;i<20;i++)updateRelationships(relationState,relationshipEvent('couple',true,false));assert.equal(relationState.relationships[ra][rb],100);
for(let i=0;i<20;i++)updateRelationships(relationState,relationshipEvent('breakup',false,true));assert.equal(relationState.relationships[ra][rb],0);
assert.equal(relationState.relationships[rb][ra],0);
[rb,rc,rd,re,rf].forEach((id,index)=>relationState.relationships[ra][id]=index*20);
assert.equal(nominationTargets(ra,[rb,rc,rd,re,rf],3,[],mulberry32(2),relationState.relationships).join(),[rb,rc,rd].join());
relationState.nominationMode='positive';
assert.equal(Object.keys(buildNominations(relationState,[3,2,1],undefined,[],mulberry32(2)).find(n=>n.fromId===ra).points).join(),[rf,re,rd].join());
let historyChanges=0;
for(let seed=1;seed<=30;seed++){
 let state=initGame(Array.from({length:14},(_,i)=>'Relation '+i),seed,{leaderPolicy:'always',leaderMode:seed%2?'save':'subtract1',withdrawals:true,reserves:[{name:'New A'},{name:'New B'}]});
 while(!state.finished){
  const previous=structuredClone(state.relationships);state=playNextGala(state);
  const round=state.houseRounds.at(-1);
  for(const event of round.events)for(const change of event.relationshipChanges??[]){historyChanges++;assert.equal(change.after-change.before,change.delta);assert(change.after>=0&&change.after<=100);}
  for(const [a,targets] of Object.entries(state.relationships))for(const [b,value]of Object.entries(targets)){
   assert.equal(value,state.relationships[b][a]);assert(value>=0&&value<=100);
   assert.equal(round.relationships[a][b],value);
   if(previous[a]?.[b]!==undefined&&!round.events.some(event=>event.relationshipChanges?.some(c=>[c.a,c.b].includes(a)&&[c.a,c.b].includes(b))))assert.equal(value,previous[a][b]);
  }
  const gala=state.galas.at(-1);if(!gala||gala.galaNumber!==round.galaNumber)continue;
  const action=gala.events.leader??gala.events.leaderSubtract;
  if(action){
   const target=action.savedId??action.targetId;
   if(target!==action.leaderId){
    let candidates=gala.provisionalNominees;
    if(gala.events.leader&&gala.nominationMode!=='positive'){
     const given=gala.nominations.find(n=>n.fromId===action.leaderId).points;
     const unvoted=candidates.filter(id=>!(id in given));if(unvoted.length)candidates=unvoted;
    }
    candidates=candidates.filter(id=>id!==action.leaderId);
    assert.equal(relationshipScore(state.relationships,action.leaderId,target),Math.max(...candidates.map(id=>relationshipScore(state.relationships,action.leaderId,id))));
   }
  }
 }
}
assert(historyChanges>0);
console.log('PASS: neutral relations, event direction, clamps, symmetric history, worst/best targets, leader affinity and frozen absent pairs.',historyChanges);
