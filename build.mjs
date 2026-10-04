import {writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// Capture build context because it is not guaranteed to be present at function runtime.
writeFileSync('lib/deployment.mjs',`export const DEPLOY_CONTEXT=${JSON.stringify(process.env.CONTEXT||'production')};\n`);
for(const dir of ['public','lib','netlify/functions'])for(const file of readdirSync(dir))if(file.endsWith('.mjs'))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
console.log('Flightboard source and server functions checked.');
