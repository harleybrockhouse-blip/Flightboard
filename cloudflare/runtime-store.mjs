import {createD1Store} from './store.mjs';
let factory;
export function configureStore(env) {
  factory = createD1Store(env.DB);
}
export const enabled = () => process.env.FLIGHTBOARD_SHARED !== 'false';
export const store = (airfield) => {
  if (!factory) throw Error('Cloudflare store has not been configured');
  return factory(airfield);
};
