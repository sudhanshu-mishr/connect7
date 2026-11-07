'use server';
import { revalidatePath } from 'next/cache'; import { createClient } from '@/lib/supabase/server';
async function current(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user) throw new Error('Please sign in.');return {db,user};}
export async function sendRequest(targetId:string){const {db,user}=await current();if(targetId===user.id) throw new Error('You cannot connect with yourself.');const {error}=await db.from('connection_requests').upsert({from_user:user.id,to_user:targetId,status:'pending'},{onConflict:'from_user,to_user'});if(error) throw new Error(error.message);revalidatePath('/discover');revalidatePath('/requests');}
export async function respondRequest(id:string,accept:boolean){const {db,user}=await current();if(accept){const {error}=await db.rpc('accept_connection_request',{request_id:id});if(error) throw new Error(error.message);}else{const {error}=await db.from('connection_requests').update({status:'rejected'}).eq('id',id).eq('to_user',user.id).eq('status','pending');if(error) throw new Error(error.message);}
revalidatePath('/requests');revalidatePath('/chats');}
