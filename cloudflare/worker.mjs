import ogn from './ogn.mjs';
import weather from './weather.mjs';
import records from './records.mjs';
import history from './history.mjs';
import collect from './collect.mjs';
import {configureStore} from './runtime-store.mjs';
const handlers = {ogn, weather, records, history};
export default {
  async fetch(request, env, ctx) {
    configureStore(env);
    const path = new URL(request.url).pathname;
    const name = path.match(/^\/\.netlify\/functions\/(ogn|weather|records|history)$/)?.[1];
    if (name) return handlers[name](request);
    if (path.startsWith('/.netlify/functions/')) return Response.json({error: 'Not found'}, {status: 404});
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller, env, ctx) {
    configureStore(env);
    ctx.waitUntil(collect());
  }
};
