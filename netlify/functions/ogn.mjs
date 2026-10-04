import {fetchOgn} from '../../lib/ogn.mjs';
export default async(req)=>{try{return Response.json(await fetchOgn(req?new URL(req.url).searchParams.get("airfield")||"brentor":"brentor"),{headers:{'cache-control':'no-store'}});}catch(e){return Response.json({ok:false,error:'Aircraft feed unavailable. Retrying shortly.'},{status:502});}};
