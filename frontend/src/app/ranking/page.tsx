"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import api from "@/lib/api";

interface RC { id:string;name:string;city:string;photoUrl:string;totalVotes:number;rank:number; }

export default function RankingPage() {
  const [miss,setMiss]   = useState<RC[]>([]);
  const [master,setMaster] = useState<RC[]>([]);
  const [tab,setTab]     = useState<"MISS"|"MASTER">("MISS");
  const [live,setLive]   = useState(false);
  const [lastUpdate,setLastUpdate] = useState<string|null>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL||"http://localhost:5000/api").replace("/api","");

  useEffect(()=>{
    api.get("/ranking?type=MISS").then(r=>setMiss(r.data.data||[]));
    api.get("/ranking?type=MASTER").then(r=>setMaster(r.data.data||[]));
    const socket:Socket = io(process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:5000",{transports:["websocket"]});
    socket.on("connect",()=>{setLive(true);socket.emit("join:ranking");});
    socket.on("disconnect",()=>setLive(false));
    socket.on("ranking:update",(d)=>{
      setMiss(d.miss||[]);setMaster(d.master||[]);
      setLastUpdate(new Date(d.updatedAt).toLocaleTimeString("fr-FR"));
    });
    return ()=>{ socket.disconnect(); };
  },[]);

  const current = tab==="MISS" ? miss : master;
  const medals  = ["🥇","🥈","🥉"];

  const S:Record<string,React.CSSProperties> = {
    page:{minHeight:"100vh"},
    wrap:{paddingTop:65,paddingBottom:45,padding:"65px 25px 45px",maxWidth:900,margin:"0 auto",position:"relative",zIndex:1},
    header:{textAlign:"center",marginBottom:28},
    title:{fontFamily:"var(--font-display)",fontSize:"clamp(1.8rem,5vw,3.2rem)",fontWeight:300,letterSpacing:"-0.01em",marginBottom:8},
    livePill:{display:"inline-flex",alignItems:"center",gap:6,fontSize:"0.65rem",color:live?"#4CAF50":"var(--text-muted)",letterSpacing:"0.1em"},
    tabs:{display:"flex",gap:6,justifyContent:"center",marginBottom:28},
    podium:{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:10,marginBottom:32,height:120},
    podiumItem:{
      flex:1,maxWidth:120,
      background:"var(--glass)",border:"1px solid var(--border)",
      borderRadius:"12px 12px 0 0",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",
      paddingBottom:10,position:"relative",overflow:"hidden",backdropFilter:"blur(10px)",
    },
    list:{display:"flex",flexDirection:"column",gap:8},
    row:{
      display:"grid",gridTemplateColumns:"42px 42px 1fr auto auto",alignItems:"center",gap:10,
      padding:"11px 14px",
      background:"var(--glass)",border:"1px solid var(--border)",
      borderRadius:12,backdropFilter:"blur(10px)",
      transition:"border-color .2s,transform .2s",
    },
    avatar:{
      width:38,height:38,borderRadius:"50%",
      background:"linear-gradient(135deg,var(--bg3),var(--bg2))",
      border:"1px solid var(--border)",overflow:"hidden",position:"relative",
    },
    votes:{textAlign:"right"},
    votesVal:{fontFamily:"var(--font-display)",fontSize:"0.95rem",fontWeight:600,color:"var(--gold-light)"},
    votesLabel:{fontSize:"0.6rem",color:"var(--text-muted)"},
    voteBtn:{
      padding:"6px 12px",background:"transparent",
      border:"1px solid rgba(201,147,42,.3)",color:"var(--gold)",
      borderRadius:100,fontSize:"0.7rem",cursor:"pointer",
      transition:"all .2s",whiteSpace:"nowrap",fontFamily:"var(--font-body)",
      textDecoration:"none",display:"inline-block",
    },
  };

  return (
    <div style={{ ...S.page, display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ ...S.wrap, flex: 1, width: "100%" }}>
        <div style={S.header}>
          <div className="section-tag">Mis à jour en direct</div>
          <h1 style={S.title} className="text-gold-gradient">Classement</h1>
          <div style={S.livePill}>
            <span className="live-dot" />
            {live ? `Temps réel${lastUpdate?` · ${lastUpdate}`:""}` : "Hors ligne"}
          </div>
        </div>

        <div style={S.tabs}>
          {(["MISS","MASTER"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`tab-pill${tab===t?" active":""}`}>
              {t==="MISS"?"♛ Miss":"♚ Master"}
            </button>
          ))}
        </div>

        {/* Podium TOP 3 */}
        {current.length>=3 && (
          <div style={S.podium}>
            {[current[1],current[0],current[2]].map((c,i)=>{
              const heights=["112px","144px","96px"];
              const ranks=[2,1,3];
              const photo = c.photoUrl?.startsWith("http")?c.photoUrl:`${apiBase}${c.photoUrl}`;
              return (
                <div key={c.id} style={{...S.podiumItem,height:heights[i]}}>
                  <div style={{position:"absolute",inset:0,opacity:.15}}>
                    <Image src={photo} alt={c.name} fill style={{objectFit:"cover"}} onError={(e:any)=>{e.target.src="/placeholder.jpg";}} />
                  </div>
                  <div className={`rank-${ranks[i]}`} style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700,marginBottom:6,position:"relative",zIndex:1}}>{ranks[i]}</div>
                  <p style={{fontFamily:"var(--font-body)",fontSize:"0.75rem",fontWeight:500,textAlign:"center",padding:"0 8px",textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap",maxWidth:"100%",color:"var(--text)",position:"relative",zIndex:1}}>{c.name.split(" ")[0]}</p>
                  <p style={{fontSize:"0.7rem",color:"var(--gold-pale)",position:"relative",zIndex:1}}>{c.totalVotes.toLocaleString("fr-FR")}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div style={S.list}>
          {current.map((c,i)=>{
            const photo = c.photoUrl?.startsWith("http")?c.photoUrl:`${apiBase}${c.photoUrl}`;
            return (
              <div key={c.id} style={{
                ...S.row,
                ...(i===0?{borderColor:"rgba(255,215,0,.3)",background:"rgba(255,215,0,.04)"}:
                   i===1?{borderColor:"rgba(192,192,192,.2)"}:
                   i===2?{borderColor:"rgba(205,127,50,.25)"}:{})
              }}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor="rgba(201,147,42,.3)";(e.currentTarget as HTMLDivElement).style.transform="translateX(4px)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=i===0?"rgba(255,215,0,.3)":i===1?"rgba(192,192,192,.2)":i===2?"rgba(205,127,50,.25)":"var(--border)";(e.currentTarget as HTMLDivElement).style.transform="";}}
              >
                <div style={{fontFamily:"var(--font-display)",fontSize:"1.3rem",fontWeight:700,textAlign:"center",color:i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"var(--text-muted)"}}>
                  {i<3?medals[i]:c.rank}
                </div>
                <div style={S.avatar}>
                  <Image src={photo} alt={c.name} fill style={{objectFit:"cover"}} onError={(e:any)=>{e.target.src="/placeholder.jpg";}} />
                </div>
                <div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:"1rem",fontWeight:600,color:"var(--text)"}}>{c.name}</div>
                  <div style={{fontSize:"0.72rem",color:"var(--text-muted)"}}>📍 {c.city}</div>
                </div>
                <div style={S.votes}>
                  <div style={S.votesLabel}>votes</div>
                  <div style={S.votesVal}>{c.totalVotes.toLocaleString("fr-FR")}</div>
                </div>
                <Link href={`/vote/${c.id}`} style={S.voteBtn}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(201,147,42,.1)";(e.currentTarget as HTMLElement).style.borderColor="var(--gold)";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.borderColor="rgba(201,147,42,.3)";}}
                >Voter →</Link>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
