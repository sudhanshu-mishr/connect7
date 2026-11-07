export function initials(name?: string | null) { return (name || 'C').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
export function compatibility(a: Record<string,string[]>, b: Record<string,string[]>) {
  const scores:number[]=[];
  for(let i=1;i<=10;i++){
    const A=new Set(a[String(i)]||[]),B=new Set(b[String(i)]||[]);
    if(!A.size||!B.size) continue;
    const overlap=Array.from(A).filter(x=>B.has(x)).length;
    const union=new Set([...Array.from(A),...Array.from(B)]).size;
    // Each question contributes equally; multi-select questions use Jaccard similarity.
    scores.push(Math.round(100*overlap/union));
  }
  return scores.length?Math.round(scores.reduce((x,y)=>x+y,0)/scores.length):0;
}
