'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MessageCircle,X,Pause,Play} from 'lucide-react';

type Story={id:string;user_id:string;image_url:string;caption:string|null;created_at:string;name:string};
export function StoriesViewer({stories}:{stories:Story[]}){
 const [active,setActive]=useState<number|null>(null);
 const [paused,setPaused]=useState(false);
 const [progress,setProgress]=useState(0);
 const touch=useRef<{x:number;y:number}|null>(null);
 const story=active===null?null:stories[active];
 const activeIndex=active??-1;
 const close=useCallback(()=>{setActive(null);setProgress(0);setPaused(false)},[]);
 const next=useCallback(()=>{setProgress(0);setActive(i=>i===null?null:i>=stories.length-1?null:i+1)},[stories.length]);
 const previous=useCallback(()=>{setProgress(0);setActive(i=>i===null?null:Math.max(0,i-1))},[]);
 useEffect(()=>{if(active===null||paused)return;const started=Date.now();const timer=window.setInterval(()=>{const elapsed=Date.now()-started;setProgress(Math.min(100,elapsed/60));},60);const finish=window.setTimeout(next,6000);return()=>{window.clearInterval(timer);window.clearTimeout(finish)}},[active,paused,next]);
 useEffect(()=>{if(active===null)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')previous();if(e.key===' '){e.preventDefault();setPaused(p=>!p)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[active,close,next,previous]);
 if(!stories.length)return <div className="surface rounded-3xl p-8 text-center text-sm muted">No active stories yet. Start the first one.</div>;
 return <><div className="flex gap-3 overflow-x-auto pb-2">{stories.map((s,i)=><button key={s.id} onClick={()=>{setActive(i);setProgress(0)}} className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center"><span className="grid h-[68px] w-[68px] place-items-center rounded-full bg-gradient-to-tr from-[#f6b34b] via-[#d45c9a] to-[#7956bd] p-[3px] transition group-hover:scale-105"><span className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-white bg-[#eee8f8]">{s.image_url?<Image src={s.image_url} alt="" fill sizes="68px" className="object-cover"/>:<span className="grid h-full place-items-center text-lg font-bold text-[#604b9b]">{s.name.slice(0,1)}</span>}</span></span><span className="w-full truncate text-[11px] font-medium text-[#514a60]">{s.name}</span></button>)}</div>
 {story&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-0 sm:p-5" onTouchStart={e=>{const t=e.touches[0];touch.current={x:t.clientX,y:t.clientY}}} onTouchEnd={e=>{if(!touch.current)return;const t=e.changedTouches[0],dx=t.clientX-touch.current.x,dy=t.clientY-touch.current.y;touch.current=null;if(Math.abs(dy)>100&&Math.abs(dy)>Math.abs(dx)){close();return}if(Math.abs(dx)>65){dx<0?next():previous()}}}>
 <div className="relative h-[100dvh] w-full max-w-[460px] overflow-hidden bg-[#17131f] sm:h-[min(92dvh,850px)] sm:rounded-3xl">
 {story.image_url&&<Image src={story.image_url} alt={story.caption||'CONNECT story'} fill priority sizes="(max-width:640px) 100vw,460px" className="object-contain"/>}
 <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/65"/>
 <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3 pt-[max(env(safe-area-inset-top),12px)]">{stories.map((s,i)=><div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35"><div className="h-full rounded-full bg-white transition-none" style={{width:i<activeIndex?'100%':i===activeIndex?progress+'%':'0%'}}/></div>)}</div>
 <div className="absolute inset-x-0 top-5 z-10 flex items-center gap-3 px-4 pt-3 text-white"><div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm font-bold">{story.name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{story.name}</p><p className="text-[10px] text-white/70">{new Date(story.created_at).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</p></div><button onClick={()=>setPaused(p=>!p)} aria-label={paused?'Resume story':'Pause story'} className="rounded-full p-2 text-white hover:bg-white/15">{paused?<Play size={19}/>:<Pause size={19}/>}</button><button onClick={close} aria-label="Close stories" className="rounded-full p-2 text-white hover:bg-white/15"><X size={22}/></button></div>
 <button aria-label="Previous story" onClick={previous} className="absolute inset-y-20 left-0 z-10 w-[22%] cursor-w-resize"/><button aria-label="Next story" onClick={next} className="absolute inset-y-20 right-0 z-10 w-[22%] cursor-e-resize"/>
 {story.caption&&<div className="absolute inset-x-0 bottom-0 z-10 space-y-4 px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-16 text-white"><p className="text-sm leading-6 drop-shadow">{story.caption}</p><Link href="/chats" onClick={close} className="flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur"><MessageCircle size={17}/> Message {story.name}</Link></div>}
 {!story.caption&&<div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(env(safe-area-inset-bottom),24px)]"><Link href="/chats" onClick={close} className="flex items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur"><MessageCircle size={17}/> Message {story.name}</Link></div>}
 <div className="absolute inset-y-0 left-0 z-[5] flex items-center pl-1 text-white/60"><ChevronLeft size={18}/></div><div className="absolute inset-y-0 right-0 z-[5] flex items-center pr-1 text-white/60"><ChevronRight size={18}/></div>
 </div></div>}
 </>;
}
