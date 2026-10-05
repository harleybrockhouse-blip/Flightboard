import test from 'node:test';import assert from 'node:assert/strict';
import {classify,kindLabel} from '../public/classification.mjs';
import {parseAdsb,mergeTraffic} from '../public/traffic.mjs';
import {Tracker,validateCorrection,corrected} from '../public/tracker.mjs';
import {AIRFIELDS} from '../public/airfields.mjs';
test('known gliders, tow planes and passing aircraft remain distinct; unknowns are candidates only',()=>{
 assert.equal(classify({vehicleType:'1'}).kind,'glider');assert.equal(classify({emitterCategory:'B1'}).kind,'glider');
 assert.equal(classify({vehicleType:'2',sources:['OGN']}).kind,'other');assert.equal(classify({emitterCategory:'A3'}).kind,'other');
 assert.equal(classify({vehicleType:'0',sources:['OGN']}).kind,'probable');
 assert.equal(classify({speedKmh:90,altitudeM:350,sources:['ADSB']}).kind,'unknown');
 assert.equal(classify({vehicleType:'1',emitterCategory:'A1'}).kind,'probable');
});
test('latest ADS-B positions preserve OGN type and resolve conflicts without duplicate aircraft',()=>{
 const now=Date.now();const rows=parseAdsb({now:now/1000,ac:[{hex:'abcdef',r:'G-TEST',category:'B1',t:'GLID',lat:50,lon:-4,seen_pos:0}]});
 assert.equal(rows[0].emitterCategory,'B1');assert.equal(rows[0].aircraftType,'GLID');
 const result=mergeTraffic([{deviceId:'flarm',registration:'G-TEST',lat:50,lon:-4,reportAt:now-1000,vehicleType:'1'}],rows);
 assert.equal(result.length,1);assert.equal(result[0].vehicleType,'1');assert.equal(result[0].aircraftKind,'glider');
 assert.equal(mergeTraffic([{...result[0],reportAt:now-1000}], [{...rows[0],emitterCategory:'A1'}])[0].aircraftKind,'probable');
});
test('manual review persists and can be cleared, without changing departure origin',()=>{
 const f={registration:'G-TEST',origin:'VISITOR',takeoffAt:1000,landingAt:null,vehicleType:'0',sources:['OGN']};
 const p=validateCorrection({...f,confirmedKind:'glider'}),reviewed=corrected(f,p);
 assert.equal(classify(reviewed).kind,'glider');assert.match(kindLabel(reviewed),/confirmed/);assert.equal(reviewed.origin,'VISITOR');
 assert.equal(classify(corrected(reviewed,validateCorrection({...f,confirmedKind:null}))).kind,'probable');
 assert.throws(()=>validateCorrection({...f,confirmedKind:'airliner'}));
});
test('server tracking retains type evidence across source switches and never makes an overhead glider an airfield launch',()=>{
 const now=Date.now(),a=AIRFIELDS.brentor,t=new Tracker({},a);
 const sample=(ts,extra)=>({deviceId:'A',registration:'G-TEST',lat:a.lat,lon:a.lon,speedKmh:90,altitudeM:500,reportAt:ts,...extra});
 t.update([sample(now-20000,{source:'OGN',sources:['OGN'],vehicleType:'1'})],now-20000);
 t.update([sample(now,{source:'ADSB',sources:['ADSB'],emitterCategory:'B1'})],now);
 assert.equal(t.flights.length,1);assert.equal(t.flights[0].aircraftKind,'glider');assert.equal(t.flights[0].vehicleType,'1');
 assert.equal(t.flights[0].origin,'VISITOR');
 t.update([sample(now+20000,{source:'ADSB',sources:['ADSB']})],now+20000);
 assert.equal(classify(t.flights[0]).kind,'glider');
});
