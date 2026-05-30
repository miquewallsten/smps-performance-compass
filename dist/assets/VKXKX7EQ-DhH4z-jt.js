var Ts=Object.defineProperty;var qs=(e,t,n)=>t in e?Ts(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var Re=(e,t,n)=>qs(e,typeof t!="symbol"?t+"":t,n);import{bB as Zn,bC as Jn,bD as B,bE as gr,bF as se,bG as I,bH as y,bI as W,bJ as xe,bK as $e,bL as G,bM as T,bN as V,bO as K,bP as Pe,bQ as ft,bR as ge,bS as Wo,bT as U,bU as Fs,bV as P,bW as Ct,bX as cn,bY as E,bZ as q,b_ as _t,b$ as wt,c0 as Os,c1 as Bt,c2 as Ls,c3 as Is,c4 as En,c5 as Ps,c6 as _s,c7 as Rs,c8 as Ht,c9 as zs,ca as Ks,cb as Bs,cc as hr,cd as Ns,ce as Rt,cf as Qo,cg as Qr,ch as Hs,ci as Vs,cj as Gn,ck as Gs,cl as Us,cm as js,cn as Ws}from"./index-DUv6oGF1.js";var Qs=e=>e!=null,Ys=e=>e.filter(Qs);function Xs(e){return(...t)=>{for(const n of e)n&&n(...t)}}var D=e=>typeof e=="function"&&!e.length?e():e,er=e=>Array.isArray(e)?e:e?[e]:[];function Zs(e,...t){return typeof e=="function"?e(...t):e}var Js=U;function ea(e,t,n,r){const o=e.length,s=t.length;let a=0;if(!s){for(;a<o;a++)n(e[a]);return}if(!o){for(;a<s;a++)r(t[a]);return}for(;a<s&&t[a]===e[a];a++);let l,i;t=t.slice(a),e=e.slice(a);for(l of t)e.includes(l)||r(l);for(i of e)t.includes(i)||n(i)}function ta(e){const[t,n]=B(),r=e!=null&&e.throw?(c,f)=>{throw n(c instanceof Error?c:new Error(f)),c}:(c,f)=>{n(c instanceof Error?c:new Error(f))},o=e!=null&&e.api?Array.isArray(e.api)?e.api:[e.api]:[globalThis.localStorage].filter(Boolean),s=e!=null&&e.prefix?`${e.prefix}.`:"",a=new Map,l=new Proxy({},{get(c,f){let g=a.get(f);g||(g=B(void 0,{equals:!1}),a.set(f,g)),g[0]();const m=o.reduce((v,b)=>{if(v!==null||!b)return v;try{return b.getItem(`${s}${f}`)}catch(p){return r(p,`Error reading ${s}${f} from ${b.name}`),null}},null);return m!==null&&(e!=null&&e.deserializer)?e.deserializer(m,f,e.options):m}}),i=(c,f,g)=>{const m=e!=null&&e.serializer?e.serializer(f,c,g??e.options):f,v=`${s}${c}`;o.forEach(p=>{try{p.getItem(v)!==m&&p.setItem(v,m)}catch(w){r(w,`Error setting ${s}${c} to ${m} in ${p.name}`)}});const b=a.get(c);b&&b[1]()},u=c=>o.forEach(f=>{try{f.removeItem(`${s}${c}`)}catch(g){r(g,`Error removing ${s}${c} from ${f.name}`)}}),h=()=>o.forEach(c=>{try{c.clear()}catch(f){r(f,`Error clearing ${c.name}`)}}),d=()=>{const c={},f=(g,m)=>{if(!c.hasOwnProperty(g)){const v=m&&(e!=null&&e.deserializer)?e.deserializer(m,g,e.options):m;v&&(c[g]=v)}};return o.forEach(g=>{if(typeof g.getAll=="function"){let m;try{m=g.getAll()}catch(v){r(v,`Error getting all values from in ${g.name}`)}for(const v of m)f(v,m[v])}else{let m=0,v;try{for(;v=g.key(m++);)c.hasOwnProperty(v)||f(v,g.getItem(v))}catch(b){r(b,`Error getting all values from ${g.name}`)}}}),c};return(e==null?void 0:e.sync)!==!1&&Ct(()=>{const c=f=>{var m;let g=!1;o.forEach(v=>{try{v!==f.storageArea&&f.key&&f.newValue!==v.getItem(f.key)&&(f.newValue?v.setItem(f.key,f.newValue):v.removeItem(f.key),g=!0)}catch(b){r(b,`Error synching api ${v.name} from storage event (${f.key}=${f.newValue})`)}}),g&&f.key&&((m=a.get(f.key))==null||m[1]())};"addEventListener"in globalThis?(globalThis.addEventListener("storage",c),U(()=>globalThis.removeEventListener("storage",c))):(o.forEach(f=>{var g;return(g=f.addEventListener)==null?void 0:g.call(f,"storage",c)}),U(()=>o.forEach(f=>{var g;return(g=f.removeEventListener)==null?void 0:g.call(f,"storage",c)})))}),[l,i,{clear:h,error:t,remove:u,toJSON:d}]}var na=ta,ra=e=>(typeof e.clear=="function"||(e.clear=()=>{let t;for(;t=e.key(0);)e.removeItem(t)}),e),Yr=e=>{if(!e)return"";let t="";for(const n in e){if(!e.hasOwnProperty(n))continue;const r=e[n];t+=r instanceof Date?`; ${n}=${r.toUTCString()}`:typeof r=="boolean"?`; ${n}`:`; ${n}=${r}`}return t},ze=ra({_cookies:[globalThis.document,"cookie"],getItem:e=>{var t;return((t=ze._cookies[0][ze._cookies[1]].match("(^|;)\\s*"+e+"\\s*=\\s*([^;]+)"))==null?void 0:t.pop())??null},setItem:(e,t,n)=>{const r=ze.getItem(e);ze._cookies[0][ze._cookies[1]]=`${e}=${t}${Yr(n)}`;const o=Object.assign(new Event("storage"),{key:e,oldValue:r,newValue:t,url:globalThis.document.URL,storageArea:ze});window.dispatchEvent(o)},removeItem:e=>{ze._cookies[0][ze._cookies[1]]=`${e}=deleted${Yr({expires:new Date(0)})}`},key:e=>{let t=null,n=0;return ze._cookies[0][ze._cookies[1]].replace(/(?:^|;)\s*(.+?)\s*=\s*[^;]+/g,(r,o)=>(!t&&o&&n++===e&&(t=o),"")),t},get length(){let e=0;return ze._cookies[0][ze._cookies[1]].replace(/(?:^|;)\s*.+?\s*=\s*[^;]+/g,t=>(e+=t?1:0,"")),e}}),oa=1024,Gt=796,Yo=700,ia="bottom-right",tr="bottom",sa="system",aa=!1,Sn=500,la=500,kn=500,ca=Object.keys(Zn)[0],Xr=1,ua=Object.keys(Jn)[0],Xo=xe({client:void 0,onlineManager:void 0,queryFlavor:"",version:"",shadowDOMTarget:void 0});function H(){return $e(Xo)}var Zr=class extends Error{},Zo=xe(void 0),da=e=>{const[t,n]=B(null),r=()=>{const a=t();a!=null&&(a.close(),n(null))},o=(a,l)=>{if(t()!=null)return;const i=window.open("","TSQD-Devtools-Panel",`width=${a},height=${l},popup`);if(!i)throw new Zr("Failed to open popup. Please allow popups for this site to view the devtools in picture-in-picture mode.");i.document.head.innerHTML="",i.document.body.innerHTML="",Rs(i.document),i.document.title="TanStack Query Devtools",i.document.body.style.margin="0",i.addEventListener("pagehide",()=>{e.setLocalStore("pip_open","false"),n(null)}),[...(H().shadowDOMTarget||document).styleSheets].forEach(u=>{try{const h=[...u.cssRules].map(g=>g.cssText).join(""),d=document.createElement("style"),c=u.ownerNode;let f="";c&&"id"in c&&(f=c.id),f&&d.setAttribute("id",f),d.textContent=h,i.document.head.appendChild(d)}catch{const d=document.createElement("link");if(u.href==null)return;d.rel="stylesheet",d.type=u.type,d.media=u.media.toString(),d.href=u.href,i.document.head.appendChild(d)}}),gr(["focusin","focusout","pointermove","keydown","pointerdown","pointerup","click","mousedown","input"],i.document),e.setLocalStore("pip_open","true"),n(i)};V(()=>{if((e.localStore.pip_open??"false")==="true"&&!e.disabled)try{o(Number(window.innerWidth),Number(e.localStore.height||la))}catch(l){if(l instanceof Zr){console.error(l.message),e.setLocalStore("pip_open","false"),e.setLocalStore("open","false");return}throw l}}),V(()=>{const a=(H().shadowDOMTarget||document).querySelector("#_goober"),l=t();if(a&&l){const i=new MutationObserver(()=>{const u=(H().shadowDOMTarget||l.document).querySelector("#_goober");u&&(u.textContent=a.textContent)});i.observe(a,{childList:!0,subtree:!0,characterDataOldValue:!0}),U(()=>{i.disconnect()})}});const s=I(()=>({pipWindow:t(),requestPipWindow:o,closePipWindow:r,disabled:e.disabled??!1}));return y(Zo.Provider,{value:s,get children(){return e.children}})},vr=()=>I(()=>{const t=$e(Zo);if(!t)throw new Error("usePiPWindow must be used within a PiPProvider");return t()}),Jo=xe(()=>"dark");function Ce(){return $e(Jo)}var ei={À:"A",Á:"A",Â:"A",Ã:"A",Ä:"A",Å:"A",Ấ:"A",Ắ:"A",Ẳ:"A",Ẵ:"A",Ặ:"A",Æ:"AE",Ầ:"A",Ằ:"A",Ȃ:"A",Ç:"C",Ḉ:"C",È:"E",É:"E",Ê:"E",Ë:"E",Ế:"E",Ḗ:"E",Ề:"E",Ḕ:"E",Ḝ:"E",Ȇ:"E",Ì:"I",Í:"I",Î:"I",Ï:"I",Ḯ:"I",Ȋ:"I",Ð:"D",Ñ:"N",Ò:"O",Ó:"O",Ô:"O",Õ:"O",Ö:"O",Ø:"O",Ố:"O",Ṍ:"O",Ṓ:"O",Ȏ:"O",Ù:"U",Ú:"U",Û:"U",Ü:"U",Ý:"Y",à:"a",á:"a",â:"a",ã:"a",ä:"a",å:"a",ấ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",æ:"ae",ầ:"a",ằ:"a",ȃ:"a",ç:"c",ḉ:"c",è:"e",é:"e",ê:"e",ë:"e",ế:"e",ḗ:"e",ề:"e",ḕ:"e",ḝ:"e",ȇ:"e",ì:"i",í:"i",î:"i",ï:"i",ḯ:"i",ȋ:"i",ð:"d",ñ:"n",ò:"o",ó:"o",ô:"o",õ:"o",ö:"o",ø:"o",ố:"o",ṍ:"o",ṓ:"o",ȏ:"o",ù:"u",ú:"u",û:"u",ü:"u",ý:"y",ÿ:"y",Ā:"A",ā:"a",Ă:"A",ă:"a",Ą:"A",ą:"a",Ć:"C",ć:"c",Ĉ:"C",ĉ:"c",Ċ:"C",ċ:"c",Č:"C",č:"c",C̆:"C",c̆:"c",Ď:"D",ď:"d",Đ:"D",đ:"d",Ē:"E",ē:"e",Ĕ:"E",ĕ:"e",Ė:"E",ė:"e",Ę:"E",ę:"e",Ě:"E",ě:"e",Ĝ:"G",Ǵ:"G",ĝ:"g",ǵ:"g",Ğ:"G",ğ:"g",Ġ:"G",ġ:"g",Ģ:"G",ģ:"g",Ĥ:"H",ĥ:"h",Ħ:"H",ħ:"h",Ḫ:"H",ḫ:"h",Ĩ:"I",ĩ:"i",Ī:"I",ī:"i",Ĭ:"I",ĭ:"i",Į:"I",į:"i",İ:"I",ı:"i",Ĳ:"IJ",ĳ:"ij",Ĵ:"J",ĵ:"j",Ķ:"K",ķ:"k",Ḱ:"K",ḱ:"k",K̆:"K",k̆:"k",Ĺ:"L",ĺ:"l",Ļ:"L",ļ:"l",Ľ:"L",ľ:"l",Ŀ:"L",ŀ:"l",Ł:"l",ł:"l",Ḿ:"M",ḿ:"m",M̆:"M",m̆:"m",Ń:"N",ń:"n",Ņ:"N",ņ:"n",Ň:"N",ň:"n",ŉ:"n",N̆:"N",n̆:"n",Ō:"O",ō:"o",Ŏ:"O",ŏ:"o",Ő:"O",ő:"o",Œ:"OE",œ:"oe",P̆:"P",p̆:"p",Ŕ:"R",ŕ:"r",Ŗ:"R",ŗ:"r",Ř:"R",ř:"r",R̆:"R",r̆:"r",Ȓ:"R",ȓ:"r",Ś:"S",ś:"s",Ŝ:"S",ŝ:"s",Ş:"S",Ș:"S",ș:"s",ş:"s",Š:"S",š:"s",Ţ:"T",ţ:"t",ț:"t",Ț:"T",Ť:"T",ť:"t",Ŧ:"T",ŧ:"t",T̆:"T",t̆:"t",Ũ:"U",ũ:"u",Ū:"U",ū:"u",Ŭ:"U",ŭ:"u",Ů:"U",ů:"u",Ű:"U",ű:"u",Ų:"U",ų:"u",Ȗ:"U",ȗ:"u",V̆:"V",v̆:"v",Ŵ:"W",ŵ:"w",Ẃ:"W",ẃ:"w",X̆:"X",x̆:"x",Ŷ:"Y",ŷ:"y",Ÿ:"Y",Y̆:"Y",y̆:"y",Ź:"Z",ź:"z",Ż:"Z",ż:"z",Ž:"Z",ž:"z",ſ:"s",ƒ:"f",Ơ:"O",ơ:"o",Ư:"U",ư:"u",Ǎ:"A",ǎ:"a",Ǐ:"I",ǐ:"i",Ǒ:"O",ǒ:"o",Ǔ:"U",ǔ:"u",Ǖ:"U",ǖ:"u",Ǘ:"U",ǘ:"u",Ǚ:"U",ǚ:"u",Ǜ:"U",ǜ:"u",Ứ:"U",ứ:"u",Ṹ:"U",ṹ:"u",Ǻ:"A",ǻ:"a",Ǽ:"AE",ǽ:"ae",Ǿ:"O",ǿ:"o",Þ:"TH",þ:"th",Ṕ:"P",ṕ:"p",Ṥ:"S",ṥ:"s",X́:"X",x́:"x",Ѓ:"Г",ѓ:"г",Ќ:"К",ќ:"к",A̋:"A",a̋:"a",E̋:"E",e̋:"e",I̋:"I",i̋:"i",Ǹ:"N",ǹ:"n",Ồ:"O",ồ:"o",Ṑ:"O",ṑ:"o",Ừ:"U",ừ:"u",Ẁ:"W",ẁ:"w",Ỳ:"Y",ỳ:"y",Ȁ:"A",ȁ:"a",Ȅ:"E",ȅ:"e",Ȉ:"I",ȉ:"i",Ȍ:"O",ȍ:"o",Ȑ:"R",ȑ:"r",Ȕ:"U",ȕ:"u",B̌:"B",b̌:"b",Č̣:"C",č̣:"c",Ê̌:"E",ê̌:"e",F̌:"F",f̌:"f",Ǧ:"G",ǧ:"g",Ȟ:"H",ȟ:"h",J̌:"J",ǰ:"j",Ǩ:"K",ǩ:"k",M̌:"M",m̌:"m",P̌:"P",p̌:"p",Q̌:"Q",q̌:"q",Ř̩:"R",ř̩:"r",Ṧ:"S",ṧ:"s",V̌:"V",v̌:"v",W̌:"W",w̌:"w",X̌:"X",x̌:"x",Y̌:"Y",y̌:"y",A̧:"A",a̧:"a",B̧:"B",b̧:"b",Ḑ:"D",ḑ:"d",Ȩ:"E",ȩ:"e",Ɛ̧:"E",ɛ̧:"e",Ḩ:"H",ḩ:"h",I̧:"I",i̧:"i",Ɨ̧:"I",ɨ̧:"i",M̧:"M",m̧:"m",O̧:"O",o̧:"o",Q̧:"Q",q̧:"q",U̧:"U",u̧:"u",X̧:"X",x̧:"x",Z̧:"Z",z̧:"z"},fa=Object.keys(ei).join("|"),ga=new RegExp(fa,"g");function ha(e){return e.replace(ga,t=>ei[t])}var qe={CASE_SENSITIVE_EQUAL:7,EQUAL:6,STARTS_WITH:5,WORD_STARTS_WITH:4,CONTAINS:3,ACRONYM:2,MATCHES:1,NO_MATCH:0};function Jr(e,t,n){var r;if(n=n||{},n.threshold=(r=n.threshold)!=null?r:qe.MATCHES,!n.accessors){const a=eo(e,t,n);return{rankedValue:e,rank:a,accessorIndex:-1,accessorThreshold:n.threshold,passed:a>=n.threshold}}const o=ba(e,n.accessors),s={rankedValue:e,rank:qe.NO_MATCH,accessorIndex:-1,accessorThreshold:n.threshold,passed:!1};for(let a=0;a<o.length;a++){const l=o[a];let i=eo(l.itemValue,t,n);const{minRanking:u,maxRanking:h,threshold:d=n.threshold}=l.attributes;i<u&&i>=qe.MATCHES?i=u:i>h&&(i=h),i=Math.min(i,h),i>=d&&i>s.rank&&(s.rank=i,s.passed=!0,s.accessorIndex=a,s.accessorThreshold=d,s.rankedValue=l.itemValue)}return s}function eo(e,t,n){return e=to(e,n),t=to(t,n),t.length>e.length?qe.NO_MATCH:e===t?qe.CASE_SENSITIVE_EQUAL:(e=e.toLowerCase(),t=t.toLowerCase(),e===t?qe.EQUAL:e.startsWith(t)?qe.STARTS_WITH:e.includes(` ${t}`)?qe.WORD_STARTS_WITH:e.includes(t)?qe.CONTAINS:t.length===1?qe.NO_MATCH:va(e).includes(t)?qe.ACRONYM:ya(e,t))}function va(e){let t="";return e.split(" ").forEach(r=>{r.split("-").forEach(s=>{t+=s.substr(0,1)})}),t}function ya(e,t){let n=0,r=0;function o(i,u,h){for(let d=h,c=u.length;d<c;d++)if(u[d]===i)return n+=1,d+1;return-1}function s(i){const u=1/i,h=n/t.length;return qe.MATCHES+h*u}const a=o(t[0],e,0);if(a<0)return qe.NO_MATCH;r=a;for(let i=1,u=t.length;i<u;i++){const h=t[i];if(r=o(h,e,r),!(r>-1))return qe.NO_MATCH}const l=r-a;return s(l)}function to(e,t){let{keepDiacritics:n}=t;return e=`${e}`,n||(e=ha(e)),e}function ma(e,t){let n=t;typeof t=="object"&&(n=t.accessor);const r=n(e);return r==null?[]:Array.isArray(r)?r:[String(r)]}function ba(e,t){const n=[];for(let r=0,o=t.length;r<o;r++){const s=t[r],a=pa(s),l=ma(e,s);for(let i=0,u=l.length;i<u;i++)n.push({itemValue:l[i],attributes:a})}return n}var no={maxRanking:1/0,minRanking:-1/0};function pa(e){return typeof e=="function"?no:{...no,...e}}var wa={data:""},xa=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||wa},$a=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Ca=/\/\*[^]*?\*\/|  +/g,ro=/\n+/g,Ft=(e,t)=>{let n="",r="",o="";for(let s in e){let a=e[s];s[0]=="@"?s[1]=="i"?n=s+" "+a+";":r+=s[1]=="f"?Ft(a,s):s+"{"+Ft(a,s[1]=="k"?"":t)+"}":typeof a=="object"?r+=Ft(a,t?t.replace(/([^,])+/g,l=>s.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,i=>/&/.test(i)?i.replace(/&/g,l):l?l+" "+i:i)):s):a!=null&&(s=/^--/.test(s)?s:s.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=Ft.p?Ft.p(s,a):s+":"+a+";")}return n+(t&&o?t+"{"+o+"}":o)+r},at={},ti=e=>{if(typeof e=="object"){let t="";for(let n in e)t+=n+ti(e[n]);return t}return e},Sa=(e,t,n,r,o)=>{let s=ti(e),a=at[s]||(at[s]=(i=>{let u=0,h=11;for(;u<i.length;)h=101*h+i.charCodeAt(u++)>>>0;return"go"+h})(s));if(!at[a]){let i=s!==e?e:(u=>{let h,d,c=[{}];for(;h=$a.exec(u.replace(Ca,""));)h[4]?c.shift():h[3]?(d=h[3].replace(ro," ").trim(),c.unshift(c[0][d]=c[0][d]||{})):c[0][h[1]]=h[2].replace(ro," ").trim();return c[0]})(e);at[a]=Ft(o?{["@keyframes "+a]:i}:i,n?"":"."+a)}let l=n&&at.g?at.g:null;return n&&(at.g=at[a]),((i,u,h,d)=>{d?u.data=u.data.replace(d,i):u.data.indexOf(i)===-1&&(u.data=h?i+u.data:u.data+i)})(at[a],t,r,l),a},ka=(e,t,n)=>e.reduce((r,o,s)=>{let a=t[s];if(a&&a.call){let l=a(n),i=l&&l.props&&l.props.className||/^go/.test(l)&&l;a=i?"."+i:l&&typeof l=="object"?l.props?"":Ft(l,""):l===!1?"":l}return r+o+(a??"")},"");function X(e){let t=this||{},n=e.call?e(t.p):e;return Sa(n.unshift?n.raw?ka(n,[].slice.call(arguments,1),t.p):n.reduce((r,o)=>Object.assign(r,o&&o.call?o(t.p):o),{}):n,xa(t.target),t.g,t.o,t.k)}X.bind({g:1});X.bind({k:1});function ni(e){var t,n,r="";if(typeof e=="string"||typeof e=="number")r+=e;else if(typeof e=="object")if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(n=ni(e[t]))&&(r&&(r+=" "),r+=n)}else for(n in e)e[n]&&(r&&(r+=" "),r+=n);return r}function L(){for(var e,t,n=0,r="",o=arguments.length;n<o;n++)(e=arguments[n])&&(t=ni(e))&&(r&&(r+=" "),r+=t);return r}function Ea(e,t){const n=Ht(e),{onChange:r}=t;let o=new Set(t.appear?void 0:n);const s=new WeakSet,[a,l]=B([],{equals:!1}),[i]=js(),u=d=>{l(c=>(c.push.apply(c,d),c));for(const c of d)s.delete(c)},h=(d,c,f)=>d.splice(f,0,c);return I(d=>{const c=a(),f=e();if(f[Qo],Ht(i))return i(),d;if(c.length){const g=d.filter(m=>!c.includes(m));return c.length=0,r({list:g,added:[],removed:[],unchanged:g,finishRemoved:u}),g}return Ht(()=>{const g=new Set(f),m=f.slice(),v=[],b=[],p=[];for(const x of f)(o.has(x)?p:v).push(x);let w=!v.length;for(let x=0;x<d.length;x++){const $=d[x];g.has($)||(s.has($)||(b.push($),s.add($)),h(m,$,x)),w&&$!==m[x]&&(w=!1)}return!b.length&&w?d:(r({list:m,added:v,removed:b,unchanged:p,finishRemoved:u}),o=g,m)})},t.appear?[]:n.slice())}function Me(...e){return Xs(e)}var oo=e=>e instanceof Element;function nr(e,t){if(t(e))return e;if(typeof e=="function"&&!e.length)return nr(e(),t);if(Array.isArray(e)){const n=[];for(const r of e){const o=nr(r,t);o&&(Array.isArray(o)?n.push.apply(n,o):n.push(o))}return n.length?n:null}return null}function Da(e,t=oo,n=oo){const r=I(e),o=I(()=>nr(r(),t));return o.toArray=()=>{const s=o();return Array.isArray(s)?s:s?[s]:[]},o}function Aa(e){return I(()=>{const t=e.name||"s";return{enterActive:(e.enterActiveClass||t+"-enter-active").split(" "),enter:(e.enterClass||t+"-enter").split(" "),enterTo:(e.enterToClass||t+"-enter-to").split(" "),exitActive:(e.exitActiveClass||t+"-exit-active").split(" "),exit:(e.exitClass||t+"-exit").split(" "),exitTo:(e.exitToClass||t+"-exit-to").split(" "),move:(e.moveClass||t+"-move").split(" ")}})}function ri(e){requestAnimationFrame(()=>requestAnimationFrame(e))}function Ma(e,t,n,r){const{onBeforeEnter:o,onEnter:s,onAfterEnter:a}=t;o==null||o(n),n.classList.add(...e.enter),n.classList.add(...e.enterActive),queueMicrotask(()=>{if(!n.parentNode)return r==null?void 0:r();s==null||s(n,()=>l())}),ri(()=>{n.classList.remove(...e.enter),n.classList.add(...e.enterTo),(!s||s.length<2)&&(n.addEventListener("transitionend",l),n.addEventListener("animationend",l))});function l(i){(!i||i.target===n)&&(n.removeEventListener("transitionend",l),n.removeEventListener("animationend",l),n.classList.remove(...e.enterActive),n.classList.remove(...e.enterTo),a==null||a(n))}}function Ta(e,t,n,r){const{onBeforeExit:o,onExit:s,onAfterExit:a}=t;if(!n.parentNode)return r==null?void 0:r();o==null||o(n),n.classList.add(...e.exit),n.classList.add(...e.exitActive),s==null||s(n,()=>l()),ri(()=>{n.classList.remove(...e.exit),n.classList.add(...e.exitTo),(!s||s.length<2)&&(n.addEventListener("transitionend",l),n.addEventListener("animationend",l))});function l(i){(!i||i.target===n)&&(r==null||r(),n.removeEventListener("transitionend",l),n.removeEventListener("animationend",l),n.classList.remove(...e.exitActive),n.classList.remove(...e.exitTo),a==null||a(n))}}var io=e=>{const t=Aa(e);return Ea(Da(()=>e.children).toArray,{appear:e.appear,onChange({added:n,removed:r,finishRemoved:o,list:s}){const a=t();for(const i of n)Ma(a,e,i);const l=[];for(const i of s)i.isConnected&&(i instanceof HTMLElement||i instanceof SVGElement)&&l.push({el:i,rect:i.getBoundingClientRect()});queueMicrotask(()=>{const i=[];for(const{el:u,rect:h}of l)if(u.isConnected){const d=u.getBoundingClientRect(),c=h.left-d.left,f=h.top-d.top;(c||f)&&(u.style.transform=`translate(${c}px, ${f}px)`,u.style.transitionDuration="0s",i.push(u))}document.body.offsetHeight;for(const u of i){let h=function(d){(d.target===u||/transform$/.test(d.propertyName))&&(u.removeEventListener("transitionend",h),u.classList.remove(...a.move))};u.classList.add(...a.move),u.style.transform=u.style.transitionDuration="",u.addEventListener("transitionend",h)}});for(const i of r)Ta(a,e,i,()=>o([i]))}})},Un=Symbol("fallback");function so(e){for(const t of e)t.dispose()}function qa(e,t,n,r={}){const o=new Map;return U(()=>so(o.values())),()=>{const a=e()||[];return a[Qo],Ht(()=>{var h,d;if(!a.length)return so(o.values()),o.clear(),r.fallback?[Qr(f=>(o.set(Un,{dispose:f}),r.fallback()))]:[];const l=new Array(a.length),i=o.get(Un);if(!o.size||i){i==null||i.dispose(),o.delete(Un);for(let c=0;c<a.length;c++){const f=a[c],g=t(f,c);s(l,f,c,g)}return l}const u=new Set(o.keys());for(let c=0;c<a.length;c++){const f=a[c],g=t(f,c);u.delete(g);const m=o.get(g);m?(l[c]=m.mapped,(h=m.setIndex)==null||h.call(m,c),m.setItem(()=>f)):s(l,f,c,g)}for(const c of u)(d=o.get(c))==null||d.dispose(),o.delete(c);return l})};function s(a,l,i,u){Qr(h=>{const[d,c]=B(l),f={setItem:c,dispose:h};if(n.length>1){const[g,m]=B(i);f.setIndex=m,f.mapped=n(d,g)}else f.mapped=n(d);o.set(u,f),a[i]=f.mapped})}}function Dn(e){const{by:t}=e;return I(qa(()=>e.each,typeof t=="function"?t:n=>n[t],e.children,"fallback"in e?{fallback:()=>e.fallback}:void 0))}function Fa(e,t,n,r){return e.addEventListener(t,n,r),Js(e.removeEventListener.bind(e,t,n,r))}function Oa(e,t,n,r){const o=()=>{er(D(e)).forEach(s=>{s&&er(D(t)).forEach(a=>Fa(s,a,n,r))})};typeof e=="function"?V(o):G(o)}function La(e,t){const n=new ResizeObserver(e);return U(n.disconnect.bind(n)),{observe:r=>n.observe(r,t),unobserve:n.unobserve.bind(n)}}function Ia(e,t,n){const r=new WeakMap,{observe:o,unobserve:s}=La(a=>{for(const l of a){const{contentRect:i,target:u}=l,h=Math.round(i.width),d=Math.round(i.height),c=r.get(u);(!c||c.width!==h||c.height!==d)&&(t(i,u,l),r.set(u,{width:h,height:d}))}},n);V(a=>{const l=Ys(er(D(e)));return ea(l,a,o,s),l},[])}var Pa=/((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;function ao(e){const t={};let n;for(;n=Pa.exec(e);)t[n[1]]=n[2];return t}function Ln(e,t){if(typeof e=="string"){if(typeof t=="string")return`${e};${t}`;e=ao(e)}else typeof t=="string"&&(t=ao(t));return{...e,...t}}function _a(e,t,n=-1){return n in e?[...e.slice(0,n),t,...e.slice(n)]:[...e,t]}function rr(e,t){const n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function Ra(e){return typeof e=="number"}function zt(e){return Object.prototype.toString.call(e)==="[object String]"}function za(e){return typeof e=="function"}function gn(e){return t=>`${e()}-${t}`}function Ne(e,t){return e?e===t||e.contains(t):!1}function an(e,t=!1){const{activeElement:n}=Je(e);if(!(n!=null&&n.nodeName))return null;if(oi(n)&&n.contentDocument)return an(n.contentDocument.body,t);if(t){const r=n.getAttribute("aria-activedescendant");if(r){const o=Je(n).getElementById(r);if(o)return o}}return n}function Ka(e){return Je(e).defaultView||window}function Je(e){return e?e.ownerDocument||e:document}function oi(e){return e.tagName==="IFRAME"}var yr=(e=>(e.Escape="Escape",e.Enter="Enter",e.Tab="Tab",e.Space=" ",e.ArrowDown="ArrowDown",e.ArrowLeft="ArrowLeft",e.ArrowRight="ArrowRight",e.ArrowUp="ArrowUp",e.End="End",e.Home="Home",e.PageDown="PageDown",e.PageUp="PageUp",e))(yr||{});function mr(e){var t;return typeof window<"u"&&window.navigator!=null?e.test(((t=window.navigator.userAgentData)==null?void 0:t.platform)||window.navigator.platform):!1}function In(){return mr(/^Mac/i)}function Ba(){return mr(/^iPhone/i)}function Na(){return mr(/^iPad/i)||In()&&navigator.maxTouchPoints>1}function Ha(){return Ba()||Na()}function Va(){return In()||Ha()}function de(e,t){return t&&(za(t)?t(e):t[0](t[1],e)),e==null?void 0:e.defaultPrevented}function we(e){return t=>{for(const n of e)de(t,n)}}function Ga(e){return In()?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey}function De(e){if(e)if(Ua())e.focus({preventScroll:!0});else{const t=ja(e);e.focus(),Wa(t)}}var xn=null;function Ua(){if(xn==null){xn=!1;try{document.createElement("div").focus({get preventScroll(){return xn=!0,!0}})}catch{}}return xn}function ja(e){let t=e.parentNode;const n=[],r=document.scrollingElement||document.documentElement;for(;t instanceof HTMLElement&&t!==r;)(t.offsetHeight<t.scrollHeight||t.offsetWidth<t.scrollWidth)&&n.push({element:t,scrollTop:t.scrollTop,scrollLeft:t.scrollLeft}),t=t.parentNode;return r instanceof HTMLElement&&n.push({element:r,scrollTop:r.scrollTop,scrollLeft:r.scrollLeft}),n}function Wa(e){for(const{element:t,scrollTop:n,scrollLeft:r}of e)t.scrollTop=n,t.scrollLeft=r}var ii=["input:not([type='hidden']):not([disabled])","select:not([disabled])","textarea:not([disabled])","button:not([disabled])","a[href]","area[href]","[tabindex]","iframe","object","embed","audio[controls]","video[controls]","[contenteditable]:not([contenteditable='false'])"],Qa=[...ii,'[tabindex]:not([tabindex="-1"]):not([disabled])'],br=`${ii.join(":not([hidden]),")},[tabindex]:not([disabled]):not([hidden])`,Ya=Qa.join(':not([hidden]):not([tabindex="-1"]),');function si(e,t){const r=Array.from(e.querySelectorAll(br)).filter(lo);return t&&lo(e)&&r.unshift(e),r.forEach((o,s)=>{if(oi(o)&&o.contentDocument){const a=o.contentDocument.body,l=si(a,!1);r.splice(s,1,...l)}}),r}function lo(e){return ai(e)&&!Xa(e)}function ai(e){return e.matches(br)&&pr(e)}function Xa(e){return Number.parseInt(e.getAttribute("tabindex")||"0",10)<0}function pr(e,t){return e.nodeName!=="#comment"&&Za(e)&&Ja(e,t)&&(!e.parentElement||pr(e.parentElement,e))}function Za(e){if(!(e instanceof HTMLElement)&&!(e instanceof SVGElement))return!1;const{display:t,visibility:n}=e.style;let r=t!=="none"&&n!=="hidden"&&n!=="collapse";if(r){if(!e.ownerDocument.defaultView)return r;const{getComputedStyle:o}=e.ownerDocument.defaultView,{display:s,visibility:a}=o(e);r=s!=="none"&&a!=="hidden"&&a!=="collapse"}return r}function Ja(e,t){return!e.hasAttribute("hidden")&&(e.nodeName==="DETAILS"&&t&&t.nodeName!=="SUMMARY"?e.hasAttribute("open"):!0)}function el(e,t,n){const r=t!=null&&t.tabbable?Ya:br,o=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode(s){var a;return(a=t==null?void 0:t.from)!=null&&a.contains(s)?NodeFilter.FILTER_REJECT:s.matches(r)&&pr(s)&&(!(t!=null&&t.accept)||t.accept(s))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});return t!=null&&t.from&&(o.currentNode=t.from),o}function co(e){let t=e;for(;t&&!tl(t);)t=t.parentElement;return t||document.scrollingElement||document.documentElement}function tl(e){const t=window.getComputedStyle(e);return/(auto|scroll)/.test(t.overflow+t.overflowX+t.overflowY)}function nl(){}function rl(e,t){const[n,r]=e;let o=!1;const s=t.length;for(let a=s,l=0,i=a-1;l<a;i=l++){const[u,h]=t[l],[d,c]=t[i],[,f]=t[i===0?a-1:i-1]||[0,0],g=(h-c)*(n-u)-(u-d)*(r-h);if(c<h){if(r>=c&&r<h){if(g===0)return!0;g>0&&(r===c?r>f&&(o=!o):o=!o)}}else if(h<c){if(r>h&&r<=c){if(g===0)return!0;g<0&&(r===c?r<f&&(o=!o):o=!o)}}else if(r===h&&(n>=d&&n<=u||n>=u&&n<=d))return!0}return o}function Z(e,t){return W(e,t)}var nn=new Map,uo=new Set;function fo(){if(typeof window>"u")return;const e=n=>{if(!n.target)return;let r=nn.get(n.target);r||(r=new Set,nn.set(n.target,r),n.target.addEventListener("transitioncancel",t)),r.add(n.propertyName)},t=n=>{if(!n.target)return;const r=nn.get(n.target);if(r&&(r.delete(n.propertyName),r.size===0&&(n.target.removeEventListener("transitioncancel",t),nn.delete(n.target)),nn.size===0)){for(const o of uo)o();uo.clear()}};document.body.addEventListener("transitionrun",e),document.body.addEventListener("transitionend",t)}typeof document<"u"&&(document.readyState!=="loading"?fo():document.addEventListener("DOMContentLoaded",fo));function or(e,t){const n=go(e,t,"left"),r=go(e,t,"top"),o=t.offsetWidth,s=t.offsetHeight;let a=e.scrollLeft,l=e.scrollTop;const i=a+e.offsetWidth,u=l+e.offsetHeight;n<=a?a=n:n+o>i&&(a+=n+o-i),r<=l?l=r:r+s>u&&(l+=r+s-u),e.scrollLeft=a,e.scrollTop=l}function go(e,t,n){const r=n==="left"?"offsetLeft":"offsetTop";let o=0;for(;t.offsetParent&&(o+=t[r],t.offsetParent!==e);){if(t.offsetParent.contains(e)){o-=e[r];break}t=t.offsetParent}return o}function ol(e,t){var n,r;if(document.contains(e)){const o=document.scrollingElement||document.documentElement;if(window.getComputedStyle(o).overflow==="hidden"){let a=co(e);for(;e&&a&&e!==o&&a!==o;)or(a,e),e=a,a=co(e)}else{const{left:a,top:l}=e.getBoundingClientRect();(n=e==null?void 0:e.scrollIntoView)==null||n.call(e,{block:"nearest"});const{left:i,top:u}=e.getBoundingClientRect();(Math.abs(a-i)>1||Math.abs(l-u)>1)&&((r=e.scrollIntoView)==null||r.call(e,{block:"nearest"}))}}}var li={border:"0",clip:"rect(0 0 0 0)","clip-path":"inset(50%)",height:"1px",margin:"0 -1px -1px 0",overflow:"hidden",padding:"0",position:"absolute",width:"1px","white-space":"nowrap"};function Pn(e,t){const[n,r]=B(ho(t==null?void 0:t()));return V(()=>{var o;r(((o=e())==null?void 0:o.tagName.toLowerCase())||ho(t==null?void 0:t()))}),n}function ho(e){return zt(e)?e:void 0}function fe(e){const[t,n]=se(e,["as"]);if(!t.as)throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");return y(Fs,W(n,{get component(){return t.as}}))}var il=Object.defineProperty,_n=(e,t)=>{for(var n in t)il(e,n,{get:t[n],enumerable:!0})},sl={};_n(sl,{Button:()=>cl,Root:()=>wr});var al=["button","color","file","image","reset","submit"];function ll(e){const t=e.tagName.toLowerCase();return t==="button"?!0:t==="input"&&e.type?al.indexOf(e.type)!==-1:!1}function wr(e){let t;const n=Z({type:"button"},e),[r,o]=se(n,["ref","type","disabled"]),s=Pn(()=>t,()=>"button"),a=I(()=>{const u=s();return u==null?!1:ll({tagName:u,type:r.type})}),l=I(()=>s()==="input"),i=I(()=>s()==="a"&&(t==null?void 0:t.getAttribute("href"))!=null);return y(fe,W({as:"button",ref(u){const h=Me(d=>t=d,r.ref);typeof h=="function"&&h(u)},get type(){return a()||l()?r.type:void 0},get role(){return!a()&&!i()?"button":void 0},get tabIndex(){return!a()&&!i()&&!r.disabled?0:void 0},get disabled(){return a()||l()?r.disabled:void 0},get"aria-disabled"(){return!a()&&!l()&&r.disabled?!0:void 0},get"data-disabled"(){return r.disabled?"":void 0}},o))}var cl=wr;function hn(e){var a;const[t,n]=B((a=e.defaultValue)==null?void 0:a.call(e)),r=I(()=>{var l;return((l=e.value)==null?void 0:l.call(e))!==void 0}),o=I(()=>{var l;return r()?(l=e.value)==null?void 0:l.call(e):t()});return[o,l=>{Ht(()=>{var u;const i=Zs(l,o());return Object.is(i,o())||(r()||n(i),(u=e.onChange)==null||u.call(e,i)),i})}]}function ci(e){const[t,n]=hn(e);return[()=>t()??!1,n]}function ul(e){const[t,n]=hn(e);return[()=>t()??[],n]}function dl(e={}){const[t,n]=ci({value:()=>D(e.isSelected),defaultValue:()=>!!D(e.defaultIsSelected),onChange:s=>{var a;return(a=e.onSelectedChange)==null?void 0:a.call(e,s)}});return{isSelected:t,setIsSelected:s=>{!D(e.isReadOnly)&&!D(e.isDisabled)&&n(s)},toggle:()=>{!D(e.isReadOnly)&&!D(e.isDisabled)&&n(!t())}}}function ui(e){let t=e.startIndex??0;const n=e.startLevel??0,r=[],o=i=>{if(i==null)return"";const u=e.getKey??"key",h=zt(u)?i[u]:u(i);return h!=null?String(h):""},s=i=>{if(i==null)return"";const u=e.getTextValue??"textValue",h=zt(u)?i[u]:u(i);return h!=null?String(h):""},a=i=>{if(i==null)return!1;const u=e.getDisabled??"disabled";return(zt(u)?i[u]:u(i))??!1},l=i=>{var u;if(i!=null)return zt(e.getSectionChildren)?i[e.getSectionChildren]:(u=e.getSectionChildren)==null?void 0:u.call(e,i)};for(const i of e.dataSource){if(zt(i)||Ra(i)){r.push({type:"item",rawValue:i,key:String(i),textValue:String(i),disabled:a(i),level:n,index:t}),t++;continue}if(l(i)!=null){r.push({type:"section",rawValue:i,key:"",textValue:"",disabled:!1,level:n,index:t}),t++;const u=l(i)??[];if(u.length>0){const h=ui({dataSource:u,getKey:e.getKey,getTextValue:e.getTextValue,getDisabled:e.getDisabled,getSectionChildren:e.getSectionChildren,startIndex:t,startLevel:n+1});r.push(...h),t+=h.length}}else r.push({type:"item",rawValue:i,key:o(i),textValue:s(i),disabled:a(i),level:n,index:t}),t++}return r}function fl(e,t=[]){return I(()=>{const n=ui({dataSource:D(e.dataSource),getKey:D(e.getKey),getTextValue:D(e.getTextValue),getDisabled:D(e.getDisabled),getSectionChildren:D(e.getSectionChildren)});for(let r=0;r<t.length;r++)t[r]();return e.factory(n)})}var gl=new Set(["Avst","Arab","Armi","Syrc","Samr","Mand","Thaa","Mend","Nkoo","Adlm","Rohg","Hebr"]),hl=new Set(["ae","ar","arc","bcc","bqi","ckb","dv","fa","glk","he","ku","mzn","nqo","pnb","ps","sd","ug","ur","yi"]);function vl(e){if(Intl.Locale){const n=new Intl.Locale(e).maximize().script??"";return gl.has(n)}const t=e.split("-")[0];return hl.has(t)}function yl(e){return vl(e)?"rtl":"ltr"}function di(){let e=typeof navigator<"u"&&(navigator.language||navigator.userLanguage)||"en-US";return{locale:e,direction:yl(e)}}var ir=di(),ln=new Set;function vo(){ir=di();for(const e of ln)e(ir)}function ml(){const[e,t]=B(ir),n=I(()=>e());return Ct(()=>{ln.size===0&&window.addEventListener("languagechange",vo),ln.add(t),U(()=>{ln.delete(t),ln.size===0&&window.removeEventListener("languagechange",vo)})}),{locale:()=>n().locale,direction:()=>n().direction}}var bl=xe();function Dt(){const e=ml();return $e(bl)||e}var jn=new Map;function pl(e){const{locale:t}=Dt(),n=I(()=>t()+(e?Object.entries(e).sort((r,o)=>r[0]<o[0]?-1:1).join():""));return I(()=>{const r=n();let o;return jn.has(r)&&(o=jn.get(r)),o||(o=new Intl.Collator(t(),e),jn.set(r,o)),o})}var lt=class fi extends Set{constructor(n,r,o){super(n);Re(this,"anchorKey");Re(this,"currentKey");n instanceof fi?(this.anchorKey=r||n.anchorKey,this.currentKey=o||n.currentKey):(this.anchorKey=r,this.currentKey=o)}};function wl(e){const[t,n]=hn(e);return[()=>t()??new lt,n]}function gi(e){return Va()?e.altKey:e.ctrlKey}function Kt(e){return In()?e.metaKey:e.ctrlKey}function yo(e){return new lt(e)}function xl(e,t){if(e.size!==t.size)return!1;for(const n of e)if(!t.has(n))return!1;return!0}function $l(e){const t=Z({selectionMode:"none",selectionBehavior:"toggle"},e),[n,r]=B(!1),[o,s]=B(),a=I(()=>{const m=D(t.selectedKeys);return m!=null?yo(m):m}),l=I(()=>{const m=D(t.defaultSelectedKeys);return m!=null?yo(m):new lt}),[i,u]=wl({value:a,defaultValue:l,onChange:m=>{var v;return(v=t.onSelectionChange)==null?void 0:v.call(t,m)}}),[h,d]=B(D(t.selectionBehavior)),c=()=>D(t.selectionMode),f=()=>D(t.disallowEmptySelection)??!1,g=m=>{(D(t.allowDuplicateSelectionEvents)||!xl(m,i()))&&u(m)};return V(()=>{const m=i();D(t.selectionBehavior)==="replace"&&h()==="toggle"&&typeof m=="object"&&m.size===0&&d("replace")}),V(()=>{d(D(t.selectionBehavior)??"toggle")}),{selectionMode:c,disallowEmptySelection:f,selectionBehavior:h,setSelectionBehavior:d,isFocused:n,setFocused:r,focusedKey:o,setFocusedKey:s,selectedKeys:i,setSelectedKeys:g}}function Cl(e){const[t,n]=B(""),[r,o]=B(-1);return{typeSelectHandlers:{onKeyDown:a=>{var c;if(D(e.isDisabled))return;const l=D(e.keyboardDelegate),i=D(e.selectionManager);if(!l.getKeyForSearch)return;const u=Sl(a.key);if(!u||a.ctrlKey||a.metaKey)return;u===" "&&t().trim().length>0&&(a.preventDefault(),a.stopPropagation());let h=n(f=>f+u),d=l.getKeyForSearch(h,i.focusedKey())??l.getKeyForSearch(h);d==null&&kl(h)&&(h=h[0],d=l.getKeyForSearch(h,i.focusedKey())??l.getKeyForSearch(h)),d!=null&&(i.setFocusedKey(d),(c=e.onTypeSelect)==null||c.call(e,d)),clearTimeout(r()),o(window.setTimeout(()=>n(""),500))}}}}function Sl(e){return e.length===1||!/^[A-Z]/i.test(e)?e:""}function kl(e){return e.split("").every(t=>t===e[0])}function El(e,t,n){const o=W({selectOnFocus:()=>D(e.selectionManager).selectionBehavior()==="replace"},e),s=()=>t(),{direction:a}=Dt();let l={top:0,left:0};Oa(()=>D(o.isVirtualized)?void 0:s(),"scroll",()=>{const v=s();v&&(l={top:v.scrollTop,left:v.scrollLeft})});const{typeSelectHandlers:i}=Cl({isDisabled:()=>D(o.disallowTypeAhead),keyboardDelegate:()=>D(o.keyboardDelegate),selectionManager:()=>D(o.selectionManager)}),u=()=>D(o.orientation)??"vertical",h=v=>{var _,C,A,R,N,J,te,ae;de(v,i.onKeyDown),v.altKey&&v.key==="Tab"&&v.preventDefault();const b=t();if(!(b!=null&&b.contains(v.target)))return;const p=D(o.selectionManager),w=D(o.selectOnFocus),x=z=>{z!=null&&(p.setFocusedKey(z),v.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(z):w&&!gi(v)&&p.replaceSelection(z))},$=D(o.keyboardDelegate),O=D(o.shouldFocusWrap),k=p.focusedKey();switch(v.key){case(u()==="vertical"?"ArrowDown":"ArrowRight"):{if($.getKeyBelow){v.preventDefault();let z;k!=null?z=$.getKeyBelow(k):z=(_=$.getFirstKey)==null?void 0:_.call($),z==null&&O&&(z=(C=$.getFirstKey)==null?void 0:C.call($,k)),x(z)}break}case(u()==="vertical"?"ArrowUp":"ArrowLeft"):{if($.getKeyAbove){v.preventDefault();let z;k!=null?z=$.getKeyAbove(k):z=(A=$.getLastKey)==null?void 0:A.call($),z==null&&O&&(z=(R=$.getLastKey)==null?void 0:R.call($,k)),x(z)}break}case(u()==="vertical"?"ArrowLeft":"ArrowUp"):{if($.getKeyLeftOf){v.preventDefault();const z=a()==="rtl";let Q;k!=null?Q=$.getKeyLeftOf(k):Q=z?(N=$.getFirstKey)==null?void 0:N.call($):(J=$.getLastKey)==null?void 0:J.call($),x(Q)}break}case(u()==="vertical"?"ArrowRight":"ArrowDown"):{if($.getKeyRightOf){v.preventDefault();const z=a()==="rtl";let Q;k!=null?Q=$.getKeyRightOf(k):Q=z?(te=$.getLastKey)==null?void 0:te.call($):(ae=$.getFirstKey)==null?void 0:ae.call($),x(Q)}break}case"Home":if($.getFirstKey){v.preventDefault();const z=$.getFirstKey(k,Kt(v));z!=null&&(p.setFocusedKey(z),Kt(v)&&v.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(z):w&&p.replaceSelection(z))}break;case"End":if($.getLastKey){v.preventDefault();const z=$.getLastKey(k,Kt(v));z!=null&&(p.setFocusedKey(z),Kt(v)&&v.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(z):w&&p.replaceSelection(z))}break;case"PageDown":if($.getKeyPageBelow&&k!=null){v.preventDefault();const z=$.getKeyPageBelow(k);x(z)}break;case"PageUp":if($.getKeyPageAbove&&k!=null){v.preventDefault();const z=$.getKeyPageAbove(k);x(z)}break;case"a":Kt(v)&&p.selectionMode()==="multiple"&&D(o.disallowSelectAll)!==!0&&(v.preventDefault(),p.selectAll());break;case"Escape":v.defaultPrevented||(v.preventDefault(),D(o.disallowEmptySelection)||p.clearSelection());break;case"Tab":if(!D(o.allowsTabNavigation)){if(v.shiftKey)b.focus();else{const z=el(b,{tabbable:!0});let Q,ee;do ee=z.lastChild(),ee&&(Q=ee);while(ee);Q&&!Q.contains(document.activeElement)&&De(Q)}break}}},d=v=>{var x,$;const b=D(o.selectionManager),p=D(o.keyboardDelegate),w=D(o.selectOnFocus);if(b.isFocused()){v.currentTarget.contains(v.target)||b.setFocused(!1);return}if(v.currentTarget.contains(v.target)){if(b.setFocused(!0),b.focusedKey()==null){const O=_=>{_!=null&&(b.setFocusedKey(_),w&&b.replaceSelection(_))},k=v.relatedTarget;k&&v.currentTarget.compareDocumentPosition(k)&Node.DOCUMENT_POSITION_FOLLOWING?O(b.lastSelectedKey()??((x=p.getLastKey)==null?void 0:x.call(p))):O(b.firstSelectedKey()??(($=p.getFirstKey)==null?void 0:$.call(p)))}else if(!D(o.isVirtualized)){const O=s();if(O){O.scrollTop=l.top,O.scrollLeft=l.left;const k=O.querySelector(`[data-key="${b.focusedKey()}"]`);k&&(De(k),or(O,k))}}}},c=v=>{const b=D(o.selectionManager);v.currentTarget.contains(v.relatedTarget)||b.setFocused(!1)},f=v=>{s()===v.target&&v.preventDefault()},g=()=>{var O,k;const v=D(o.autoFocus);if(!v)return;const b=D(o.selectionManager),p=D(o.keyboardDelegate);let w;v==="first"&&(w=(O=p.getFirstKey)==null?void 0:O.call(p)),v==="last"&&(w=(k=p.getLastKey)==null?void 0:k.call(p));const x=b.selectedKeys();x.size&&(w=x.values().next().value),b.setFocused(!0),b.setFocusedKey(w);const $=t();$&&w==null&&!D(o.shouldUseVirtualFocus)&&De($)};return Ct(()=>{o.deferAutoFocus?setTimeout(g,0):g()}),V(ft([s,()=>D(o.isVirtualized),()=>D(o.selectionManager).focusedKey()],v=>{var x;const[b,p,w]=v;if(p)w&&((x=o.scrollToKey)==null||x.call(o,w));else if(w&&b){const $=b.querySelector(`[data-key="${w}"]`);$&&or(b,$)}})),{tabIndex:I(()=>{if(!D(o.shouldUseVirtualFocus))return D(o.selectionManager).focusedKey()==null?0:-1}),onKeyDown:h,onMouseDown:f,onFocusIn:d,onFocusOut:c}}function hi(e,t){const n=()=>D(e.selectionManager),r=()=>D(e.key),o=()=>D(e.shouldUseVirtualFocus),s=p=>{n().selectionMode()!=="none"&&(n().selectionMode()==="single"?n().isSelected(r())&&!n().disallowEmptySelection()?n().toggleSelection(r()):n().replaceSelection(r()):p!=null&&p.shiftKey?n().extendSelection(r()):n().selectionBehavior()==="toggle"||Kt(p)||"pointerType"in p&&p.pointerType==="touch"?n().toggleSelection(r()):n().replaceSelection(r()))},a=()=>n().isSelected(r()),l=()=>D(e.disabled)||n().isDisabled(r()),i=()=>!l()&&n().canSelectItem(r());let u=null;const h=p=>{i()&&(u=p.pointerType,p.pointerType==="mouse"&&p.button===0&&!D(e.shouldSelectOnPressUp)&&s(p))},d=p=>{i()&&p.pointerType==="mouse"&&p.button===0&&D(e.shouldSelectOnPressUp)&&D(e.allowsDifferentPressOrigin)&&s(p)},c=p=>{i()&&(D(e.shouldSelectOnPressUp)&&!D(e.allowsDifferentPressOrigin)||u!=="mouse")&&s(p)},f=p=>{!i()||!["Enter"," "].includes(p.key)||(gi(p)?n().toggleSelection(r()):s(p))},g=p=>{l()&&p.preventDefault()},m=p=>{const w=t();o()||l()||!w||p.target===w&&n().setFocusedKey(r())},v=I(()=>{if(!(o()||l()))return r()===n().focusedKey()?0:-1}),b=I(()=>D(e.virtualized)?void 0:r());return V(ft([t,r,o,()=>n().focusedKey(),()=>n().isFocused()],([p,w,x,$,O])=>{p&&w===$&&O&&!x&&document.activeElement!==p&&(e.focus?e.focus():De(p))})),{isSelected:a,isDisabled:l,allowsSelection:i,tabIndex:v,dataKey:b,onPointerDown:h,onPointerUp:d,onClick:c,onKeyDown:f,onMouseDown:g,onFocus:m}}var Dl=class{constructor(e,t){Re(this,"collection");Re(this,"state");this.collection=e,this.state=t}selectionMode(){return this.state.selectionMode()}disallowEmptySelection(){return this.state.disallowEmptySelection()}selectionBehavior(){return this.state.selectionBehavior()}setSelectionBehavior(e){this.state.setSelectionBehavior(e)}isFocused(){return this.state.isFocused()}setFocused(e){this.state.setFocused(e)}focusedKey(){return this.state.focusedKey()}setFocusedKey(e){(e==null||this.collection().getItem(e))&&this.state.setFocusedKey(e)}selectedKeys(){return this.state.selectedKeys()}isSelected(e){if(this.state.selectionMode()==="none")return!1;const t=this.getKey(e);return t==null?!1:this.state.selectedKeys().has(t)}isEmpty(){return this.state.selectedKeys().size===0}isSelectAll(){if(this.isEmpty())return!1;const e=this.state.selectedKeys();return this.getAllSelectableKeys().every(t=>e.has(t))}firstSelectedKey(){let e;for(const t of this.state.selectedKeys()){const n=this.collection().getItem(t),r=(n==null?void 0:n.index)!=null&&(e==null?void 0:e.index)!=null&&n.index<e.index;(!e||r)&&(e=n)}return e==null?void 0:e.key}lastSelectedKey(){let e;for(const t of this.state.selectedKeys()){const n=this.collection().getItem(t),r=(n==null?void 0:n.index)!=null&&(e==null?void 0:e.index)!=null&&n.index>e.index;(!e||r)&&(e=n)}return e==null?void 0:e.key}extendSelection(e){if(this.selectionMode()==="none")return;if(this.selectionMode()==="single"){this.replaceSelection(e);return}const t=this.getKey(e);if(t==null)return;const n=this.state.selectedKeys(),r=n.anchorKey||t,o=new lt(n,r,t);for(const s of this.getKeyRange(r,n.currentKey||t))o.delete(s);for(const s of this.getKeyRange(t,r))this.canSelectItem(s)&&o.add(s);this.state.setSelectedKeys(o)}getKeyRange(e,t){const n=this.collection().getItem(e),r=this.collection().getItem(t);return n&&r?n.index!=null&&r.index!=null&&n.index<=r.index?this.getKeyRangeInternal(e,t):this.getKeyRangeInternal(t,e):[]}getKeyRangeInternal(e,t){const n=[];let r=e;for(;r!=null;){const o=this.collection().getItem(r);if(o&&o.type==="item"&&n.push(r),r===t)return n;r=this.collection().getKeyAfter(r)}return[]}getKey(e){const t=this.collection().getItem(e);return t?!t||t.type!=="item"?null:t.key:e}toggleSelection(e){if(this.selectionMode()==="none")return;if(this.selectionMode()==="single"&&!this.isSelected(e)){this.replaceSelection(e);return}const t=this.getKey(e);if(t==null)return;const n=new lt(this.state.selectedKeys());n.has(t)?n.delete(t):this.canSelectItem(t)&&(n.add(t),n.anchorKey=t,n.currentKey=t),!(this.disallowEmptySelection()&&n.size===0)&&this.state.setSelectedKeys(n)}replaceSelection(e){if(this.selectionMode()==="none")return;const t=this.getKey(e);if(t==null)return;const n=this.canSelectItem(t)?new lt([t],t,t):new lt;this.state.setSelectedKeys(n)}setSelectedKeys(e){if(this.selectionMode()==="none")return;const t=new lt;for(const n of e){const r=this.getKey(n);if(r!=null&&(t.add(r),this.selectionMode()==="single"))break}this.state.setSelectedKeys(t)}selectAll(){this.selectionMode()==="multiple"&&this.state.setSelectedKeys(new Set(this.getAllSelectableKeys()))}clearSelection(){const e=this.state.selectedKeys();!this.disallowEmptySelection()&&e.size>0&&this.state.setSelectedKeys(new lt)}toggleSelectAll(){this.isSelectAll()?this.clearSelection():this.selectAll()}select(e,t){this.selectionMode()!=="none"&&(this.selectionMode()==="single"?this.isSelected(e)&&!this.disallowEmptySelection()?this.toggleSelection(e):this.replaceSelection(e):this.selectionBehavior()==="toggle"||t&&t.pointerType==="touch"?this.toggleSelection(e):this.replaceSelection(e))}isSelectionEqual(e){if(e===this.state.selectedKeys())return!0;const t=this.selectedKeys();if(e.size!==t.size)return!1;for(const n of e)if(!t.has(n))return!1;for(const n of t)if(!e.has(n))return!1;return!0}canSelectItem(e){if(this.state.selectionMode()==="none")return!1;const t=this.collection().getItem(e);return t!=null&&!t.disabled}isDisabled(e){const t=this.collection().getItem(e);return!t||t.disabled}getAllSelectableKeys(){const e=[];return(n=>{for(;n!=null;){if(this.canSelectItem(n)){const r=this.collection().getItem(n);if(!r)continue;r.type==="item"&&e.push(n)}n=this.collection().getKeyAfter(n)}})(this.collection().getFirstKey()),e}},mo=class{constructor(e){Re(this,"keyMap",new Map);Re(this,"iterable");Re(this,"firstKey");Re(this,"lastKey");this.iterable=e;for(const r of e)this.keyMap.set(r.key,r);if(this.keyMap.size===0)return;let t,n=0;for(const[r,o]of this.keyMap)t?(t.nextKey=r,o.prevKey=t.key):(this.firstKey=r,o.prevKey=void 0),o.type==="item"&&(o.index=n++),t=o,t.nextKey=void 0;this.lastKey=t.key}*[Symbol.iterator](){yield*this.iterable}getSize(){return this.keyMap.size}getKeys(){return this.keyMap.keys()}getKeyBefore(e){var t;return(t=this.keyMap.get(e))==null?void 0:t.prevKey}getKeyAfter(e){var t;return(t=this.keyMap.get(e))==null?void 0:t.nextKey}getFirstKey(){return this.firstKey}getLastKey(){return this.lastKey}getItem(e){return this.keyMap.get(e)}at(e){const t=[...this.getKeys()];return this.getItem(t[e])}};function Al(e){const t=$l(e),r=fl({dataSource:()=>D(e.dataSource),getKey:()=>D(e.getKey),getTextValue:()=>D(e.getTextValue),getDisabled:()=>D(e.getDisabled),getSectionChildren:()=>D(e.getSectionChildren),factory:s=>e.filter?new mo(e.filter(s)):new mo(s)},[()=>e.filter]),o=new Dl(r,t);return zs(()=>{const s=t.focusedKey();s!=null&&!r().getItem(s)&&t.setFocusedKey(void 0)}),{collection:r,selectionManager:()=>o}}var vi=xe();function yi(){return $e(vi)}function Ml(){const e=yi();if(e===void 0)throw new Error("[kobalte]: `useDomCollectionContext` must be used within a `DomCollectionProvider` component");return e}function mi(e,t){return!!(t.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_PRECEDING)}function Tl(e,t){var o;const n=t.ref();if(!n)return-1;let r=e.length;if(!r)return-1;for(;r--;){const s=(o=e[r])==null?void 0:o.ref();if(s&&mi(s,n))return r+1}return 0}function ql(e){const t=e.map((r,o)=>[o,r]);let n=!1;return t.sort(([r,o],[s,a])=>{const l=o.ref(),i=a.ref();return l===i||!l||!i?0:mi(l,i)?(r>s&&(n=!0),-1):(r<s&&(n=!0),1)}),n?t.map(([r,o])=>o):e}function bi(e,t){const n=ql(e);e!==n&&t(n)}function Fl(e){var o,s;const t=e[0],n=(o=e[e.length-1])==null?void 0:o.ref();let r=(s=t==null?void 0:t.ref())==null?void 0:s.parentElement;for(;r;){if(n&&r.contains(n))return r;r=r.parentElement}return Je(r).body}function Ol(e,t){V(()=>{const n=setTimeout(()=>{bi(e(),t)});U(()=>clearTimeout(n))})}function Ll(e,t){if(typeof IntersectionObserver!="function"){Ol(e,t);return}let n=[];V(()=>{const r=()=>{const a=!!n.length;n=e(),a&&bi(e(),t)},o=Fl(e()),s=new IntersectionObserver(r,{root:o});for(const a of e()){const l=a.ref();l&&s.observe(l)}U(()=>s.disconnect())})}function Il(e={}){const[t,n]=ul({value:()=>D(e.items),onChange:s=>{var a;return(a=e.onItemsChange)==null?void 0:a.call(e,s)}});Ll(t,n);const r=s=>(n(a=>{const l=Tl(a,s);return _a(a,s,l)}),()=>{n(a=>{const l=a.filter(i=>i.ref()!==s.ref());return a.length===l.length?a:l})});return{DomCollectionProvider:s=>y(vi.Provider,{value:{registerItem:r},get children(){return s.children}})}}function Pl(e){const t=Ml(),n=Z({shouldRegisterItem:!0},e);V(()=>{if(!n.shouldRegisterItem)return;const r=t.registerItem(n.getItem());U(r)})}var _l=["top","right","bottom","left"],St=Math.min,Le=Math.max,An=Math.round,$n=Math.floor,Ze=e=>({x:e,y:e}),Rl={left:"right",right:"left",bottom:"top",top:"bottom"};function sr(e,t,n){return Le(e,St(t,n))}function Lt(e,t){return typeof e=="function"?e(t):e}function kt(e){return e.split("-")[0]}function jt(e){return e.split("-")[1]}function pi(e){return e==="x"?"y":"x"}function xr(e){return e==="y"?"height":"width"}function ut(e){const t=e[0];return t==="t"||t==="b"?"y":"x"}function $r(e){return pi(ut(e))}function zl(e,t,n){n===void 0&&(n=!1);const r=jt(e),o=$r(e),s=xr(o);let a=o==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[s]>t.floating[s]&&(a=Mn(a)),[a,Mn(a)]}function Kl(e){const t=Mn(e);return[ar(e),t,ar(t)]}function ar(e){return e.includes("start")?e.replace("start","end"):e.replace("end","start")}var bo=["left","right"],po=["right","left"],Bl=["top","bottom"],Nl=["bottom","top"];function Hl(e,t,n){switch(e){case"top":case"bottom":return n?t?po:bo:t?bo:po;case"left":case"right":return t?Bl:Nl;default:return[]}}function Vl(e,t,n,r){const o=jt(e);let s=Hl(kt(e),n==="start",r);return o&&(s=s.map(a=>a+"-"+o),t&&(s=s.concat(s.map(ar)))),s}function Mn(e){const t=kt(e);return Rl[t]+e.slice(t.length)}function Gl(e){return{top:0,right:0,bottom:0,left:0,...e}}function wi(e){return typeof e!="number"?Gl(e):{top:e,right:e,bottom:e,left:e}}function Tn(e){const{x:t,y:n,width:r,height:o}=e;return{width:r,height:o,top:n,left:t,right:t+r,bottom:n+o,x:t,y:n}}function wo(e,t,n){let{reference:r,floating:o}=e;const s=ut(t),a=$r(t),l=xr(a),i=kt(t),u=s==="y",h=r.x+r.width/2-o.width/2,d=r.y+r.height/2-o.height/2,c=r[l]/2-o[l]/2;let f;switch(i){case"top":f={x:h,y:r.y-o.height};break;case"bottom":f={x:h,y:r.y+r.height};break;case"right":f={x:r.x+r.width,y:d};break;case"left":f={x:r.x-o.width,y:d};break;default:f={x:r.x,y:r.y}}switch(jt(t)){case"start":f[a]-=c*(n&&u?-1:1);break;case"end":f[a]+=c*(n&&u?-1:1);break}return f}async function Ul(e,t){var n;t===void 0&&(t={});const{x:r,y:o,platform:s,rects:a,elements:l,strategy:i}=e,{boundary:u="clippingAncestors",rootBoundary:h="viewport",elementContext:d="floating",altBoundary:c=!1,padding:f=0}=Lt(t,e),g=wi(f),v=l[c?d==="floating"?"reference":"floating":d],b=Tn(await s.getClippingRect({element:(n=await(s.isElement==null?void 0:s.isElement(v)))==null||n?v:v.contextElement||await(s.getDocumentElement==null?void 0:s.getDocumentElement(l.floating)),boundary:u,rootBoundary:h,strategy:i})),p=d==="floating"?{x:r,y:o,width:a.floating.width,height:a.floating.height}:a.reference,w=await(s.getOffsetParent==null?void 0:s.getOffsetParent(l.floating)),x=await(s.isElement==null?void 0:s.isElement(w))?await(s.getScale==null?void 0:s.getScale(w))||{x:1,y:1}:{x:1,y:1},$=Tn(s.convertOffsetParentRelativeRectToViewportRelativeRect?await s.convertOffsetParentRelativeRectToViewportRelativeRect({elements:l,rect:p,offsetParent:w,strategy:i}):p);return{top:(b.top-$.top+g.top)/x.y,bottom:($.bottom-b.bottom+g.bottom)/x.y,left:(b.left-$.left+g.left)/x.x,right:($.right-b.right+g.right)/x.x}}var jl=50,Wl=async(e,t,n)=>{const{placement:r="bottom",strategy:o="absolute",middleware:s=[],platform:a}=n,l=a.detectOverflow?a:{...a,detectOverflow:Ul},i=await(a.isRTL==null?void 0:a.isRTL(t));let u=await a.getElementRects({reference:e,floating:t,strategy:o}),{x:h,y:d}=wo(u,r,i),c=r,f=0;const g={};for(let m=0;m<s.length;m++){const v=s[m];if(!v)continue;const{name:b,fn:p}=v,{x:w,y:x,data:$,reset:O}=await p({x:h,y:d,initialPlacement:r,placement:c,strategy:o,middlewareData:g,rects:u,platform:l,elements:{reference:e,floating:t}});h=w??h,d=x??d,g[b]={...g[b],...$},O&&f<jl&&(f++,typeof O=="object"&&(O.placement&&(c=O.placement),O.rects&&(u=O.rects===!0?await a.getElementRects({reference:e,floating:t,strategy:o}):O.rects),{x:h,y:d}=wo(u,c,i)),m=-1)}return{x:h,y:d,placement:c,strategy:o,middlewareData:g}},Ql=e=>({name:"arrow",options:e,async fn(t){const{x:n,y:r,placement:o,rects:s,platform:a,elements:l,middlewareData:i}=t,{element:u,padding:h=0}=Lt(e,t)||{};if(u==null)return{};const d=wi(h),c={x:n,y:r},f=$r(o),g=xr(f),m=await a.getDimensions(u),v=f==="y",b=v?"top":"left",p=v?"bottom":"right",w=v?"clientHeight":"clientWidth",x=s.reference[g]+s.reference[f]-c[f]-s.floating[g],$=c[f]-s.reference[f],O=await(a.getOffsetParent==null?void 0:a.getOffsetParent(u));let k=O?O[w]:0;(!k||!await(a.isElement==null?void 0:a.isElement(O)))&&(k=l.floating[w]||s.floating[g]);const _=x/2-$/2,C=k/2-m[g]/2-1,A=St(d[b],C),R=St(d[p],C),N=A,J=k-m[g]-R,te=k/2-m[g]/2+_,ae=sr(N,te,J),z=!i.arrow&&jt(o)!=null&&te!==ae&&s.reference[g]/2-(te<N?A:R)-m[g]/2<0,Q=z?te<N?te-N:te-J:0;return{[f]:c[f]+Q,data:{[f]:ae,centerOffset:te-ae-Q,...z&&{alignmentOffset:Q}},reset:z}}}),Yl=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var n,r;const{placement:o,middlewareData:s,rects:a,initialPlacement:l,platform:i,elements:u}=t,{mainAxis:h=!0,crossAxis:d=!0,fallbackPlacements:c,fallbackStrategy:f="bestFit",fallbackAxisSideDirection:g="none",flipAlignment:m=!0,...v}=Lt(e,t);if((n=s.arrow)!=null&&n.alignmentOffset)return{};const b=kt(o),p=ut(l),w=kt(l)===l,x=await(i.isRTL==null?void 0:i.isRTL(u.floating)),$=c||(w||!m?[Mn(l)]:Kl(l)),O=g!=="none";!c&&O&&$.push(...Vl(l,m,g,x));const k=[l,...$],_=await i.detectOverflow(t,v),C=[];let A=((r=s.flip)==null?void 0:r.overflows)||[];if(h&&C.push(_[b]),d){const te=zl(o,a,x);C.push(_[te[0]],_[te[1]])}if(A=[...A,{placement:o,overflows:C}],!C.every(te=>te<=0)){var R,N;const te=(((R=s.flip)==null?void 0:R.index)||0)+1,ae=k[te];if(ae&&(!(d==="alignment"?p!==ut(ae):!1)||A.every(ee=>ut(ee.placement)===p?ee.overflows[0]>0:!0)))return{data:{index:te,overflows:A},reset:{placement:ae}};let z=(N=A.filter(Q=>Q.overflows[0]<=0).sort((Q,ee)=>Q.overflows[1]-ee.overflows[1])[0])==null?void 0:N.placement;if(!z)switch(f){case"bestFit":{var J;const Q=(J=A.filter(ee=>{if(O){const ce=ut(ee.placement);return ce===p||ce==="y"}return!0}).map(ee=>[ee.placement,ee.overflows.filter(ce=>ce>0).reduce((ce,ye)=>ce+ye,0)]).sort((ee,ce)=>ee[1]-ce[1])[0])==null?void 0:J[0];Q&&(z=Q);break}case"initialPlacement":z=l;break}if(o!==z)return{reset:{placement:z}}}return{}}}};function xo(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function $o(e){return _l.some(t=>e[t]>=0)}var Xl=function(e){return e===void 0&&(e={}),{name:"hide",options:e,async fn(t){const{rects:n,platform:r}=t,{strategy:o="referenceHidden",...s}=Lt(e,t);switch(o){case"referenceHidden":{const a=await r.detectOverflow(t,{...s,elementContext:"reference"}),l=xo(a,n.reference);return{data:{referenceHiddenOffsets:l,referenceHidden:$o(l)}}}case"escaped":{const a=await r.detectOverflow(t,{...s,altBoundary:!0}),l=xo(a,n.floating);return{data:{escapedOffsets:l,escaped:$o(l)}}}default:return{}}}}},Zl=new Set(["left","top"]);async function Jl(e,t){const{placement:n,platform:r,elements:o}=e,s=await(r.isRTL==null?void 0:r.isRTL(o.floating)),a=kt(n),l=jt(n),i=ut(n)==="y",u=Zl.has(a)?-1:1,h=s&&i?-1:1,d=Lt(t,e);let{mainAxis:c,crossAxis:f,alignmentAxis:g}=typeof d=="number"?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return l&&typeof g=="number"&&(f=l==="end"?g*-1:g),i?{x:f*h,y:c*u}:{x:c*u,y:f*h}}var ec=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var n,r;const{x:o,y:s,placement:a,middlewareData:l}=t,i=await Jl(t,e);return a===((n=l.offset)==null?void 0:n.placement)&&(r=l.arrow)!=null&&r.alignmentOffset?{}:{x:o+i.x,y:s+i.y,data:{...i,placement:a}}}}},tc=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:n,y:r,placement:o,platform:s}=t,{mainAxis:a=!0,crossAxis:l=!1,limiter:i={fn:b=>{let{x:p,y:w}=b;return{x:p,y:w}}},...u}=Lt(e,t),h={x:n,y:r},d=await s.detectOverflow(t,u),c=ut(kt(o)),f=pi(c);let g=h[f],m=h[c];if(a){const b=f==="y"?"top":"left",p=f==="y"?"bottom":"right",w=g+d[b],x=g-d[p];g=sr(w,g,x)}if(l){const b=c==="y"?"top":"left",p=c==="y"?"bottom":"right",w=m+d[b],x=m-d[p];m=sr(w,m,x)}const v=i.fn({...t,[f]:g,[c]:m});return{...v,data:{x:v.x-n,y:v.y-r,enabled:{[f]:a,[c]:l}}}}}},nc=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){var n,r;const{placement:o,rects:s,platform:a,elements:l}=t,{apply:i=()=>{},...u}=Lt(e,t),h=await a.detectOverflow(t,u),d=kt(o),c=jt(o),f=ut(o)==="y",{width:g,height:m}=s.floating;let v,b;d==="top"||d==="bottom"?(v=d,b=c===(await(a.isRTL==null?void 0:a.isRTL(l.floating))?"start":"end")?"left":"right"):(b=d,v=c==="end"?"top":"bottom");const p=m-h.top-h.bottom,w=g-h.left-h.right,x=St(m-h[v],p),$=St(g-h[b],w),O=!t.middlewareData.shift;let k=x,_=$;if((n=t.middlewareData.shift)!=null&&n.enabled.x&&(_=w),(r=t.middlewareData.shift)!=null&&r.enabled.y&&(k=p),O&&!c){const A=Le(h.left,0),R=Le(h.right,0),N=Le(h.top,0),J=Le(h.bottom,0);f?_=g-2*(A!==0||R!==0?A+R:Le(h.left,h.right)):k=m-2*(N!==0||J!==0?N+J:Le(h.top,h.bottom))}await i({...t,availableWidth:_,availableHeight:k});const C=await a.getDimensions(l.floating);return g!==C.width||m!==C.height?{reset:{rects:!0}}:{}}}};function Rn(){return typeof window<"u"}function Wt(e){return xi(e)?(e.nodeName||"").toLowerCase():"#document"}function Ie(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function et(e){var t;return(t=(xi(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function xi(e){return Rn()?e instanceof Node||e instanceof Ie(e).Node:!1}function Ue(e){return Rn()?e instanceof Element||e instanceof Ie(e).Element:!1}function ht(e){return Rn()?e instanceof HTMLElement||e instanceof Ie(e).HTMLElement:!1}function Co(e){return!Rn()||typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof Ie(e).ShadowRoot}function vn(e){const{overflow:t,overflowX:n,overflowY:r,display:o}=je(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&o!=="inline"&&o!=="contents"}function rc(e){return/^(table|td|th)$/.test(Wt(e))}function zn(e){try{if(e.matches(":popover-open"))return!0}catch{}try{return e.matches(":modal")}catch{return!1}}var oc=/transform|translate|scale|rotate|perspective|filter/,ic=/paint|layout|strict|content/,qt=e=>!!e&&e!=="none",Wn;function Cr(e){const t=Ue(e)?je(e):e;return qt(t.transform)||qt(t.translate)||qt(t.scale)||qt(t.rotate)||qt(t.perspective)||!Sr()&&(qt(t.backdropFilter)||qt(t.filter))||oc.test(t.willChange||"")||ic.test(t.contain||"")}function sc(e){let t=Et(e);for(;ht(t)&&!Ut(t);){if(Cr(t))return t;if(zn(t))return null;t=Et(t)}return null}function Sr(){return Wn==null&&(Wn=typeof CSS<"u"&&CSS.supports&&CSS.supports("-webkit-backdrop-filter","none")),Wn}function Ut(e){return/^(html|body|#document)$/.test(Wt(e))}function je(e){return Ie(e).getComputedStyle(e)}function Kn(e){return Ue(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function Et(e){if(Wt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||Co(e)&&e.host||et(e);return Co(t)?t.host:t}function $i(e){const t=Et(e);return Ut(t)?e.ownerDocument?e.ownerDocument.body:e.body:ht(t)&&vn(t)?t:$i(t)}function un(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const o=$i(e),s=o===((r=e.ownerDocument)==null?void 0:r.body),a=Ie(o);if(s){const l=lr(a);return t.concat(a,a.visualViewport||[],vn(o)?o:[],l&&n?un(l):[])}else return t.concat(o,un(o,[],n))}function lr(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Ci(e){const t=je(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const o=ht(e),s=o?e.offsetWidth:n,a=o?e.offsetHeight:r,l=An(n)!==s||An(r)!==a;return l&&(n=s,r=a),{width:n,height:r,$:l}}function kr(e){return Ue(e)?e:e.contextElement}function Vt(e){const t=kr(e);if(!ht(t))return Ze(1);const n=t.getBoundingClientRect(),{width:r,height:o,$:s}=Ci(t);let a=(s?An(n.width):n.width)/r,l=(s?An(n.height):n.height)/o;return(!a||!Number.isFinite(a))&&(a=1),(!l||!Number.isFinite(l))&&(l=1),{x:a,y:l}}var ac=Ze(0);function Si(e){const t=Ie(e);return!Sr()||!t.visualViewport?ac:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function lc(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==Ie(e)?!1:t}function Ot(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const o=e.getBoundingClientRect(),s=kr(e);let a=Ze(1);t&&(r?Ue(r)&&(a=Vt(r)):a=Vt(e));const l=lc(s,n,r)?Si(s):Ze(0);let i=(o.left+l.x)/a.x,u=(o.top+l.y)/a.y,h=o.width/a.x,d=o.height/a.y;if(s){const c=Ie(s),f=r&&Ue(r)?Ie(r):r;let g=c,m=lr(g);for(;m&&r&&f!==g;){const v=Vt(m),b=m.getBoundingClientRect(),p=je(m),w=b.left+(m.clientLeft+parseFloat(p.paddingLeft))*v.x,x=b.top+(m.clientTop+parseFloat(p.paddingTop))*v.y;i*=v.x,u*=v.y,h*=v.x,d*=v.y,i+=w,u+=x,g=Ie(m),m=lr(g)}}return Tn({width:h,height:d,x:i,y:u})}function Bn(e,t){const n=Kn(e).scrollLeft;return t?t.left+n:Ot(et(e)).left+n}function ki(e,t){const n=e.getBoundingClientRect(),r=n.left+t.scrollLeft-Bn(e,n),o=n.top+t.scrollTop;return{x:r,y:o}}function cc(e){let{elements:t,rect:n,offsetParent:r,strategy:o}=e;const s=o==="fixed",a=et(r),l=t?zn(t.floating):!1;if(r===a||l&&s)return n;let i={scrollLeft:0,scrollTop:0},u=Ze(1);const h=Ze(0),d=ht(r);if((d||!d&&!s)&&((Wt(r)!=="body"||vn(a))&&(i=Kn(r)),d)){const f=Ot(r);u=Vt(r),h.x=f.x+r.clientLeft,h.y=f.y+r.clientTop}const c=a&&!d&&!s?ki(a,i):Ze(0);return{width:n.width*u.x,height:n.height*u.y,x:n.x*u.x-i.scrollLeft*u.x+h.x+c.x,y:n.y*u.y-i.scrollTop*u.y+h.y+c.y}}function uc(e){return Array.from(e.getClientRects())}function dc(e){const t=et(e),n=Kn(e),r=e.ownerDocument.body,o=Le(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),s=Le(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let a=-n.scrollLeft+Bn(e);const l=-n.scrollTop;return je(r).direction==="rtl"&&(a+=Le(t.clientWidth,r.clientWidth)-o),{width:o,height:s,x:a,y:l}}var So=25;function fc(e,t){const n=Ie(e),r=et(e),o=n.visualViewport;let s=r.clientWidth,a=r.clientHeight,l=0,i=0;if(o){s=o.width,a=o.height;const h=Sr();(!h||h&&t==="fixed")&&(l=o.offsetLeft,i=o.offsetTop)}const u=Bn(r);if(u<=0){const h=r.ownerDocument,d=h.body,c=getComputedStyle(d),f=h.compatMode==="CSS1Compat"&&parseFloat(c.marginLeft)+parseFloat(c.marginRight)||0,g=Math.abs(r.clientWidth-d.clientWidth-f);g<=So&&(s-=g)}else u<=So&&(s+=u);return{width:s,height:a,x:l,y:i}}function gc(e,t){const n=Ot(e,!0,t==="fixed"),r=n.top+e.clientTop,o=n.left+e.clientLeft,s=ht(e)?Vt(e):Ze(1),a=e.clientWidth*s.x,l=e.clientHeight*s.y,i=o*s.x,u=r*s.y;return{width:a,height:l,x:i,y:u}}function ko(e,t,n){let r;if(t==="viewport")r=fc(e,n);else if(t==="document")r=dc(et(e));else if(Ue(t))r=gc(t,n);else{const o=Si(e);r={x:t.x-o.x,y:t.y-o.y,width:t.width,height:t.height}}return Tn(r)}function Ei(e,t){const n=Et(e);return n===t||!Ue(n)||Ut(n)?!1:je(n).position==="fixed"||Ei(n,t)}function hc(e,t){const n=t.get(e);if(n)return n;let r=un(e,[],!1).filter(l=>Ue(l)&&Wt(l)!=="body"),o=null;const s=je(e).position==="fixed";let a=s?Et(e):e;for(;Ue(a)&&!Ut(a);){const l=je(a),i=Cr(a);!i&&l.position==="fixed"&&(o=null),(s?!i&&!o:!i&&l.position==="static"&&!!o&&(o.position==="absolute"||o.position==="fixed")||vn(a)&&!i&&Ei(e,a))?r=r.filter(h=>h!==a):o=l,a=Et(a)}return t.set(e,r),r}function vc(e){let{element:t,boundary:n,rootBoundary:r,strategy:o}=e;const a=[...n==="clippingAncestors"?zn(t)?[]:hc(t,this._c):[].concat(n),r],l=ko(t,a[0],o);let i=l.top,u=l.right,h=l.bottom,d=l.left;for(let c=1;c<a.length;c++){const f=ko(t,a[c],o);i=Le(f.top,i),u=St(f.right,u),h=St(f.bottom,h),d=Le(f.left,d)}return{width:u-d,height:h-i,x:d,y:i}}function yc(e){const{width:t,height:n}=Ci(e);return{width:t,height:n}}function mc(e,t,n){const r=ht(t),o=et(t),s=n==="fixed",a=Ot(e,!0,s,t);let l={scrollLeft:0,scrollTop:0};const i=Ze(0);function u(){i.x=Bn(o)}if(r||!r&&!s)if((Wt(t)!=="body"||vn(o))&&(l=Kn(t)),r){const f=Ot(t,!0,s,t);i.x=f.x+t.clientLeft,i.y=f.y+t.clientTop}else o&&u();s&&!r&&o&&u();const h=o&&!r&&!s?ki(o,l):Ze(0),d=a.left+l.scrollLeft-i.x-h.x,c=a.top+l.scrollTop-i.y-h.y;return{x:d,y:c,width:a.width,height:a.height}}function Qn(e){return je(e).position==="static"}function Eo(e,t){if(!ht(e)||je(e).position==="fixed")return null;if(t)return t(e);let n=e.offsetParent;return et(e)===n&&(n=n.ownerDocument.body),n}function Di(e,t){const n=Ie(e);if(zn(e))return n;if(!ht(e)){let o=Et(e);for(;o&&!Ut(o);){if(Ue(o)&&!Qn(o))return o;o=Et(o)}return n}let r=Eo(e,t);for(;r&&rc(r)&&Qn(r);)r=Eo(r,t);return r&&Ut(r)&&Qn(r)&&!Cr(r)?n:r||sc(e)||n}var bc=async function(e){const t=this.getOffsetParent||Di,n=this.getDimensions,r=await n(e.floating);return{reference:mc(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function pc(e){return je(e).direction==="rtl"}var Ai={convertOffsetParentRelativeRectToViewportRelativeRect:cc,getDocumentElement:et,getClippingRect:vc,getOffsetParent:Di,getElementRects:bc,getClientRects:uc,getDimensions:yc,getScale:Vt,isElement:Ue,isRTL:pc};function Mi(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function wc(e,t){let n=null,r;const o=et(e);function s(){var l;clearTimeout(r),(l=n)==null||l.disconnect(),n=null}function a(l,i){l===void 0&&(l=!1),i===void 0&&(i=1),s();const u=e.getBoundingClientRect(),{left:h,top:d,width:c,height:f}=u;if(l||t(),!c||!f)return;const g=$n(d),m=$n(o.clientWidth-(h+c)),v=$n(o.clientHeight-(d+f)),b=$n(h),w={rootMargin:-g+"px "+-m+"px "+-v+"px "+-b+"px",threshold:Le(0,St(1,i))||1};let x=!0;function $(O){const k=O[0].intersectionRatio;if(k!==i){if(!x)return a();k?a(!1,k):r=setTimeout(()=>{a(!1,1e-7)},1e3)}k===1&&!Mi(u,e.getBoundingClientRect())&&a(),x=!1}try{n=new IntersectionObserver($,{...w,root:o.ownerDocument})}catch{n=new IntersectionObserver($,w)}n.observe(e)}return a(!0),s}function xc(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:o=!0,ancestorResize:s=!0,elementResize:a=typeof ResizeObserver=="function",layoutShift:l=typeof IntersectionObserver=="function",animationFrame:i=!1}=r,u=kr(e),h=o||s?[...u?un(u):[],...t?un(t):[]]:[];h.forEach(b=>{o&&b.addEventListener("scroll",n,{passive:!0}),s&&b.addEventListener("resize",n)});const d=u&&l?wc(u,n):null;let c=-1,f=null;a&&(f=new ResizeObserver(b=>{let[p]=b;p&&p.target===u&&f&&t&&(f.unobserve(t),cancelAnimationFrame(c),c=requestAnimationFrame(()=>{var w;(w=f)==null||w.observe(t)})),n()}),u&&!i&&f.observe(u),t&&f.observe(t));let g,m=i?Ot(e):null;i&&v();function v(){const b=Ot(e);m&&!Mi(m,b)&&n(),m=b,g=requestAnimationFrame(v)}return n(),()=>{var b;h.forEach(p=>{o&&p.removeEventListener("scroll",n),s&&p.removeEventListener("resize",n)}),d==null||d(),(b=f)==null||b.disconnect(),f=null,i&&cancelAnimationFrame(g)}}var $c=ec,Cc=tc,Sc=Yl,kc=nc,Ec=Xl,Dc=Ql,Ac=(e,t,n)=>{const r=new Map,o={platform:Ai,...n},s={...o.platform,_c:r};return Wl(e,t,{...o,platform:s})},Er=xe();function Dr(){const e=$e(Er);if(e===void 0)throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");return e}var Mc=P('<svg display="block" viewBox="0 0 30 30" style="transform:scale(1.02)"><g><path fill="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z"></path><path stroke="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z">'),cr=30,Do=cr/2,Tc={top:180,right:-90,bottom:0,left:90};function Ar(e){const t=Dr(),n=Z({size:cr},e),[r,o]=se(n,["ref","style","size"]),s=()=>t.currentPlacement().split("-")[0],a=qc(t.contentRef),l=()=>{var c;return((c=a())==null?void 0:c.getPropertyValue("background-color"))||"none"},i=()=>{var c;return((c=a())==null?void 0:c.getPropertyValue(`border-${s()}-color`))||"none"},u=()=>{var c;return((c=a())==null?void 0:c.getPropertyValue(`border-${s()}-width`))||"0px"},h=()=>Number.parseInt(u())*2*(cr/r.size),d=()=>`rotate(${Tc[s()]} ${Do} ${Do}) translate(0 2)`;return y(fe,W({as:"div",ref(c){const f=Me(t.setArrowRef,r.ref);typeof f=="function"&&f(c)},"aria-hidden":"true",get style(){return Ln({position:"absolute","font-size":`${r.size}px`,width:"1em",height:"1em","pointer-events":"none",fill:l(),stroke:i(),"stroke-width":h()},r.style)}},o,{get children(){const c=Mc(),f=c.firstChild;return G(()=>T(f,"transform",d())),c}}))}function qc(e){const[t,n]=B();return V(()=>{const r=e();r&&n(Ka(r).getComputedStyle(r))}),t}function Fc(e){const t=Dr(),[n,r]=se(e,["ref","style"]);return y(fe,W({as:"div",ref(o){const s=Me(t.setPositionerRef,n.ref);typeof s=="function"&&s(o)},"data-popper-positioner":"",get style(){return Ln({position:"absolute",top:0,left:0,"min-width":"max-content"},n.style)}},r))}function Ao(e){const{x:t=0,y:n=0,width:r=0,height:o=0}=e??{};if(typeof DOMRect=="function")return new DOMRect(t,n,r,o);const s={x:t,y:n,width:r,height:o,top:n,right:t+r,bottom:n+o,left:t};return{...s,toJSON:()=>s}}function Oc(e,t){return{contextElement:e,getBoundingClientRect:()=>{const r=t(e);return r?Ao(r):e?e.getBoundingClientRect():Ao()}}}function Lc(e){return/^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e)}var Ic={top:"bottom",right:"left",bottom:"top",left:"right"};function Pc(e,t){const[n,r]=e.split("-"),o=Ic[n];return r?n==="left"||n==="right"?`${o} ${r==="start"?"top":"bottom"}`:r==="start"?`${o} ${t==="rtl"?"right":"left"}`:`${o} ${t==="rtl"?"left":"right"}`:`${o} center`}function _c(e){const t=Z({getAnchorRect:c=>c==null?void 0:c.getBoundingClientRect(),placement:"bottom",gutter:0,shift:0,flip:!0,slide:!0,overlap:!1,sameWidth:!1,fitViewport:!1,hideWhenDetached:!1,detachedPadding:0,arrowPadding:4,overflowPadding:8},e),[n,r]=B(),[o,s]=B(),[a,l]=B(t.placement),i=()=>{var c;return Oc((c=t.anchorRef)==null?void 0:c.call(t),t.getAnchorRect)},{direction:u}=Dt();async function h(){var O,k;const c=i(),f=n(),g=o();if(!c||!f)return;const m=((g==null?void 0:g.clientHeight)||0)/2,v=typeof t.gutter=="number"?t.gutter+m:t.gutter??m;f.style.setProperty("--kb-popper-content-overflow-padding",`${t.overflowPadding}px`),c.getBoundingClientRect();const b=[$c(({placement:_})=>{const C=!!_.split("-")[1];return{mainAxis:v,crossAxis:C?void 0:t.shift,alignmentAxis:t.shift}})];if(t.flip!==!1){const _=typeof t.flip=="string"?t.flip.split(" "):void 0;if(_!==void 0&&!_.every(Lc))throw new Error("`flip` expects a spaced-delimited list of placements");b.push(Sc({padding:t.overflowPadding,fallbackPlacements:_}))}(t.slide||t.overlap)&&b.push(Cc({mainAxis:t.slide,crossAxis:t.overlap,padding:t.overflowPadding})),b.push(kc({padding:t.overflowPadding,apply({availableWidth:_,availableHeight:C,rects:A}){const R=Math.round(A.reference.width);_=Math.floor(_),C=Math.floor(C),f.style.setProperty("--kb-popper-anchor-width",`${R}px`),f.style.setProperty("--kb-popper-content-available-width",`${_}px`),f.style.setProperty("--kb-popper-content-available-height",`${C}px`),t.sameWidth&&(f.style.width=`${R}px`),t.fitViewport&&(f.style.maxWidth=`${_}px`,f.style.maxHeight=`${C}px`)}})),t.hideWhenDetached&&b.push(Ec({padding:t.detachedPadding})),g&&b.push(Dc({element:g,padding:t.arrowPadding}));const p=await Ac(c,f,{placement:t.placement,strategy:"absolute",middleware:b,platform:{...Ai,isRTL:()=>u()==="rtl"}});if(l(p.placement),(O=t.onCurrentPlacementChange)==null||O.call(t,p.placement),!f)return;f.style.setProperty("--kb-popper-content-transform-origin",Pc(p.placement,u()));const w=Math.round(p.x),x=Math.round(p.y);let $;if(t.hideWhenDetached&&($=(k=p.middlewareData.hide)!=null&&k.referenceHidden?"hidden":"visible"),Object.assign(f.style,{top:"0",left:"0",transform:`translate3d(${w}px, ${x}px, 0)`,visibility:$}),g&&p.middlewareData.arrow){const{x:_,y:C}=p.middlewareData.arrow,A=p.placement.split("-")[0];Object.assign(g.style,{left:_!=null?`${_}px`:"",top:C!=null?`${C}px`:"",[A]:"100%"})}}V(()=>{const c=i(),f=n();if(!c||!f)return;const g=xc(c,f,h,{elementResize:typeof ResizeObserver=="function"});U(g)}),V(()=>{var g;const c=n(),f=(g=t.contentRef)==null?void 0:g.call(t);!c||!f||queueMicrotask(()=>{c.style.zIndex=getComputedStyle(f).zIndex})});const d={currentPlacement:a,contentRef:()=>{var c;return(c=t.contentRef)==null?void 0:c.call(t)},setPositionerRef:r,setArrowRef:s};return y(Er.Provider,{value:d,get children(){return t.children}})}var Ti=Object.assign(_c,{Arrow:Ar,Context:Er,usePopperContext:Dr,Positioner:Fc}),qn="data-kb-top-layer",qi,ur=!1,gt=[];function dn(e){return gt.findIndex(t=>t.node===e)}function Rc(e){return gt[dn(e)]}function zc(e){return gt[gt.length-1].node===e}function Fi(){return gt.filter(e=>e.isPointerBlocking)}function Kc(){return[...Fi()].slice(-1)[0]}function Mr(){return Fi().length>0}function Oi(e){var n;const t=dn((n=Kc())==null?void 0:n.node);return dn(e)<t}function Bc(e){gt.push(e)}function Nc(e){const t=dn(e);t<0||gt.splice(t,1)}function Hc(){for(const{node:e}of gt)e.style.pointerEvents=Oi(e)?"none":"auto"}function Vc(e){if(Mr()&&!ur){const t=Je(e);qi=document.body.style.pointerEvents,t.body.style.pointerEvents="none",ur=!0}}function Gc(e){if(Mr())return;const t=Je(e);t.body.style.pointerEvents=qi,t.body.style.length===0&&t.body.removeAttribute("style"),ur=!1}var Fe={layers:gt,isTopMostLayer:zc,hasPointerBlockingLayer:Mr,isBelowPointerBlockingLayer:Oi,addLayer:Bc,removeLayer:Nc,indexOf:dn,find:Rc,assignPointerEventToLayers:Hc,disableBodyPointerEvents:Vc,restoreBodyPointerEvents:Gc},Mo="interactOutside.pointerDownOutside",To="interactOutside.focusOutside";function Uc(e,t){let n,r=nl;const o=()=>Je(t()),s=d=>{var c;return(c=e.onPointerDownOutside)==null?void 0:c.call(e,d)},a=d=>{var c;return(c=e.onFocusOutside)==null?void 0:c.call(e,d)},l=d=>{var c;return(c=e.onInteractOutside)==null?void 0:c.call(e,d)},i=d=>{var f;const c=d.target;return!(c instanceof Element)||c.closest(`[${qn}]`)||!Ne(o(),c)||Ne(t(),c)?!1:!((f=e.shouldExcludeElement)!=null&&f.call(e,c))},u=d=>{function c(){const f=t(),g=d.target;if(!f||!g||!i(d))return;const m=we([s,l]);g.addEventListener(Mo,m,{once:!0});const v=new CustomEvent(Mo,{bubbles:!1,cancelable:!0,detail:{originalEvent:d,isContextMenu:d.button===2||Ga(d)&&d.button===0}});g.dispatchEvent(v)}d.pointerType==="touch"?(o().removeEventListener("click",c),r=c,o().addEventListener("click",c,{once:!0})):c()},h=d=>{const c=t(),f=d.target;if(!c||!f||!i(d))return;const g=we([a,l]);f.addEventListener(To,g,{once:!0});const m=new CustomEvent(To,{bubbles:!1,cancelable:!0,detail:{originalEvent:d,isContextMenu:!1}});f.dispatchEvent(m)};V(()=>{D(e.isDisabled)||(n=window.setTimeout(()=>{o().addEventListener("pointerdown",u,!0)},0),o().addEventListener("focusin",h,!0),U(()=>{window.clearTimeout(n),o().removeEventListener("click",r),o().removeEventListener("pointerdown",u,!0),o().removeEventListener("focusin",h,!0)}))})}function jc(e){const t=n=>{var r;n.key===yr.Escape&&((r=e.onEscapeKeyDown)==null||r.call(e,n))};V(()=>{var r;if(D(e.isDisabled))return;const n=((r=e.ownerDocument)==null?void 0:r.call(e))??Je();n.addEventListener("keydown",t),U(()=>{n.removeEventListener("keydown",t)})})}var Li=xe();function Wc(){return $e(Li)}function Qc(e){let t;const n=Wc(),[r,o]=se(e,["ref","disableOutsidePointerEvents","excludedElements","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss","bypassTopMostLayerCheck"]),s=new Set([]),a=d=>{s.add(d);const c=n==null?void 0:n.registerNestedLayer(d);return()=>{s.delete(d),c==null||c()}};Uc({shouldExcludeElement:d=>{var c;return t?((c=r.excludedElements)==null?void 0:c.some(f=>Ne(f(),d)))||[...s].some(f=>Ne(f,d)):!1},onPointerDownOutside:d=>{var c,f,g;!t||Fe.isBelowPointerBlockingLayer(t)||!r.bypassTopMostLayerCheck&&!Fe.isTopMostLayer(t)||((c=r.onPointerDownOutside)==null||c.call(r,d),(f=r.onInteractOutside)==null||f.call(r,d),d.defaultPrevented||(g=r.onDismiss)==null||g.call(r))},onFocusOutside:d=>{var c,f,g;(c=r.onFocusOutside)==null||c.call(r,d),(f=r.onInteractOutside)==null||f.call(r,d),d.defaultPrevented||(g=r.onDismiss)==null||g.call(r)}},()=>t),jc({ownerDocument:()=>Je(t),onEscapeKeyDown:d=>{var c;!t||!Fe.isTopMostLayer(t)||((c=r.onEscapeKeyDown)==null||c.call(r,d),!d.defaultPrevented&&r.onDismiss&&(d.preventDefault(),r.onDismiss()))}}),Ct(()=>{if(!t)return;Fe.addLayer({node:t,isPointerBlocking:r.disableOutsidePointerEvents,dismiss:r.onDismiss});const d=n==null?void 0:n.registerNestedLayer(t);Fe.assignPointerEventToLayers(),Fe.disableBodyPointerEvents(t),U(()=>{t&&(Fe.removeLayer(t),d==null||d(),Fe.assignPointerEventToLayers(),Fe.restoreBodyPointerEvents(t))})}),V(ft([()=>t,()=>r.disableOutsidePointerEvents],([d,c])=>{if(!d)return;const f=Fe.find(d);f&&f.isPointerBlocking!==c&&(f.isPointerBlocking=c,Fe.assignPointerEventToLayers()),c&&Fe.disableBodyPointerEvents(d),U(()=>{Fe.restoreBodyPointerEvents(d)})},{defer:!0}));const h={registerNestedLayer:a};return y(Li.Provider,{value:h,get children(){return y(fe,W({as:"div",ref(d){const c=Me(f=>t=f,r.ref);typeof c=="function"&&c(d)}},o))}})}function Ii(e={}){const[t,n]=ci({value:()=>D(e.open),defaultValue:()=>!!D(e.defaultOpen),onChange:a=>{var l;return(l=e.onOpenChange)==null?void 0:l.call(e,a)}}),r=()=>{n(!0)},o=()=>{n(!1)};return{isOpen:t,setIsOpen:n,open:r,close:o,toggle:()=>{t()?o():r()}}}function He(e){return t=>(e(t),()=>e(void 0))}var Ee=e=>typeof e=="function"?e():e,Yc=e=>{const t=I(()=>{const a=Ee(e.element);if(a)return getComputedStyle(a)}),n=()=>{var a;return((a=t())==null?void 0:a.animationName)??"none"},[r,o]=B(Ee(e.show)?"present":"hidden");let s="none";return V(a=>{const l=Ee(e.show);return Ht(()=>{var h;if(a===l)return l;const i=s,u=n();l?o("present"):u==="none"||((h=t())==null?void 0:h.display)==="none"?o("hidden"):o(a===!0&&i!==u?"hiding":"hidden")}),l}),V(()=>{const a=Ee(e.element);if(!a)return;const l=u=>{u.target===a&&(s=n())},i=u=>{const d=n().includes(u.animationName);u.target===a&&d&&r()==="hiding"&&o("hidden")};a.addEventListener("animationstart",l),a.addEventListener("animationcancel",i),a.addEventListener("animationend",i),U(()=>{a.removeEventListener("animationstart",l),a.removeEventListener("animationcancel",i),a.removeEventListener("animationend",i)})}),{present:()=>r()==="present"||r()==="hiding",state:r,setState:o}},Xc=Yc,Pi=Xc,Zc=["id","name","validationState","required","disabled","readOnly"];function Jc(e){const t=`form-control-${Pe()}`,n=Z({id:t},e),[r,o]=B(),[s,a]=B(),[l,i]=B(),[u,h]=B(),d=(m,v,b)=>{const p=b!=null||r()!=null;return[b,r(),p&&v!=null?m:void 0].filter(Boolean).join(" ")||void 0},c=m=>[l(),u(),m].filter(Boolean).join(" ")||void 0,f=I(()=>({"data-valid":D(n.validationState)==="valid"?"":void 0,"data-invalid":D(n.validationState)==="invalid"?"":void 0,"data-required":D(n.required)?"":void 0,"data-disabled":D(n.disabled)?"":void 0,"data-readonly":D(n.readOnly)?"":void 0}));return{formControlContext:{name:()=>D(n.name)??D(n.id),dataset:f,validationState:()=>D(n.validationState),isRequired:()=>D(n.required),isDisabled:()=>D(n.disabled),isReadOnly:()=>D(n.readOnly),labelId:r,fieldId:s,descriptionId:l,errorMessageId:u,getAriaLabelledBy:d,getAriaDescribedBy:c,generateId:gn(()=>D(n.id)),registerLabel:He(o),registerField:He(a),registerDescription:He(i),registerErrorMessage:He(h)}}}var _i=xe();function yn(){const e=$e(_i);if(e===void 0)throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");return e}function Ri(e){const t=yn(),n=Z({id:t.generateId("description")},e);return V(()=>U(t.registerDescription(n.id))),y(fe,W({as:"div"},()=>t.dataset(),n))}function eu(e){let t;const n=yn(),r=Z({id:n.generateId("label")},e),[o,s]=se(r,["ref"]),a=Pn(()=>t,()=>"label");return V(()=>U(n.registerLabel(s.id))),y(fe,W({as:"label",ref(l){const i=Me(u=>t=u,o.ref);typeof i=="function"&&i(l)},get for(){return ge(()=>a()==="label")()?n.fieldId():void 0}},()=>n.dataset(),s))}function tu(e,t){V(ft(e,n=>{if(n==null)return;const r=nu(n);r!=null&&(r.addEventListener("reset",t,{passive:!0}),U(()=>{r.removeEventListener("reset",t)}))}))}function nu(e){return ru(e)?e.form:e.closest("form")}function ru(e){return e.matches("textarea, input, select, button")}function zi(e){const t=yn(),n=Z({id:t.generateId("error-message")},e),[r,o]=se(n,["forceMount"]),s=()=>t.validationState()==="invalid";return V(()=>{s()&&U(t.registerErrorMessage(o.id))}),y(K,{get when(){return r.forceMount||s()},get children(){return y(fe,W({as:"div"},()=>t.dataset(),o))}})}var Yn="focusScope.autoFocusOnMount",Xn="focusScope.autoFocusOnUnmount",qo={bubbles:!1,cancelable:!0},Fo={stack:[],active(){return this.stack[0]},add(e){var t;e!==this.active()&&((t=this.active())==null||t.pause()),this.stack=rr(this.stack,e),this.stack.unshift(e)},remove(e){var t;this.stack=rr(this.stack,e),(t=this.active())==null||t.resume()}};function ou(e,t){const[n,r]=B(!1),o={pause(){r(!0)},resume(){r(!1)}};let s=null;const a=g=>{var m;return(m=e.onMountAutoFocus)==null?void 0:m.call(e,g)},l=g=>{var m;return(m=e.onUnmountAutoFocus)==null?void 0:m.call(e,g)},i=()=>Je(t()),u=()=>{const g=i().createElement("span");return g.setAttribute("data-focus-trap",""),g.tabIndex=0,Object.assign(g.style,li),g},h=()=>{const g=t();return g?si(g,!0).filter(m=>!m.hasAttribute("data-focus-trap")):[]},d=()=>{const g=h();return g.length>0?g[0]:null},c=()=>{const g=h();return g.length>0?g[g.length-1]:null},f=()=>{const g=t();if(!g)return!1;const m=an(g);return!m||Ne(g,m)?!1:ai(m)};V(()=>{const g=t();if(!g)return;Fo.add(o);const m=an(g);if(!Ne(g,m)){const b=new CustomEvent(Yn,qo);g.addEventListener(Yn,a),g.dispatchEvent(b),b.defaultPrevented||setTimeout(()=>{De(d()),an(g)===m&&De(g)},0)}U(()=>{g.removeEventListener(Yn,a),setTimeout(()=>{const b=new CustomEvent(Xn,qo);f()&&b.preventDefault(),g.addEventListener(Xn,l),g.dispatchEvent(b),b.defaultPrevented||De(m??i().body),g.removeEventListener(Xn,l),Fo.remove(o)},0)})}),V(()=>{const g=t();if(!g||!D(e.trapFocus)||n())return;const m=b=>{const p=b.target;p!=null&&p.closest(`[${qn}]`)||(Ne(g,p)?s=p:De(s))},v=b=>{const w=b.relatedTarget??an(g);w!=null&&w.closest(`[${qn}]`)||Ne(g,w)||De(s)};i().addEventListener("focusin",m),i().addEventListener("focusout",v),U(()=>{i().removeEventListener("focusin",m),i().removeEventListener("focusout",v)})}),V(()=>{const g=t();if(!g||!D(e.trapFocus)||n())return;const m=u();g.insertAdjacentElement("afterbegin",m);const v=u();g.insertAdjacentElement("beforeend",v);function b(w){const x=d(),$=c();w.relatedTarget===x?De($):De(x)}m.addEventListener("focusin",b),v.addEventListener("focusin",b);const p=new MutationObserver(w=>{for(const x of w)x.previousSibling===v&&(v.remove(),g.insertAdjacentElement("beforeend",v)),x.nextSibling===m&&(m.remove(),g.insertAdjacentElement("afterbegin",m))});p.observe(g,{childList:!0,subtree:!1}),U(()=>{m.removeEventListener("focusin",b),v.removeEventListener("focusin",b),m.remove(),v.remove(),p.disconnect()})})}var iu="data-live-announcer";function su(e){V(()=>{D(e.isDisabled)||U(au(D(e.targets),D(e.root)))})}var rn=new WeakMap,Ke=[];function au(e,t=document.body){const n=new Set(e),r=new Set,o=i=>{for(const c of i.querySelectorAll(`[${iu}], [${qn}]`))n.add(c);const u=c=>{if(n.has(c)||c.parentElement&&r.has(c.parentElement)&&c.parentElement.getAttribute("role")!=="row")return NodeFilter.FILTER_REJECT;for(const f of n)if(c.contains(f))return NodeFilter.FILTER_SKIP;return NodeFilter.FILTER_ACCEPT},h=document.createTreeWalker(i,NodeFilter.SHOW_ELEMENT,{acceptNode:u}),d=u(i);if(d===NodeFilter.FILTER_ACCEPT&&s(i),d!==NodeFilter.FILTER_REJECT){let c=h.nextNode();for(;c!=null;)s(c),c=h.nextNode()}},s=i=>{const u=rn.get(i)??0;i.getAttribute("aria-hidden")==="true"&&u===0||(u===0&&i.setAttribute("aria-hidden","true"),r.add(i),rn.set(i,u+1))};Ke.length&&Ke[Ke.length-1].disconnect(),o(t);const a=new MutationObserver(i=>{for(const u of i)if(!(u.type!=="childList"||u.addedNodes.length===0)&&![...n,...r].some(h=>h.contains(u.target))){for(const h of u.removedNodes)h instanceof Element&&(n.delete(h),r.delete(h));for(const h of u.addedNodes)(h instanceof HTMLElement||h instanceof SVGElement)&&(h.dataset.liveAnnouncer==="true"||h.dataset.reactAriaTopLayer==="true")?n.add(h):h instanceof Element&&o(h)}});a.observe(t,{childList:!0,subtree:!0});const l={observe(){a.observe(t,{childList:!0,subtree:!0})},disconnect(){a.disconnect()}};return Ke.push(l),()=>{a.disconnect();for(const i of r){const u=rn.get(i);if(u==null)return;u===1?(i.removeAttribute("aria-hidden"),rn.delete(i)):rn.set(i,u-1)}l===Ke[Ke.length-1]?(Ke.pop(),Ke.length&&Ke[Ke.length-1].observe()):Ke.splice(Ke.indexOf(l),1)}}var dr=(e,t)=>{if(e.contains(t))return!0;let n=t;for(;n;){if(n===e)return!0;n=n._$host??n.parentElement}return!1},Cn=new Map,lu=e=>{V(()=>{const t=Ee(e.style)??{},n=Ee(e.properties)??[],r={};for(const s in t)r[s]=e.element.style[s];const o=Cn.get(e.key);o?o.activeCount++:Cn.set(e.key,{activeCount:1,originalStyles:r,properties:n.map(s=>s.key)}),Object.assign(e.element.style,e.style);for(const s of n)e.element.style.setProperty(s.key,s.value);U(()=>{var a;const s=Cn.get(e.key);if(s){if(s.activeCount!==1){s.activeCount--;return}Cn.delete(e.key);for(const[l,i]of Object.entries(s.originalStyles))e.element.style[l]=i;for(const l of s.properties)e.element.style.removeProperty(l);e.element.style.length===0&&e.element.removeAttribute("style"),(a=e.cleanup)==null||a.call(e)}})})},Oo=lu,cu=(e,t)=>{switch(t){case"x":return[e.clientWidth,e.scrollLeft,e.scrollWidth];case"y":return[e.clientHeight,e.scrollTop,e.scrollHeight]}},uu=(e,t)=>{const n=getComputedStyle(e),r=t==="x"?n.overflowX:n.overflowY;return r==="auto"||r==="scroll"||e.tagName==="HTML"&&r==="visible"},du=(e,t,n)=>{const r=t==="x"&&window.getComputedStyle(e).direction==="rtl"?-1:1;let o=e,s=0,a=0,l=!1;do{const[i,u,h]=cu(o,t),d=h-i-r*u;(u!==0||d!==0)&&uu(o,t)&&(s+=d,a+=u),o===(n??document.documentElement)?l=!0:o=o._$host??o.parentElement}while(o&&!l);return[s,a]},[Lo,Io]=B([]),fu=e=>Lo().indexOf(e)===Lo().length-1,gu=e=>{const t=W({element:null,enabled:!0,hideScrollbar:!0,preventScrollbarShift:!0,preventScrollbarShiftMode:"padding",restoreScrollPosition:!0,allowPinchZoom:!1},e),n=Pe();let r=[0,0],o=null,s=null;V(()=>{Ee(t.enabled)&&(Io(u=>[...u,n]),U(()=>{Io(u=>u.filter(h=>h!==n))}))}),V(()=>{if(!Ee(t.enabled)||!Ee(t.hideScrollbar))return;const{body:u}=document,h=window.innerWidth-u.offsetWidth;if(Ee(t.preventScrollbarShift)){const d={overflow:"hidden"},c=[];h>0&&(Ee(t.preventScrollbarShiftMode)==="padding"?d.paddingRight=`calc(${window.getComputedStyle(u).paddingRight} + ${h}px)`:d.marginRight=`calc(${window.getComputedStyle(u).marginRight} + ${h}px)`,c.push({key:"--scrollbar-width",value:`${h}px`}));const f=window.scrollY,g=window.scrollX;Oo({key:"prevent-scroll",element:u,style:d,properties:c,cleanup:()=>{Ee(t.restoreScrollPosition)&&h>0&&window.scrollTo(g,f)}})}else Oo({key:"prevent-scroll",element:u,style:{overflow:"hidden"}})}),V(()=>{!fu(n)||!Ee(t.enabled)||(document.addEventListener("wheel",l,{passive:!1}),document.addEventListener("touchstart",a,{passive:!1}),document.addEventListener("touchmove",i,{passive:!1}),U(()=>{document.removeEventListener("wheel",l),document.removeEventListener("touchstart",a),document.removeEventListener("touchmove",i)}))});const a=u=>{r=Po(u),o=null,s=null},l=u=>{const h=u.target,d=Ee(t.element),c=hu(u),f=Math.abs(c[0])>Math.abs(c[1])?"x":"y",g=f==="x"?c[0]:c[1],m=_o(h,f,g,d);let v;d&&dr(d,h)?v=!m:v=!0,v&&u.cancelable&&u.preventDefault()},i=u=>{const h=Ee(t.element),d=u.target;let c;if(u.touches.length===2)c=!Ee(t.allowPinchZoom);else{if(o==null||s===null){const f=Po(u).map((m,v)=>r[v]-m),g=Math.abs(f[0])>Math.abs(f[1])?"x":"y";o=g,s=g==="x"?f[0]:f[1]}if(d.type==="range")c=!1;else{const f=_o(d,o,s,h);h&&dr(h,d)?c=!f:c=!0}}c&&u.cancelable&&u.preventDefault()}},hu=e=>[e.deltaX,e.deltaY],Po=e=>e.changedTouches[0]?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0],_o=(e,t,n,r)=>{const o=r!==null&&dr(r,e),[s,a]=du(e,t,o?r:void 0);return!(n>0&&Math.abs(s)<=1||n<0&&Math.abs(a)<1)},vu=gu,yu=vu,Be={};_n(Be,{Description:()=>Ri,ErrorMessage:()=>zi,Item:()=>Ni,ItemControl:()=>Hi,ItemDescription:()=>Vi,ItemIndicator:()=>Gi,ItemInput:()=>Ui,ItemLabel:()=>ji,Label:()=>Wi,RadioGroup:()=>mu,Root:()=>Qi,useRadioGroupContext:()=>Tr});var Ki=xe();function Tr(){const e=$e(Ki);if(e===void 0)throw new Error("[kobalte]: `useRadioGroupContext` must be used within a `RadioGroup` component");return e}var Bi=xe();function mn(){const e=$e(Bi);if(e===void 0)throw new Error("[kobalte]: `useRadioGroupItemContext` must be used within a `RadioGroup.Item` component");return e}function Ni(e){const t=yn(),n=Tr(),r=`${t.generateId("item")}-${Pe()}`,o=Z({id:r},e),[s,a]=se(o,["value","disabled","onPointerDown"]),[l,i]=B(),[u,h]=B(),[d,c]=B(),[f,g]=B(),[m,v]=B(!1),b=I(()=>n.isDefaultValue(s.value)),p=I(()=>n.isSelectedValue(s.value)),w=I(()=>s.disabled||t.isDisabled()||!1),x=k=>{de(k,s.onPointerDown),m()&&k.preventDefault()},$=I(()=>({...t.dataset(),"data-disabled":w()?"":void 0,"data-checked":p()?"":void 0})),O={value:()=>s.value,dataset:$,isDefault:b,isSelected:p,isDisabled:w,inputId:l,labelId:u,descriptionId:d,inputRef:f,select:()=>n.setSelectedValue(s.value),generateId:gn(()=>a.id),registerInput:He(i),registerLabel:He(h),registerDescription:He(c),setIsFocused:v,setInputRef:g};return y(Bi.Provider,{value:O,get children(){return y(fe,W({as:"div",role:"group",onPointerDown:x},$,a))}})}function Hi(e){const t=mn(),n=Z({id:t.generateId("control")},e),[r,o]=se(n,["onClick","onKeyDown"]);return y(fe,W({as:"div",onClick:l=>{var i;de(l,r.onClick),t.select(),(i=t.inputRef())==null||i.focus()},onKeyDown:l=>{var i;de(l,r.onKeyDown),l.key===yr.Space&&(t.select(),(i=t.inputRef())==null||i.focus())}},()=>t.dataset(),o))}function Vi(e){const t=mn(),n=Z({id:t.generateId("description")},e);return V(()=>U(t.registerDescription(n.id))),y(fe,W({as:"div"},()=>t.dataset(),n))}function Gi(e){const t=mn(),n=Z({id:t.generateId("indicator")},e),[r,o]=se(n,["ref","forceMount"]),[s,a]=B(),{present:l}=Pi({show:()=>r.forceMount||t.isSelected(),element:()=>s()??null});return y(K,{get when(){return l()},get children(){return y(fe,W({as:"div",ref(i){const u=Me(a,r.ref);typeof u=="function"&&u(i)}},()=>t.dataset(),o))}})}function Ui(e){const t=yn(),n=Tr(),r=mn(),o=Z({id:r.generateId("input")},e),[s,a]=se(o,["ref","style","aria-labelledby","aria-describedby","onChange","onFocus","onBlur"]),l=()=>[s["aria-labelledby"],r.labelId(),s["aria-labelledby"]!=null&&a["aria-label"]!=null?a.id:void 0].filter(Boolean).join(" ")||void 0,i=()=>[s["aria-describedby"],r.descriptionId(),n.ariaDescribedBy()].filter(Boolean).join(" ")||void 0,[u,h]=B(!1),d=g=>{if(de(g,s.onChange),g.stopPropagation(),!u()){n.setSelectedValue(r.value());const m=g.target;m.checked=r.isSelected()}h(!1)},c=g=>{de(g,s.onFocus),r.setIsFocused(!0)},f=g=>{de(g,s.onBlur),r.setIsFocused(!1)};return V(ft([()=>r.isSelected(),()=>r.value()],g=>{if(!g[0]&&g[1]===r.value())return;h(!0);const m=r.inputRef();m==null||m.dispatchEvent(new Event("input",{bubbles:!0,cancelable:!0})),m==null||m.dispatchEvent(new Event("change",{bubbles:!0,cancelable:!0}))},{defer:!0})),V(()=>U(r.registerInput(a.id))),y(fe,W({as:"input",ref(g){const m=Me(r.setInputRef,s.ref);typeof m=="function"&&m(g)},type:"radio",get name(){return t.name()},get value(){return r.value()},get checked(){return r.isSelected()},get required(){return t.isRequired()},get disabled(){return r.isDisabled()},get readonly(){return t.isReadOnly()},get style(){return Ln({...li},s.style)},get"aria-labelledby"(){return l()},get"aria-describedby"(){return i()},onChange:d,onFocus:c,onBlur:f},()=>r.dataset(),a))}function ji(e){const t=mn(),n=Z({id:t.generateId("label")},e);return V(()=>U(t.registerLabel(n.id))),y(fe,W({as:"label",get for(){return t.inputId()}},()=>t.dataset(),n))}function Wi(e){return y(eu,W({as:"span"},e))}function Qi(e){let t;const n=`radiogroup-${Pe()}`,r=Z({id:n,orientation:"vertical"},e),[o,s,a]=se(r,["ref","value","defaultValue","onChange","orientation","aria-labelledby","aria-describedby"],Zc),[l,i]=hn({value:()=>o.value,defaultValue:()=>o.defaultValue,onChange:v=>{var b;return(b=o.onChange)==null?void 0:b.call(o,v)}}),{formControlContext:u}=Jc(s);tu(()=>t,()=>i(o.defaultValue??""));const h=()=>u.getAriaLabelledBy(D(s.id),a["aria-label"],o["aria-labelledby"]),d=()=>u.getAriaDescribedBy(o["aria-describedby"]),c=v=>v===e.defaultValue,f=v=>v===l(),m={ariaDescribedBy:d,isDefaultValue:c,isSelectedValue:f,setSelectedValue:v=>{if(!(u.isReadOnly()||u.isDisabled())&&(i(v),t))for(const b of t.querySelectorAll("[type='radio']")){const p=b;p.checked=f(p.value)}}};return y(_i.Provider,{value:u,get children(){return y(Ki.Provider,{value:m,get children(){return y(fe,W({as:"div",ref(v){const b=Me(p=>t=p,o.ref);typeof b=="function"&&b(v)},role:"radiogroup",get id(){return D(s.id)},get"aria-invalid"(){return u.validationState()==="invalid"||void 0},get"aria-required"(){return u.isRequired()||void 0},get"aria-disabled"(){return u.isDisabled()||void 0},get"aria-readonly"(){return u.isReadOnly()||void 0},get"aria-orientation"(){return o.orientation},get"aria-labelledby"(){return h()},get"aria-describedby"(){return d()}},()=>u.dataset(),a))}})}})}var mu=Object.assign(Qi,{Description:Ri,ErrorMessage:zi,Item:Ni,ItemControl:Hi,ItemDescription:Vi,ItemIndicator:Gi,ItemInput:Ui,ItemLabel:ji,Label:Wi}),bu=class{constructor(e,t,n){Re(this,"collection");Re(this,"ref");Re(this,"collator");this.collection=e,this.ref=t,this.collator=n}getKeyBelow(e){let t=this.collection().getKeyAfter(e);for(;t!=null;){const n=this.collection().getItem(t);if(n&&n.type==="item"&&!n.disabled)return t;t=this.collection().getKeyAfter(t)}}getKeyAbove(e){let t=this.collection().getKeyBefore(e);for(;t!=null;){const n=this.collection().getItem(t);if(n&&n.type==="item"&&!n.disabled)return t;t=this.collection().getKeyBefore(t)}}getFirstKey(){let e=this.collection().getFirstKey();for(;e!=null;){const t=this.collection().getItem(e);if(t&&t.type==="item"&&!t.disabled)return e;e=this.collection().getKeyAfter(e)}}getLastKey(){let e=this.collection().getLastKey();for(;e!=null;){const t=this.collection().getItem(e);if(t&&t.type==="item"&&!t.disabled)return e;e=this.collection().getKeyBefore(e)}}getItem(e){var t,n;return((n=(t=this.ref)==null?void 0:t.call(this))==null?void 0:n.querySelector(`[data-key="${e}"]`))??null}getKeyPageAbove(e){var s;const t=(s=this.ref)==null?void 0:s.call(this);let n=this.getItem(e);if(!t||!n)return;const r=Math.max(0,n.offsetTop+n.offsetHeight-t.offsetHeight);let o=e;for(;o&&n&&n.offsetTop>r;)o=this.getKeyAbove(o),n=o!=null?this.getItem(o):null;return o}getKeyPageBelow(e){var s;const t=(s=this.ref)==null?void 0:s.call(this);let n=this.getItem(e);if(!t||!n)return;const r=Math.min(t.scrollHeight,n.offsetTop-n.offsetHeight+t.offsetHeight);let o=e;for(;o&&n&&n.offsetTop<r;)o=this.getKeyBelow(o),n=o!=null?this.getItem(o):null;return o}getKeyForSearch(e,t){var o;const n=(o=this.collator)==null?void 0:o.call(this);if(!n)return;let r=t!=null?this.getKeyBelow(t):this.getFirstKey();for(;r!=null;){const s=this.collection().getItem(r);if(s){const a=s.textValue.slice(0,e.length);if(s.textValue&&n.compare(a,e)===0)return r}r=this.getKeyBelow(r)}}};function pu(e,t,n){const r=pl({usage:"search",sensitivity:"base"}),o=I(()=>{const s=D(e.keyboardDelegate);return s||new bu(e.collection,t,r)});return El({selectionManager:()=>D(e.selectionManager),keyboardDelegate:o,autoFocus:()=>D(e.autoFocus),deferAutoFocus:()=>D(e.deferAutoFocus),shouldFocusWrap:()=>D(e.shouldFocusWrap),disallowEmptySelection:()=>D(e.disallowEmptySelection),selectOnFocus:()=>D(e.selectOnFocus),disallowTypeAhead:()=>D(e.disallowTypeAhead),shouldUseVirtualFocus:()=>D(e.shouldUseVirtualFocus),allowsTabNavigation:()=>D(e.allowsTabNavigation),isVirtualized:()=>D(e.isVirtualized),scrollToKey:s=>{var a;return(a=D(e.scrollToKey))==null?void 0:a(s)},orientation:()=>D(e.orientation)},t)}var wu=xe();function Nn(){return $e(wu)}var xu=xe();function Yi(){return $e(xu)}var Xi=xe();function Zi(){return $e(Xi)}function vt(){const e=Zi();if(e===void 0)throw new Error("[kobalte]: `useMenuContext` must be used within a `Menu` component");return e}var Ji=xe();function qr(){const e=$e(Ji);if(e===void 0)throw new Error("[kobalte]: `useMenuItemContext` must be used within a `Menu.Item` component");return e}var es=xe();function tt(){const e=$e(es);if(e===void 0)throw new Error("[kobalte]: `useMenuRootContext` must be used within a `MenuRoot` component");return e}function Fr(e){let t;const n=tt(),r=vt(),o=Z({id:n.generateId(`item-${Pe()}`)},e),[s,a]=se(o,["ref","textValue","disabled","closeOnSelect","checked","indeterminate","onSelect","onPointerMove","onPointerLeave","onPointerDown","onPointerUp","onClick","onKeyDown","onMouseDown","onFocus"]),[l,i]=B(),[u,h]=B(),[d,c]=B(),f=()=>r.listState().selectionManager(),g=()=>a.id,m=()=>f().focusedKey()===g(),v=()=>{var C;(C=s.onSelect)==null||C.call(s),s.closeOnSelect&&setTimeout(()=>{r.close(!0)})};Pl({getItem:()=>{var C;return{ref:()=>t,type:"item",key:g(),textValue:s.textValue??((C=d())==null?void 0:C.textContent)??(t==null?void 0:t.textContent)??"",disabled:s.disabled??!1}}});const b=hi({key:g,selectionManager:f,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>s.disabled},()=>t),p=C=>{de(C,s.onPointerMove),C.pointerType==="mouse"&&(s.disabled?r.onItemLeave(C):(r.onItemEnter(C),C.defaultPrevented||(De(C.currentTarget),r.listState().selectionManager().setFocused(!0),r.listState().selectionManager().setFocusedKey(g()))))},w=C=>{de(C,s.onPointerLeave),C.pointerType==="mouse"&&r.onItemLeave(C)},x=C=>{de(C,s.onPointerUp),!s.disabled&&C.button===0&&v()},$=C=>{if(de(C,s.onKeyDown),!C.repeat&&!s.disabled)switch(C.key){case"Enter":case" ":v();break}},O=I(()=>{if(s.indeterminate)return"mixed";if(s.checked!=null)return s.checked}),k=I(()=>({"data-indeterminate":s.indeterminate?"":void 0,"data-checked":s.checked&&!s.indeterminate?"":void 0,"data-disabled":s.disabled?"":void 0,"data-highlighted":m()?"":void 0})),_={isChecked:()=>s.checked,dataset:k,setLabelRef:c,generateId:gn(()=>a.id),registerLabel:He(i),registerDescription:He(h)};return y(Ji.Provider,{value:_,get children(){return y(fe,W({as:"div",ref(C){const A=Me(R=>t=R,s.ref);typeof A=="function"&&A(C)},get tabIndex(){return b.tabIndex()},get"aria-checked"(){return O()},get"aria-disabled"(){return s.disabled},get"aria-labelledby"(){return l()},get"aria-describedby"(){return u()},get"data-key"(){return b.dataKey()},get onPointerDown(){return we([s.onPointerDown,b.onPointerDown])},get onPointerUp(){return we([x,b.onPointerUp])},get onClick(){return we([s.onClick,b.onClick])},get onKeyDown(){return we([$,b.onKeyDown])},get onMouseDown(){return we([s.onMouseDown,b.onMouseDown])},get onFocus(){return we([s.onFocus,b.onFocus])},onPointerMove:p,onPointerLeave:w},k,a))}})}function ts(e){const t=Z({closeOnSelect:!1},e),[n,r]=se(t,["checked","defaultChecked","onChange","onSelect"]),o=dl({isSelected:()=>n.checked,defaultIsSelected:()=>n.defaultChecked,onSelectedChange:a=>{var l;return(l=n.onChange)==null?void 0:l.call(n,a)},isDisabled:()=>r.disabled});return y(Fr,W({role:"menuitemcheckbox",get checked(){return o.isSelected()},onSelect:()=>{var a;(a=n.onSelect)==null||a.call(n),o.toggle()}},r))}var fn={next:(e,t)=>e==="ltr"?t==="horizontal"?"ArrowRight":"ArrowDown":t==="horizontal"?"ArrowLeft":"ArrowUp",previous:(e,t)=>fn.next(e==="ltr"?"rtl":"ltr",t)},Ro={first:e=>e==="horizontal"?"ArrowDown":"ArrowRight",last:e=>e==="horizontal"?"ArrowUp":"ArrowLeft"};function ns(e){const t=tt(),n=vt(),r=Nn(),{direction:o}=Dt(),s=Z({id:t.generateId("trigger")},e),[a,l]=se(s,["ref","id","disabled","onPointerDown","onClick","onKeyDown","onMouseOver","onFocus"]);let i=()=>t.value();r!==void 0&&(i=()=>t.value()??a.id,r.lastValue()===void 0&&r.setLastValue(i));const u=Pn(()=>n.triggerRef(),()=>"button"),h=I(()=>{var b;return u()==="a"&&((b=n.triggerRef())==null?void 0:b.getAttribute("href"))!=null});V(ft(()=>r==null?void 0:r.value(),b=>{var p;h()&&b===i()&&((p=n.triggerRef())==null||p.focus())}));const d=()=>{r!==void 0?n.isOpen()?r.value()===i()&&r.closeMenu():(r.autoFocusMenu()||r.setAutoFocusMenu(!0),n.open(!1)):n.toggle(!0)},c=b=>{de(b,a.onPointerDown),b.currentTarget.dataset.pointerType=b.pointerType,!a.disabled&&b.pointerType!=="touch"&&b.button===0&&d()},f=b=>{de(b,a.onClick),a.disabled||b.currentTarget.dataset.pointerType==="touch"&&d()},g=b=>{if(de(b,a.onKeyDown),!a.disabled){if(h())switch(b.key){case"Enter":case" ":return}switch(b.key){case"Enter":case" ":case Ro.first(t.orientation()):b.stopPropagation(),b.preventDefault(),ol(b.currentTarget),n.open("first"),r==null||r.setAutoFocusMenu(!0),r==null||r.setValue(i);break;case Ro.last(t.orientation()):b.stopPropagation(),b.preventDefault(),n.open("last");break;case fn.next(o(),t.orientation()):if(r===void 0)break;b.stopPropagation(),b.preventDefault(),r.nextMenu();break;case fn.previous(o(),t.orientation()):if(r===void 0)break;b.stopPropagation(),b.preventDefault(),r.previousMenu();break}}},m=b=>{var p;de(b,a.onMouseOver),((p=n.triggerRef())==null?void 0:p.dataset.pointerType)!=="touch"&&!a.disabled&&r!==void 0&&r.value()!==void 0&&r.setValue(i)},v=b=>{de(b,a.onFocus),r!==void 0&&b.currentTarget.dataset.pointerType!=="touch"&&r.setValue(i)};return V(()=>U(n.registerTriggerId(a.id))),y(wr,W({ref(b){const p=Me(n.setTriggerRef,a.ref);typeof p=="function"&&p(b)},get"data-kb-menu-value-trigger"(){return t.value()},get id(){return a.id},get disabled(){return a.disabled},"aria-haspopup":"true",get"aria-expanded"(){return n.isOpen()},get"aria-controls"(){return ge(()=>!!n.isOpen())()?n.contentId():void 0},get"data-highlighted"(){return i()!==void 0&&(r==null?void 0:r.value())===i()?!0:void 0},get tabIndex(){return r!==void 0?r.value()===i()||r.lastValue()===i()?0:-1:void 0},onPointerDown:c,onMouseOver:m,onClick:f,onKeyDown:g,onFocus:v,role:r!==void 0?"menuitem":void 0},()=>n.dataset(),l))}function rs(e){let t;const n=tt(),r=vt(),o=Nn(),s=Yi(),{direction:a}=Dt(),l=Z({id:n.generateId(`content-${Pe()}`)},e),[i,u]=se(l,["ref","id","style","onOpenAutoFocus","onCloseAutoFocus","onEscapeKeyDown","onFocusOutside","onPointerEnter","onPointerMove","onKeyDown","onMouseDown","onFocusIn","onFocusOut"]);let h=0;const d=()=>r.parentMenuContext()==null&&o===void 0&&n.isModal(),c=pu({selectionManager:r.listState().selectionManager,collection:r.listState().collection,autoFocus:r.autoFocus,deferAutoFocus:!0,shouldFocusWrap:!0,disallowTypeAhead:()=>!r.listState().selectionManager().isFocused(),orientation:()=>n.orientation()==="horizontal"?"vertical":"horizontal"},()=>t);ou({trapFocus:()=>d()&&r.isOpen(),onMountAutoFocus:w=>{var x;o===void 0&&((x=i.onOpenAutoFocus)==null||x.call(i,w))},onUnmountAutoFocus:i.onCloseAutoFocus},()=>t);const f=w=>{if(Ne(w.currentTarget,w.target)&&(w.key==="Tab"&&r.isOpen()&&w.preventDefault(),o!==void 0&&w.currentTarget.getAttribute("aria-haspopup")!=="true"))switch(w.key){case fn.next(a(),n.orientation()):w.stopPropagation(),w.preventDefault(),r.close(!0),o.setAutoFocusMenu(!0),o.nextMenu();break;case fn.previous(a(),n.orientation()):if(w.currentTarget.hasAttribute("data-closed"))break;w.stopPropagation(),w.preventDefault(),r.close(!0),o.setAutoFocusMenu(!0),o.previousMenu();break}},g=w=>{var x;(x=i.onEscapeKeyDown)==null||x.call(i,w),o==null||o.setAutoFocusMenu(!1),r.close(!0)},m=w=>{var x;(x=i.onFocusOutside)==null||x.call(i,w),n.isModal()&&w.preventDefault()},v=w=>{var x,$;de(w,i.onPointerEnter),r.isOpen()&&((x=r.parentMenuContext())==null||x.listState().selectionManager().setFocused(!1),($=r.parentMenuContext())==null||$.listState().selectionManager().setFocusedKey(void 0))},b=w=>{if(de(w,i.onPointerMove),w.pointerType!=="mouse")return;const x=w.target,$=h!==w.clientX;Ne(w.currentTarget,x)&&$&&(r.setPointerDir(w.clientX>h?"right":"left"),h=w.clientX)};V(()=>U(r.registerContentId(i.id))),U(()=>r.setContentRef(void 0));const p={ref:Me(w=>{r.setContentRef(w),t=w},i.ref),role:"menu",get id(){return i.id},get tabIndex(){return c.tabIndex()},get"aria-labelledby"(){return r.triggerId()},onKeyDown:we([i.onKeyDown,c.onKeyDown,f]),onMouseDown:we([i.onMouseDown,c.onMouseDown]),onFocusIn:we([i.onFocusIn,c.onFocusIn]),onFocusOut:we([i.onFocusOut,c.onFocusOut]),onPointerEnter:v,onPointerMove:b,get"data-orientation"(){return n.orientation()}};return y(K,{get when(){return r.contentPresent()},get children(){return y(K,{get when(){return s===void 0||r.parentMenuContext()!=null},get fallback(){return y(fe,W({as:"div"},()=>r.dataset(),p,u))},get children(){return y(Ti.Positioner,{get children(){return y(Qc,W({get disableOutsidePointerEvents(){return ge(()=>!!d())()&&r.isOpen()},get excludedElements(){return[r.triggerRef]},bypassTopMostLayerCheck:!0,get style(){return Ln({"--kb-menu-content-transform-origin":"var(--kb-popper-content-transform-origin)",position:"relative"},i.style)},onEscapeKeyDown:g,onFocusOutside:m,get onDismiss(){return r.close}},()=>r.dataset(),p,u))}})}})}})}function $u(e){let t;const n=tt(),r=vt(),[o,s]=se(e,["ref"]);return yu({element:()=>t??null,enabled:()=>r.contentPresent()&&n.preventScroll()}),y(rs,W({ref(a){const l=Me(i=>{t=i},o.ref);typeof l=="function"&&l(a)}},s))}var os=xe();function Cu(){const e=$e(os);if(e===void 0)throw new Error("[kobalte]: `useMenuGroupContext` must be used within a `Menu.Group` component");return e}function Or(e){const t=tt(),n=Z({id:t.generateId(`group-${Pe()}`)},e),[r,o]=B(),s={generateId:gn(()=>n.id),registerLabelId:He(o)};return y(os.Provider,{value:s,get children(){return y(fe,W({as:"div",role:"group",get"aria-labelledby"(){return r()}},n))}})}function is(e){const t=Cu(),n=Z({id:t.generateId("label")},e),[r,o]=se(n,["id"]);return V(()=>U(t.registerLabelId(r.id))),y(fe,W({as:"span",get id(){return r.id},"aria-hidden":"true"},o))}function ss(e){const t=vt(),n=Z({children:"▼"},e);return y(fe,W({as:"span","aria-hidden":"true"},()=>t.dataset(),n))}function as(e){return y(Fr,W({role:"menuitem",closeOnSelect:!0},e))}function ls(e){const t=qr(),n=Z({id:t.generateId("description")},e),[r,o]=se(n,["id"]);return V(()=>U(t.registerDescription(r.id))),y(fe,W({as:"div",get id(){return r.id}},()=>t.dataset(),o))}function cs(e){const t=qr(),n=Z({id:t.generateId("indicator")},e),[r,o]=se(n,["forceMount"]);return y(K,{get when(){return r.forceMount||t.isChecked()},get children(){return y(fe,W({as:"div"},()=>t.dataset(),o))}})}function us(e){const t=qr(),n=Z({id:t.generateId("label")},e),[r,o]=se(n,["ref","id"]);return V(()=>U(t.registerLabel(r.id))),y(fe,W({as:"div",ref(s){const a=Me(t.setLabelRef,r.ref);typeof a=="function"&&a(s)},get id(){return r.id}},()=>t.dataset(),o))}function ds(e){const t=vt();return y(K,{get when(){return t.contentPresent()},get children(){return y(Wo,e)}})}var fs=xe();function Su(){const e=$e(fs);if(e===void 0)throw new Error("[kobalte]: `useMenuRadioGroupContext` must be used within a `Menu.RadioGroup` component");return e}function gs(e){const n=tt().generateId(`radiogroup-${Pe()}`),r=Z({id:n},e),[o,s]=se(r,["value","defaultValue","onChange","disabled"]),[a,l]=hn({value:()=>o.value,defaultValue:()=>o.defaultValue,onChange:u=>{var h;return(h=o.onChange)==null?void 0:h.call(o,u)}}),i={isDisabled:()=>o.disabled,isSelectedValue:u=>u===a(),setSelectedValue:u=>l(u)};return y(fs.Provider,{value:i,get children(){return y(Or,s)}})}function hs(e){const t=Su(),n=Z({closeOnSelect:!1},e),[r,o]=se(n,["value","onSelect"]);return y(Fr,W({role:"menuitemradio",get checked(){return t.isSelectedValue(r.value)},onSelect:()=>{var a;(a=r.onSelect)==null||a.call(r),t.setSelectedValue(r.value)}},o))}function ku(e,t,n){const r=e.split("-")[0],o=n.getBoundingClientRect(),s=[],a=t.clientX,l=t.clientY;switch(r){case"top":s.push([a,l+5]),s.push([o.left,o.bottom]),s.push([o.left,o.top]),s.push([o.right,o.top]),s.push([o.right,o.bottom]);break;case"right":s.push([a-5,l]),s.push([o.left,o.top]),s.push([o.right,o.top]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]);break;case"bottom":s.push([a,l-5]),s.push([o.right,o.top]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]),s.push([o.left,o.top]);break;case"left":s.push([a+5,l]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]),s.push([o.left,o.top]),s.push([o.right,o.top]);break}return s}function Eu(e,t){return t?rl([e.clientX,e.clientY],t):!1}function vs(e){const t=tt(),n=yi(),r=Zi(),o=Nn(),s=Yi(),a=Z({placement:t.orientation()==="horizontal"?"bottom-start":"right-start"},e),[l,i]=se(a,["open","defaultOpen","onOpenChange"]);let u=0,h=null,d="right";const[c,f]=B(),[g,m]=B(),[v,b]=B(),[p,w]=B(),[x,$]=B(!0),[O,k]=B(i.placement),[_,C]=B([]),[A,R]=B([]),{DomCollectionProvider:N}=Il({items:A,onItemsChange:R}),J=Ii({open:()=>l.open,defaultOpen:()=>l.defaultOpen,onOpenChange:j=>{var Se;return(Se=l.onOpenChange)==null?void 0:Se.call(l,j)}}),{present:te}=Pi({show:()=>t.forceMount()||J.isOpen(),element:()=>p()??null}),ae=Al({selectionMode:"none",dataSource:A}),z=j=>{$(j),J.open()},Q=(j=!1)=>{J.close(),j&&r&&r.close(!0)},ee=j=>{$(j),J.toggle()},ce=()=>{const j=p();j&&(De(j),ae.selectionManager().setFocused(!0),ae.selectionManager().setFocusedKey(void 0))},ye=()=>{s!=null?setTimeout(()=>ce()):ce()},Te=j=>{C(ke=>[...ke,j]);const Se=r==null?void 0:r.registerNestedMenu(j);return()=>{C(ke=>rr(ke,j)),Se==null||Se()}},ve=j=>d===(h==null?void 0:h.side)&&Eu(j,h==null?void 0:h.area),Ae=j=>{ve(j)&&j.preventDefault()},M=j=>{ve(j)||ye()},he=j=>{ve(j)&&j.preventDefault()};su({isDisabled:()=>!(r==null&&J.isOpen()&&t.isModal()),targets:()=>[p(),..._()].filter(Boolean)}),V(()=>{const j=p();if(!j||!r)return;const Se=r.registerNestedMenu(j);U(()=>{Se()})}),V(()=>{r===void 0&&(o==null||o.registerMenu(t.value(),[p(),..._()]))}),V(()=>{var j;r!==void 0||o===void 0||(o.value()===t.value()?((j=v())==null||j.focus(),o.autoFocusMenu()&&z(!0)):Q())}),V(()=>{r!==void 0||o===void 0||J.isOpen()&&o.setValue(t.value())}),U(()=>{r===void 0&&(o==null||o.unregisterMenu(t.value()))});const yt={dataset:I(()=>({"data-expanded":J.isOpen()?"":void 0,"data-closed":J.isOpen()?void 0:""})),isOpen:J.isOpen,contentPresent:te,nestedMenus:_,currentPlacement:O,pointerGraceTimeoutId:()=>u,autoFocus:x,listState:()=>ae,parentMenuContext:()=>r,triggerRef:v,contentRef:p,triggerId:c,contentId:g,setTriggerRef:b,setContentRef:w,open:z,close:Q,toggle:ee,focusContent:ye,onItemEnter:Ae,onItemLeave:M,onTriggerLeave:he,setPointerDir:j=>d=j,setPointerGraceTimeoutId:j=>u=j,setPointerGraceIntent:j=>h=j,registerNestedMenu:Te,registerItemToParentDomCollection:n==null?void 0:n.registerItem,registerTriggerId:He(f),registerContentId:He(m)};return y(N,{get children(){return y(Xi.Provider,{value:yt,get children(){return y(K,{when:s===void 0,get fallback(){return i.children},get children(){return y(Ti,W({anchorRef:v,contentRef:p,onCurrentPlacementChange:k},i))}})}})}})}function ys(e){const{direction:t}=Dt();return y(vs,W({get placement(){return t()==="rtl"?"left-start":"right-start"},flip:!0},e))}var Du={close:(e,t)=>e==="ltr"?[t==="horizontal"?"ArrowLeft":"ArrowUp"]:[t==="horizontal"?"ArrowRight":"ArrowDown"]};function ms(e){const t=vt(),n=tt(),[r,o]=se(e,["onFocusOutside","onKeyDown"]),{direction:s}=Dt();return y(rs,W({onOpenAutoFocus:h=>{h.preventDefault()},onCloseAutoFocus:h=>{h.preventDefault()},onFocusOutside:h=>{var c;(c=r.onFocusOutside)==null||c.call(r,h);const d=h.target;Ne(t.triggerRef(),d)||t.close()},onKeyDown:h=>{de(h,r.onKeyDown);const d=Ne(h.currentTarget,h.target),c=Du.close(s(),n.orientation()).includes(h.key),f=t.parentMenuContext()!=null;d&&c&&f&&(t.close(),De(t.triggerRef()))}},o))}var zo=["Enter"," "],Au={open:(e,t)=>e==="ltr"?[...zo,t==="horizontal"?"ArrowRight":"ArrowDown"]:[...zo,t==="horizontal"?"ArrowLeft":"ArrowUp"]};function bs(e){let t;const n=tt(),r=vt(),o=Z({id:n.generateId(`sub-trigger-${Pe()}`)},e),[s,a]=se(o,["ref","id","textValue","disabled","onPointerMove","onPointerLeave","onPointerDown","onPointerUp","onClick","onKeyDown","onMouseDown","onFocus"]);let l=null;const i=()=>{l&&window.clearTimeout(l),l=null},{direction:u}=Dt(),h=()=>s.id,d=()=>{const w=r.parentMenuContext();if(w==null)throw new Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");return w.listState().selectionManager()},c=()=>r.listState().collection(),f=()=>d().focusedKey()===h(),g=hi({key:h,selectionManager:d,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>s.disabled},()=>t),m=w=>{de(w,s.onClick),!r.isOpen()&&!s.disabled&&r.open(!0)},v=w=>{var $;if(de(w,s.onPointerMove),w.pointerType!=="mouse")return;const x=r.parentMenuContext();if(x==null||x.onItemEnter(w),!w.defaultPrevented){if(s.disabled){x==null||x.onItemLeave(w);return}!r.isOpen()&&!l&&(($=r.parentMenuContext())==null||$.setPointerGraceIntent(null),l=window.setTimeout(()=>{r.open(!1),i()},100)),x==null||x.onItemEnter(w),w.defaultPrevented||(r.listState().selectionManager().isFocused()&&(r.listState().selectionManager().setFocused(!1),r.listState().selectionManager().setFocusedKey(void 0)),De(w.currentTarget),x==null||x.listState().selectionManager().setFocused(!0),x==null||x.listState().selectionManager().setFocusedKey(h()))}},b=w=>{if(de(w,s.onPointerLeave),w.pointerType!=="mouse")return;i();const x=r.parentMenuContext(),$=r.contentRef();if($){x==null||x.setPointerGraceIntent({area:ku(r.currentPlacement(),w,$),side:r.currentPlacement().split("-")[0]}),window.clearTimeout(x==null?void 0:x.pointerGraceTimeoutId());const O=window.setTimeout(()=>{x==null||x.setPointerGraceIntent(null)},300);x==null||x.setPointerGraceTimeoutId(O)}else{if(x==null||x.onTriggerLeave(w),w.defaultPrevented)return;x==null||x.setPointerGraceIntent(null)}x==null||x.onItemLeave(w)},p=w=>{de(w,s.onKeyDown),!w.repeat&&(s.disabled||Au.open(u(),n.orientation()).includes(w.key)&&(w.stopPropagation(),w.preventDefault(),d().setFocused(!1),d().setFocusedKey(void 0),r.isOpen()||r.open("first"),r.focusContent(),r.listState().selectionManager().setFocused(!0),r.listState().selectionManager().setFocusedKey(c().getFirstKey())))};return V(()=>{if(r.registerItemToParentDomCollection==null)throw new Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");const w=r.registerItemToParentDomCollection({ref:()=>t,type:"item",key:h(),textValue:s.textValue??(t==null?void 0:t.textContent)??"",disabled:s.disabled??!1});U(w)}),V(ft(()=>{var w;return(w=r.parentMenuContext())==null?void 0:w.pointerGraceTimeoutId()},w=>{U(()=>{var x;window.clearTimeout(w),(x=r.parentMenuContext())==null||x.setPointerGraceIntent(null)})})),V(()=>U(r.registerTriggerId(s.id))),U(()=>{i()}),y(fe,W({as:"div",ref(w){const x=Me($=>{r.setTriggerRef($),t=$},s.ref);typeof x=="function"&&x(w)},get id(){return s.id},role:"menuitem",get tabIndex(){return g.tabIndex()},"aria-haspopup":"true",get"aria-expanded"(){return r.isOpen()},get"aria-controls"(){return ge(()=>!!r.isOpen())()?r.contentId():void 0},get"aria-disabled"(){return s.disabled},get"data-key"(){return g.dataKey()},get"data-highlighted"(){return f()?"":void 0},get"data-disabled"(){return s.disabled?"":void 0},get onPointerDown(){return we([s.onPointerDown,g.onPointerDown])},get onPointerUp(){return we([s.onPointerUp,g.onPointerUp])},get onClick(){return we([m,g.onClick])},get onKeyDown(){return we([p,g.onKeyDown])},get onMouseDown(){return we([s.onMouseDown,g.onMouseDown])},get onFocus(){return we([s.onFocus,g.onFocus])},onPointerMove:v,onPointerLeave:b},()=>r.dataset(),a))}function Mu(e){const t=Nn(),n=`menu-${Pe()}`,r=Z({id:n,modal:!0},e),[o,s]=se(r,["id","modal","preventScroll","forceMount","open","defaultOpen","onOpenChange","value","orientation"]),a=Ii({open:()=>o.open,defaultOpen:()=>o.defaultOpen,onOpenChange:i=>{var u;return(u=o.onOpenChange)==null?void 0:u.call(o,i)}}),l={isModal:()=>o.modal??!0,preventScroll:()=>o.preventScroll??l.isModal(),forceMount:()=>o.forceMount??!1,generateId:gn(()=>o.id),value:()=>o.value,orientation:()=>o.orientation??(t==null?void 0:t.orientation())??"horizontal"};return y(es.Provider,{value:l,get children(){return y(vs,W({get open(){return a.isOpen()},get onOpenChange(){return a.setIsOpen}},s))}})}var Tu={};_n(Tu,{Root:()=>Hn,Separator:()=>qu});function Hn(e){let t;const n=Z({orientation:"horizontal"},e),[r,o]=se(n,["ref","orientation"]),s=Pn(()=>t,()=>"hr");return y(fe,W({as:"hr",ref(a){const l=Me(i=>t=i,r.ref);typeof l=="function"&&l(a)},get role(){return s()!=="hr"?"separator":void 0},get"aria-orientation"(){return r.orientation==="vertical"?"vertical":void 0},get"data-orientation"(){return r.orientation}},o))}var qu=Hn,ie={};_n(ie,{Arrow:()=>Ar,CheckboxItem:()=>ts,Content:()=>ps,DropdownMenu:()=>Fu,Group:()=>Or,GroupLabel:()=>is,Icon:()=>ss,Item:()=>as,ItemDescription:()=>ls,ItemIndicator:()=>cs,ItemLabel:()=>us,Portal:()=>ds,RadioGroup:()=>gs,RadioItem:()=>hs,Root:()=>ws,Separator:()=>Hn,Sub:()=>ys,SubContent:()=>ms,SubTrigger:()=>bs,Trigger:()=>ns});function ps(e){const t=tt(),n=vt(),[r,o]=se(e,["onCloseAutoFocus","onInteractOutside"]);let s=!1;return y($u,W({onCloseAutoFocus:i=>{var u;(u=r.onCloseAutoFocus)==null||u.call(r,i),s||De(n.triggerRef()),s=!1,i.preventDefault()},onInteractOutside:i=>{var u;(u=r.onInteractOutside)==null||u.call(r,i),(!t.isModal()||i.detail.isContextMenu)&&(s=!0)}},o))}function ws(e){const t=`dropdownmenu-${Pe()}`,n=Z({id:t},e);return y(Mu,n)}var Fu=Object.assign(ws,{Arrow:Ar,CheckboxItem:ts,Content:ps,Group:Or,GroupLabel:is,Icon:ss,Item:as,ItemDescription:ls,ItemIndicator:cs,ItemLabel:us,Portal:ds,RadioGroup:gs,RadioItem:hs,Separator:Hn,Sub:ys,SubContent:ms,SubTrigger:bs,Trigger:ns}),S={colors:{inherit:"inherit",current:"currentColor",transparent:"transparent",black:"#000000",white:"#ffffff",neutral:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},darkGray:{50:"#525c7a",100:"#49536e",200:"#414962",300:"#394056",400:"#313749",500:"#292e3d",600:"#212530",700:"#191c24",800:"#111318",900:"#0b0d10"},gray:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},blue:{25:"#F5FAFF",50:"#EFF8FF",100:"#D1E9FF",200:"#B2DDFF",300:"#84CAFF",400:"#53B1FD",500:"#2E90FA",600:"#1570EF",700:"#175CD3",800:"#1849A9",900:"#194185"},green:{25:"#F6FEF9",50:"#ECFDF3",100:"#D1FADF",200:"#A6F4C5",300:"#6CE9A6",400:"#32D583",500:"#12B76A",600:"#039855",700:"#027A48",800:"#05603A",900:"#054F31"},red:{50:"#fef2f2",100:"#fee2e2",200:"#fecaca",300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c",800:"#991b1b",900:"#7f1d1d",950:"#450a0a"},yellow:{25:"#FFFCF5",50:"#FFFAEB",100:"#FEF0C7",200:"#FEDF89",300:"#FEC84B",400:"#FDB022",500:"#F79009",600:"#DC6803",700:"#B54708",800:"#93370D",900:"#7A2E0E"},purple:{25:"#FAFAFF",50:"#F4F3FF",100:"#EBE9FE",200:"#D9D6FE",300:"#BDB4FE",400:"#9B8AFB",500:"#7A5AF8",600:"#6938EF",700:"#5925DC",800:"#4A1FB8",900:"#3E1C96"},teal:{25:"#F6FEFC",50:"#F0FDF9",100:"#CCFBEF",200:"#99F6E0",300:"#5FE9D0",400:"#2ED3B7",500:"#15B79E",600:"#0E9384",700:"#107569",800:"#125D56",900:"#134E48"},pink:{25:"#fdf2f8",50:"#fce7f3",100:"#fbcfe8",200:"#f9a8d4",300:"#f472b6",400:"#ec4899",500:"#db2777",600:"#be185d",700:"#9d174d",800:"#831843",900:"#500724"},cyan:{25:"#ecfeff",50:"#cffafe",100:"#a5f3fc",200:"#67e8f9",300:"#22d3ee",400:"#06b6d4",500:"#0891b2",600:"#0e7490",700:"#155e75",800:"#164e63",900:"#083344"}},alpha:{100:"ff",90:"e5",80:"cc",70:"b3",60:"99",50:"80",40:"66",30:"4d",20:"33",10:"1a",0:"00"},font:{size:{"2xs":"calc(var(--tsqd-font-size) * 0.625)",xs:"calc(var(--tsqd-font-size) * 0.75)",sm:"calc(var(--tsqd-font-size) * 0.875)",md:"var(--tsqd-font-size)",lg:"calc(var(--tsqd-font-size) * 1.125)",xl:"calc(var(--tsqd-font-size) * 1.25)","2xl":"calc(var(--tsqd-font-size) * 1.5)","3xl":"calc(var(--tsqd-font-size) * 1.875)","4xl":"calc(var(--tsqd-font-size) * 2.25)","5xl":"calc(var(--tsqd-font-size) * 3)","6xl":"calc(var(--tsqd-font-size) * 3.75)","7xl":"calc(var(--tsqd-font-size) * 4.5)","8xl":"calc(var(--tsqd-font-size) * 6)","9xl":"calc(var(--tsqd-font-size) * 8)"},lineHeight:{xs:"calc(var(--tsqd-font-size) * 1)",sm:"calc(var(--tsqd-font-size) * 1.25)",md:"calc(var(--tsqd-font-size) * 1.5)",lg:"calc(var(--tsqd-font-size) * 1.75)",xl:"calc(var(--tsqd-font-size) * 2)","2xl":"calc(var(--tsqd-font-size) * 2.25)","3xl":"calc(var(--tsqd-font-size) * 2.5)","4xl":"calc(var(--tsqd-font-size) * 2.75)","5xl":"calc(var(--tsqd-font-size) * 3)","6xl":"calc(var(--tsqd-font-size) * 3.25)","7xl":"calc(var(--tsqd-font-size) * 3.5)","8xl":"calc(var(--tsqd-font-size) * 3.75)","9xl":"calc(var(--tsqd-font-size) * 4)"},weight:{thin:"100",extralight:"200",light:"300",normal:"400",medium:"500",semibold:"600",bold:"700",extrabold:"800",black:"900"}},breakpoints:{xs:"320px",sm:"640px",md:"768px",lg:"1024px",xl:"1280px","2xl":"1536px"},border:{radius:{none:"0px",xs:"calc(var(--tsqd-font-size) * 0.125)",sm:"calc(var(--tsqd-font-size) * 0.25)",md:"calc(var(--tsqd-font-size) * 0.375)",lg:"calc(var(--tsqd-font-size) * 0.5)",xl:"calc(var(--tsqd-font-size) * 0.75)","2xl":"calc(var(--tsqd-font-size) * 1)","3xl":"calc(var(--tsqd-font-size) * 1.5)",full:"9999px"}},size:{0:"0px",.25:"calc(var(--tsqd-font-size) * 0.0625)",.5:"calc(var(--tsqd-font-size) * 0.125)",1:"calc(var(--tsqd-font-size) * 0.25)",1.5:"calc(var(--tsqd-font-size) * 0.375)",2:"calc(var(--tsqd-font-size) * 0.5)",2.5:"calc(var(--tsqd-font-size) * 0.625)",3:"calc(var(--tsqd-font-size) * 0.75)",3.5:"calc(var(--tsqd-font-size) * 0.875)",4:"calc(var(--tsqd-font-size) * 1)",4.5:"calc(var(--tsqd-font-size) * 1.125)",5:"calc(var(--tsqd-font-size) * 1.25)",5.5:"calc(var(--tsqd-font-size) * 1.375)",6:"calc(var(--tsqd-font-size) * 1.5)",6.5:"calc(var(--tsqd-font-size) * 1.625)",7:"calc(var(--tsqd-font-size) * 1.75)",8:"calc(var(--tsqd-font-size) * 2)",9:"calc(var(--tsqd-font-size) * 2.25)",10:"calc(var(--tsqd-font-size) * 2.5)",11:"calc(var(--tsqd-font-size) * 2.75)",12:"calc(var(--tsqd-font-size) * 3)",14:"calc(var(--tsqd-font-size) * 3.5)",16:"calc(var(--tsqd-font-size) * 4)",20:"calc(var(--tsqd-font-size) * 5)",24:"calc(var(--tsqd-font-size) * 6)",28:"calc(var(--tsqd-font-size) * 7)",32:"calc(var(--tsqd-font-size) * 8)",36:"calc(var(--tsqd-font-size) * 9)",40:"calc(var(--tsqd-font-size) * 10)",44:"calc(var(--tsqd-font-size) * 11)",48:"calc(var(--tsqd-font-size) * 12)",52:"calc(var(--tsqd-font-size) * 13)",56:"calc(var(--tsqd-font-size) * 14)",60:"calc(var(--tsqd-font-size) * 15)",64:"calc(var(--tsqd-font-size) * 16)",72:"calc(var(--tsqd-font-size) * 18)",80:"calc(var(--tsqd-font-size) * 20)",96:"calc(var(--tsqd-font-size) * 24)"},shadow:{xs:(e="rgb(0 0 0 / 0.1)")=>"0 1px 2px 0 rgb(0 0 0 / 0.05)",sm:(e="rgb(0 0 0 / 0.1)")=>`0 1px 3px 0 ${e}, 0 1px 2px -1px ${e}`,md:(e="rgb(0 0 0 / 0.1)")=>`0 4px 6px -1px ${e}, 0 2px 4px -2px ${e}`,lg:(e="rgb(0 0 0 / 0.1)")=>`0 10px 15px -3px ${e}, 0 4px 6px -4px ${e}`,xl:(e="rgb(0 0 0 / 0.1)")=>`0 20px 25px -5px ${e}, 0 8px 10px -6px ${e}`,"2xl":(e="rgb(0 0 0 / 0.25)")=>`0 25px 50px -12px ${e}`,inner:(e="rgb(0 0 0 / 0.05)")=>`inset 0 2px 4px 0 ${e}`,none:()=>"none"},zIndices:{hide:-1,auto:"auto",base:0,docked:10,dropdown:1e3,sticky:1100,banner:1200,overlay:1300,modal:1400,popover:1500,skipLink:1600,toast:1700,tooltip:1800}},Ou=P('<svg width=14 height=14 viewBox="0 0 14 14"fill=none xmlns=http://www.w3.org/2000/svg><path d="M13 13L9.00007 9M10.3333 5.66667C10.3333 8.244 8.244 10.3333 5.66667 10.3333C3.08934 10.3333 1 8.244 1 5.66667C1 3.08934 3.08934 1 5.66667 1C8.244 1 10.3333 3.08934 10.3333 5.66667Z"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),Lu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Iu=P('<svg width=10 height=6 viewBox="0 0 10 6"fill=none xmlns=http://www.w3.org/2000/svg><path d="M1 1L5 5L9 1"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),Pu=P('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 13.3333V2.66667M8 2.66667L4 6.66667M8 2.66667L12 6.66667"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),_u=P('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),Ru=P('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg style=transform:rotate(90deg)><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),zu=P('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg style=transform:rotate(-90deg)><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),Ku=P('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2v2m0 16v2M4 12H2m4.314-5.686L4.9 4.9m12.786 1.414L19.1 4.9M6.314 17.69 4.9 19.104m12.786-1.414 1.414 1.414M22 12h-2m-3 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Bu=P('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M22 15.844a10.424 10.424 0 0 1-4.306.925c-5.779 0-10.463-4.684-10.463-10.462 0-1.536.33-2.994.925-4.307A10.464 10.464 0 0 0 2 11.538C2 17.316 6.684 22 12.462 22c4.243 0 7.896-2.526 9.538-6.156Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Nu=P('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 21h8m-4-4v4m-5.2-4h10.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 14.72 22 13.88 22 12.2V7.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C19.72 3 18.88 3 17.2 3H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 5.28 2 6.12 2 7.8v4.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C4.28 17 5.12 17 6.8 17Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Hu=P('<svg stroke=currentColor fill=currentColor stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M0 0h24v24H0z"></path><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z">'),Vu=P('<svg stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M24 .01c0-.01 0-.01 0 0L0 0v24h24V.01zM0 0h24v24H0V0zm0 0h24v24H0V0z"></path><path d="M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78l2.52 2.52c3.47-.17 6.99 1.05 9.63 3.7l2-2zm-4 4a9.793 9.793 0 00-4.49-2.56l3.53 3.53.96-.97zM2 3.05L5.07 6.1C3.6 6.82 2.22 7.78 1 9l1.99 2c1.24-1.24 2.67-2.16 4.2-2.77l2.24 2.24A9.684 9.684 0 005 13v.01L6.99 15a7.042 7.042 0 014.92-2.06L18.98 20l1.27-1.26L3.29 1.79 2 3.05zM9 17l3 3 3-3a4.237 4.237 0 00-6 0z">'),Gu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.3951 19.3711L9.97955 20.6856C10.1533 21.0768 10.4368 21.4093 10.7958 21.6426C11.1547 21.8759 11.5737 22.0001 12.0018 22C12.4299 22.0001 12.8488 21.8759 13.2078 21.6426C13.5667 21.4093 13.8503 21.0768 14.024 20.6856L14.6084 19.3711C14.8165 18.9047 15.1664 18.5159 15.6084 18.26C16.0532 18.0034 16.5678 17.8941 17.0784 17.9478L18.5084 18.1C18.9341 18.145 19.3637 18.0656 19.7451 17.8713C20.1265 17.6771 20.4434 17.3763 20.6573 17.0056C20.8715 16.635 20.9735 16.2103 20.9511 15.7829C20.9286 15.3555 20.7825 14.9438 20.5307 14.5978L19.684 13.4344C19.3825 13.0171 19.2214 12.5148 19.224 12C19.2239 11.4866 19.3865 10.9864 19.6884 10.5711L20.5351 9.40778C20.787 9.06175 20.933 8.65007 20.9555 8.22267C20.978 7.79528 20.8759 7.37054 20.6618 7C20.4479 6.62923 20.131 6.32849 19.7496 6.13423C19.3681 5.93997 18.9386 5.86053 18.5129 5.90556L17.0829 6.05778C16.5722 6.11141 16.0577 6.00212 15.6129 5.74556C15.17 5.48825 14.82 5.09736 14.6129 4.62889L14.024 3.31444C13.8503 2.92317 13.5667 2.59072 13.2078 2.3574C12.8488 2.12408 12.4299 1.99993 12.0018 2C11.5737 1.99993 11.1547 2.12408 10.7958 2.3574C10.4368 2.59072 10.1533 2.92317 9.97955 3.31444L9.3951 4.62889C9.18803 5.09736 8.83798 5.48825 8.3951 5.74556C7.95032 6.00212 7.43577 6.11141 6.9251 6.05778L5.49066 5.90556C5.06499 5.86053 4.6354 5.93997 4.25397 6.13423C3.87255 6.32849 3.55567 6.62923 3.34177 7C3.12759 7.37054 3.02555 7.79528 3.04804 8.22267C3.07052 8.65007 3.21656 9.06175 3.46844 9.40778L4.3151 10.5711C4.61704 10.9864 4.77964 11.4866 4.77955 12C4.77964 12.5134 4.61704 13.0137 4.3151 13.4289L3.46844 14.5922C3.21656 14.9382 3.07052 15.3499 3.04804 15.7773C3.02555 16.2047 3.12759 16.6295 3.34177 17C3.55589 17.3706 3.8728 17.6712 4.25417 17.8654C4.63554 18.0596 5.06502 18.1392 5.49066 18.0944L6.92066 17.9422C7.43133 17.8886 7.94587 17.9979 8.39066 18.2544C8.83519 18.511 9.18687 18.902 9.3951 19.3711Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><path d="M12 15C13.6568 15 15 13.6569 15 12C15 10.3431 13.6568 9 12 9C10.3431 9 8.99998 10.3431 8.99998 12C8.99998 13.6569 10.3431 15 12 15Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Uu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M16 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V8M11.5 12.5L17 7M17 7H12M17 7V12M6.2 21H8.8C9.9201 21 10.4802 21 10.908 20.782C11.2843 20.5903 11.5903 20.2843 11.782 19.908C12 19.4802 12 18.9201 12 17.8V15.2C12 14.0799 12 13.5198 11.782 13.092C11.5903 12.7157 11.2843 12.4097 10.908 12.218C10.4802 12 9.92011 12 8.8 12H6.2C5.0799 12 4.51984 12 4.09202 12.218C3.71569 12.4097 3.40973 12.7157 3.21799 13.092C3 13.5198 3 14.0799 3 15.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),ju=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path class=copier d="M8 8V5.2C8 4.0799 8 3.51984 8.21799 3.09202C8.40973 2.71569 8.71569 2.40973 9.09202 2.21799C9.51984 2 10.0799 2 11.2 2H18.8C19.9201 2 20.4802 2 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C22 3.51984 22 4.0799 22 5.2V12.8C22 13.9201 22 14.4802 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.4802 16 19.9201 16 18.8 16H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round stroke=currentColor>'),Wu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M2.5 21.4998L8.04927 19.3655C8.40421 19.229 8.58168 19.1607 8.74772 19.0716C8.8952 18.9924 9.0358 18.901 9.16804 18.7984C9.31692 18.6829 9.45137 18.5484 9.72028 18.2795L21 6.99982C22.1046 5.89525 22.1046 4.10438 21 2.99981C19.8955 1.89525 18.1046 1.89524 17 2.99981L5.72028 14.2795C5.45138 14.5484 5.31692 14.6829 5.20139 14.8318C5.09877 14.964 5.0074 15.1046 4.92823 15.2521C4.83911 15.4181 4.77085 15.5956 4.63433 15.9506L2.5 21.4998ZM2.5 21.4998L4.55812 16.1488C4.7054 15.7659 4.77903 15.5744 4.90534 15.4867C5.01572 15.4101 5.1523 15.3811 5.2843 15.4063C5.43533 15.4351 5.58038 15.5802 5.87048 15.8703L8.12957 18.1294C8.41967 18.4195 8.56472 18.5645 8.59356 18.7155C8.61877 18.8475 8.58979 18.9841 8.51314 19.0945C8.42545 19.2208 8.23399 19.2944 7.85107 19.4417L2.5 21.4998Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),xs=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Qu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 9L15 15M15 9L9 15M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke=#F04438 stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Yu=P('<svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 xmlns=http://www.w3.org/2000/svg><rect class=list width=20 height=20 y=2 x=2 rx=2></rect><line class=list-item y1=7 y2=7 x1=6 x2=18></line><line class=list-item y2=12 y1=12 x1=6 x2=18></line><line class=list-item y1=17 y2=17 x1=6 x2=18>'),Xu=P('<svg viewBox="0 0 24 24"height=20 width=20 fill=none xmlns=http://www.w3.org/2000/svg><path d="M3 7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C5.28 3 6.12 3 7.8 3h8.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C21 5.28 21 6.12 21 7.8v8.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V7.8Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Zu=P('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Ju=P('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><animateTransform attributeName=transform attributeType=XML type=rotate from=0 to=360 dur=2s repeatCount=indefinite>'),ed=P('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M15 9L9 15M9 9L15 15M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),td=P('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.5 15V9M14.5 15V9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),nd=P('<svg version=1.0 viewBox="0 0 633 633"><linearGradient x1=-666.45 x2=-666.45 y1=163.28 y2=163.99 gradientTransform="matrix(633 0 0 633 422177 -103358)"gradientUnits=userSpaceOnUse><stop stop-color=#6BDAFF offset=0></stop><stop stop-color=#F9FFB5 offset=.32></stop><stop stop-color=#FFA770 offset=.71></stop><stop stop-color=#FF7373 offset=1></stop></linearGradient><circle cx=316.5 cy=316.5 r=316.5></circle><defs><filter x=-137.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=316.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=316.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=316.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=272.2 y=308 width=176.9 height=129.3 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=272.2 y=308 width=176.9 height=129.3 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><line x1=436 x2=431 y1=403.2 y2=431.8 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=291 x2=280 y1=341.5 y2=403.5 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=332.9 x2=328.6 y1=384.1 y2=411.2 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><linearGradient x1=-670.75 x2=-671.59 y1=164.4 y2=164.49 gradientTransform="matrix(-184.16 -32.472 -11.461 64.997 -121359 -32126)"gradientUnits=userSpaceOnUse><stop stop-color=#EE2700 offset=0></stop><stop stop-color=#FF008E offset=1></stop></linearGradient><path d="m344.1 363 97.7 17.2c5.8 2.1 8.2 6.1 7.1 12.1s-4.7 9.2-11 9.9l-106-18.7-57.5-59.2c-3.2-4.8-2.9-9.1 0.8-12.8s8.3-4.4 13.7-2.1l55.2 53.6z"clip-rule=evenodd fill-rule=evenodd></path><line x1=428.2 x2=429.1 y1=384.5 y2=378 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=395.2 x2=396.1 y1=379.5 y2=373 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=362.2 x2=363.1 y1=373.5 y2=367.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=324.2 x2=328.4 y1=351.3 y2=347.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=303.2 x2=307.4 y1=331.3 y2=327.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line></g><defs><filter x=73.2 y=113.8 width=280.6 height=317.4 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=73.2 y=113.8 width=280.6 height=317.4 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-672.16 x2=-672.16 y1=165.03 y2=166.03 gradientTransform="matrix(-100.18 48.861 97.976 200.88 -83342 -93.059)"gradientUnits=userSpaceOnUse><stop stop-color=#A17500 offset=0></stop><stop stop-color=#5D2100 offset=1></stop></linearGradient><path d="m192.3 203c8.1 37.3 14 73.6 17.8 109.1 3.8 35.4 2.8 75.1-3 119.2l61.2-16.7c-15.6-59-25.2-97.9-28.6-116.6s-10.8-51.9-22.1-99.6l-25.3 4.6"clip-rule=evenodd fill-rule=evenodd></path><g stroke=#2F8A00><linearGradient x1=-660.23 x2=-660.23 y1=166.72 y2=167.72 gradientTransform="matrix(92.683 4.8573 -2.0259 38.657 61680 -3088.6)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9s-12.6-22.1-36.5-29.9c-15.9-5.2-34.4-1.5-55.5 11.1 15.9 14.3 29.5 22.6 40.7 24.9 16.8 3.6 51.3-6.1 51.3-6.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-661.36 x2=-661.36 y1=164.18 y2=165.18 gradientTransform="matrix(110 5.7648 -6.3599 121.35 73933 -15933)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5s-47.5-8.5-83.2 15.7c-23.8 16.2-34.3 49.3-31.6 99.4 30.3-27.8 52.1-48.5 65.2-61.9 19.8-20.2 49.6-53.2 49.6-53.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.79 x2=-656.79 y1=165.15 y2=166.15 gradientTransform="matrix(62.954 3.2993 -3.5023 66.828 42156 -8754.1)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9c-0.8-21.9 6-38 20.6-48.2s29.8-15.4 45.5-15.3c-6.1 21.4-14.5 35.8-25.2 43.4s-24.4 14.2-40.9 20.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-663.07 x2=-663.07 y1=165.44 y2=166.44 gradientTransform="matrix(152.47 7.9907 -3.0936 59.029 101884 -4318.7)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c31.9-30 64.1-39.7 96.7-29s50.8 30.4 54.6 59.1c-35.2-5.5-60.4-9.6-75.8-12.1-15.3-2.6-40.5-8.6-75.5-18z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-662.57 x2=-662.57 y1=164.44 y2=165.44 gradientTransform="matrix(136.46 7.1517 -5.2163 99.533 91536 -11442)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c35.8-7.6 65.6-0.2 89.2 22s37.7 49 42.3 80.3c-39.8-9.7-68.3-23.8-85.5-42.4s-32.5-38.5-46-59.9z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.43 x2=-656.43 y1=163.86 y2=164.86 gradientTransform="matrix(60.866 3.1899 -8.7773 167.48 41560 -25168)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c-33.6 13.8-53.6 35.7-60.1 65.6s-3.6 63.1 8.7 99.6c27.4-40.3 43.2-69.6 47.4-88s5.6-44.1 4-77.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><path d="m196.5 182.3c-14.8 21.6-25.1 41.4-30.8 59.4s-9.5 33-11.1 45.1"fill=none stroke-linecap=round stroke-width=8></path><path d="m194.9 185.7c-24.4 1.7-43.8 9-58.1 21.8s-24.7 25.4-31.3 37.8"fill=none stroke-linecap=round stroke-width=8></path><path d="m204.5 176.4c29.7-6.7 52-8.4 67-5.1s26.9 8.6 35.8 15.9"fill=none stroke-linecap=round stroke-width=8></path><path d="m196.5 181.4c20.3 9.9 38.2 20.5 53.9 31.9s27.4 22.1 35.1 32"fill=none stroke-linecap=round stroke-width=8></path></g></g><defs><filter x=50.5 y=399 width=532 height=633 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=50.5 y=399 width=532 height=633 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-666.06 x2=-666.23 y1=163.36 y2=163.75 gradientTransform="matrix(532 0 0 633 354760 -102959)"gradientUnits=userSpaceOnUse><stop stop-color=#FFF400 offset=0></stop><stop stop-color=#3C8700 offset=1></stop></linearGradient><ellipse cx=316.5 cy=715.5 rx=266 ry=316.5></ellipse></g><defs><filter x=391 y=-24 width=288 height=283 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=391 y=-24 width=288 height=283 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-664.56 x2=-664.56 y1=163.79 y2=164.79 gradientTransform="matrix(227 0 0 227 151421 -37204)"gradientUnits=userSpaceOnUse><stop stop-color=#FFDF00 offset=0></stop><stop stop-color=#FF9D00 offset=1></stop></linearGradient><circle cx=565.5 cy=89.5 r=113.5></circle><linearGradient x1=-644.5 x2=-645.77 y1=342 y2=342 gradientTransform="matrix(30 0 0 1 19770 -253)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=427 x2=397 y1=89 y2=89 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-641.56 x2=-642.83 y1=196.02 y2=196.07 gradientTransform="matrix(26.5 0 0 5.5 17439 -1025.5)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=430.5 x2=404 y1=55.5 y2=50 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-643.73 x2=-645 y1=185.83 y2=185.9 gradientTransform="matrix(29 0 0 8 19107 -1361)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=431 x2=402 y1=122 y2=130 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-638.94 x2=-640.22 y1=177.09 y2=177.39 gradientTransform="matrix(24 0 0 13 15783 -2145)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=442 x2=418 y1=153 y2=166 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-633.42 x2=-634.7 y1=172.41 y2=173.31 gradientTransform="matrix(20 0 0 19 13137 -3096)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=464 x2=444 y1=180 y2=199 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-619.05 x2=-619.52 y1=170.82 y2=171.82 gradientTransform="matrix(13.83 0 0 22.85 9050 -3703.4)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=491.4 x2=477.5 y1=203 y2=225.9 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-578.5 x2=-578.63 y1=170.31 y2=171.31 gradientTransform="matrix(7.5 0 0 24.5 4860 -3953)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=524.5 x2=517 y1=219.5 y2=244 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=666.5 x2=666.5 y1=170.31 y2=171.31 gradientTransform="matrix(.5 0 0 24.5 231.5 -3944)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=564.5 x2=565 y1=228.5 y2=253 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12>');function rd(){return Ou()}function $s(){return Lu()}function Nt(){return Iu()}function Ko(){return Pu()}function Bo(){return _u()}function od(){return Ru()}function id(){return zu()}function sd(){return Ku()}function ad(){return Bu()}function ld(){return Nu()}function cd(){return Hu()}function ud(){return Vu()}function dd(){return Gu()}function fd(){return Uu()}function gd(){return ju()}function hd(){return Wu()}function vd(e){return(()=>{var t=xs(),n=t.firstChild;return G(()=>T(n,"stroke",e.theme==="dark"?"#12B76A":"#027A48")),t})()}function yd(){return Qu()}function md(){return Yu()}function bd(e){return[y(K,{get when(){return e.checked},get children(){var t=xs(),n=t.firstChild;return G(()=>T(n,"stroke",e.theme==="dark"?"#9B8AFB":"#6938EF")),t}}),y(K,{get when(){return!e.checked},get children(){var t=Xu(),n=t.firstChild;return G(()=>T(n,"stroke",e.theme==="dark"?"#9B8AFB":"#6938EF")),t}})]}function fr(){return Zu()}function pd(){return Ju()}function wd(){return ed()}function xd(){return td()}function No(){const e=Pe();return(()=>{var t=nd(),n=t.firstChild,r=n.nextSibling,o=r.nextSibling,s=o.firstChild,a=o.nextSibling,l=a.firstChild,i=a.nextSibling,u=i.nextSibling,h=u.firstChild,d=u.nextSibling,c=d.firstChild,f=d.nextSibling,g=f.nextSibling,m=g.firstChild,v=g.nextSibling,b=v.firstChild,p=v.nextSibling,w=p.nextSibling,x=w.firstChild,$=w.nextSibling,O=$.firstChild,k=$.nextSibling,_=k.nextSibling,C=_.firstChild,A=_.nextSibling,R=A.firstChild,N=A.nextSibling,J=N.nextSibling,te=J.firstChild,ae=J.nextSibling,z=ae.firstChild,Q=ae.nextSibling,ee=Q.nextSibling,ce=ee.firstChild,ye=ee.nextSibling,Te=ye.firstChild,ve=ye.nextSibling,Ae=ve.firstChild,M=Ae.nextSibling,he=M.nextSibling,ne=he.nextSibling,yt=ne.nextSibling,j=ve.nextSibling,Se=j.firstChild,ke=j.nextSibling,It=ke.firstChild,_e=ke.nextSibling,mt=_e.firstChild,At=mt.nextSibling,nt=At.nextSibling,Ye=nt.firstChild,bt=Ye.nextSibling,F=bt.nextSibling,Y=F.nextSibling,me=Y.nextSibling,le=me.nextSibling,re=le.nextSibling,ue=re.nextSibling,be=ue.nextSibling,oe=be.nextSibling,rt=oe.nextSibling,ot=rt.nextSibling,Ve=_e.nextSibling,Mt=Ve.firstChild,it=Ve.nextSibling,Tt=it.firstChild,st=it.nextSibling,pt=st.firstChild,bn=pt.nextSibling,Xt=st.nextSibling,pn=Xt.firstChild,Pt=Xt.nextSibling,wn=Pt.firstChild,Zt=Pt.nextSibling,Jt=Zt.firstChild,en=Jt.nextSibling,tn=en.nextSibling,Ir=tn.nextSibling,Pr=Ir.nextSibling,_r=Pr.nextSibling,Rr=_r.nextSibling,zr=Rr.nextSibling,Kr=zr.nextSibling,Br=Kr.nextSibling,Nr=Br.nextSibling,Hr=Nr.nextSibling,Vr=Hr.nextSibling,Gr=Vr.nextSibling,Ur=Gr.nextSibling,jr=Ur.nextSibling,Wr=jr.nextSibling,Ms=Wr.nextSibling;return T(n,"id",`a-${e}`),T(r,"fill",`url(#a-${e})`),T(s,"id",`am-${e}`),T(a,"id",`b-${e}`),T(l,"filter",`url(#am-${e})`),T(i,"mask",`url(#b-${e})`),T(h,"id",`ah-${e}`),T(d,"id",`k-${e}`),T(c,"filter",`url(#ah-${e})`),T(f,"mask",`url(#k-${e})`),T(m,"id",`ae-${e}`),T(v,"id",`j-${e}`),T(b,"filter",`url(#ae-${e})`),T(p,"mask",`url(#j-${e})`),T(x,"id",`ai-${e}`),T($,"id",`i-${e}`),T(O,"filter",`url(#ai-${e})`),T(k,"mask",`url(#i-${e})`),T(C,"id",`aj-${e}`),T(A,"id",`h-${e}`),T(R,"filter",`url(#aj-${e})`),T(N,"mask",`url(#h-${e})`),T(te,"id",`ag-${e}`),T(ae,"id",`g-${e}`),T(z,"filter",`url(#ag-${e})`),T(Q,"mask",`url(#g-${e})`),T(ce,"id",`af-${e}`),T(ye,"id",`f-${e}`),T(Te,"filter",`url(#af-${e})`),T(ve,"mask",`url(#f-${e})`),T(ne,"id",`m-${e}`),T(yt,"fill",`url(#m-${e})`),T(Se,"id",`ak-${e}`),T(ke,"id",`e-${e}`),T(It,"filter",`url(#ak-${e})`),T(_e,"mask",`url(#e-${e})`),T(mt,"id",`n-${e}`),T(At,"fill",`url(#n-${e})`),T(Ye,"id",`r-${e}`),T(bt,"fill",`url(#r-${e})`),T(F,"id",`s-${e}`),T(Y,"fill",`url(#s-${e})`),T(me,"id",`q-${e}`),T(le,"fill",`url(#q-${e})`),T(re,"id",`p-${e}`),T(ue,"fill",`url(#p-${e})`),T(be,"id",`o-${e}`),T(oe,"fill",`url(#o-${e})`),T(rt,"id",`l-${e}`),T(ot,"fill",`url(#l-${e})`),T(Mt,"id",`al-${e}`),T(it,"id",`d-${e}`),T(Tt,"filter",`url(#al-${e})`),T(st,"mask",`url(#d-${e})`),T(pt,"id",`u-${e}`),T(bn,"fill",`url(#u-${e})`),T(pn,"id",`ad-${e}`),T(Pt,"id",`c-${e}`),T(wn,"filter",`url(#ad-${e})`),T(Zt,"mask",`url(#c-${e})`),T(Jt,"id",`t-${e}`),T(en,"fill",`url(#t-${e})`),T(tn,"id",`v-${e}`),T(Ir,"stroke",`url(#v-${e})`),T(Pr,"id",`aa-${e}`),T(_r,"stroke",`url(#aa-${e})`),T(Rr,"id",`w-${e}`),T(zr,"stroke",`url(#w-${e})`),T(Kr,"id",`ac-${e}`),T(Br,"stroke",`url(#ac-${e})`),T(Nr,"id",`ab-${e}`),T(Hr,"stroke",`url(#ab-${e})`),T(Vr,"id",`y-${e}`),T(Gr,"stroke",`url(#y-${e})`),T(Ur,"id",`x-${e}`),T(jr,"stroke",`url(#x-${e})`),T(Wr,"id",`z-${e}`),T(Ms,"stroke",`url(#z-${e})`),t})()}var $d=P('<span><svg width=16 height=16 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M6 12L10 8L6 4"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Cd=P('<button title="Copy object to clipboard">'),Sd=P('<button title="Remove all items"aria-label="Remove all items">'),kd=P('<button title="Delete item"aria-label="Delete item">'),Ed=P('<button title="Toggle value"aria-label="Toggle value">'),Dd=P('<button title="Bulk Edit Data"aria-label="Bulk Edit Data">'),on=P("<div>"),Ad=P("<div><button> <span></span> <span> "),Md=P("<input>"),Ho=P("<span>"),Td=P("<div><label>:"),qd=P("<div><div><button> [<!>...<!>]");function Fd(e,t){let n=0;const r=[];for(;n<e.length;)r.push(e.slice(n,n+t)),n=n+t;return r}var Vo=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n));return(()=>{var o=$d();return G(()=>q(o,L(r().expander,n`
          transform: rotate(${e.expanded?90:0}deg);
        `,e.expanded&&n`
            & svg {
              top: -1px;
            }
          `))),o})()},Od=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n)),[o,s]=B("NoCopy");return(()=>{var a=Cd();return Hs(a,"click",o()==="NoCopy"?()=>{navigator.clipboard.writeText(Vs(e.value)).then(()=>{s("SuccessCopy"),setTimeout(()=>{s("NoCopy")},1500)},l=>{console.error("Failed to copy: ",l),s("ErrorCopy"),setTimeout(()=>{s("NoCopy")},1500)})}:void 0,!0),E(a,y(Gs,{get children(){return[y(Gn,{get when(){return o()==="NoCopy"},get children(){return y(gd,{})}}),y(Gn,{get when(){return o()==="SuccessCopy"},get children(){return y(vd,{get theme(){return t()}})}}),y(Gn,{get when(){return o()==="ErrorCopy"},get children(){return y(yd,{})}})]}})),G(l=>{var i=r().actionButton,u=`${o()==="NoCopy"?"Copy object to clipboard":o()==="SuccessCopy"?"Object copied to clipboard":"Error copying object to clipboard"}`;return i!==l.e&&q(a,l.e=i),u!==l.t&&T(a,"aria-label",l.t=u),l},{e:void 0,t:void 0}),a})()},Ld=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n)),o=H().client;return(()=>{var s=Sd();return s.$$click=()=>{const a=e.activeQuery.state.data,l=hr(a,e.dataPath,[]);o.setQueryData(e.activeQuery.queryKey,l)},E(s,y(md,{})),G(()=>q(s,r().actionButton)),s})()},Go=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n)),o=H().client;return(()=>{var s=kd();return s.$$click=()=>{const a=e.activeQuery.state.data,l=Us(a,e.dataPath);o.setQueryData(e.activeQuery.queryKey,l)},E(s,y($s,{})),G(()=>q(s,L(r().actionButton))),s})()},Id=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n)),o=H().client;return(()=>{var s=Ed();return s.$$click=()=>{const a=e.activeQuery.state.data,l=hr(a,e.dataPath,!e.value);o.setQueryData(e.activeQuery.queryKey,l)},E(s,y(bd,{get theme(){return t()},get checked(){return e.value}})),G(()=>q(s,L(r().actionButton,n`
          width: ${S.size[3.5]};
          height: ${S.size[3.5]};
        `))),s})()};function Uo(e){return Symbol.iterator in e}function xt(e){const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Yt(n):Qt(n)),o=H().client,[s,a]=B((e.defaultExpanded||[]).includes(e.label)),l=()=>a(m=>!m),[i,u]=B([]),h=I(()=>Array.isArray(e.value)?e.value.map((m,v)=>({label:v.toString(),value:m})):e.value!==null&&typeof e.value=="object"&&Uo(e.value)&&typeof e.value[Symbol.iterator]=="function"?e.value instanceof Map?Array.from(e.value,([m,v])=>({label:m,value:v})):Array.from(e.value,(m,v)=>({label:v.toString(),value:m})):typeof e.value=="object"&&e.value!==null?Object.entries(e.value).map(([m,v])=>({label:m,value:v})):[]),d=I(()=>Array.isArray(e.value)?"array":e.value!==null&&typeof e.value=="object"&&Uo(e.value)&&typeof e.value[Symbol.iterator]=="function"?"Iterable":typeof e.value=="object"&&e.value!==null?"object":typeof e.value),c=I(()=>Fd(h(),100)),f=e.dataPath??[],g=Pe();return(()=>{var m=on();return E(m,y(K,{get when(){return c().length},get children(){return[(()=>{var v=Ad(),b=v.firstChild,p=b.firstChild,w=p.nextSibling,x=w.nextSibling,$=x.nextSibling,O=$.firstChild;return b.$$click=()=>l(),E(b,y(Vo,{get expanded(){return s()}}),p),E(w,()=>e.label),E($,()=>String(d()).toLowerCase()==="iterable"?"(Iterable) ":"",O),E($,()=>h().length,O),E($,()=>h().length>1?"items":"item",null),E(v,y(K,{get when(){return e.editable},get children(){var k=on();return E(k,y(Od,{get value(){return e.value}}),null),E(k,y(K,{get when(){return ge(()=>!!e.itemsDeletable)()&&e.activeQuery!==void 0},get children(){return y(Go,{get activeQuery(){return e.activeQuery},dataPath:f})}}),null),E(k,y(K,{get when(){return ge(()=>d()==="array")()&&e.activeQuery!==void 0},get children(){return y(Ld,{get activeQuery(){return e.activeQuery},dataPath:f})}}),null),E(k,y(K,{get when(){return ge(()=>!!e.onEdit)()&&!Ks(e.value).meta},get children(){var _=Dd();return _.$$click=()=>{var C;(C=e.onEdit)==null||C.call(e)},E(_,y(hd,{})),G(()=>q(_,r().actionButton)),_}}),null),G(()=>q(k,r().actions)),k}}),null),G(k=>{var _=r().expanderButtonContainer,C=r().expanderButton,A=s()?"true":"false",R=r().info;return _!==k.e&&q(v,k.e=_),C!==k.t&&q(b,k.t=C),A!==k.a&&T(b,"aria-expanded",k.a=A),R!==k.o&&q($,k.o=R),k},{e:void 0,t:void 0,a:void 0,o:void 0}),v})(),y(K,{get when(){return s()},get children(){return[y(K,{get when(){return c().length===1},get children(){var v=on();return E(v,y(Dn,{get each(){return h()},by:b=>b.label,children:b=>y(xt,{get defaultExpanded(){return e.defaultExpanded},get label(){return b().label},get value(){return b().value},get editable(){return e.editable},get dataPath(){return[...f,b().label]},get activeQuery(){return e.activeQuery},get itemsDeletable(){return d()==="array"||d()==="Iterable"||d()==="object"}})})),G(()=>q(v,r().subEntry)),v}}),y(K,{get when(){return c().length>1},get children(){var v=on();return E(v,y(Bs,{get each(){return c()},children:(b,p)=>(()=>{var w=qd(),x=w.firstChild,$=x.firstChild,O=$.firstChild,k=O.nextSibling,_=k.nextSibling,C=_.nextSibling;return C.nextSibling,$.$$click=()=>u(A=>A.includes(p)?A.filter(R=>R!==p):[...A,p]),E($,y(Vo,{get expanded(){return i().includes(p)}}),O),E($,p*100,k),E($,p*100+100-1,C),E(x,y(K,{get when(){return i().includes(p)},get children(){var A=on();return E(A,y(Dn,{get each(){return b()},by:R=>R.label,children:R=>y(xt,{get defaultExpanded(){return e.defaultExpanded},get label(){return R().label},get value(){return R().value},get editable(){return e.editable},get dataPath(){return[...f,R().label]},get activeQuery(){return e.activeQuery}})})),G(()=>q(A,r().subEntry)),A}}),null),G(A=>{var R=r().entry,N=r().expanderButton;return R!==A.e&&q(x,A.e=R),N!==A.t&&q($,A.t=N),A},{e:void 0,t:void 0}),w})()})),G(()=>q(v,r().subEntry)),v}})]}})]}}),null),E(m,y(K,{get when(){return c().length===0},get children(){var v=Td(),b=v.firstChild,p=b.firstChild;return T(b,"for",g),E(b,()=>e.label,p),E(v,y(K,{get when(){return ge(()=>!!(e.editable&&e.activeQuery!==void 0))()&&(d()==="string"||d()==="number"||d()==="boolean")},get fallback(){return(()=>{var w=Ho();return E(w,()=>En(e.value)),G(()=>q(w,r().value)),w})()},get children(){return[y(K,{get when(){return ge(()=>!!(e.editable&&e.activeQuery!==void 0))()&&(d()==="string"||d()==="number")},get children(){var w=Md();return w.addEventListener("change",x=>{const $=e.activeQuery.state.data,O=hr($,f,d()==="number"?x.target.valueAsNumber:x.target.value);o.setQueryData(e.activeQuery.queryKey,O)}),T(w,"id",g),G(x=>{var $=d()==="number"?"number":"text",O=L(r().value,r().editableInput);return $!==x.e&&T(w,"type",x.e=$),O!==x.t&&q(w,x.t=O),x},{e:void 0,t:void 0}),G(()=>w.value=e.value),w}}),y(K,{get when(){return d()==="boolean"},get children(){var w=Ho();return E(w,y(Id,{get activeQuery(){return e.activeQuery},dataPath:f,get value(){return e.value}}),null),E(w,()=>En(e.value),null),G(()=>q(w,L(r().value,r().actions,r().editableInput))),w}})]}}),null),E(v,y(K,{get when(){return ge(()=>!!(e.editable&&e.itemsDeletable))()&&e.activeQuery!==void 0},get children(){return y(Go,{get activeQuery(){return e.activeQuery},dataPath:f})}}),null),G(w=>{var x=r().row,$=r().label;return x!==w.e&&q(v,w.e=x),$!==w.t&&q(b,w.t=$),w},{e:void 0,t:void 0}),v}}),null),G(()=>q(m,r().entry)),m})()}var Cs=(e,t)=>{const{colors:n,font:r,size:o,border:s}=S,a=(l,i)=>e==="light"?l:i;return{entry:t`
      & * {
        font-size: ${r.size.xs};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
      }
      position: relative;
      outline: none;
      word-break: break-word;
    `,subEntry:t`
      margin: 0 0 0 0.5em;
      padding-left: 0.75em;
      border-left: 2px solid ${a(n.gray[300],n.darkGray[400])};
      /* outline: 1px solid ${n.teal[400]}; */
    `,expander:t`
      & path {
        stroke: ${n.gray[400]};
      }
      & svg {
        width: ${o[3]};
        height: ${o[3]};
      }
      display: inline-flex;
      align-items: center;
      transition: all 0.1s ease;
      /* outline: 1px solid ${n.blue[400]}; */
    `,expanderButtonContainer:t`
      display: flex;
      align-items: center;
      line-height: ${o[4]};
      min-height: ${o[4]};
      gap: ${o[2]};
    `,expanderButton:t`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      height: ${o[5]};
      background: transparent;
      border: none;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: ${o[1]};
      position: relative;
      /* outline: 1px solid ${n.green[400]}; */

      &:focus-visible {
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }

      & svg {
        position: relative;
        left: 1px;
      }
    `,info:t`
      color: ${a(n.gray[500],n.gray[500])};
      font-size: ${r.size.xs};
      margin-left: ${o[1]};
      /* outline: 1px solid ${n.yellow[400]}; */
    `,label:t`
      color: ${a(n.gray[700],n.gray[300])};
      white-space: nowrap;
    `,value:t`
      color: ${a(n.purple[600],n.purple[400])};
      flex-grow: 1;
    `,actions:t`
      display: inline-flex;
      gap: ${o[2]};
      align-items: center;
    `,row:t`
      display: inline-flex;
      gap: ${o[2]};
      width: 100%;
      margin: ${o[.25]} 0px;
      line-height: ${o[4.5]};
      align-items: center;
    `,editableInput:t`
      border: none;
      padding: ${o[.5]} ${o[1]} ${o[.5]} ${o[1.5]};
      flex-grow: 1;
      border-radius: ${s.radius.xs};
      background-color: ${a(n.gray[200],n.darkGray[500])};

      &:hover {
        background-color: ${a(n.gray[300],n.darkGray[600])};
      }
    `,actionButton:t`
      background-color: transparent;
      color: ${a(n.gray[500],n.gray[500])};
      border: none;
      display: inline-flex;
      padding: 0px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: ${o[3]};
      height: ${o[3]};
      position: relative;
      z-index: 1;

      &:hover svg {
        color: ${a(n.gray[600],n.gray[400])};
      }

      &:focus-visible {
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
        outline-offset: 2px;
      }
    `}},Qt=e=>Cs("light",e),Yt=e=>Cs("dark",e);gr(["click"]);var Pd=P('<div><div aria-hidden=true></div><button type=button aria-label="Open Tanstack query devtools"class=tsqd-open-btn>'),Lr=P("<div>"),_d=P("<div style=--tsqd-font-size:16px;max-height:100vh;height:100vh;width:100vw>"),Rd=P('<aside aria-label="Tanstack query devtools"><div role=separator aria-label="Resize devtools panel"tabindex=0></div><button aria-label="Close tanstack query devtools">'),zd=P('<select name=tsqd-queries-filter-sort aria-label="Sort queries by">'),Kd=P('<select name=tsqd-mutations-filter-sort aria-label="Sort mutations by">'),Bd=P("<span>Asc"),Nd=P("<span>Desc"),Hd=P('<button aria-label="Open in picture-in-picture mode"title="Open in picture-in-picture mode">'),Vd=P("<div>Settings"),Gd=P("<span>Position"),Ud=P("<span>Top"),jd=P("<span>Bottom"),Wd=P("<span>Left"),Qd=P("<span>Right"),Yd=P("<span>Theme"),Xd=P("<span>Light"),Zd=P("<span>Dark"),Jd=P("<span>System"),e0=P("<span>Disabled Queries"),t0=P("<span>Show"),n0=P("<span>Hide"),r0=P("<div><div class=tsqd-queries-container>"),o0=P("<div><div class=tsqd-mutations-container>"),i0=P('<div><div><div><button aria-label="Close Tanstack query devtools"><span>TANSTACK</span><span> v</span></button></div></div><div><div><div><input aria-label="Filter queries by query key"type=text placeholder=Filter name=tsqd-query-filter-input></div><div></div><button class=tsqd-query-filter-sort-order-btn></button></div><div><button aria-label="Clear query cache"></button><button>'),jo=P("<option>Sort by "),s0=P("<div class=tsqd-query-disabled-indicator aria-hidden=true>disabled"),a0=P("<div class=tsqd-query-static-indicator aria-hidden=true>static"),Ss=P("<button><div></div><code class=tsqd-query-hash>"),l0=P("<div role=tooltip id=tsqd-status-tooltip>"),c0=P("<span>"),u0=P("<button><span aria-hidden=true></span><span>"),d0=P("<button><span aria-hidden=true></span> Error"),f0=P('<div><span aria-hidden=true></span>Trigger Error<select aria-label="Select error type to trigger"><option value disabled selected>'),g0=P('<div class="tsqd-query-details-explorer-container tsqd-query-details-data-explorer">'),h0=P('<form><textarea name=data aria-label="Edit query data as JSON"></textarea><div><span></span><div><button type=button>Cancel</button><button>Save'),v0=P('<div><div role=heading aria-level=2>Query Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span role=status aria-live=polite></span></div><div class=tsqd-query-details-observers-count><span>Observers:</span><span></span></div><div class=tsqd-query-details-last-updated><span>Last Updated:</span><span></span></div></div><div role=heading aria-level=2>Actions</div><div><button><span aria-hidden=true></span>Refetch</button><button><span aria-hidden=true></span>Invalidate</button><button><span aria-hidden=true></span>Reset</button><button><span aria-hidden=true></span>Remove</button><button><span aria-hidden=true></span> Loading</button></div><div role=heading aria-level=2>Data </div><div role=heading aria-level=2>Query Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">'),y0=P("<option>"),m0=P('<div><div role=heading aria-level=2>Mutation Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span role=status aria-live=polite></span></div><div class=tsqd-query-details-last-updated><span>Submitted At:</span><span></span></div></div><div role=heading aria-level=2>Variables Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Context Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Data Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Mutations Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">'),[Oe,Vn]=B(null),[$t,ks]=B(null),[dt,Es]=B(0),[sn,b0]=B(!1),p0=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Qe(n):We(n)),o=I(()=>H().onlineManager);Ct(()=>{const d=o().subscribe(c=>{b0(!c)});U(()=>{d()})});const s=vr(),a=I(()=>H().buttonPosition||ia),l=I(()=>e.localStore.open==="true"?!0:e.localStore.open==="false"?!1:H().initialIsOpen||aa),i=I(()=>e.localStore.position||H().position||tr);let u;V(()=>{const d=u.parentElement,c=e.localStore.height||Sn,f=e.localStore.width||kn,g=i();d.style.setProperty("--tsqd-panel-height",`${g==="top"?"-":""}${c}px`),d.style.setProperty("--tsqd-panel-width",`${g==="left"?"-":""}${f}px`)}),Ct(()=>{const d=()=>{const c=u.parentElement,f=getComputedStyle(c).fontSize;c.style.setProperty("--tsqd-font-size",f)};d(),window.addEventListener("focus",d),U(()=>{window.removeEventListener("focus",d)})});const h=I(()=>e.localStore.pip_open??"false");return[y(K,{get when(){return ge(()=>!!s().pipWindow)()&&h()=="true"},get children(){return y(Wo,{get mount(){var d;return(d=s().pipWindow)==null?void 0:d.document.body},get children(){return y(w0,{get children(){return y(Ds,e)}})}})}}),(()=>{var d=Lr(),c=u;return typeof c=="function"?cn(c,d):u=d,E(d,y(io,{name:"tsqd-panel-transition",get children(){return y(K,{get when(){return ge(()=>!!(l()&&!s().pipWindow))()&&h()=="false"},get children(){return y(x0,{get localStore(){return e.localStore},get setLocalStore(){return e.setLocalStore}})}})}}),null),E(d,y(io,{name:"tsqd-button-transition",get children(){return y(K,{get when(){return!l()},get children(){var f=Pd(),g=f.firstChild,m=g.nextSibling;return E(g,y(No,{})),m.$$click=()=>e.setLocalStore("open","true"),E(m,y(No,{})),G(()=>q(f,L(r().devtoolsBtn,r()[`devtoolsBtn-position-${a()}`],"tsqd-open-btn-container"))),f}})}}),null),G(()=>q(d,L(n`
            & .tsqd-panel-transition-exit-active,
            & .tsqd-panel-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
            }

            & .tsqd-panel-transition-exit-to,
            & .tsqd-panel-transition-enter {
              ${i()==="top"||i()==="bottom"?"transform: translateY(var(--tsqd-panel-height));":"transform: translateX(var(--tsqd-panel-width));"}
            }

            & .tsqd-button-transition-exit-active,
            & .tsqd-button-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
              opacity: 1;
            }

            & .tsqd-button-transition-exit-to,
            & .tsqd-button-transition-enter {
              transform: ${a()==="relative"?"none;":a()==="top-left"?"translateX(-72px);":a()==="top-right"?"translateX(72px);":"translateY(72px);"};
              opacity: 0;
            }
          `,"tsqd-transitions-container"))),d})()]},w0=e=>{const t=vr(),n=Ce(),r=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,o=I(()=>n()==="dark"?Qe(r):We(r)),s=()=>{const{colors:a}=S,l=(i,u)=>n()==="dark"?u:i;return dt()<Gt?r`
        flex-direction: column;
        background-color: ${l(a.gray[300],a.gray[600])};
      `:r`
      flex-direction: row;
      background-color: ${l(a.gray[200],a.darkGray[900])};
    `};return V(()=>{const a=t().pipWindow,l=()=>{a&&Es(a.innerWidth)};a&&(a.addEventListener("resize",l),l()),U(()=>{a&&a.removeEventListener("resize",l)})}),(()=>{var a=_d();return E(a,()=>e.children),G(()=>q(a,L(o().panel,s(),{[r`
            min-width: min-content;
          `]:dt()<Yo},"tsqd-main-panel"))),a})()},x0=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Qe(n):We(n));let o;Ct(()=>{o.focus()});const[s,a]=B(!1),l=I(()=>e.localStore.position||H().position||tr),i=d=>{const c=d.currentTarget.parentElement;if(!c)return;a(!0);const{height:f,width:g}=c.getBoundingClientRect(),m=d.clientX,v=d.clientY;let b=0;const p=_t(3.5),w=_t(12),x=O=>{if(O.preventDefault(),l()==="left"||l()==="right"){const k=l()==="right"?m-O.clientX:O.clientX-m;b=Math.round(g+k),b<w&&(b=w),e.setLocalStore("width",String(Math.round(b)));const _=c.getBoundingClientRect().width;Number(e.localStore.width)<_&&e.setLocalStore("width",String(_))}else{const k=l()==="bottom"?v-O.clientY:O.clientY-v;b=Math.round(f+k),b<p&&(b=p,Vn(null)),e.setLocalStore("height",String(Math.round(b)))}},$=()=>{s()&&a(!1),document.removeEventListener("mousemove",x,!1),document.removeEventListener("mouseup",$,!1)};document.addEventListener("mousemove",x,!1),document.addEventListener("mouseup",$,!1)};let u;Ct(()=>{Ia(u,({width:d},c)=>{c===u&&Es(d)})}),V(()=>{var v,b;const d=(b=(v=u.parentElement)==null?void 0:v.parentElement)==null?void 0:b.parentElement;if(!d)return;const c=e.localStore.position||tr,f=Ns("padding",c),g=e.localStore.position==="left"||e.localStore.position==="right",m=(({padding:p,paddingTop:w,paddingBottom:x,paddingLeft:$,paddingRight:O})=>({padding:p,paddingTop:w,paddingBottom:x,paddingLeft:$,paddingRight:O}))(d.style);d.style[f]=`${g?e.localStore.width:e.localStore.height}px`,U(()=>{Object.entries(m).forEach(([p,w])=>{d.style[p]=w})})});const h=()=>{const{colors:d}=S,c=(f,g)=>t()==="dark"?g:f;return dt()<Gt?n`
        flex-direction: column;
        background-color: ${c(d.gray[300],d.gray[600])};
      `:n`
      flex-direction: row;
      background-color: ${c(d.gray[200],d.darkGray[900])};
    `};return(()=>{var d=Rd(),c=d.firstChild,f=c.nextSibling,g=u;typeof g=="function"?cn(g,d):u=d,c.$$keydown=v=>{const p=_t(3.5),w=_t(12);if(l()==="top"||l()==="bottom"){if(v.key==="ArrowUp"||v.key==="ArrowDown"){v.preventDefault();const x=Number(e.localStore.height||Sn),$=l()==="bottom"?v.key==="ArrowUp"?10:-10:v.key==="ArrowDown"?10:-10,O=Math.max(p,x+$);e.setLocalStore("height",String(O))}}else if(v.key==="ArrowLeft"||v.key==="ArrowRight"){v.preventDefault();const x=Number(e.localStore.width||kn),$=l()==="right"?v.key==="ArrowLeft"?10:-10:v.key==="ArrowRight"?10:-10,O=Math.max(w,x+$);e.setLocalStore("width",String(O))}},c.$$mousedown=i,f.$$click=()=>e.setLocalStore("open","false");var m=o;return typeof m=="function"?cn(m,f):o=f,E(f,y(Nt,{})),E(d,y(Ds,e),null),G(v=>{var b=L(r().panel,r()[`panel-position-${l()}`],h(),{[n`
            min-width: min-content;
          `]:dt()<Yo&&(l()==="right"||l()==="left")},"tsqd-main-panel"),p=l()==="bottom"||l()==="top"?`${e.localStore.height||Sn}px`:"auto",w=l()==="right"||l()==="left"?`${e.localStore.width||kn}px`:"auto",x=l()==="top"||l()==="bottom"?"horizontal":"vertical",$=l()==="top"||l()==="bottom"?_t(3.5):_t(12),O=l()==="top"||l()==="bottom"?Number(e.localStore.height||Sn):Number(e.localStore.width||kn),k=L(r().dragHandle,r()[`dragHandle-position-${l()}`],"tsqd-drag-handle"),_=L(r().closeBtn,r()[`closeBtn-position-${l()}`],"tsqd-minimize-btn");return b!==v.e&&q(d,v.e=b),p!==v.t&&wt(d,"height",v.t=p),w!==v.a&&wt(d,"width",v.a=w),x!==v.o&&T(c,"aria-orientation",v.o=x),$!==v.i&&T(c,"aria-valuemin",v.i=$),O!==v.n&&T(c,"aria-valuenow",v.n=O),k!==v.s&&q(c,v.s=k),_!==v.h&&q(f,v.h=_),v},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0}),d})()},Ds=e=>{A0(),M0();let t;const n=Ce(),r=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,o=I(()=>n()==="dark"?Qe(r):We(r)),s=vr(),[a,l]=B("queries"),i=I(()=>e.localStore.sort||ca),u=I(()=>Number(e.localStore.sortOrder)||Xr),h=I(()=>e.localStore.mutationSort||ua),d=I(()=>Number(e.localStore.mutationSortOrder)||Xr),c=I(()=>Zn[i()]),f=I(()=>Jn[h()]),g=I(()=>H().onlineManager),m=I(()=>H().client.getQueryCache()),v=I(()=>H().client.getMutationCache()),b=pe(k=>k().getAll().length,!1),p=I(ft(()=>[b(),e.localStore.filter,i(),u(),e.localStore.hideDisabledQueries],()=>{const k=m().getAll();let _=e.localStore.filter?k.filter(A=>Jr(A.queryHash,e.localStore.filter||"").passed):[...k];return e.localStore.hideDisabledQueries==="true"&&(_=_.filter(A=>!A.isDisabled())),c()?_.sort((A,R)=>c()(A,R)*u()):_})),w=Ge(k=>k().getAll().length,!1),x=I(ft(()=>[w(),e.localStore.mutationFilter,h(),d()],()=>{const k=v().getAll(),_=e.localStore.mutationFilter?k.filter(A=>{const R=`${A.options.mutationKey?JSON.stringify(A.options.mutationKey)+" - ":""}${new Date(A.state.submittedAt).toLocaleString()}`;return Jr(R,e.localStore.mutationFilter||"").passed}):[...k];return f()?_.sort((A,R)=>f()(A,R)*d()):_})),$=k=>{e.setLocalStore("position",k)},O=k=>{const C=getComputedStyle(t).getPropertyValue("--tsqd-font-size");k.style.setProperty("--tsqd-font-size",C)};return[(()=>{var k=i0(),_=k.firstChild,C=_.firstChild,A=C.firstChild,R=A.firstChild,N=R.nextSibling,J=N.firstChild,te=_.nextSibling,ae=te.firstChild,z=ae.firstChild,Q=z.firstChild,ee=z.nextSibling,ce=ee.nextSibling,ye=ae.nextSibling,Te=ye.firstChild,ve=Te.nextSibling,Ae=t;return typeof Ae=="function"?cn(Ae,k):t=k,A.$$click=()=>{if(!s().pipWindow&&!e.showPanelViewOnly){e.setLocalStore("open","false");return}e.onClose&&e.onClose()},E(N,()=>H().queryFlavor,J),E(N,()=>H().version,null),E(C,y(Be.Root,{get class(){return L(o().viewToggle)},get value(){return a()},"aria-label":"Toggle between queries and mutations view",onChange:M=>{l(M),Vn(null),ks(null)},get children(){return[y(Be.Item,{value:"queries",class:"tsqd-radio-toggle",get children(){return[y(Be.ItemInput,{}),y(Be.ItemControl,{get children(){return y(Be.ItemIndicator,{})}}),y(Be.ItemLabel,{title:"Toggle Queries View",children:"Queries"})]}}),y(Be.Item,{value:"mutations",class:"tsqd-radio-toggle",get children(){return[y(Be.ItemInput,{}),y(Be.ItemControl,{get children(){return y(Be.ItemIndicator,{})}}),y(Be.ItemLabel,{title:"Toggle Mutations View",children:"Mutations"})]}})]}}),null),E(_,y(K,{get when(){return a()==="queries"},get children(){return y(S0,{})}}),null),E(_,y(K,{get when(){return a()==="mutations"},get children(){return y(k0,{})}}),null),E(z,y(rd,{}),Q),Q.$$input=M=>{a()==="queries"?e.setLocalStore("filter",M.currentTarget.value):e.setLocalStore("mutationFilter",M.currentTarget.value)},E(ee,y(K,{get when(){return a()==="queries"},get children(){var M=zd();return M.addEventListener("change",he=>{e.setLocalStore("sort",he.currentTarget.value)}),E(M,()=>Object.keys(Zn).map(he=>(()=>{var ne=jo();return ne.firstChild,ne.value=he,E(ne,he,null),ne})())),G(()=>M.value=i()),M}}),null),E(ee,y(K,{get when(){return a()==="mutations"},get children(){var M=Kd();return M.addEventListener("change",he=>{e.setLocalStore("mutationSort",he.currentTarget.value)}),E(M,()=>Object.keys(Jn).map(he=>(()=>{var ne=jo();return ne.firstChild,ne.value=he,E(ne,he,null),ne})())),G(()=>M.value=h()),M}}),null),E(ee,y(Nt,{}),null),ce.$$click=()=>{a()==="queries"?e.setLocalStore("sortOrder",String(u()*-1)):e.setLocalStore("mutationSortOrder",String(d()*-1))},E(ce,y(K,{get when(){return(a()==="queries"?u():d())===1},get children(){return[Bd(),y(Ko,{})]}}),null),E(ce,y(K,{get when(){return(a()==="queries"?u():d())===-1},get children(){return[Nd(),y(Bo,{})]}}),null),Te.$$click=()=>{a()==="queries"?(Xe({type:"CLEAR_QUERY_CACHE"}),m().clear()):(Xe({type:"CLEAR_MUTATION_CACHE"}),v().clear())},E(Te,y($s,{})),ve.$$click=()=>{g().setOnline(!g().isOnline())},E(ve,(()=>{var M=ge(()=>!!sn());return()=>M()?y(ud,{}):y(cd,{})})()),E(ye,y(K,{get when(){return ge(()=>!s().pipWindow)()&&!s().disabled},get children(){var M=Hd();return M.$$click=()=>{s().requestPipWindow(Number(window.innerWidth),Number(e.localStore.height??500))},E(M,y(fd,{})),G(()=>q(M,L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-open-pip"))),M}}),null),E(ye,y(ie.Root,{gutter:4,get children(){return[y(ie.Trigger,{get class(){return L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-settings")},"aria-label":"Open settings menu",title:"Open settings menu",get children(){return y(dd,{})}}),y(ie.Portal,{ref:M=>O(M),get mount(){return ge(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return y(ie.Content,{get class(){return L(o().settingsMenu,"tsqd-settings-menu")},get children(){return[(()=>{var M=Vd();return G(()=>q(M,L(o().settingsMenuHeader,"tsqd-settings-menu-header"))),M})(),y(K,{get when(){return!e.showPanelViewOnly},get children(){return y(ie.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[y(ie.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-position")},get children(){return[Gd(),y(Nt,{})]}}),y(ie.Portal,{ref:M=>O(M),get mount(){return ge(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return y(ie.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return y(ie.RadioGroup,{"aria-label":"Position settings",get value(){return e.localStore.position},onChange:M=>$(M),get children(){return[y(ie.RadioItem,{value:"top",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-top")},get children(){return[Ud(),y(Ko,{})]}}),y(ie.RadioItem,{value:"bottom",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-bottom")},get children(){return[jd(),y(Bo,{})]}}),y(ie.RadioItem,{value:"left",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-left")},get children(){return[Wd(),y(od,{})]}}),y(ie.RadioItem,{value:"right",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-right")},get children(){return[Qd(),y(id,{})]}})]}})}})}})]}})}}),y(ie.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[y(ie.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-position")},get children(){return[Yd(),y(Nt,{})]}}),y(ie.Portal,{ref:M=>O(M),get mount(){return ge(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return y(ie.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return y(ie.RadioGroup,{get value(){return e.localStore.theme_preference},onChange:M=>{e.setLocalStore("theme_preference",M)},"aria-label":"Theme preference",get children(){return[y(ie.RadioItem,{value:"light",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-top")},get children(){return[Xd(),y(sd,{})]}}),y(ie.RadioItem,{value:"dark",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-bottom")},get children(){return[Zd(),y(ad,{})]}}),y(ie.RadioItem,{value:"system",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-left")},get children(){return[Jd(),y(ld,{})]}})]}})}})}})]}}),y(ie.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[y(ie.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-disabled-queries")},get children(){return[e0(),y(Nt,{})]}}),y(ie.Portal,{ref:M=>O(M),get mount(){return ge(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return y(ie.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return y(ie.RadioGroup,{get value(){return e.localStore.hideDisabledQueries},"aria-label":"Hide disabled queries setting",onChange:M=>e.setLocalStore("hideDisabledQueries",M),get children(){return[y(ie.RadioItem,{value:"false",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-show")},get children(){return[t0(),y(K,{get when(){return e.localStore.hideDisabledQueries!=="true"},get children(){return y(fr,{})}})]}}),y(ie.RadioItem,{value:"true",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-hide")},get children(){return[n0(),y(K,{get when(){return e.localStore.hideDisabledQueries==="true"},get children(){return y(fr,{})}})]}})]}})}})}})]}})]}})}})]}}),null),E(k,y(K,{get when(){return a()==="queries"},get children(){var M=r0(),he=M.firstChild;return E(he,y(Dn,{by:ne=>ne.queryHash,get each(){return p()},children:ne=>y($0,{get query(){return ne()}})})),G(()=>q(M,L(o().overflowQueryContainer,"tsqd-queries-overflow-container"))),M}}),null),E(k,y(K,{get when(){return a()==="mutations"},get children(){var M=o0(),he=M.firstChild;return E(he,y(Dn,{by:ne=>ne.mutationId,get each(){return x()},children:ne=>y(C0,{get mutation(){return ne()}})})),G(()=>q(M,L(o().overflowQueryContainer,"tsqd-mutations-overflow-container"))),M}}),null),G(M=>{var he=L(o().queriesContainer,dt()<Gt&&(Oe()||$t())&&r`
              height: 50%;
              max-height: 50%;
            `,dt()<Gt&&!(Oe()||$t())&&r`
              height: 100%;
              max-height: 100%;
            `,"tsqd-queries-container"),ne=L(o().row,"tsqd-header"),yt=o().logoAndToggleContainer,j=L(o().logo,"tsqd-text-logo-container"),Se=L(o().tanstackLogo,"tsqd-text-logo-tanstack"),ke=L(o().queryFlavorLogo,"tsqd-text-logo-query-flavor"),It=L(o().row,"tsqd-filters-actions-container"),_e=L(o().filtersContainer,"tsqd-filters-container"),mt=L(o().filterInput,"tsqd-query-filter-textfield-container"),At=L("tsqd-query-filter-textfield"),nt=L(o().filterSelect,"tsqd-query-filter-sort-container"),Ye=`Sort order ${(a()==="queries"?u():d())===-1?"descending":"ascending"}`,bt=(a()==="queries"?u():d())===-1,F=L(o().actionsContainer,"tsqd-actions-container"),Y=L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-clear-cache"),me=`Clear ${a()} cache`,le=L(o().actionsBtn,sn()&&o().actionsBtnOffline,"tsqd-actions-btn","tsqd-action-mock-offline-behavior"),re=`${sn()?"Unset offline mocking behavior":"Mock offline behavior"}`,ue=sn(),be=`${sn()?"Unset offline mocking behavior":"Mock offline behavior"}`;return he!==M.e&&q(k,M.e=he),ne!==M.t&&q(_,M.t=ne),yt!==M.a&&q(C,M.a=yt),j!==M.o&&q(A,M.o=j),Se!==M.i&&q(R,M.i=Se),ke!==M.n&&q(N,M.n=ke),It!==M.s&&q(te,M.s=It),_e!==M.h&&q(ae,M.h=_e),mt!==M.r&&q(z,M.r=mt),At!==M.d&&q(Q,M.d=At),nt!==M.l&&q(ee,M.l=nt),Ye!==M.u&&T(ce,"aria-label",M.u=Ye),bt!==M.c&&T(ce,"aria-pressed",M.c=bt),F!==M.w&&q(ye,M.w=F),Y!==M.m&&q(Te,M.m=Y),me!==M.f&&T(Te,"title",M.f=me),le!==M.y&&q(ve,M.y=le),re!==M.g&&T(ve,"aria-label",M.g=re),ue!==M.p&&T(ve,"aria-pressed",M.p=ue),be!==M.b&&T(ve,"title",M.b=be),M},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0}),G(()=>Q.value=a()==="queries"?e.localStore.filter||"":e.localStore.mutationFilter||""),k})(),y(K,{get when(){return ge(()=>a()==="queries")()&&Oe()},get children(){return y(E0,{})}}),y(K,{get when(){return ge(()=>a()==="mutations")()&&$t()},get children(){return y(D0,{})}})]},$0=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,a=(g,m)=>t()==="dark"?m:g,l=pe(g=>{var m;return(m=g().find({queryKey:e.query.queryKey}))==null?void 0:m.state},!0,g=>g.query.queryHash===e.query.queryHash),i=pe(g=>{var m;return((m=g().find({queryKey:e.query.queryKey}))==null?void 0:m.isDisabled())??!1},!0,g=>g.query.queryHash===e.query.queryHash),u=pe(g=>{var m;return((m=g().find({queryKey:e.query.queryKey}))==null?void 0:m.isStatic())??!1},!0,g=>g.query.queryHash===e.query.queryHash),h=pe(g=>{var m;return((m=g().find({queryKey:e.query.queryKey}))==null?void 0:m.isStale())??!1},!0,g=>g.query.queryHash===e.query.queryHash),d=pe(g=>{var m;return((m=g().find({queryKey:e.query.queryKey}))==null?void 0:m.getObserversCount())??0},!0,g=>g.query.queryHash===e.query.queryHash),c=I(()=>Os({queryState:l(),observerCount:d(),isStale:h()})),f=()=>c()==="gray"?n`
        background-color: ${a(o[c()][200],o[c()][700])};
        color: ${a(o[c()][700],o[c()][300])};
      `:n`
      background-color: ${a(o[c()][200]+s[80],o[c()][900])};
      color: ${a(o[c()][800],o[c()][300])};
    `;return y(K,{get when(){return l()},get children(){var g=Ss(),m=g.firstChild,v=m.nextSibling;return g.$$click=()=>Vn(e.query.queryHash===Oe()?null:e.query.queryHash),E(m,d),E(v,()=>e.query.queryHash),E(g,y(K,{get when(){return i()},get children(){return s0()}}),null),E(g,y(K,{get when(){return u()},get children(){return a0()}}),null),G(b=>{var p=L(r().queryRow,Oe()===e.query.queryHash&&r().selectedQueryRow,"tsqd-query-row"),w=`Query key ${e.query.queryHash}${i()?", disabled":""}${u()?", static":""}`,x=L(f(),"tsqd-query-observer-count");return p!==b.e&&q(g,b.e=p),w!==b.t&&T(g,"aria-label",b.t=w),x!==b.a&&q(m,b.a=x),b},{e:void 0,t:void 0,a:void 0}),g}})},C0=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,a=(c,f)=>t()==="dark"?f:c,l=Ge(c=>{const g=c().getAll().find(m=>m.mutationId===e.mutation.mutationId);return g==null?void 0:g.state}),i=Ge(c=>{const g=c().getAll().find(m=>m.mutationId===e.mutation.mutationId);return g?g.state.isPaused:!1}),u=Ge(c=>{const g=c().getAll().find(m=>m.mutationId===e.mutation.mutationId);return g?g.state.status:"idle"}),h=I(()=>Bt({isPaused:i(),status:u()})),d=()=>h()==="gray"?n`
        background-color: ${a(o[h()][200],o[h()][700])};
        color: ${a(o[h()][700],o[h()][300])};
      `:n`
      background-color: ${a(o[h()][200]+s[80],o[h()][900])};
      color: ${a(o[h()][800],o[h()][300])};
    `;return y(K,{get when(){return l()},get children(){var c=Ss(),f=c.firstChild,g=f.nextSibling;return c.$$click=()=>{ks(e.mutation.mutationId===$t()?null:e.mutation.mutationId)},E(f,y(K,{get when(){return h()==="purple"},get children(){return y(xd,{})}}),null),E(f,y(K,{get when(){return h()==="green"},get children(){return y(fr,{})}}),null),E(f,y(K,{get when(){return h()==="red"},get children(){return y(wd,{})}}),null),E(f,y(K,{get when(){return h()==="yellow"},get children(){return y(pd,{})}}),null),E(g,y(K,{get when(){return e.mutation.options.mutationKey},get children(){return[ge(()=>JSON.stringify(e.mutation.options.mutationKey))," -"," "]}}),null),E(g,()=>new Date(e.mutation.state.submittedAt).toLocaleString(),null),G(m=>{var v=L(r().queryRow,$t()===e.mutation.mutationId&&r().selectedQueryRow,"tsqd-query-row"),b=`Mutation submitted at ${new Date(e.mutation.state.submittedAt).toLocaleString()}`,p=L(d(),"tsqd-query-observer-count");return v!==m.e&&q(c,m.e=v),b!==m.t&&T(c,"aria-label",m.t=b),p!==m.a&&q(f,m.a=p),m},{e:void 0,t:void 0,a:void 0}),c}})},S0=()=>{const e=pe(i=>i().getAll().filter(u=>Rt(u)==="stale").length),t=pe(i=>i().getAll().filter(u=>Rt(u)==="fresh").length),n=pe(i=>i().getAll().filter(u=>Rt(u)==="fetching").length),r=pe(i=>i().getAll().filter(u=>Rt(u)==="paused").length),o=pe(i=>i().getAll().filter(u=>Rt(u)==="inactive").length),s=Ce(),a=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,l=I(()=>s()==="dark"?Qe(a):We(a));return(()=>{var i=Lr();return E(i,y(ct,{label:"Fresh",color:"green",get count(){return t()}}),null),E(i,y(ct,{label:"Fetching",color:"blue",get count(){return n()}}),null),E(i,y(ct,{label:"Paused",color:"purple",get count(){return r()}}),null),E(i,y(ct,{label:"Stale",color:"yellow",get count(){return e()}}),null),E(i,y(ct,{label:"Inactive",color:"gray",get count(){return o()}}),null),G(()=>q(i,L(l().queryStatusContainer,"tsqd-query-status-container"))),i})()},k0=()=>{const e=Ge(l=>l().getAll().filter(i=>Bt({isPaused:i.state.isPaused,status:i.state.status})==="green").length),t=Ge(l=>l().getAll().filter(i=>Bt({isPaused:i.state.isPaused,status:i.state.status})==="yellow").length),n=Ge(l=>l().getAll().filter(i=>Bt({isPaused:i.state.isPaused,status:i.state.status})==="purple").length),r=Ge(l=>l().getAll().filter(i=>Bt({isPaused:i.state.isPaused,status:i.state.status})==="red").length),o=Ce(),s=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,a=I(()=>o()==="dark"?Qe(s):We(s));return(()=>{var l=Lr();return E(l,y(ct,{label:"Paused",color:"purple",get count(){return n()}}),null),E(l,y(ct,{label:"Pending",color:"yellow",get count(){return t()}}),null),E(l,y(ct,{label:"Success",color:"green",get count(){return e()}}),null),E(l,y(ct,{label:"Error",color:"red",get count(){return r()}}),null),G(()=>q(l,L(a().queryStatusContainer,"tsqd-query-status-container"))),l})()},ct=e=>{const t=Ce(),n=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,r=I(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,a=(f,g)=>t()==="dark"?g:f;let l;const[i,u]=B(!1),[h,d]=B(!1),c=I(()=>!(Oe()&&dt()<oa&&dt()>Gt||dt()<Gt));return(()=>{var f=u0(),g=f.firstChild,m=g.nextSibling,v=l;return typeof v=="function"?cn(v,f):l=f,f.addEventListener("mouseleave",()=>{u(!1),d(!1)}),f.addEventListener("mouseenter",()=>u(!0)),f.addEventListener("blur",()=>d(!1)),f.addEventListener("focus",()=>d(!0)),Ls(f,W({get disabled(){return c()},get"aria-label"(){return`${e.label}: ${e.count}`},get class(){return L(r().queryStatusTag,!c()&&n`
            cursor: pointer;
            &:hover {
              background: ${a(o.gray[200],o.darkGray[400])}${s[80]};
            }
          `,"tsqd-query-status-tag",`tsqd-query-status-tag-${e.label.toLowerCase()}`)}},()=>i()||h()?{"aria-describedby":"tsqd-status-tooltip"}:{}),!1,!0),E(f,y(K,{get when(){return ge(()=>!c())()&&(i()||h())},get children(){var b=l0();return E(b,()=>e.label),G(()=>q(b,L(r().statusTooltip,"tsqd-query-status-tooltip"))),b}}),g),E(f,y(K,{get when(){return c()},get children(){var b=c0();return E(b,()=>e.label),G(()=>q(b,L(r().queryStatusTagLabel,"tsqd-query-status-tag-label"))),b}}),m),E(m,()=>e.count),G(b=>{var p=L(n`
            width: ${S.size[1.5]};
            height: ${S.size[1.5]};
            border-radius: ${S.border.radius.full};
            background-color: ${S.colors[e.color][500]};
          `,"tsqd-query-status-tag-dot"),w=L(r().queryStatusCount,e.count>0&&e.color!=="gray"&&n`
              background-color: ${a(o[e.color][100],o[e.color][900])};
              color: ${a(o[e.color][700],o[e.color][300])};
            `,"tsqd-query-status-tag-count");return p!==b.e&&q(g,b.e=p),w!==b.t&&q(m,b.t=w),b},{e:void 0,t:void 0}),f})()},E0=()=>{const e=Ce(),t=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,n=I(()=>e()==="dark"?Qe(t):We(t)),{colors:r}=S,o=(C,A)=>e()==="dark"?A:C,s=H().client,[a,l]=B(!1),[i,u]=B("view"),[h,d]=B(!1),c=I(()=>H().errorTypes||[]),f=pe(C=>C().getAll().find(A=>A.queryHash===Oe()),!1),g=pe(C=>C().getAll().find(A=>A.queryHash===Oe()),!1),m=pe(C=>{var A;return(A=C().getAll().find(R=>R.queryHash===Oe()))==null?void 0:A.state},!1),v=pe(C=>{var A;return(A=C().getAll().find(R=>R.queryHash===Oe()))==null?void 0:A.state.data},!1),b=pe(C=>{const A=C().getAll().find(R=>R.queryHash===Oe());return A?Rt(A):"inactive"}),p=pe(C=>{const A=C().getAll().find(R=>R.queryHash===Oe());return A?A.state.status:"pending"}),w=pe(C=>{var A;return((A=C().getAll().find(R=>R.queryHash===Oe()))==null?void 0:A.getObserversCount())??0}),x=I(()=>Is(b())),$=()=>{var A,R;Xe({type:"REFETCH",queryHash:(A=f())==null?void 0:A.queryHash});const C=(R=f())==null?void 0:R.fetch();C==null||C.catch(()=>{})},O=C=>{const A=f();if(!A)return;Xe({type:"TRIGGER_ERROR",queryHash:A.queryHash,metadata:{error:C==null?void 0:C.name}});const R=(C==null?void 0:C.initializer(A))??new Error("Unknown error from devtools"),N=A.options;A.setState({data:void 0,status:"error",error:R,fetchMeta:{...A.state.fetchMeta,__previousQueryOptions:N}})},k=()=>{const C=f();if(!C)return;Xe({type:"RESTORE_LOADING",queryHash:C.queryHash});const A=C.state,R=C.state.fetchMeta?C.state.fetchMeta.__previousQueryOptions:null;C.cancel({silent:!0}),C.setState({...A,fetchStatus:"idle",fetchMeta:null}),R&&C.fetch(R)};V(()=>{b()!=="fetching"&&l(!1)});const _=()=>x()==="gray"?t`
        background-color: ${o(r[x()][200],r[x()][700])};
        color: ${o(r[x()][700],r[x()][300])};
        border-color: ${o(r[x()][400],r[x()][600])};
      `:t`
      background-color: ${o(r[x()][100],r[x()][900])};
      color: ${o(r[x()][700],r[x()][300])};
      border-color: ${o(r[x()][400],r[x()][600])};
    `;return y(K,{get when(){return ge(()=>!!f())()&&m()},get children(){var C=v0(),A=C.firstChild,R=A.nextSibling,N=R.firstChild,J=N.firstChild,te=J.firstChild,ae=J.nextSibling,z=N.nextSibling,Q=z.firstChild,ee=Q.nextSibling,ce=z.nextSibling,ye=ce.firstChild,Te=ye.nextSibling,ve=R.nextSibling,Ae=ve.nextSibling,M=Ae.firstChild,he=M.firstChild,ne=M.nextSibling,yt=ne.firstChild,j=ne.nextSibling,Se=j.firstChild,ke=j.nextSibling,It=ke.firstChild,_e=ke.nextSibling,mt=_e.firstChild,At=mt.nextSibling,nt=Ae.nextSibling;nt.firstChild;var Ye=nt.nextSibling,bt=Ye.nextSibling;return E(te,()=>En(f().queryKey,!0)),E(ae,b),E(ee,w),E(Te,()=>new Date(m().dataUpdatedAt).toLocaleTimeString()),M.$$click=$,ne.$$click=()=>{var F,Y;Xe({type:"INVALIDATE",queryHash:(F=f())==null?void 0:F.queryHash}),s.invalidateQueries({queryKey:(Y=f())==null?void 0:Y.queryKey,exact:!0})},j.$$click=()=>{var F,Y;Xe({type:"RESET",queryHash:(F=f())==null?void 0:F.queryHash}),s.resetQueries({queryKey:(Y=f())==null?void 0:Y.queryKey,exact:!0})},ke.$$click=()=>{var F,Y;Xe({type:"REMOVE",queryHash:(F=f())==null?void 0:F.queryHash}),s.removeQueries({queryKey:(Y=f())==null?void 0:Y.queryKey,exact:!0}),Vn(null)},_e.$$click=()=>{var F;if(((F=f())==null?void 0:F.state.data)===void 0)l(!0),k();else{const Y=f();if(!Y)return;Xe({type:"TRIGGER_LOADING",queryHash:Y.queryHash});const me=Y.options;Y.fetch({...me,queryFn:()=>new Promise(()=>{}),gcTime:-1}),Y.setState({data:void 0,status:"pending",fetchMeta:{...Y.state.fetchMeta,__previousQueryOptions:me}})}},E(_e,()=>p()==="pending"?"Restore":"Trigger",At),E(Ae,y(K,{get when(){return c().length===0||p()==="error"},get children(){var F=d0(),Y=F.firstChild,me=Y.nextSibling;return F.$$click=()=>{var le,re;f().state.error?(Xe({type:"RESTORE_ERROR",queryHash:(le=f())==null?void 0:le.queryHash}),s.resetQueries({queryKey:(re=f())==null?void 0:re.queryKey})):O()},E(F,()=>p()==="error"?"Restore":"Trigger",me),G(le=>{var re=L(t`
                  color: ${o(r.red[500],r.red[400])};
                `,"tsqd-query-details-actions-btn","tsqd-query-details-action-error"),ue=p()==="pending",be=t`
                  background-color: ${o(r.red[500],r.red[400])};
                `;return re!==le.e&&q(F,le.e=re),ue!==le.t&&(F.disabled=le.t=ue),be!==le.a&&q(Y,le.a=be),le},{e:void 0,t:void 0,a:void 0}),F}}),null),E(Ae,y(K,{get when(){return!(c().length===0||p()==="error")},get children(){var F=f0(),Y=F.firstChild,me=Y.nextSibling,le=me.nextSibling;return le.firstChild,le.addEventListener("change",re=>{const ue=c().find(be=>be.name===re.currentTarget.value);O(ue)}),E(le,y(Ps,{get each(){return c()},children:re=>(()=>{var ue=y0();return E(ue,()=>re.name),G(()=>ue.value=re.name),ue})()}),null),E(F,y(Nt,{}),null),G(re=>{var ue=L(n().actionsSelect,"tsqd-query-details-actions-btn","tsqd-query-details-action-error-multiple"),be=t`
                  background-color: ${S.colors.red[400]};
                `,oe=p()==="pending";return ue!==re.e&&q(F,re.e=ue),be!==re.t&&q(Y,re.t=be),oe!==re.a&&(le.disabled=re.a=oe),re},{e:void 0,t:void 0,a:void 0}),F}}),null),E(nt,()=>i()==="view"?"Explorer":"Editor",null),E(C,y(K,{get when(){return i()==="view"},get children(){var F=g0();return E(F,y(xt,{label:"Data",defaultExpanded:["Data"],get value(){return v()},editable:!0,onEdit:()=>u("edit"),get activeQuery(){return f()}})),G(Y=>wt(F,"padding",S.size[2])),F}}),Ye),E(C,y(K,{get when(){return i()==="edit"},get children(){var F=h0(),Y=F.firstChild,me=Y.nextSibling,le=me.firstChild,re=le.nextSibling,ue=re.firstChild,be=ue.nextSibling;return F.addEventListener("submit",oe=>{oe.preventDefault();const ot=new FormData(oe.currentTarget).get("data");try{const Ve=JSON.parse(ot);f().setState({...f().state,data:Ve}),u("view")}catch{d(!0)}}),Y.addEventListener("focus",()=>d(!1)),E(le,()=>h()?"Invalid Value":""),ue.$$click=()=>u("view"),G(oe=>{var rt=L(n().devtoolsEditForm,"tsqd-query-details-data-editor"),ot=n().devtoolsEditTextarea,Ve=h(),Mt=n().devtoolsEditFormActions,it=n().devtoolsEditFormError,Tt=n().devtoolsEditFormActionContainer,st=L(n().devtoolsEditFormAction,t`
                      color: ${o(r.gray[600],r.gray[300])};
                    `),pt=L(n().devtoolsEditFormAction,t`
                      color: ${o(r.blue[600],r.blue[400])};
                    `);return rt!==oe.e&&q(F,oe.e=rt),ot!==oe.t&&q(Y,oe.t=ot),Ve!==oe.a&&T(Y,"data-error",oe.a=Ve),Mt!==oe.o&&q(me,oe.o=Mt),it!==oe.i&&q(le,oe.i=it),Tt!==oe.n&&q(re,oe.n=Tt),st!==oe.s&&q(ue,oe.s=st),pt!==oe.h&&q(be,oe.h=pt),oe},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0}),G(()=>Y.value=JSON.stringify(v(),null,2)),F}}),Ye),E(bt,y(xt,{label:"Query",defaultExpanded:["Query","queryKey"],get value(){return g()}})),G(F=>{var Y=L(n().detailsContainer,"tsqd-query-details-container"),me=L(n().detailsHeader,"tsqd-query-details-header"),le=L(n().detailsBody,"tsqd-query-details-summary-container"),re=L(n().queryDetailsStatus,_()),ue=L(n().detailsHeader,"tsqd-query-details-header"),be=L(n().actionsBody,"tsqd-query-details-actions-container"),oe=L(t`
                color: ${o(r.blue[600],r.blue[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-refetch"),rt=b()==="fetching",ot=t`
                background-color: ${o(r.blue[600],r.blue[400])};
              `,Ve=L(t`
                color: ${o(r.yellow[600],r.yellow[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-invalidate"),Mt=p()==="pending",it=t`
                background-color: ${o(r.yellow[600],r.yellow[400])};
              `,Tt=L(t`
                color: ${o(r.gray[600],r.gray[300])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-reset"),st=p()==="pending",pt=t`
                background-color: ${o(r.gray[600],r.gray[400])};
              `,bn=L(t`
                color: ${o(r.pink[500],r.pink[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-remove"),Xt=b()==="fetching",pn=t`
                background-color: ${o(r.pink[500],r.pink[400])};
              `,Pt=L(t`
                color: ${o(r.cyan[500],r.cyan[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-loading"),wn=a(),Zt=t`
                background-color: ${o(r.cyan[500],r.cyan[400])};
              `,Jt=L(n().detailsHeader,"tsqd-query-details-header"),en=L(n().detailsHeader,"tsqd-query-details-header"),tn=S.size[2];return Y!==F.e&&q(C,F.e=Y),me!==F.t&&q(A,F.t=me),le!==F.a&&q(R,F.a=le),re!==F.o&&q(ae,F.o=re),ue!==F.i&&q(ve,F.i=ue),be!==F.n&&q(Ae,F.n=be),oe!==F.s&&q(M,F.s=oe),rt!==F.h&&(M.disabled=F.h=rt),ot!==F.r&&q(he,F.r=ot),Ve!==F.d&&q(ne,F.d=Ve),Mt!==F.l&&(ne.disabled=F.l=Mt),it!==F.u&&q(yt,F.u=it),Tt!==F.c&&q(j,F.c=Tt),st!==F.w&&(j.disabled=F.w=st),pt!==F.m&&q(Se,F.m=pt),bn!==F.f&&q(ke,F.f=bn),Xt!==F.y&&(ke.disabled=F.y=Xt),pn!==F.g&&q(It,F.g=pn),Pt!==F.p&&q(_e,F.p=Pt),wn!==F.b&&(_e.disabled=F.b=wn),Zt!==F.T&&q(mt,F.T=Zt),Jt!==F.A&&q(nt,F.A=Jt),en!==F.O&&q(Ye,F.O=en),tn!==F.I&&wt(bt,"padding",F.I=tn),F},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0,T:void 0,A:void 0,O:void 0,I:void 0}),C}})},D0=()=>{const e=Ce(),t=H().shadowDOMTarget?X.bind({target:H().shadowDOMTarget}):X,n=I(()=>e()==="dark"?Qe(t):We(t)),{colors:r}=S,o=(h,d)=>e()==="dark"?d:h,s=Ge(h=>{const c=h().getAll().find(f=>f.mutationId===$t());return c?c.state.isPaused:!1}),a=Ge(h=>{const c=h().getAll().find(f=>f.mutationId===$t());return c?c.state.status:"idle"}),l=I(()=>Bt({isPaused:s(),status:a()})),i=Ge(h=>h().getAll().find(d=>d.mutationId===$t()),!1),u=()=>l()==="gray"?t`
        background-color: ${o(r[l()][200],r[l()][700])};
        color: ${o(r[l()][700],r[l()][300])};
        border-color: ${o(r[l()][400],r[l()][600])};
      `:t`
      background-color: ${o(r[l()][100],r[l()][900])};
      color: ${o(r[l()][700],r[l()][300])};
      border-color: ${o(r[l()][400],r[l()][600])};
    `;return y(K,{get when(){return i()},get children(){var h=m0(),d=h.firstChild,c=d.nextSibling,f=c.firstChild,g=f.firstChild,m=g.firstChild,v=g.nextSibling,b=f.nextSibling,p=b.firstChild,w=p.nextSibling,x=c.nextSibling,$=x.nextSibling,O=$.nextSibling,k=O.nextSibling,_=k.nextSibling,C=_.nextSibling,A=C.nextSibling,R=A.nextSibling;return E(m,y(K,{get when(){return i().options.mutationKey},fallback:"No mutationKey found",get children(){return En(i().options.mutationKey,!0)}})),E(v,y(K,{get when(){return l()==="purple"},children:"pending"}),null),E(v,y(K,{get when(){return l()!=="purple"},get children(){return a()}}),null),E(w,()=>new Date(i().state.submittedAt).toLocaleTimeString()),E($,y(xt,{label:"Variables",defaultExpanded:["Variables"],get value(){return i().state.variables}})),E(k,y(xt,{label:"Context",defaultExpanded:["Context"],get value(){return i().state.context}})),E(C,y(xt,{label:"Data",defaultExpanded:["Data"],get value(){return i().state.data}})),E(R,y(xt,{label:"Mutation",defaultExpanded:["Mutation"],get value(){return i()}})),G(N=>{var J=L(n().detailsContainer,"tsqd-query-details-container"),te=L(n().detailsHeader,"tsqd-query-details-header"),ae=L(n().detailsBody,"tsqd-query-details-summary-container"),z=L(n().queryDetailsStatus,u()),Q=L(n().detailsHeader,"tsqd-query-details-header"),ee=S.size[2],ce=L(n().detailsHeader,"tsqd-query-details-header"),ye=S.size[2],Te=L(n().detailsHeader,"tsqd-query-details-header"),ve=S.size[2],Ae=L(n().detailsHeader,"tsqd-query-details-header"),M=S.size[2];return J!==N.e&&q(h,N.e=J),te!==N.t&&q(d,N.t=te),ae!==N.a&&q(c,N.a=ae),z!==N.o&&q(v,N.o=z),Q!==N.i&&q(x,N.i=Q),ee!==N.n&&wt($,"padding",N.n=ee),ce!==N.s&&q(O,N.s=ce),ye!==N.h&&wt(k,"padding",N.h=ye),Te!==N.r&&q(_,N.r=Te),ve!==N.d&&wt(C,"padding",N.d=ve),Ae!==N.l&&q(A,N.l=Ae),M!==N.u&&wt(R,"padding",N.u=M),N},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0}),h}})},Fn=new Map,A0=()=>{const e=I(()=>H().client.getQueryCache()),t=e().subscribe(n=>{_s(()=>{for(const[r,o]of Fn.entries())o.shouldUpdate(n)&&o.setter(r(e))})});return U(()=>{Fn.clear(),t()}),t},pe=(e,t=!0,n=()=>!0)=>{const r=I(()=>H().client.getQueryCache()),[o,s]=B(e(r),t?void 0:{equals:!1});return V(()=>{s(e(r))}),Fn.set(e,{setter:s,shouldUpdate:n}),U(()=>{Fn.delete(e)}),o},On=new Map,M0=()=>{const e=I(()=>H().client.getMutationCache()),t=e().subscribe(()=>{for(const[n,r]of On.entries())queueMicrotask(()=>{r(n(e))})});return U(()=>{On.clear(),t()}),t},Ge=(e,t=!0)=>{const n=I(()=>H().client.getMutationCache()),[r,o]=B(e(n),t?void 0:{equals:!1});return V(()=>{o(e(n))}),On.set(e,o),U(()=>{On.delete(e)}),r},T0="@tanstack/query-devtools-event",Xe=({type:e,queryHash:t,metadata:n})=>{const r=new CustomEvent(T0,{detail:{type:e,queryHash:t,metadata:n},bubbles:!0,cancelable:!0});window.dispatchEvent(r)},As=(e,t)=>{const{colors:n,font:r,size:o,alpha:s,shadow:a,border:l}=S,i=(u,h)=>e==="light"?u:h;return{devtoolsBtn:t`
      z-index: 100000;
      position: fixed;
      padding: 4px;
      text-align: left;

      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      box-shadow: ${a.md()};
      overflow: hidden;

      & div {
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border-radius: 9999px;

        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        filter: blur(6px) saturate(1.2) contrast(1.1);
      }

      &:focus-within {
        outline-offset: 2px;
        outline: 3px solid ${n.green[600]};
      }

      & button {
        position: relative;
        z-index: 1;
        padding: 0;
        border-radius: 9999px;
        background-color: transparent;
        border: none;
        height: 40px;
        display: flex;
        width: 40px;
        overflow: hidden;
        cursor: pointer;
        outline: none;
        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
      }
    `,panel:t`
      position: fixed;
      z-index: 9999;
      display: flex;
      gap: ${S.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${i(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${i(n.gray[400],n.darkGray[300])};
      }
    `,parentPanel:t`
      z-index: 9999;
      display: flex;
      height: 100%;
      gap: ${S.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${i(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${i(n.gray[400],n.darkGray[300])};
      }
    `,"devtoolsBtn-position-bottom-right":t`
      bottom: 12px;
      right: 12px;
    `,"devtoolsBtn-position-bottom-left":t`
      bottom: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-left":t`
      top: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-right":t`
      top: 12px;
      right: 12px;
    `,"devtoolsBtn-position-relative":t`
      position: relative;
    `,"panel-position-top":t`
      top: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${o[14]};
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-bottom":t`
      bottom: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${o[14]};
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-right":t`
      bottom: 0;
      right: 0;
      top: 0;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,"panel-position-left":t`
      bottom: 0;
      left: 0;
      top: 0;
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,closeBtn:t`
      position: absolute;
      cursor: pointer;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline: 2px solid ${n.blue[600]};
      }
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
        width: ${o[2]};
        height: ${o[2]};
      }
    `,"closeBtn-position-top":t`
      bottom: 0;
      right: ${o[2]};
      transform: translate(0, 100%);
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: none;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px 0px ${l.radius.sm} ${l.radius.sm};
      padding: ${o[.5]} ${o[1.5]} ${o[1]} ${o[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        bottom: 100%;
        left: -${o[2.5]};
        height: ${o[1.5]};
        width: calc(100% + ${o[5]});
      }

      & svg {
        transform: rotate(180deg);
      }
    `,"closeBtn-position-bottom":t`
      top: 0;
      right: ${o[2]};
      transform: translate(0, -100%);
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: none;
      border-radius: ${l.radius.sm} ${l.radius.sm} 0px 0px;
      padding: ${o[1]} ${o[1.5]} ${o[.5]} ${o[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        top: 100%;
        left: -${o[2.5]};
        height: ${o[1.5]};
        width: calc(100% + ${o[5]});
      }
    `,"closeBtn-position-right":t`
      bottom: ${o[2]};
      left: 0;
      transform: translate(-100%, 0);
      border-right: none;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: ${l.radius.sm} 0px 0px ${l.radius.sm};
      padding: ${o[1.5]} ${o[.5]} ${o[1.5]} ${o[1]};

      &::after {
        content: ' ';
        position: absolute;
        left: 100%;
        height: calc(100% + ${o[5]});
        width: ${o[1.5]};
      }

      & svg {
        transform: rotate(-90deg);
      }
    `,"closeBtn-position-left":t`
      bottom: ${o[2]};
      right: 0;
      transform: translate(100%, 0);
      border-left: none;
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px ${l.radius.sm} ${l.radius.sm} 0px;
      padding: ${o[1.5]} ${o[1]} ${o[1.5]} ${o[.5]};

      &::after {
        content: ' ';
        position: absolute;
        right: 100%;
        height: calc(100% + ${o[5]});
        width: ${o[1.5]};
      }

      & svg {
        transform: rotate(90deg);
      }
    `,queriesContainer:t`
      flex: 1 1 700px;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      display: flex;
      flex-direction: column;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
    `,dragHandle:t`
      position: absolute;
      transition: background-color 0.125s ease;
      &:hover {
        background-color: ${n.purple[400]}${i("",s[90])};
      }
      &:focus {
        outline: none;
        background-color: ${n.purple[400]}${i("",s[90])};
      }
      &:focus-visible {
        outline: 2px solid ${n.blue[800]};
        outline-offset: -2px;
        background-color: ${n.purple[400]}${i("",s[90])};
      }
      z-index: 4;
    `,"dragHandle-position-top":t`
      bottom: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-bottom":t`
      top: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-right":t`
      left: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,"dragHandle-position-left":t`
      right: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,row:t`
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${S.size[2]} ${S.size[2.5]};
      gap: ${S.size[2.5]};
      border-bottom: ${i(n.gray[300],n.darkGray[500])} 1px solid;
      align-items: center;
      & > button {
        padding: 0;
        background: transparent;
        border: none;
        display: flex;
        gap: ${o[.5]};
        flex-direction: column;
      }
    `,logoAndToggleContainer:t`
      display: flex;
      gap: ${S.size[3]};
      align-items: center;
    `,logo:t`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      gap: ${S.size[.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
      &:focus-visible {
        outline-offset: 4px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,tanstackLogo:t`
      font-size: ${r.size.md};
      font-weight: ${r.weight.bold};
      line-height: ${r.lineHeight.xs};
      white-space: nowrap;
      color: ${i(n.gray[600],n.gray[300])};
    `,queryFlavorLogo:t`
      font-weight: ${r.weight.semibold};
      font-size: ${r.size.xs};
      background: linear-gradient(
        to right,
        ${i("#ea4037, #ff9b11","#dd524b, #e9a03b")}
      );
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,queryStatusContainer:t`
      display: flex;
      gap: ${S.size[2]};
      height: min-content;
    `,queryStatusTag:t`
      display: flex;
      gap: ${S.size[1.5]};
      box-sizing: border-box;
      height: ${S.size[6.5]};
      background: ${i(n.gray[50],n.darkGray[500])};
      color: ${i(n.gray[700],n.gray[300])};
      border-radius: ${S.border.radius.sm};
      font-size: ${r.size.sm};
      padding: ${S.size[1]};
      padding-left: ${S.size[1.5]};
      align-items: center;
      font-weight: ${r.weight.medium};
      border: ${i("1px solid "+n.gray[300],"1px solid transparent")};
      user-select: none;
      position: relative;
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
    `,queryStatusTagLabel:t`
      font-size: ${r.size.xs};
    `,queryStatusCount:t`
      font-size: ${r.size.xs};
      padding: 0 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${i(n.gray[500],n.gray[400])};
      background-color: ${i(n.gray[200],n.darkGray[300])};
      border-radius: 2px;
      font-variant-numeric: tabular-nums;
      height: ${S.size[4.5]};
    `,statusTooltip:t`
      position: absolute;
      z-index: 1;
      background-color: ${i(n.gray[50],n.darkGray[500])};
      top: 100%;
      left: 50%;
      transform: translate(-50%, calc(${S.size[2]}));
      padding: ${S.size[.5]} ${S.size[2]};
      border-radius: ${S.border.radius.sm};
      font-size: ${r.size.xs};
      border: 1px solid ${i(n.gray[400],n.gray[600])};
      color: ${i(n.gray[600],n.gray[300])};

      &::before {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, -100%);
        position: absolute;
        border-color: transparent transparent
          ${i(n.gray[400],n.gray[600])} transparent;
        border-style: solid;
        border-width: 7px;
        /* transform: rotate(180deg); */
      }

      &::after {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, calc(-100% + 2px));
        position: absolute;
        border-color: transparent transparent
          ${i(n.gray[100],n.darkGray[500])} transparent;
        border-style: solid;
        border-width: 7px;
      }
    `,filtersContainer:t`
      display: flex;
      gap: ${S.size[2]};
      & > button {
        cursor: pointer;
        padding: ${S.size[.5]} ${S.size[1.5]} ${S.size[.5]}
          ${S.size[2]};
        border-radius: ${S.border.radius.sm};
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: 1px solid ${i(n.gray[300],n.darkGray[200])};
        color: ${i(n.gray[700],n.gray[300])};
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        line-height: ${r.lineHeight.sm};
        gap: ${S.size[1.5]};
        max-width: 160px;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${l.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        & svg {
          width: ${S.size[3]};
          height: ${S.size[3]};
          color: ${i(n.gray[500],n.gray[400])};
        }
      }
    `,filterInput:t`
      padding: ${o[.5]} ${o[2]};
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      display: flex;
      box-sizing: content-box;
      align-items: center;
      gap: ${S.size[1.5]};
      max-width: 160px;
      min-width: 100px;
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      height: min-content;
      color: ${i(n.gray[600],n.gray[400])};
      & > svg {
        width: ${o[3]};
        height: ${o[3]};
      }
      & input {
        font-size: ${r.size.xs};
        width: 100%;
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: none;
        padding: 0;
        line-height: ${r.lineHeight.sm};
        color: ${i(n.gray[700],n.gray[300])};
        &::placeholder {
          color: ${i(n.gray[700],n.gray[300])};
        }
        &:focus {
          outline: none;
        }
      }

      &:focus-within {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,filterSelect:t`
      padding: ${S.size[.5]} ${S.size[2]};
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      display: flex;
      align-items: center;
      gap: ${S.size[1.5]};
      box-sizing: content-box;
      max-width: 160px;
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      height: min-content;
      & > svg {
        color: ${i(n.gray[600],n.gray[400])};
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
      & > select {
        appearance: none;
        color: ${i(n.gray[700],n.gray[300])};
        min-width: 100px;
        line-height: ${r.lineHeight.sm};
        font-size: ${r.size.xs};
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: none;
        &:focus {
          outline: none;
        }
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsContainer:t`
      display: flex;
      gap: ${S.size[2]};
    `,actionsBtn:t`
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      width: ${S.size[6.5]};
      height: ${S.size[6.5]};
      justify-content: center;
      display: flex;
      align-items: center;
      gap: ${S.size[1.5]};
      max-width: 160px;
      cursor: pointer;
      padding: 0;
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      & svg {
        color: ${i(n.gray[700],n.gray[300])};
        width: ${S.size[3]};
        height: ${S.size[3]};
      }
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsBtnOffline:t`
      & svg {
        stroke: ${i(n.yellow[700],n.yellow[500])};
        fill: ${i(n.yellow[700],n.yellow[500])};
      }
    `,overflowQueryContainer:t`
      flex: 1;
      overflow-y: auto;
      & > div {
        display: flex;
        flex-direction: column;
      }
    `,queryRow:t`
      display: flex;
      align-items: center;
      padding: 0;
      border: none;
      cursor: pointer;
      color: ${i(n.gray[700],n.gray[300])};
      background-color: ${i(n.gray[50],n.darkGray[700])};
      line-height: 1;
      &:focus {
        outline: none;
      }
      &:focus-visible {
        outline-offset: -2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover .tsqd-query-hash {
        background-color: ${i(n.gray[200],n.darkGray[600])};
      }

      & .tsqd-query-observer-count {
        padding: 0 ${S.size[1]};
        user-select: none;
        min-width: ${S.size[6.5]};
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${r.size.xs};
        font-weight: ${r.weight.medium};
        border-bottom-width: 1px;
        border-bottom-style: solid;
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[700])};
      }
      & .tsqd-query-hash {
        user-select: text;
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        min-height: ${S.size[6]};
        flex: 1;
        padding: ${S.size[1]} ${S.size[2]};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
        text-align: left;
        text-overflow: clip;
        word-break: break-word;
      }

      & .tsqd-query-disabled-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${S.size[2]};
        color: ${i(n.gray[800],n.gray[300])};
        background-color: ${i(n.gray[300],n.darkGray[600])};
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
        font-size: ${r.size.xs};
      }

      & .tsqd-query-static-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${S.size[2]};
        color: ${i(n.teal[800],n.teal[300])};
        background-color: ${i(n.teal[100],n.teal[900])};
        border-bottom: 1px solid ${i(n.teal[300],n.teal[700])};
        font-size: ${r.size.xs};
      }
    `,selectedQueryRow:t`
      background-color: ${i(n.gray[200],n.darkGray[500])};
    `,detailsContainer:t`
      flex: 1 1 700px;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      color: ${i(n.gray[700],n.gray[300])};
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      display: flex;
      text-align: left;
    `,detailsHeader:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: ${i(n.gray[200],n.darkGray[600])};
      padding: ${S.size[1.5]} ${S.size[2]};
      font-weight: ${r.weight.medium};
      font-size: ${r.size.xs};
      line-height: ${r.lineHeight.xs};
      text-align: left;
    `,detailsBody:t`
      margin: ${S.size[1.5]} 0px ${S.size[2]} 0px;
      & > div {
        display: flex;
        align-items: stretch;
        padding: 0 ${S.size[2]};
        line-height: ${r.lineHeight.sm};
        justify-content: space-between;
        & > span {
          font-size: ${r.size.xs};
        }
        & > span:nth-child(2) {
          font-variant-numeric: tabular-nums;
        }
      }

      & > div:first-child {
        margin-bottom: ${S.size[1.5]};
      }

      & code {
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        margin: 0;
        font-size: ${r.size.xs};
        line-height: ${r.lineHeight.xs};
        max-width: 100%;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      & pre {
        margin: 0;
        display: flex;
        align-items: center;
      }
    `,queryDetailsStatus:t`
      border: 1px solid ${n.darkGray[200]};
      border-radius: ${S.border.radius.sm};
      font-weight: ${r.weight.medium};
      padding: ${S.size[1]} ${S.size[2.5]};
    `,actionsBody:t`
      flex-wrap: wrap;
      margin: ${S.size[2]} 0px ${S.size[2]} 0px;
      display: flex;
      gap: ${S.size[2]};
      padding: 0px ${S.size[2]};
      & > button {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
        font-size: ${r.size.xs};
        padding: ${S.size[1]} ${S.size[2]};
        display: flex;
        border-radius: ${S.border.radius.sm};
        background-color: ${i(n.gray[100],n.darkGray[600])};
        border: 1px solid ${i(n.gray[300],n.darkGray[400])};
        align-items: center;
        gap: ${S.size[2]};
        font-weight: ${r.weight.medium};
        line-height: ${r.lineHeight.xs};
        cursor: pointer;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${l.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        &:hover {
          background-color: ${i(n.gray[200],n.darkGray[500])};
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        & > span {
          width: ${o[1.5]};
          height: ${o[1.5]};
          border-radius: ${S.border.radius.full};
        }
      }
    `,actionsSelect:t`
      font-size: ${r.size.xs};
      padding: ${S.size[.5]} ${S.size[2]};
      display: flex;
      border-radius: ${S.border.radius.sm};
      overflow: hidden;
      background-color: ${i(n.gray[100],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${S.size[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.sm};
      color: ${i(n.red[500],n.red[400])};
      cursor: pointer;
      position: relative;
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      & > span {
        width: ${o[1.5]};
        height: ${o[1.5]};
        border-radius: ${S.border.radius.full};
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      & select {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        appearance: none;
        background-color: transparent;
        border: none;
        color: transparent;
        outline: none;
      }

      & svg path {
        stroke: ${S.colors.red[400]};
      }
      & svg {
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
    `,settingsMenu:t`
      display: flex;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
      flex-direction: column;
      gap: ${o[.5]};
      border-radius: ${S.border.radius.sm};
      border: 1px solid ${i(n.gray[300],n.gray[700])};
      background-color: ${i(n.gray[50],n.darkGray[600])};
      font-size: ${r.size.xs};
      color: ${i(n.gray[700],n.gray[300])};
      z-index: 99999;
      min-width: 120px;
      padding: ${o[.5]};
    `,settingsSubTrigger:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: ${S.border.radius.xs};
      padding: ${S.size[1]} ${S.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      color: ${i(n.gray[700],n.gray[300])};
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
        transform: rotate(-90deg);
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
      &.data-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,settingsMenuHeader:t`
      padding: ${S.size[1]} ${S.size[1]};
      font-weight: ${r.weight.medium};
      border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
      color: ${i(n.gray[500],n.gray[400])};
      font-size: ${r.size.xs};
    `,settingsSubButton:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: ${i(n.gray[700],n.gray[300])};
      font-size: ${r.size.xs};
      border-radius: ${S.border.radius.xs};
      padding: ${S.size[1]} ${S.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
      &[data-checked] {
        background-color: ${i(n.purple[100],n.purple[900])};
        color: ${i(n.purple[700],n.purple[300])};
        & svg {
          color: ${i(n.purple[700],n.purple[300])};
        }
        &:hover {
          background-color: ${i(n.purple[100],n.purple[900])};
        }
      }
    `,viewToggle:t`
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[200],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      display: flex;
      padding: 0;
      font-size: ${r.size.xs};
      color: ${i(n.gray[700],n.gray[300])};
      overflow: hidden;

      &:has(:focus-visible) {
        outline: 2px solid ${n.blue[800]};
      }

      & .tsqd-radio-toggle {
        opacity: 0.5;
        display: flex;
        & label {
          display: flex;
          align-items: center;
          cursor: pointer;
          line-height: ${r.lineHeight.md};
        }

        & label:hover {
          background-color: ${i(n.gray[100],n.darkGray[500])};
        }
      }

      & > [data-checked] {
        opacity: 1;
        background-color: ${i(n.gray[100],n.darkGray[400])};
        & label:hover {
          background-color: ${i(n.gray[100],n.darkGray[400])};
        }
      }

      & .tsqd-radio-toggle:first-child {
        & label {
          padding: 0 ${S.size[1.5]} 0 ${S.size[2]};
        }
        border-right: 1px solid ${i(n.gray[300],n.darkGray[200])};
      }

      & .tsqd-radio-toggle:nth-child(2) {
        & label {
          padding: 0 ${S.size[2]} 0 ${S.size[1.5]};
        }
      }
    `,devtoolsEditForm:t`
      padding: ${o[2]};
      & > [data-error='true'] {
        outline: 2px solid ${i(n.red[200],n.red[800])};
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
      }
    `,devtoolsEditTextarea:t`
      width: 100%;
      max-height: 500px;
      font-family: 'Fira Code', monospace;
      font-size: ${r.size.xs};
      border-radius: ${l.radius.sm};
      field-sizing: content;
      padding: ${o[2]};
      background-color: ${i(n.gray[100],n.darkGray[800])};
      color: ${i(n.gray[900],n.gray[100])};
      border: 1px solid ${i(n.gray[200],n.gray[700])};
      resize: none;
      &:focus {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${i(n.blue[200],n.blue[800])};
      }
    `,devtoolsEditFormActions:t`
      display: flex;
      justify-content: space-between;
      gap: ${o[2]};
      align-items: center;
      padding-top: ${o[1]};
      font-size: ${r.size.xs};
    `,devtoolsEditFormError:t`
      color: ${i(n.red[700],n.red[500])};
    `,devtoolsEditFormActionContainer:t`
      display: flex;
      gap: ${o[2]};
    `,devtoolsEditFormAction:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      font-size: ${r.size.xs};
      padding: ${o[1]} ${S.size[2]};
      display: flex;
      border-radius: ${l.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${o[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.xs};
      cursor: pointer;
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${l.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `}},We=e=>As("light",e),Qe=e=>As("dark",e);gr(["click","mousedown","keydown","input"]);var q0=e=>{const[t,n]=na({prefix:"TanstackQueryDevtools"}),r=Ws(),o=I(()=>{const s=e.theme||t.theme_preference||sa;return s!=="system"?s:r()});return y(Xo.Provider,{value:e,get children(){return y(da,{localStore:t,setLocalStore:n,get children(){return y(Jo.Provider,{value:o,get children(){return y(p0,{localStore:t,setLocalStore:n})}})}})}})},L0=q0;export{L0 as default};
