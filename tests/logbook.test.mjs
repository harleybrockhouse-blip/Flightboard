import test from 'node:test';import assert from 'node:assert/strict';
import {filterLog,dailyTotals,logDays,completedAirTime,launchCount,localRecord} from '../public/logbook.mjs';
import {classify} from '../public/classification.mjs';
import {PREDANNACK_HISTORIC_FLIGHTS} from '../public/predannack-data.mjs';
import {applyIdentity} from '../lib/identity.mjs';
const at=Date.parse('2026-10-04T14:00:00Z');
const rows=[{registration:'G-DDSL',deviceId:'D01496',sources:['OGN'],registryType:'1',origin:'VISITOR',takeoffAt:at,landingAt:at+300000},{registration:'OTHER',vehicleType:'2',origin:'BRENTOR',takeoffAt:at,landingAt:at+100000},{registration:'MAYBE',sources:['OGN'],origin:'BRENTOR',takeoffAt:at,landingAt:null,status:'LOST'}];
test('gliders-only includes registry-identified visitors, excludes probable and tow aircraft',()=>{
 assert.equal(filterLog(rows).length,1);assert.equal(filterLog(rows,{kind:'glider',origin:'local',airfieldOrigin:'BRENTOR'}).length,0);
 assert.equal(filterLog(rows,{kind:'probable',status:'lost'}).length,1);assert.equal(filterLog(rows,{kind:'all',query:'ddsl'}).length,1);
});
test('daily totals keep activity distinct from confirmed airfield departures and include empty dates',()=>{
 const totals=dailyTotals(filterLog(rows),logDays('2026-10-05'), 'BRENTOR');const sunday=totals.find(x=>x.day==='2026-10-04');
 assert.equal(sunday.gliders,1);assert.equal(sunday.launches,0);assert.equal(sunday.duration,300000);assert.equal(totals.find(x=>x.day==='2026-10-03').flights,0);
});
test('PDANNACK GLIM uses the user-confirmed identity without guessing a departure',()=>{
 const c=classify({cn:'PDANNACK GLIM',origin:'VISITOR'});assert.equal(c.kind,'glider');assert.match(c.reason,/User-confirmed/);
});
test('supplied 43BC85 track contributes six permanent Predannack flights and totals',()=>{
 assert.equal(PREDANNACK_HISTORIC_FLIGHTS.length,6);
 assert.equal(PREDANNACK_HISTORIC_FLIGHTS.every(f=>localRecord(f,'PREDANNACK')&&classify(f).kind==='glider'),true);
 assert.equal(launchCount(PREDANNACK_HISTORIC_FLIGHTS,'PREDANNACK'),6);
 assert.equal(completedAirTime(PREDANNACK_HISTORIC_FLIGHTS),2028600);
});
test('registry respects opt-outs and manual review, and rejects ambiguous aircraft types',()=>{
 const a={registration:'G-TEST',deviceId:'A',sources:['OGN']},d={registration:'G-TEST',device_id:'A',aircraft_type:1,tracked:'Y',identified:'Y',aircraft_model:'Twin Astir'};
 assert.equal(applyIdentity(a,[d]).aircraftKind,'glider');assert.equal(applyIdentity(a,[{...d,identified:'N'}]).registryType,undefined);
 assert.equal(applyIdentity({...a,confirmedKind:'other'},[d]).aircraftKind,'other');
 assert.equal(applyIdentity(a,[d,{...d,aircraft_type:2}]).registryType,undefined);
});
