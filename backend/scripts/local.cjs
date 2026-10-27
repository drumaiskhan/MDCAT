const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
function run(command,args=[],cwd=root){const result=spawnSync(command,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(result.error)throw new Error(`${command} could not start. Install Node.js 24.22.1 and Docker Desktop (for the local database).`);if(result.status!==0)throw new Error(`${command} exited with code ${result.status}.`);}
function createLocalEnv(directory){const target=path.join(directory,'.env');if(fs.existsSync(target))return false;let text=fs.readFileSync(path.join(directory,'.env.example'),'utf8');text=text.replace('replace-with-a-long-random-secret-before-running',crypto.randomBytes(48).toString('hex')).replace('owner@example.com','admin@localhost.test').replace('replace-with-your-own-strong-password',crypto.randomBytes(18).toString('base64url')).replace('replace-with-local-student-password',crypto.randomBytes(18).toString('base64url'));fs.writeFileSync(target,text,{mode:0o600,flag:'wx'});return true;}
function npm(args){run(process.platform==='win32'?'npm.cmd':'npm',args);}
function verifyLocal(){if(!fs.existsSync(path.join(root,'.env')))throw new Error('Run npm run setup first.');const env=fs.readFileSync(path.join(root,'.env'),'utf8');if(/replace-with-|owner@example.com/.test(env))throw new Error('Complete DATABASE_URL, JWT_SECRET and admin credentials in the root .env before starting.');if(!fs.existsSync(path.join(root,'node_modules')))throw new Error('Dependencies are missing. Run npm run setup.');}
function main(){const action=process.argv[2]||'help';if(![24].includes(Number(process.versions.node.split('.')[0])))throw new Error('Use Node.js 24.22.1 for this project.');switch(action){
case 'setup':{const created=createLocalEnv(root);console.log(created?'Created local .env. Your local admin email/password are in that file.':'Keeping your existing .env unchanged.');npm(['ci']);console.log('Setup complete. Start Docker Desktop, then run npm run db:start and npm run dev.');break;}
case 'dev':verifyLocal();npm(['run','dev:all']);break;
case 'db:start':run('docker',['compose','up','-d','--wait']);break;
case 'db:stop':run('docker',['compose','stop']);break;
case 'doctor':console.log(`Node ${process.versions.node}`);console.log(`Root .env: ${fs.existsSync(path.join(root,'.env'))?'present':'missing — run npm run setup'}`);console.log(`Dependencies: ${fs.existsSync(path.join(root,'node_modules'))?'present':'missing — run npm run setup'}`);run('docker',['compose','version']);console.log('For database readiness: docker compose ps. For API readiness: http://localhost:3001/api/healthz');break;
default:console.log('Commands: npm run setup | npm run db:start | npm run dev | npm run doctor | npm run db:stop');}}
module.exports={createLocalEnv};
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
