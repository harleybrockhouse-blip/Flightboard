export const PREDANNACK_FLEET=Object.freeze({
 '43BC85':Object.freeze({deviceId:'43BC85',icaoHex:'43bc85',callsign:'PDANNACK',aircraftType:'G103 Viking T1',operator:'626 Volunteer Gliding Squadron'})
});

const common=Object.freeze({deviceId:'43BC85',icaoHex:'43bc85',registration:'43BC85',cn:'PDANNACK',aircraftType:'G103 Viking T1',operator:'626 Volunteer Gliding Squadron',origin:'PREDANNACK',status:'LANDED',source:'ADSB',sources:['ADSB'],provider:'User-supplied KML track',historical:true,estimatedTakeoff:true,estimatedLanding:true,departureConfirmed:true,partial:false,referenceElevationM:90,heightBaselineM:90,altitudeReference:'EGM96-corrected geometric altitude',detectionVersion:12,dataProvenance:'43BC85-track-EGM96.kml supplied 6 October 2026',note:'Times are the first and last recorded positions in each circuit; treat them as estimates.'});
const flight=(takeoffAt,landingAt,maxAltM,index)=>Object.freeze({...common,id:`43BC85-20261003-${index}`,takeoffAt,landingAt,lastReportAt:landingAt,maxAltM,maxRelativeHeightM:maxAltM-common.referenceElevationM});

// Six circuits separated by gaps of more than two minutes in the supplied
// corrected track. The interface converts these UTC values to Europe/London.
export const PREDANNACK_HISTORIC_FLIGHTS=Object.freeze([
 flight(1791029098180,1791029453760,587,1),
 flight(1791029660620,1791029995580,557,2),
 flight(1791031018130,1791031346040,488,3),
 flight(1791031738770,1791032069710,503,4),
 flight(1791033035270,1791033400580,625,5),
 flight(1791033562840,1791033876740,450,6)
]);

const normalize=value=>String(value||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
export function predannackFleetAircraft(aircraft={}){
 const key=[aircraft.icaoHex,aircraft.deviceId,aircraft.registration].map(normalize).find(value=>PREDANNACK_FLEET[value]);
 return key?PREDANNACK_FLEET[key]:null;
}
