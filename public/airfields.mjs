export const AIRFIELDS = {
 brentor: {id:'brentor',name:'Brentor',subtitle:'Dartmoor Gliding Society',lat:50.592183,lon:-4.151667,elevationM:250,radiusM:850,origin:'BRENTOR'},
 predannack: {id:'predannack',name:'Predannack',subtitle:'626 Volunteer Gliding Squadron',lat:49.99917,lon:-5.23056,elevationM:90,radiusM:1200,origin:'PREDANNACK'}
};
export const resolveAirfield=id=>AIRFIELDS[id||'brentor']||null;
export const storageKey=(id,kind)=>`${id}-v5-${kind}`;
export const feedBox=a=>({north:a.lat+.28,south:a.lat-.28,east:a.lon+.45,west:a.lon-.45});
export const WEATHER_MODELS={auto:{name:'Open-Meteo · Automatic blend',model:null},metoffice:{name:'UK Met Office · via Open-Meteo',model:'ukmo_seamless'},ecmwf:{name:'European Centre for Medium-Range Weather Forecasts · via Open-Meteo',model:'ecmwf_ifs025'}};
