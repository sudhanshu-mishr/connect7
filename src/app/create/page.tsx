'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useState} from 'react';
import {ArrowLeft,ImagePlus,MapPin,Smile, X} from 'lucide-react';
import {createPhoto} from '@/actions/social';

export default function CreatePage(){
 const [preview,setPreview]=useState<string|null>(null);
 const [fileName,setFileName]=useState('');
 function choose(file?:File){if(preview)URL.revokeObjectURL(preview);if(file&&file.type.startsWith('image/')){setPreview(URL.createObjectURL(file));setFileName(file.name)}else{setPreview(null);setFileName('')}}
 return <main className="mx-auto min-h-[calc(100dvh-150px)] max-w-[760px] px-4 py-5 sm:py-8">
  <div className="mb-6 flex items-center gap-3"><Link href="/photos" aria-label="Back to home" className="grid h-10 w-10 place-items-center rounded-full border border-[#eeeaf3] bg-white text-[#5e536f]"><ArrowLeft size={19}/></Link><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#938aa5]">Create</p><h1 className="text-xl font-semibold tracking-tight text-[#30283d]">New photo post</h1></div></div>
  <form action={createPhoto} className="overflow-hidden rounded-[26px] border border-[#eeeaf3] bg-white shadow-[0_18px_55px_rgba(35,24,74,.06)]">
   <div className="flex items-center justify-between border-b border-[#f0edf4] px-5 py-4"><div><p className="text-sm font-semibold">Share a moment</p><p className="mt-0.5 text-xs text-[#958da2]">Post a photo for your CONNECT community</p></div><span className="rounded-full bg-[#f2edfb] px-3 py-1 text-[10px] font-semibold text-[#65509a]">PHOTO</span></div>
   <div className="p-4 sm:p-6">
    <label className="group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-[#d8cfe8] bg-[#faf9fc] text-center transition hover:border-[#9d88cc] hover:bg-[#f7f3fc] sm:min-h-[420px]">
     {preview?<><Image src={preview} alt="Selected photo preview" fill unoptimized sizes="(max-width:760px) 100vw,700px" className="object-contain"/><span className="absolute right-3 top-3 rounded-full bg-black/55 p-2 text-white"><X size={16}/></span></>:<><span className="mb-4 grid h-16 w-16 place-items-center rounded-[22px] bg-[#eee8fa] text-[#6c56a2] transition group-hover:scale-105"><ImagePlus size={29}/></span><span className="text-sm font-semibold text-[#393146]">Choose a photo</span><span className="mt-1 text-xs text-[#928a9f]">JPG, PNG, WEBP or GIF · up to 8 MB</span><span className="mt-5 rounded-full bg-[#6c56a2] px-5 py-2.5 text-xs font-semibold text-white">Select from device</span></>}
     <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif" required className="absolute inset-0 cursor-pointer opacity-0" onChange={e=>choose(e.target.files?.[0])}/>
    </label>
    {fileName&&<p className="mt-2 truncate text-xs text-[#81788f]">{fileName}</p>}
    <label className="mt-5 block"><span className="mb-2 block text-xs font-semibold text-[#51485f]">Caption</span><textarea name="caption" maxLength={240} rows={3} placeholder="Write a caption… Share the story behind your photo." className="w-full resize-none rounded-2xl border border-[#eae5f0] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#aaa3b2] focus:border-[#9c87ca] focus:ring-4 focus:ring-[#eee8fa]"/></label>
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#faf9fc] px-4 py-3"><div className="flex items-center gap-2 text-xs text-[#81788f]"><Smile size={16}/> Keep it kind and authentic</div><span className="text-[10px] text-[#aaa3b2]">Visible in your feed</span></div>
   </div>
   <div className="flex items-center justify-between gap-3 border-t border-[#f0edf4] px-4 py-4 sm:px-6"><Link href="/photos" className="text-xs font-semibold text-[#80778d]">Cancel</Link><button className="rounded-full bg-[#69539f] px-7 py-3 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(105,83,159,.22)] transition hover:bg-[#584487] active:scale-[.98]">Share post</button></div>
  </form>
 </main>;
}
