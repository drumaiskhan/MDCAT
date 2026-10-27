import {apiOrigin} from '@/lib/api-origin';
import { getNativeAuthToken, peekNativeAuthToken } from '@/lib/native-auth';
export const apiBase = () => `${(apiOrigin || '').replace(/\/$/, '')}/api/study-library`;
export const authHeaders = (): Record<string,string> => { const token = peekNativeAuthToken(); return token ? {Authorization: `Bearer ${token}`} : {}; };
export async function api(path: string, body?: unknown): Promise<any> {
 const token = await getNativeAuthToken();
 const response = await fetch(apiBase() + path, {credentials:'include', method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
 return data;
}
