import {DEPLOY_CONTEXT} from './deployment.mjs';
import {getStore} from '@netlify/blobs';
export const enabled=()=>process.env.FLIGHTBOARD_SHARED!=='false';
export const store=(airfield="brentor")=>getStore({name:`${airfield}-v5-${DEPLOY_CONTEXT}`,consistency:'strong'});

