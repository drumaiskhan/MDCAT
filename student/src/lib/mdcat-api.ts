import {apiOrigin} from '@/lib/api-origin';
export async function learningApi<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
 const base=(apiOrigin||'').replace(/\/$/,'');
 const response=await fetch(base+'/api'+path,{credentials:'include',method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;
}
