"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpaceType = "start" | "property" | "event" | "tax" | "stock" | "bonus";
type Phase = "roll" | "decision" | "manage" | "gameover";
type Player = { name:string; ai:boolean; color:string; cash:number; pos:number; properties:number[]; holdings:Record<string,number>; remoteId?:string };
type Stock = { symbol:string; name:string; price:number; prev:number; color:string };
type RoomMember = { id:string; name:string; seat:number; isHost:boolean };
type RoomAuth = { code:string; playerId:string; token:string; isHost:boolean };
type SharedGame = { players:Player[];stocks:Stock[];current:number;phase:Phase;round:number;dice:number[];pending:number|null;message:string;log:string[] };

const COLORS = ["#e33a36", "#2e72c7", "#158a79", "#e2a62a"];
const SPACES:{name:string; cn:string; type:SpaceType; price?:number; rent?:number; color?:string; icon:string}[] = [
  {name:"King’s Cross",cn:"国王十字",type:"start",icon:"⌂"},
  {name:"Camden Market",cn:"卡姆登市场",type:"property",price:200,rent:38,color:"#9a6a45",icon:"◆"},
  {name:"Abbey Road",cn:"艾比路",type:"property",price:240,rent:48,color:"#4b9b75",icon:"♫"},
  {name:"Notting Hill",cn:"诺丁山",type:"property",price:320,rent:68,color:"#4b9b75",icon:"⌂"},
  {name:"Hyde Park",cn:"海德公园",type:"bonus",icon:"♣"},
  {name:"Buckingham Palace",cn:"白金汉宫",type:"property",price:440,rent:102,color:"#e7b72f",icon:"♛"},
  {name:"Westminster",cn:"威斯敏斯特",type:"property",price:360,rent:78,color:"#e3563f",icon:"▥"},
  {name:"Big Ben",cn:"大本钟",type:"property",price:380,rent:84,color:"#e3563f",icon:"♜"},
  {name:"London Eye",cn:"伦敦眼",type:"bonus",icon:"◉"},
  {name:"Borough Market",cn:"博罗市场",type:"stock",icon:"↗"},
  {name:"The Shard",cn:"碎片大厦",type:"property",price:300,rent:62,color:"#78b7dc",icon:"▲"},
  {name:"Tower Bridge",cn:"伦敦塔桥",type:"bonus",icon:"♛"},
  {name:"Canary Wharf",cn:"金丝雀码头",type:"property",price:340,rent:72,color:"#d24676",icon:"▥"},
  {name:"Greenwich",cn:"格林尼治",type:"property",price:280,rent:58,color:"#d24676",icon:"◷"},
  {name:"Market News",cn:"市场新闻",type:"event",icon:"✦"},
  {name:"St Paul’s",cn:"圣保罗大教堂",type:"property",price:260,rent:52,color:"#78b7dc",icon:"♜"},
  {name:"Stock Exchange",cn:"伦敦交易所",type:"stock",icon:"▥"},
  {name:"British Museum",cn:"大英博物馆",type:"property",price:220,rent:42,color:"#9a6a45",icon:"▥"},
  {name:"Soho Chance",cn:"苏豪奇遇",type:"event",icon:"?"},
  {name:"Covent Garden",cn:"科文特花园",type:"tax",icon:"£"},
];

const INITIAL_STOCKS:Stock[] = [
  {symbol:"THM",name:"泰晤士航运",price:64,prev:64,color:"#6abbd2"},
  {symbol:"RDL",name:"红线交通",price:48,prev:48,color:"#e33a36"},
  {symbol:"CRN",name:"皇冠酒店",price:82,prev:82,color:"#e2a62a"},
  {symbol:"FOG",name:"雾都科技",price:56,prev:56,color:"#7e65b5"},
  {symbol:"BGB",name:"大钟传媒",price:41,prev:41,color:"#335e91"},
  {symbol:"TEA",name:"午茶集团",price:37,prev:37,color:"#a96b49"},
  {symbol:"LME",name:"狮心能源",price:72,prev:72,color:"#158a79"},
  {symbol:"UMB",name:"雨伞保险",price:53,prev:53,color:"#52667d"},
];

