'use client';
import {useEffect} from 'react';
export default function ErrorPage({error,reset}:{error:Error & {digest?:string};reset:()=>void}){useEffect(()=>{console.error(error)},[error]);return <main className="grid min-h-screen place-items-center p-6 text-center"><div className="surface max-w-md rounded-3xl p-8"><h1 className="text-2xl font-semibold">Something went wrong.</h1><p className="mt-2 text-sm muted">Your data is safe. Try again, or return to CONNECT.</p><button onClick={()=>reset()} className="btn btn-primary mt-6">Try again</button></div></main>}
