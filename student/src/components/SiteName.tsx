import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {siteContentApi} from '@/lib/api';
export default function SiteName(){const q=useQuery({queryKey:['site-content'],queryFn:siteContentApi.get});const name=q.data?.PLATFORM_NAME?.trim()||'MDCAT';useEffect(()=>{document.title=name;if(q.data)try{localStorage.setItem('study-branding-v2',JSON.stringify({...JSON.parse(localStorage.getItem('study-branding-v2')||'{}'),name}));}catch{}},[name,q.data]);return <>{name}</>;}