const MAP_POINTS = [
  [50,15],[39,10],[21,23],[13,40],[23,52],[34,62],[41,67],[44,63],[49,60],[59,57],
  [64,53],[72,52],[88,49],[91,70],[82,62],[61,36],[65,29],[43,29],[39,42],[48,43]
];
const RIVER_POINTS = [[-4,63],[12,61],[27,68],[43,68],[57,62],[70,56],[84,59],[104,73]];
const lineStyle = (a:number[],b:number[]) => { const dx=b[0]-a[0],dy=b[1]-a[1]; return {left:`${a[0]}%`,top:`${a[1]}%`,width:`${Math.hypot(dx,dy)}%`,transform:`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`}; };

const money = (n:number) => `£${Math.round(n).toLocaleString("en-GB")}`;

export default function Home(){
  const [screen,setScreen] = useState<"home"|"setup"|"online"|"lobby"|"game">("home");
  const [slots,setSlots] = useState([{name:"玩家 1",ai:false},{name:"电脑 · Baker",ai:true},{name:"电脑 · Ada",ai:true},{name:"电脑 · Sherlock",ai:true}]);
  const [players,setPlayers] = useState<Player[]>([]);
  const [stocks,setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [current,setCurrent] = useState(0);
  const [phase,setPhase] = useState<Phase>("roll");
  const [round,setRound] = useState(1);
  const [dice,setDice] = useState([1,1]);
  const [pending,setPending] = useState<number|null>(null);
  const [message,setMessage] = useState("轮到你了。掷骰子，开始伦敦之旅！");
  const [log,setLog] = useState<string[]>(["欢迎来到 London Tycoon"]);
  const [showStocks,setShowStocks] = useState(false);
  const [onlineName,setOnlineName] = useState("");
  const [roomCodeInput,setRoomCodeInput] = useState("");
  const [onlineAction,setOnlineAction] = useState<"create"|"join">("create");
  const [roomAuth,setRoomAuth] = useState<RoomAuth|null>(null);
  const [roomMembers,setRoomMembers] = useState<RoomMember[]>([]);
  const [roomStatus,setRoomStatus] = useState<"lobby"|"active">("lobby");
  const [onlineError,setOnlineError] = useState("");
  const [onlineBusy,setOnlineBusy] = useState(false);
  const [copied,setCopied] = useState(false);
  const dirtyRef = useRef(false);
  const remoteVersionRef = useRef(0);

  const active = players[current];
  const owners = useMemo(() => {
    const map:Record<number,number> = {};
    players.forEach((p,pi)=>p.properties.forEach(x=>map[x]=pi));
    return map;
  },[players]);
  const netWorth = (p:Player) => p.cash + p.properties.reduce((s,i)=>s+(SPACES[i].price||0),0) + stocks.reduce((s,st)=>s+(p.holdings[st.symbol]||0)*st.price,0);
  const canAct = !roomAuth || active?.remoteId===roomAuth.playerId || (active?.ai&&roomAuth.isHost);
  const sharedState = ():SharedGame => ({players,stocks,current,phase,round,dice,pending,message,log});
  const markDirty = () => { if(roomAuth)dirtyRef.current=true; };

  const addLog = (text:string) => setLog(x=>[text,...x].slice(0,6));
  const updatePlayer = (idx:number, fn:(p:Player)=>Player) => setPlayers(ps=>ps.map((p,i)=>i===idx?fn(p):p));

  const startGame = () => {
    setRoomAuth(null);
    setPlayers(slots.map((s,i)=>({name:s.name.trim()||`玩家 ${i+1}`,ai:s.ai,color:COLORS[i],cash:1500,pos:0,properties:[],holdings:{}})));
    setStocks(INITIAL_STOCKS); setCurrent(0); setRound(1); setDice([1,1]); setPhase("roll"); setPending(null); setShowStocks(false);
    setMessage(slots[0].ai?"电脑正在思考…":"轮到你了。掷骰子，开始伦敦之旅！"); setLog(["游戏开始：每人拥有 £1,500"]); setScreen("game");
  };

  const roomRequest = async (payload:Record<string,unknown>) => {
    const response=await fetch("/api/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await response.json(); if(!response.ok)throw new Error(data.error||"房间操作失败。"); return data;
  };

  const enterRoom = async () => {
    if(!onlineName.trim()){setOnlineError("请先输入你的昵称。");return}
    if(onlineAction==="join"&&roomCodeInput.trim().length!==6){setOnlineError("请输入 6 位房间代码。");return}
    setOnlineBusy(true);setOnlineError("");
    try{
      const data=await roomRequest({action:onlineAction,name:onlineName,code:roomCodeInput});
      const auth:RoomAuth={code:data.room.code,playerId:data.auth.playerId,token:data.auth.token,isHost:data.auth.isHost};
      setRoomAuth(auth);setRoomMembers(data.room.players);setRoomStatus(data.room.status);remoteVersionRef.current=data.room.updatedAt;setScreen("lobby");
      window.history.replaceState({},"",`?room=${data.room.code}`);
    }catch(error){setOnlineError(error instanceof Error?error.message:"无法进入房间。")}
    finally{setOnlineBusy(false)}
  };

  const applySharedGame = (state:SharedGame) => {
    dirtyRef.current=false;setPlayers(state.players);setStocks(state.stocks);setCurrent(state.current);setPhase(state.phase);setRound(state.round);setDice(state.dice);setPending(state.pending);setMessage(state.message);setLog(state.log);setShowStocks(false);setScreen("game");
  };

  const startOnlineGame = async () => {
    if(!roomAuth?.isHost)return;setOnlineBusy(true);setOnlineError("");
    const people=[...roomMembers].sort((a,b)=>a.seat-b.seat);
    const roster:Player[]=people.map((m,i)=>({name:m.name,ai:false,remoteId:m.id,color:COLORS[i],cash:1500,pos:0,properties:[],holdings:{}}));
    while(roster.length<4){const i=roster.length;roster.push({name:["电脑 · Baker","电脑 · Ada","电脑 · Sherlock"][i-people.length]||`电脑 ${i+1}`,ai:true,color:COLORS[i],cash:1500,pos:0,properties:[],holdings:{}})}
    const state:SharedGame={players:roster,stocks:INITIAL_STOCKS,current:0,phase:"roll",round:1,dice:[1,1],pending:null,message:`轮到 ${roster[0].name}。请掷骰子。`,log:["在线游戏开始：每人拥有 £1,500"]};
    try{const data=await roomRequest({action:"start",code:roomAuth.code,token:roomAuth.token,gameState:state});remoteVersionRef.current=data.room.updatedAt;applySharedGame(state)}catch(error){setOnlineError(error instanceof Error?error.message:"无法开始游戏。")}
    finally{setOnlineBusy(false)}
  };

  const copyInvite = async () => {
    if(!roomAuth)return;const url=`${window.location.origin}${window.location.pathname}?room=${roomAuth.code}`;
    try{await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setOnlineError("复制失败，请手动复制浏览器地址。")}
  };

  const finishLanding = (isAI:boolean) => {
    setPhase("manage");
    if(!isAI) setMessage("你可以交易股票，准备好后结束回合。");
  };

  const resolveLanding = (idx:number, spaceIndex:number, snapshot:Player[]) => {
    markDirty();
    const p = snapshot[idx]; const space=SPACES[spaceIndex]; const owner = snapshot.findIndex((x,pi)=>pi!==idx&&x.properties.includes(spaceIndex));
    if(space.type==="property"){
      if(owner>=0){
        const rent=space.rent||0;
        setPlayers(snapshot.map((x,pi)=>pi===idx?{...x,cash:x.cash-rent}:pi===owner?{...x,cash:x.cash+rent}:x));
        setMessage(`${p.name} 向 ${snapshot[owner].name} 支付 ${money(rent)} 租金。`); addLog(`${p.name} 在 ${space.cn} 支付了 ${money(rent)}`); finishLanding(p.ai); return;
      }
      if(!p.properties.includes(spaceIndex)){
        if(p.ai){
          if(p.cash>(space.price||0)+320 && Math.random()>.25){
            setPlayers(snapshot.map((x,pi)=>pi===idx?{...x,cash:x.cash-(space.price||0),properties:[...x.properties,spaceIndex]}:x));
            setMessage(`${p.name} 收购了 ${space.cn}。`); addLog(`${p.name} 以 ${money(space.price||0)} 收购 ${space.cn}`);
          } else { setMessage(`${p.name} 放弃了 ${space.cn}。`); }
          finishLanding(true);
        } else { setPending(spaceIndex); setPhase("decision"); setMessage(`${space.cn} 尚未被收购。要买下它吗？`); }
        return;
      }
    }
    if(space.type==="tax"){
      setPlayers(snapshot.map((x,pi)=>pi===idx?{...x,cash:x.cash-120}:x)); setMessage(`${p.name} 缴纳了 £120 城市税。`); addLog(`${p.name} 缴纳城市税 £120`);
    } else if(space.type==="bonus"){
      setPlayers(snapshot.map((x,pi)=>pi===idx?{...x,cash:x.cash+100}:x)); setMessage(`${p.name} 获得城市奖励 £100。`); addLog(`${p.name} 在 ${space.cn} 获得 £100`);
    } else if(space.type==="stock"){
      setMessage(`${p.name} 抵达交易区，本回合股票免手续费。`); if(!p.ai)setShowStocks(true);
    } else if(space.type==="event"){
      const events=[{text:"西区音乐剧大卖，票房分红 +£140",cash:140},{text:"地铁罢工，额外交通费 −£90",cash:-90},{text:"泰晤士河庆典，旅游收入 +£110",cash:110},{text:"突遇伦敦大雾，行程损失 −£70",cash:-70}];
      const ev=events[Math.floor(Math.random()*events.length)]; setPlayers(snapshot.map((x,pi)=>pi===idx?{...x,cash:x.cash+ev.cash}:x)); setMessage(ev.text); addLog(`${p.name}：${ev.text}`);
    } else if(space.type==="start"){ setMessage(`${p.name} 回到国王十字，整装再出发。`); }
    finishLanding(p.ai);
  };

  const rollDice = () => {
    if(!active||phase!=="roll"||!canAct)return;markDirty();
    const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),steps=d1+d2;
    setDice([d1,d2]); setMessage(`${active.name} 掷出了 ${steps} 点…`);
    const old=active.pos, next=(old+steps)%SPACES.length, passed=old+steps>=SPACES.length;
    const snapshot=players.map((p,i)=>i===current?{...p,pos:next,cash:p.cash+(passed?200:0)}:p);
    setPlayers(snapshot); if(passed)addLog(`${active.name} 经过起点，领取 £200`);
    window.setTimeout(()=>resolveLanding(current,next,snapshot),520);
  };

  const buyProperty = () => {
    if(pending===null||!canAct)return; markDirty();const s=SPACES[pending];
    if(active.cash<(s.price||0)){setMessage("现金不足，无法购买这处地标。");return;}
    updatePlayer(current,p=>({...p,cash:p.cash-(s.price||0),properties:[...p.properties,pending]})); addLog(`${active.name} 以 ${money(s.price||0)} 收购 ${s.cn}`); setMessage(`你已拥有 ${s.cn}。`); setPending(null); setPhase("manage");
  };

  const changeStock = (symbol:string,delta:number) => {
    if(phase!=="manage"||active.ai||!canAct)return;markDirty(); const st=stocks.find(s=>s.symbol===symbol)!; const held=active.holdings[symbol]||0;
    if(delta>0&&active.cash<st.price)return; if(delta<0&&held<1)return;
    updatePlayer(current,p=>({...p,cash:p.cash-delta*st.price,holdings:{...p.holdings,[symbol]:held+delta}}));
  };

  const moveStocks = () => setStocks(ss=>ss.map(s=>{const swing=(Math.random()-.47)*.22;const next=Math.max(12,Math.round(s.price*(1+swing)));return {...s,prev:s.price,price:next}}));

  const endTurn = () => {
    if(!players.length||!canAct)return;markDirty();
    if(current===players.length-1){
      if(round>=20){setPhase("gameover");setShowStocks(false);setMessage("伦敦钟声敲响，最终财富结算完成！");return;}
      setRound(r=>r+1); moveStocks(); addLog(`第 ${round+1} 回合开盘：8 支股票价格已更新`);
    }
    const next=(current+1)%players.length; setCurrent(next); setPending(null); setShowStocks(false); setPhase("roll"); setMessage(players[next].ai?`${players[next].name} 正在思考…`:`轮到 ${players[next].name}。请掷骰子。`);
  };

  const aiInvest = () => {
    const p=players[current]; if(!p||!p.ai||phase!=="manage")return;markDirty();
    const affordable=stocks.filter(s=>s.price<p.cash-350).sort((a,b)=>(b.price-b.prev)-(a.price-a.prev));
    if(affordable.length&&Math.random()>.35){const pick=affordable[0];updatePlayer(current,x=>({...x,cash:x.cash-pick.price,holdings:{...x.holdings,[pick.symbol]:(x.holdings[pick.symbol]||0)+1}}));addLog(`${p.name} 买入 1 股 ${pick.symbol}`);}
    window.setTimeout(endTurn,520);
  };

  useEffect(()=>{
    const code=new URLSearchParams(window.location.search).get("room")?.toUpperCase()||"";
    if(code.length===6){setRoomCodeInput(code);setOnlineAction("join");setScreen("online")}
  },[]);

  useEffect(()=>{
    if(!roomAuth||(screen!=="lobby"&&screen!=="game"))return;
    let cancelled=false;
    const refresh=async()=>{
      try{
        const response=await fetch(`/api/rooms?code=${roomAuth.code}`,{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error);
        if(cancelled)return;setRoomMembers(data.room.players);setRoomStatus(data.room.status);
        if(data.room.updatedAt>remoteVersionRef.current&&!dirtyRef.current){remoteVersionRef.current=data.room.updatedAt;if(data.room.status==="active"&&data.room.gameState)applySharedGame(data.room.gameState)}
      }catch(error){if(!cancelled)setOnlineError(error instanceof Error?error.message:"连接房间失败。")}
    };
    refresh();const timer=window.setInterval(refresh,1200);return()=>{cancelled=true;window.clearInterval(timer)};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[roomAuth?.code,screen]);

  useEffect(()=>{
    if(!roomAuth||screen!=="game"||!dirtyRef.current)return;
    const state=sharedState();
    const timer=window.setTimeout(async()=>{
      try{const data=await roomRequest({action:"sync",code:roomAuth.code,token:roomAuth.token,gameState:state});remoteVersionRef.current=Math.max(remoteVersionRef.current,data.updatedAt||0);dirtyRef.current=false}catch(error){setOnlineError(error instanceof Error?error.message:"同步暂时中断，正在重试。")}
    },180);
    return()=>window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[players,stocks,current,phase,round,dice,pending,message,log,screen,roomAuth?.code]);

  useEffect(()=>{
    if(screen!=="game"||!active?.ai)return;
    if(roomAuth&&!roomAuth.isHost)return;
    const t=window.setTimeout(()=>{if(phase==="roll")rollDice();else if(phase==="manage")aiInvest();},650);
    return()=>window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[screen,current,phase,active?.ai,roomAuth?.isHost]);

  const ranking=[...players].sort((a,b)=>netWorth(b)-netWorth(a));

  if(screen==="home")return <main className="landing">
    <header className="topbar"><Logo/><span className="tag">4 位玩家 · 地产 · 股票</span></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">WELCOME TO THE CAPITAL</p><h1>从泰晤士河畔，<br/>建立你的伦敦帝国。</h1><p>沿真实伦敦方位探索城市地标、交易 8 支虚构股票，与好友和聪明的电脑对手角逐伦敦首富。</p><div className="home-actions"><button className="primary" onClick={()=>setScreen("online")}>在线与朋友玩 <span>→</span></button><button className="secondary" onClick={()=>setScreen("setup")}>同一台电脑玩</button></div><div className="facts"><span><b>20</b> 城市站点</span><span><b>8</b> 虚构股票</span><span><b>4</b> 玩家席位</span></div></div><MapMini/></section>
    <footer className="landing-footer"><span>BIG BEN</span><span>THE SHARD</span><span>TOWER BRIDGE</span><span>BUCKINGHAM PALACE</span></footer>
  </main>;

  if(screen==="setup")return <main className="setup-page"><header className="topbar"><Logo/><button className="text-btn" onClick={()=>setScreen("home")}>← 返回</button></header><section className="setup-card"><div><p className="eyebrow">NEW GAME</p><h1>谁来征服伦敦？</h1><p>一局固定 4 个席位。你可以自由选择真人或电脑玩家，并为每位玩家改名。</p></div><div className="slots">{slots.map((s,i)=><div className="slot" key={i} style={{"--player":COLORS[i]} as React.CSSProperties}><span className="pawn">{s.ai?"◆":"●"}</span><div className="slot-main"><label>玩家 {i+1}</label><input aria-label={`玩家 ${i+1} 名称`} value={s.name} onChange={e=>setSlots(x=>x.map((v,j)=>j===i?{...v,name:e.target.value}:v))}/></div><div className="toggle"><button className={!s.ai?"on":""} onClick={()=>setSlots(x=>x.map((v,j)=>j===i?{...v,ai:false}:v))}>真人</button><button className={s.ai?"on":""} onClick={()=>setSlots(x=>x.map((v,j)=>j===i?{...v,ai:true}:v))}>电脑</button></div></div>)}</div><div className="rules"><span>起始资金 <b>£1,500</b></span><span>游戏长度 <b>20 回合</b></span><span>胜利条件 <b>最高总资产</b></span></div><button className="primary wide" onClick={startGame}>进入伦敦 <span>→</span></button></section></main>;

  if(screen==="online")return <main className="setup-page online-page"><header className="topbar"><Logo/><button className="text-btn" onClick={()=>{setScreen("home");window.history.replaceState({},"",window.location.pathname)}}>← 返回</button></header><section className="setup-card online-card"><p className="eyebrow">PLAY TOGETHER</p><h1>和朋友一起征服伦敦</h1><p>创建房间后复制邀请链接；朋友打开链接、输入昵称，就能从自己的电脑加入。</p><div className="online-tabs"><button className={onlineAction==="create"?"on":""} onClick={()=>setOnlineAction("create")}>创建房间</button><button className={onlineAction==="join"?"on":""} onClick={()=>setOnlineAction("join")}>加入房间</button></div><div className="online-form"><label>你的昵称<input value={onlineName} maxLength={24} placeholder="例如：小明" onChange={e=>setOnlineName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enterRoom()}/></label>{onlineAction==="join"&&<label>房间代码<input className="code-input" value={roomCodeInput} maxLength={6} placeholder="6 位代码" onChange={e=>setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} onKeyDown={e=>e.key==="Enter"&&enterRoom()}/></label>}</div>{onlineError&&<p className="form-error">{onlineError}</p>}<button className="primary wide" disabled={onlineBusy} onClick={enterRoom}>{onlineBusy?"正在连接…":onlineAction==="create"?"创建邀请房间":"加入这局游戏"} <span>→</span></button></section></main>;

  if(screen==="lobby"&&roomAuth)return <main className="setup-page lobby-page"><header className="topbar"><Logo/><button className="text-btn" onClick={()=>{setRoomAuth(null);setScreen("home");window.history.replaceState({},"",window.location.pathname)}}>退出房间</button></header><section className="setup-card lobby-card"><div className="lobby-heading"><div><p className="eyebrow">WAITING AT KING’S CROSS</p><h1>等待玩家上车</h1><p>把邀请链接发给朋友。最多 4 位真人参加；空余席位会由电脑补上。</p></div><div className="room-code"><small>房间代码</small><b>{roomAuth.code}</b><button onClick={copyInvite}>{copied?"已复制邀请链接 ✓":"复制邀请链接"}</button></div></div><div className="lobby-seats">{[0,1,2,3].map(seat=>{const member=roomMembers.find(m=>m.seat===seat);return <div className={`lobby-seat ${member?"joined":""}`} key={seat} style={{"--player":COLORS[seat]} as React.CSSProperties}><span>{member?"●":"＋"}</span><div><small>席位 {seat+1}</small><b>{member?.name||"等待朋友加入…"}</b>{member?.isHost&&<em>房主</em>}</div></div>})}</div>{onlineError&&<p className="form-error">{onlineError}</p>}<div className="lobby-footer"><span><i className="live-dot"/> 房间实时同步中</span>{roomAuth.isHost?<button className="primary" disabled={onlineBusy} onClick={startOnlineGame}>{onlineBusy?"正在准备…":"开始游戏"} <span>→</span></button>:<b>等待房主开始游戏…</b>}</div></section></main>;

  return <main className="game-page">
    <header className="game-head"><Logo/>{roomAuth&&<span className="online-badge"><i/> 房间 {roomAuth.code}</span>}<div className="round"><small>当前进度</small><b>第 {round} / 20 回合</b></div><button className="market-btn" onClick={()=>setShowStocks(!showStocks)}>股票市场 <span>↗</span></button></header>
    <section className="game-layout">
      <aside className="players-panel"><p className="panel-title">玩家资产</p>{players.map((p,i)=><article className={`player-card ${i===current?"active":""}`} key={i} style={{"--player":p.color} as React.CSSProperties}><div className="avatar">{p.ai?"◆":"●"}</div><div className="player-info"><b>{p.name}</b><small>{p.ai?"电脑玩家":"真人玩家"} · 总资产 {money(netWorth(p))}</small></div><strong>{money(p.cash)}</strong><div className="mini-assets"><span>{p.properties.length} 处地产</span><span>{Object.values(p.holdings).reduce((a,b)=>a+b,0)} 股</span></div></article>)}<div className="activity"><p className="panel-title">伦敦动态</p>{log.map((x,i)=><p key={i}>{x}</p>)}</div></aside>
      <section className="map-wrap"><div className="london-map">
        <div className="map-title"><small>GREATER LONDON · 城市财富地图</small><b>LONDON</b></div>
        <div className="park park-one">HYDE PARK</div><div className="park park-two">GREENWICH PARK</div>
        {[...Array(15)].map((_,i)=><i className={`street street-${i}`} key={`street-${i}`}/>) }
        {RIVER_POINTS.slice(0,-1).map((p,i)=><i className="thames-segment" style={lineStyle(p,RIVER_POINTS[i+1])} key={`river-${i}`}/>) }
        <span className="thames-label">RIVER THAMES · 泰晤士河</span>
        {MAP_POINTS.slice(0,-1).map((p,i)=><i className="route-segment" style={lineStyle(p,MAP_POINTS[i+1])} key={`route-${i}`}/>) }
        <i className="route-segment" style={lineStyle(MAP_POINTS[MAP_POINTS.length-1],MAP_POINTS[0])}/>
        {SPACES.map((s,i)=><button className={`map-stop ${s.type} ${players.some(p=>p.pos===i)?"occupied":""}`} style={{left:`${MAP_POINTS[i][0]}%`,top:`${MAP_POINTS[i][1]}%`,"--stripe":s.color||"#18334e","--icon-col":i%5,"--icon-row":Math.floor(i/5)} as React.CSSProperties} key={s.name} aria-label={`${s.cn} ${s.name}`}><span className="landmark-art"/><span className="stop-copy"><b>{s.cn}</b><small>{s.type==="property"?`${s.name} · ${money(s.price||0)}`:s.name}</small></span>{owners[i]!==undefined&&<i className="owner-pin" style={{background:players[owners[i]].color}}/>}</button>)}
        {players.map((p,pi)=><span className="moving-pawn" key={pi} style={{left:`${MAP_POINTS[p.pos][0]}%`,top:`${MAP_POINTS[p.pos][1]}%`,background:p.color,zIndex:12+pi}}>{pi+1}</span>)}
        <div className="map-console"><div><small>当前位置</small><b>{active?SPACES[active.pos].cn:"伦敦"}</b><p>{message}</p></div><div className="dice-row"><span className="die">{dice[0]}</span><span className="die">{dice[1]}</span></div>{phase==="roll"&&!active?.ai&&canAct&&<button className="roll-btn" onClick={rollDice}>掷骰子</button>}{phase==="decision"&&pending!==null&&canAct&&<div className="decision"><button onClick={buyProperty}>以 {money(SPACES[pending].price||0)} 收购</button><button onClick={()=>{markDirty();setPending(null);setPhase("manage");setMessage("你放弃了这处地标，可以交易股票或结束回合。");}}>暂不购买</button></div>}{phase==="manage"&&!active?.ai&&canAct&&<div className="manage"><button onClick={()=>setShowStocks(true)}>交易股票</button><button className="end" onClick={endTurn}>结束回合 →</button></div>}{roomAuth&&!canAct&&<span className="waiting-turn">等待 {active?.name} 操作…</span>}</div>
      </div></section>
    </section>
    {showStocks&&phase!=="gameover"&&<div className="drawer"><div className="drawer-head"><div><p className="eyebrow">THE CITY EXCHANGE</p><h2>伦敦虚拟股票市场</h2></div><button onClick={()=>setShowStocks(false)}>×</button></div><p className="disclaimer">以下 8 支股票均为游戏内虚构资产。价格每回合随机波动，仅用于娱乐。</p><div className="stock-grid">{stocks.map(st=>{const up=st.price>=st.prev,held=active?.holdings[st.symbol]||0;return <article className="stock" key={st.symbol} style={{"--stock":st.color} as React.CSSProperties}><div><span className="ticker">{st.symbol}</span><b>{st.name}</b></div><strong>{money(st.price)}</strong><small className={up?"up":"down"}>{up?"▲":"▼"} {Math.abs(st.price-st.prev)} · 持有 {held} 股</small><div className="trade"><button disabled={phase!=="manage"||active?.ai||!canAct||held<1} onClick={()=>changeStock(st.symbol,-1)}>卖出</button><button disabled={phase!=="manage"||active?.ai||!canAct||(active?.cash||0)<st.price} onClick={()=>changeStock(st.symbol,1)}>买入 1 股</button></div></article>})}</div></div>}
    {phase==="gameover"&&<div className="overlay"><section className="result"><span className="crown">♛</span><p className="eyebrow">FINAL BELL</p><h1>{ranking[0]?.name}<br/>成为伦敦首富！</h1><div className="podium">{ranking.map((p,i)=><div key={p.name}><span>{i+1}</span><b>{p.name}</b><strong>{money(netWorth(p))}</strong></div>)}</div><button className="primary" onClick={()=>setScreen("setup")}>再玩一局 <span>→</span></button></section></div>}
  </main>;
}

function Logo(){return <div className="brand"><span className="roundel">L</span><div><b>LONDON TYCOON</b><small>伦敦财富之旅</small></div></div>}
function MapMini(){const picks=[0,2,3,5,7,8,10,11,12,13,15,17];return <div className="map-preview"><div className="preview-map-title">LONDON <small>城市财富地图</small></div>{RIVER_POINTS.slice(0,-1).map((p,i)=><i className="mini-river" style={lineStyle(p,RIVER_POINTS[i+1])} key={i}/>)}<span className="mini-thames">RIVER THAMES</span>{picks.map(i=><div className="mini-landmark" key={i} style={{left:`${MAP_POINTS[i][0]}%`,top:`${MAP_POINTS[i][1]}%`,"--icon-col":i%5,"--icon-row":Math.floor(i/5)} as React.CSSProperties}><span className="landmark-art"/><b>{SPACES[i].name}</b></div>)}<div className="pulse-route"/></div>}
