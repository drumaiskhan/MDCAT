import {apiOrigin} from '@/lib/api-origin';
import {isNativeApp,getNativeAuthToken} from '@/lib/native-auth';
// Same auth rules as lib/api.ts: the website uses the HttpOnly session cookie;
// the Capacitor Android app has no reliable cross-origin cookies, so it sends
// its stored bearer token and omits cookies. Without this every call made here
// (lectures, chapters, course years, flashcard progress) returned 401
// "Please sign in to continue." inside the app.
export async function learningApi<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
 const base=(apiOrigin||'').replace(/\/$/,'');
 const native=isNativeApp();
 const token=native?await getNativeAuthToken():null;
 const headers:Record<string,string>={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
 const response=await fetch(base+'/api'+path,{credentials:native?'omit':'include',method:method||(body===undefined?'GET':'POST'),headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;
}
