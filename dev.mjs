import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import ogn from './netlify/functions/ogn.mjs';
import weather from './netlify/functions/weather.mjs';
const root=resolve('public'),port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;let response;if(path==='/.netlify/functions/ogn')response=await ogn(new Request(new URL(req.url,"http://localhost")));else if(path==='/.netlify/functions/weather')response=await weather(new Request(new URL(req.url,"http://localhost")));else if(path==='/.netlify/functions/records')response=Response.json({enabled:false});if(response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return}const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}const body=await readFile(file);res.setHeader('content-type',({'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body)}catch{res.writeHead(404);res.end('Not found')}}).listen(port,()=>console.log(`Flightboard preview http://localhost:${port} · Demo /?demo=1`));
