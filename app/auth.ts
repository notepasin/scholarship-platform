import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {sessionUser} from '../lib/auth.mjs';
export async function getUser(){return sessionUser(env.DB,(await headers()).get('cookie'));}
