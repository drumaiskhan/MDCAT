// config.js is loaded before the application; edit it after uploading to your host.
const runtime=(window as Window & {__MDCAT_CONFIG__?:{apiOrigin?:string}}).__MDCAT_CONFIG__?.apiOrigin;
const configured=(runtime||import.meta.env.VITE_API_BASE_URL||'').trim().replace(/\/+$/,'');
function normalize(value:string){if(!value)return '';const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Invalid API origin in config.js');if(url.pathname!=='/'||url.search||url.hash)throw new Error('Use only the API origin in config.js, without /api or another path.');return url.origin;}
export const apiOrigin=normalize(configured);
