import {getUser} from './auth';
import ScholarshipApp from './scholarship-app';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getUser();return <ScholarshipApp user={user?{name:user.displayName,email:''}:null} signInUrl="/login" signOutUrl="/api/auth/logout"/>;}
