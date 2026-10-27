import {useGetCurrentUser} from '@workspace/api-client-react';
export function useAuth() { const {data} = useGetCurrentUser(); return {user: data ? {...data, uid: String(data.id)} : null}; }
