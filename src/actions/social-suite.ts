'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
async function current(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');return{db,user};}
export async function createStory(fd:FormData){const{db,user}=await current();const file=fd.get('photo');if(!(file instanceof File)||!file.size||!file.type.startsWith('image/')||file.size>8*1024*1024)throw new Error('Choose an image smaller than 8 MB.');const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'');const path=user.id+'/story-'+crypto.randomUUID()+'.'+ext;const{error:up}=await db.storage.from('connect-stories').upload(path,file,{contentType:file.type});if(up)throw new Error(up.message);const audience=fd.get('audience')==='connections'?'connections':'everyone';const{error}=await db.from('stories').insert({user_id:user.id,image_path:path,caption:String(fd.get('caption')||'').trim().slice(0,180),audience});if(error){await db.storage.from('connect-stories').remove([path]);throw new Error(error.message);}revalidatePath('/stories');revalidatePath('/photos');}
export async function createNote(fd:FormData){const{db,user}=await current();const content=String(fd.get('content')||'').trim().slice(0,100);if(!content)throw new Error('Write a note first.');const audience=fd.get('audience')==='connections'?'connections':'everyone';const{error}=await db.from('notes').insert({user_id:user.id,content,audience});if(error)throw new Error(error.message);revalidatePath('/stories');revalidatePath('/chats');}
export async function answerDailyPrompt(fd:FormData){const{db,user}=await current();const prompt_id=String(fd.get('prompt_id')||'');const response=String(fd.get('response')||'').trim().slice(0,500);if(!prompt_id||!response)throw new Error('Write a response first.');const{error}=await db.from('prompt_responses').upsert({prompt_id,user_id:user.id,response},{onConflict:'prompt_id,user_id'});if(error)throw new Error(error.message);revalidatePath('/prompts');}
export async function createBlend(fd:FormData){const{db}=await current();const name=String(fd.get('name')||'').trim();const description=String(fd.get('description')||'').trim();if(name.length<3)throw new Error('Blend name must have at least 3 characters.');const{data,error}=await db.rpc('create_connect_blend',{p_name:name,p_description:description});if(error)throw new Error(error.message);revalidatePath('/blends');redirect('/blends/'+data);}
export async function joinBlend(id:string){const{db,user}=await current();const{error}=await db.from('blend_members').upsert({blend_id:id,user_id:user.id},{onConflict:'blend_id,user_id',ignoreDuplicates:true});if(error)throw new Error(error.message);revalidatePath('/blends');redirect('/blends/'+id);}
export async function addBlendItem(id:string,fd:FormData){const{db,user}=await current();const content=String(fd.get('content')||'').trim().slice(0,500);if(!content)throw new Error('Write something first.');const{error}=await db.from('blend_items').insert({blend_id:id,user_id:user.id,content});if(error)throw new Error(error.message);revalidatePath('/blends/'+id);}

const STORY_REACTIONS=['❤️','😂','😍','🔥','👏','😮'] as const;
export async function reactToStory(storyId:string,emoji:string){
 const{db,user}=await current();
 if(!(STORY_REACTIONS as readonly string[]).includes(emoji))throw new Error('Unsupported reaction.');
 const{data:story}=await db.from('stories').select('id').eq('id',storyId).maybeSingle();
 if(!story)throw new Error('This story is no longer available.');
 const{error}=await db.from('story_reactions').upsert({story_id:storyId,user_id:user.id,emoji},{onConflict:'story_id,user_id'});
 if(error)throw new Error(error.message);
 revalidatePath('/stories');
}
export async function replyToStory(storyId:string,content:string){
 const{db,user}=await current();
 const body=content.trim();
 if(!body||body.length>300)throw new Error('Reply must be between 1 and 300 characters.');
 const{data:story,error:storyError}=await db.from('stories').select('id,user_id').eq('id',storyId).maybeSingle();
 if(storyError||!story)throw new Error('This story is no longer available.');
 if(story.user_id===user.id)throw new Error('You cannot reply to your own story.');
 const{error}=await db.from('story_replies').insert({story_id:storyId,sender_id:user.id,recipient_id:story.user_id,content:body});
 if(error)throw new Error(error.message);
 revalidatePath('/stories');
 revalidatePath('/chats');
}
