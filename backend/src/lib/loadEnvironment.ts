import {config} from 'dotenv';
import {existsSync} from 'node:fs';
import path from 'node:path';
// Locate the workspace .env for both npm dev (API cwd) and cPanel (root cwd).
config();
let directory=process.cwd();
for(let depth=0;depth<5;depth++){
 if(existsSync(path.join(directory,'compose.yaml'))){config({path:path.join(directory,'.env')});break;}
 const parent=path.dirname(directory);if(parent===directory)break;directory=parent;
}
