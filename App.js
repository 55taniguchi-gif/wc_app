// src/App.js — WC2026 予想バトル（完全製品版 / Firebase不要）
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { storageGet, storageSet, storageSubscribe } from "./storage";

// ── 定数 ──────────────────────────────────────────────────────────────────
const MATCHES = [
  { id:"g1",  home:"Panama",       hc:"PAN", away:"England",    ac:"ENG", time:"6/28 06:00", winP:{h:5.3,  d:10.8,a:83.9} },
  { id:"g2",  home:"Croatia",      hc:"CRO", away:"Ghana",      ac:"GHA", time:"6/28 06:00", winP:{h:51.6, d:29.3,a:19.1} },
  { id:"g3",  home:"Colombia",     hc:"COL", away:"Portugal",   ac:"POR", time:"6/28 08:30", winP:{h:27.3, d:25.6,a:47.1} },
  { id:"g4",  home:"Congo DR",     hc:"COD", away:"Uzbekistan", ac:"UZB", time:"6/28 08:30", winP:{h:58.7, d:23.4,a:17.9} },
  { id:"g5",  home:"Jordan",       hc:"JOR", away:"Argentina",  ac:"ARG", time:"6/28 11:00", winP:{h:4.8,  d:11.2,a:84  } },
  { id:"g6",  home:"Algeria",      hc:"DZA", away:"Austria",    ac:"AUT", time:"6/28 11:00", winP:{h:24.3, d:42.8,a:32.9} },
  { id:"g7",  home:"South Africa", hc:"RSA", away:"Canada",     ac:"CAN", time:"6/29 04:00", winP:{h:17.6, d:25.8,a:56.6} },
  { id:"g8",  home:"Brazil",       hc:"BRA", away:"Japan",      ac:"JPN", time:"6/30 02:00", winP:{h:56.2, d:25.5,a:18.3} },
  { id:"g9",  home:"Germany",      hc:"GER", away:"Paraguay",   ac:"PAR", time:"6/30 05:30", winP:{h:70.1, d:18.6,a:11.3} },
  { id:"g10", home:"Netherlands",  hc:"NED", away:"Morocco",    ac:"MAR", time:"6/30 10:00", winP:{h:45.1, d:28.8,a:26.1} },
];

const ALL_TEAMS = [
  {code:"ARG",name:"Argentina"},{code:"BRA",name:"Brazil"},  {code:"ENG",name:"England"},
  {code:"GER",name:"Germany"},  {code:"POR",name:"Portugal"},{code:"NED",name:"Netherlands"},
  {code:"COL",name:"Colombia"}, {code:"CRO",name:"Croatia"}, {code:"JPN",name:"Japan"},
  {code:"MAR",name:"Morocco"},  {code:"CAN",name:"Canada"},  {code:"RSA",name:"South Africa"},
  {code:"COD",name:"Congo DR"}, {code:"GHA",name:"Ghana"},   {code:"AUT",name:"Austria"},
  {code:"PAR",name:"Paraguay"}, {code:"UZB",name:"Uzbekistan"},{code:"JOR",name:"Jordan"},
  {code:"DZA",name:"Algeria"},  {code:"PAN",name:"Panama"},
];

const FLAG = {
  PAN:"🇵🇦",ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",CRO:"🇭🇷",GHA:"🇬🇭",COL:"🇨🇴",POR:"🇵🇹",
  COD:"🇨🇩",UZB:"🇺🇿",JOR:"🇯🇴",ARG:"🇦🇷",DZA:"🇩🇿",AUT:"🇦🇹",
  RSA:"🇿🇦",CAN:"🇨🇦",BRA:"🇧🇷",JPN:"🇯🇵",GER:"🇩🇪",PAR:"🇵🇾",
  NED:"🇳🇱",MAR:"🇲🇦",
};

const SK = {
  players:    "players",
  results:    "results",
  champResult:"champResult",
  champBets:  "champBets",
  champPicks: "champPicks",
  picks:     (id) => `picks:${id}`,
  matchBets: (id) => `matchBets:${id}`,
  me:         "me",
};

// ── デザイントークン ───────────────────────────────────────────────────────
const G = {
  bg:"#080C18",card:"#111827",card2:"#1C2A3A",border:"#1E2D45",
  gold:"#C9A84C",goldL:"#E8C86A",text:"#E2E8F0",muted:"#64748B",
  win:"#22C55E",lose:"#EF4444",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{height:100%}
  body{
    background:${G.bg};color:${G.text};font-family:'Inter',sans-serif;
    overscroll-behavior:none;
    padding-top:env(safe-area-inset-top);
    padding-bottom:env(safe-area-inset-bottom);
    -webkit-tap-highlight-color:transparent;
  }
  button{cursor:pointer;border:none;font-family:inherit}
  input,select{font-family:inherit}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:${G.border};border-radius:2px}
  @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .up{animation:up .22s ease both}
  .gold{
    background:linear-gradient(90deg,${G.gold},${G.goldL},${G.gold});
    background-size:200%;animation:shimmer 3s linear infinite;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  }
  .tab-ul::after{
    content:'';position:absolute;bottom:-1px;left:0;right:0;
    height:2px;background:${G.gold};border-radius:1px;
  }
  .tab-ul{position:relative}
`;

// ── 按分計算（純粋関数）───────────────────────────────────────────────────
function calcMatchPayout(picks, bets, result) {
  const ids = Object.keys(bets);
  const pool = ids.reduce((s,id)=>s+(bets[id]||0),0);
  const wIds = ids.filter(id=>picks[id]===result&&(bets[id]||0)>0);
  const wTotal = wIds.reduce((s,id)=>s+(bets[id]||0),0);
  if(!wIds.length||!wTotal) return{pool,winners:[],payouts:{},noWinner:true};
  const payouts={};
  wIds.forEach(id=>{payouts[id]=Math.floor((bets[id]/wTotal)*pool);});
  const dist=Object.values(payouts).reduce((s,v)=>s+v,0);
  const rem=pool-dist;
  if(rem>0){const top=wIds.reduce((a,b)=>(bets[b]||0)>(bets[a]||0)?b:a);payouts[top]=(payouts[top]||0)+rem;}
  return{pool,winners:wIds,payouts,noWinner:false};
}

function calcChampPayout(champPicks, champBets, champResult) {
  if(!champResult) return{pool:0,winners:[],payouts:{},noWinner:false,pending:true};
  const ids=Object.keys(champBets);
  const pool=ids.reduce((s,id)=>s+(champBets[id]||0),0);
  const wIds=ids.filter(id=>champPicks[id]===champResult&&(champBets[id]||0)>0);
  const wTotal=wIds.reduce((s,id)=>s+(champBets[id]||0),0);
  if(!wIds.length||!wTotal) return{pool,winners:[],payouts:{},noWinner:true};
  const payouts={};
  wIds.forEach(id=>{payouts[id]=Math.floor((champBets[id]/wTotal)*pool);});
  const dist=Object.values(payouts).reduce((s,v)=>s+v,0);
  const rem=pool-dist;
  if(rem>0){const top=wIds.reduce((a,b)=>(champBets[b]||0)>(champBets[a]||0)?b:a);payouts[top]=(payouts[top]||0)+rem;}
  return{pool,winners:wIds,payouts,noWinner:false};
}

// ── ストレージ購読フック ──────────────────────────────────────────────────
function useStore(key, defaultVal) {
  const [val, setVal] = useState(() => storageGet(key) ?? defaultVal);
  useEffect(() => {
    if(!key) return;
    // 初期値再取得
    const v = storageGet(key);
    if(v !== null) setVal(v);
    // 変更購読
    return storageSubscribe(key, setVal);
  }, [key]);
  const save = useCallback((next) => {
    setVal(prev => {
      const v = typeof next==="function" ? next(prev) : next;
      storageSet(key, v);
      return v;
    });
  }, [key]);
  return [val, save];
}

// ── 名前登録画面 ───────────────────────────────────────────────────────────
function RegisterScreen({ onDone }) {
  const [name, setName] = useState("");
  const [err,  setErr]  = useState("");

  const register = () => {
    const n = name.trim();
    if(!n)            return setErr("名前を入力してください");
    if(n.length > 12) return setErr("12文字以内で入力してください");
    const players = storageGet(SK.players) || {};
    if(Object.values(players).find(p=>p.name===n))
      return setErr("その名前はすでに使われています");
    const id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    const me = { id, name:n, joinedAt:Date.now() };
    players[id] = me;
    storageSet(SK.players, players);
    storageSet(SK.me, me);
    onDone(me);
  };

  return (
    <div style={{
      minHeight:"100vh",display:"flex",flexDirection:"column",
      justifyContent:"center",alignItems:"center",padding:32,gap:20,
    }}>
      <div style={{textAlign:"center"}}>
        <div className="gold" style={{fontSize:32,fontWeight:800,marginBottom:6}}>WC 2026</div>
        <div style={{fontSize:14,color:G.muted}}>予想バトルに参加する</div>
      </div>
      <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:10}}>
        <input
          value={name} maxLength={12}
          onChange={e=>{setName(e.target.value);setErr("");}}
          onKeyDown={e=>e.key==="Enter"&&register()}
          placeholder="あなたの名前（12文字以内）"
          autoFocus
          style={{
            background:G.card,border:`1px solid ${err?G.lose:G.border}`,
            borderRadius:12,color:G.text,padding:"13px 16px",
            fontSize:15,outline:"none",width:"100%",
          }}
        />
        {err && <div style={{fontSize:12,color:G.lose,paddingLeft:4}}>{err}</div>}
        <button onClick={register} style={{
          background:G.gold,color:G.bg,borderRadius:12,
          padding:"14px 0",fontSize:15,fontWeight:800,width:"100%",
        }}>参加する →</button>
      </div>
      <div style={{fontSize:11,color:G.muted,textAlign:"center",maxWidth:260,lineHeight:1.8}}>
        同じブラウザ内でリアルタイム共有されます。<br/>
        別デバイスからはURLを共有してアクセス。
      </div>
    </div>
  );
}

// ── 予想・ベット選択ボタン ────────────────────────────────────────────────
function PickBtn({ label, active, color, onClick, disabled }) {
  return (
    <button onClick={!disabled?onClick:undefined} style={{
      flex:1,padding:"9px 4px",borderRadius:8,fontSize:11,fontWeight:600,
      transition:"all .15s",
      background:active?color:"transparent",
      color:active?"#fff":disabled?G.border:G.muted,
      border:`1.5px solid ${active?color:G.border}`,
      boxShadow:active?`0 0 10px ${color}55`:"none",
      cursor:disabled?"default":"pointer",
    }}>{label}</button>
  );
}

// ── 試合カード ────────────────────────────────────────────────────────────
function MatchCard({ game, myPick, myBet, onPick, onBet, result }) {
  const locked = !!result;
  const hit = myPick&&result&&myPick===result;
  return (
    <div className="up" style={{
      background:G.card,
      border:`1px solid ${result?(hit?G.win+"55":myPick?G.lose+"44":G.border):G.border}`,
      borderRadius:14,padding:"14px 16px",
      display:"flex",flexDirection:"column",gap:10,
    }}>
      {/* チーム */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:20}}>{FLAG[game.hc]||"🏳"}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{game.home}</div>
            <div style={{fontSize:10,color:G.muted}}>{game.winP.h}%</div>
          </div>
        </div>
        <div style={{textAlign:"center",minWidth:54}}>
          <div style={{fontSize:9,color:G.gold,fontWeight:500}}>{game.time}</div>
          <div style={{fontSize:9,color:G.muted,marginTop:1}}>JST</div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:6,flexDirection:"row-reverse"}}>
          <span style={{fontSize:20}}>{FLAG[game.ac]||"🏳"}</span>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600}}>{game.away}</div>
            <div style={{fontSize:10,color:G.muted}}>{game.winP.a}%</div>
          </div>
        </div>
      </div>

      {/* 予想ボタン */}
      <div style={{display:"flex",gap:6}}>
        <PickBtn label={`${FLAG[game.hc]} ${game.home}`} active={myPick==="home"}
          color="#3B82F6" onClick={()=>onPick(game.id,"home")} disabled={locked}/>
        <PickBtn label="引き分け" active={myPick==="draw"}
          color={G.muted} onClick={()=>onPick(game.id,"draw")} disabled={locked}/>
        <PickBtn label={`${FLAG[game.ac]} ${game.away}`} active={myPick==="away"}
          color="#8B5CF6" onClick={()=>onPick(game.id,"away")} disabled={locked}/>
      </div>

      {/* ベット額 */}
      {!locked && (
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:G.muted}}>賭け金：</span>
          {[100,500,1000,3000].map(v=>(
            <button key={v} onClick={()=>onBet(game.id,v)} style={{
              padding:"4px 8px",borderRadius:6,fontSize:11,fontWeight:600,
              background:myBet===v?G.gold:G.card2,
              color:myBet===v?G.bg:G.muted,
              border:`1px solid ${myBet===v?G.gold:G.border}`,
            }}>¥{v>=1000?v/1000+"k":v}</button>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:3}}>
            <span style={{fontSize:11,color:G.muted}}>¥</span>
            <input type="number" min="0" step="100" value={myBet||""}
              onChange={e=>onBet(game.id,Math.max(0,parseInt(e.target.value)||0))}
              placeholder="0"
              style={{
                width:58,background:G.card2,border:`1px solid ${G.border}`,
                borderRadius:6,color:G.text,padding:"3px 6px",
                fontSize:12,outline:"none",textAlign:"right",
              }}
            />
          </div>
        </div>
      )}

      {/* 結果バッジ */}
      {result && (
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          paddingTop:6,borderTop:`1px solid ${G.border}`,
        }}>
          <span style={{fontSize:11,color:G.muted}}>
            結果：<span style={{color:G.text,fontWeight:600}}>
              {result==="home"?game.home:result==="away"?game.away:"引き分け"}
            </span>
          </span>
          {myPick&&(
            <span style={{
              fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20,
              background:hit?G.win+"22":G.lose+"22",color:hit?G.win:G.muted,
            }}>{hit?"✓ 当たり":"✗ 外れ"}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── 結果入力パネル ────────────────────────────────────────────────────────
function ResultPanel({ game, result, onSet, onClear }) {
  const [sel, setSel] = useState(result||"home");
  useEffect(()=>{setSel(result||"home");},[result]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{fontSize:10,color:G.gold,fontWeight:700,letterSpacing:".08em"}}>結果を入力</div>
      <div style={{display:"flex",gap:6}}>
        {[["home",`${FLAG[game.hc]} ${game.home}`,"#3B82F6"],
          ["draw","引き分け",G.muted],
          ["away",`${FLAG[game.ac]} ${game.away}`,"#8B5CF6"]
        ].map(([v,label,color])=>(
          <PickBtn key={v} label={label} active={sel===v} color={color} onClick={()=>setSel(v)}/>
        ))}
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>onSet(game.id,sel)} style={{
          flex:1,padding:"9px 0",background:G.gold,color:G.bg,
          borderRadius:8,fontSize:13,fontWeight:700,border:"none",
        }}>確定する</button>
        {result&&(
          <button onClick={()=>onClear(game.id)} style={{
            padding:"9px 12px",background:"transparent",color:G.lose,
            border:`1px solid ${G.lose}44`,borderRadius:8,fontSize:12,
          }}>取消</button>
        )}
      </div>
    </div>
  );
}

// ── メインアプリ ──────────────────────────────────────────────────────────
export default function App() {
  const [me,      setMe]   = useState(null);
  const [booting, setBoot] = useState(true);
  const [tab,     setTab]  = useState("picks");
  const [openResult, setOpenResult] = useState(null);
  const [champSelVal, setChampSelVal] = useState("ARG");

  // 共有ストア
  const [players,     setPlayers]    = useStore(SK.players,    {});
  const [results,     setResults]    = useStore(SK.results,    {});
  const [champResult, setChampResult]= useStore(SK.champResult,null);
  const [champBets,   setChampBets]  = useStore(SK.champBets,  {});
  const [champPicks,  setChampPicks] = useStore(SK.champPicks, {});

  // 自分のデータ
  const [myPicks,    setMyPicks]    = useStore(me?SK.picks(me.id):null,    {});
  const [myMatchBets,setMyMatchBets]= useStore(me?SK.matchBets(me.id):null,{});

  // 全員のデータ（按分計算用）
  const [allPicks,    setAllPicks]    = useState({});
  const [allMatchBets,setAllMatchBets]= useState({});

  // 起動時にme復元
  useEffect(()=>{
    const saved = storageGet(SK.me);
    if(saved) setMe(saved);
    setBoot(false);
  },[]);

  // プレイヤーリスト
  const playerList = useMemo(()=>
    Object.values(players).sort((a,b)=>a.joinedAt-b.joinedAt),
  [players]);

  // 全員のpicks/bets を購読
  useEffect(()=>{
    if(!playerList.length) return;
    const unsubs = playerList.flatMap(p=>[
      storageSubscribe(SK.picks(p.id),    v=>setAllPicks    (prev=>({...prev,[p.id]:v||{}}))),
      storageSubscribe(SK.matchBets(p.id),v=>setAllMatchBets(prev=>({...prev,[p.id]:v||{}}))),
    ]);
    // 初期値もロード
    playerList.forEach(p=>{
      const pk = storageGet(SK.picks(p.id));
      const bk = storageGet(SK.matchBets(p.id));
      if(pk) setAllPicks    (prev=>({...prev,[p.id]:pk}));
      if(bk) setAllMatchBets(prev=>({...prev,[p.id]:bk}));
    });
    return ()=>unsubs.forEach(u=>u());
  // eslint-disable-next-line
  },[playerList.map(p=>p.id).join()]);

  // ハンドラ
  const handlePick = useCallback((gid,choice)=>{
    if(!me) return;
    setMyPicks(prev=>({...prev,[gid]:choice}));
  },[me,setMyPicks]);

  const handleBet = useCallback((gid,amount)=>{
    if(!me) return;
    setMyMatchBets(prev=>({...prev,[gid]:amount}));
  },[me,setMyMatchBets]);

  const setResult  = (gid,val)=>{ setResults(prev=>({...prev,[gid]:val})); setOpenResult(null); };
  const clearResult= (gid)=>{ setResults(prev=>{ const n={...prev}; delete n[gid]; return n; }); setOpenResult(null); };

  // 収支計算
  const playerSummary = useMemo(()=>{
    const cr = calcChampPayout(champPicks,champBets,champResult);
    return playerList.map(p=>{
      const picks = allPicks[p.id]||{};
      const bets  = allMatchBets[p.id]||{};
      let matchBetTotal=0, matchPayout=0;
      const breakdown={};
      MATCHES.forEach(g=>{
        const result = results[g.id];
        const myBet  = bets[g.id]||0;
        matchBetTotal += myBet;
        if(!result){ breakdown[g.id]={bet:myBet,payout:0,hit:false,net:0}; return; }
        const gPicks={},gBets={};
        playerList.forEach(pl=>{
          gPicks[pl.id]=(allPicks[pl.id]||{})[g.id];
          gBets[pl.id] =(allMatchBets[pl.id]||{})[g.id]||0;
        });
        const {payouts}=calcMatchPayout(gPicks,gBets,result);
        const payout=payouts[p.id]||0;
        matchPayout+=payout;
        breakdown[g.id]={bet:myBet,payout,hit:picks[g.id]===result,net:payout-myBet};
      });
      const cBet=champBets[p.id]||0;
      const cPay=cr.payouts[p.id]||0;
      const totalBet=matchBetTotal+cBet, totalPayout=matchPayout+cPay;
      return{...p,matchBetTotal,matchPayout,champBet:cBet,champPayout:cPay,
        totalBet,totalPayout,profit:totalPayout-totalBet,breakdown,
        champHit:!!champResult&&champPicks[p.id]===champResult};
    });
  },[playerList,allPicks,allMatchBets,results,champPicks,champBets,champResult]);

  const ranking = useMemo(()=>[...playerSummary].sort((a,b)=>b.profit-a.profit),[playerSummary]);
  const mySummary = playerSummary.find(p=>p.id===me?.id);
  const resultCount = Object.keys(results).length;
  const champPool = Object.values(champBets).reduce((s,v)=>s+(v||0),0);

  const TABS=[
    {key:"picks",       label:"予想"},
    {key:"matches",     label:"試合"},
    {key:"leaderboard", label:"順位"},
    {key:"champ",       label:"優勝"},
  ];

  if(booting) return null;
  if(!me) return(<><style>{CSS}</style><RegisterScreen onDone={setMe}/></>);

  return(
    <><style>{CSS}</style>
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{padding:"20px 18px 0",background:`linear-gradient(180deg,#0D1525,${G.bg})`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <h1 className="gold" style={{fontSize:18,fontWeight:800}}>WC 2026 予想バトル</h1>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:G.win,display:"block",animation:"pulse 1.5s infinite"}}/>
            <span style={{fontSize:10,color:G.win,fontWeight:700,letterSpacing:".06em"}}>LIVE</span>
          </div>
        </div>

        {/* 統計 */}
        <div style={{display:"flex",marginBottom:12}}>
          {[
            {label:"参加者",  val:playerList.length},
            {label:"確定試合",val:`${resultCount}/${MATCHES.length}`},
            {label:"自分の収支",val:mySummary?`${mySummary.profit>=0?"+":""}¥${mySummary.profit.toLocaleString()}`:"--"},
            {label:"優勝P/F", val:`¥${champPool.toLocaleString()}`},
          ].map((s,i)=>(
            <div key={i} style={{flex:1,textAlign:"center",padding:"6px 0",borderRight:i<3?`1px solid ${G.border}`:"none"}}>
              <div style={{
                fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums",
                color:i===2&&mySummary?(mySummary.profit>=0?G.win:G.lose):G.text,
              }}>{s.val}</div>
              <div style={{fontSize:9,color:G.muted,marginTop:1}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 参加者チップ */}
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:12,flexWrap:"wrap"}}>
          <span style={{fontSize:10,color:G.muted}}>参加中：</span>
          {playerList.map(p=>(
            <span key={p.id} style={{
              fontSize:11,fontWeight:600,borderRadius:20,padding:"2px 9px",
              background:p.id===me.id?G.gold:G.card2,
              color:p.id===me.id?G.bg:G.muted,
            }}>{p.name}</span>
          ))}
        </div>

        {/* タブ */}
        <div style={{display:"flex",borderBottom:`1px solid ${G.border}`}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)}
              className={tab===t.key?"tab-ul":""}
              style={{
                flex:1,padding:"10px 0",fontSize:12,background:"none",
                fontWeight:tab===t.key?700:400,
                color:tab===t.key?G.text:G.muted,transition:"color .15s",
              }}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{flex:1,padding:"16px 14px 60px",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>

        {/* 予想タブ */}
        {tab==="picks"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:11,color:G.muted,marginBottom:2}}>
              予想を選んで賭け金を設定 · 結果確定後はロック
            </div>
            {MATCHES.map(g=>(
              <MatchCard key={g.id} game={g}
                myPick={myPicks[g.id]}
                myBet={myMatchBets[g.id]||0}
                onPick={handlePick} onBet={handleBet}
                result={results[g.id]}/>
            ))}
          </div>
        )}

        {/* 試合タブ（結果入力）*/}
        {tab==="matches"&&(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:G.muted,marginBottom:2}}>
              試合をタップして結果を入力できます（全員に反映）
            </div>
            {MATCHES.map(g=>(
              <div key={g.id} className="up">
                <button onClick={()=>setOpenResult(openResult===g.id?null:g.id)} style={{
                  width:"100%",textAlign:"left",
                  background:G.card,
                  border:`1px solid ${results[g.id]?G.win+"44":G.border}`,
                  borderRadius:openResult===g.id?"12px 12px 0 0":12,
                  padding:"12px 14px",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:18}}>{FLAG[g.hc]||"🏳"}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{g.home}</div>
                        <div style={{fontSize:10,color:G.muted}}>{g.winP.h}%</div>
                      </div>
                    </div>
                    <div style={{textAlign:"center",minWidth:62}}>
                      <div style={{fontSize:9,color:G.gold}}>{g.time} JST</div>
                      {results[g.id]?(
                        <div style={{fontSize:11,fontWeight:700,color:G.win,marginTop:1}}>
                          {results[g.id]==="home"?g.home:results[g.id]==="away"?g.away:"引き分け"}
                        </div>
                      ):(
                        <div style={{fontSize:10,color:G.muted,marginTop:1}}>vs</div>
                      )}
                      <div style={{fontSize:9,color:results[g.id]?G.win:G.muted,marginTop:1}}>
                        {results[g.id]?"✓ 確定":"未確定"}
                      </div>
                    </div>
                    <div style={{flex:1,display:"flex",alignItems:"center",gap:6,flexDirection:"row-reverse"}}>
                      <span style={{fontSize:18}}>{FLAG[g.ac]||"🏳"}</span>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:12,fontWeight:600}}>{g.away}</div>
                        <div style={{fontSize:10,color:G.muted}}>{g.winP.a}%</div>
                      </div>
                    </div>
                  </div>
                </button>
                {openResult===g.id&&(
                  <div style={{
                    border:`1px solid ${G.border}`,borderTop:"none",
                    borderRadius:"0 0 12px 12px",padding:12,background:G.card2,
                  }}>
                    <ResultPanel game={g} result={results[g.id]} onSet={setResult} onClear={clearResult}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 順位タブ */}
        {tab==="leaderboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:11,color:G.muted,marginBottom:2}}>試合ベット＋優勝予想の合計収支</div>
            {ranking.map((p,i)=>(
              <div key={p.id} className="up" style={{
                background:p.id===me.id?"linear-gradient(135deg,#1C2A1A,#162012)":
                  i===0&&p.profit>0?"linear-gradient(135deg,#1C2A3A,#1A2234)":G.card,
                border:`1px solid ${p.id===me.id?G.win+"66":i===0&&p.profit>0?G.gold+"55":G.border}`,
                borderRadius:12,padding:"13px 14px",
                display:"flex",alignItems:"center",gap:12,
                animationDelay:`${i*.04}s`,
              }}>
                <span style={{
                  width:28,height:28,borderRadius:"50%",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:800,flexShrink:0,
                  background:i===0?G.gold:i===1?"#94A3B8":i===2?"#CD7F32":G.border,
                  color:i<3?G.bg:G.muted,
                }}>{i+1}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    {p.name}
                    {p.id===me.id&&<span style={{fontSize:9,color:G.win,background:G.win+"22",padding:"1px 7px",borderRadius:10,fontWeight:600}}>あなた</span>}
                  </div>
                  <div style={{fontSize:10,color:G.muted,marginTop:1}}>
                    試合¥{p.matchBetTotal.toLocaleString()} 優勝¥{p.champBet.toLocaleString()} → 払戻¥{p.totalPayout.toLocaleString()}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{
                    fontSize:19,fontWeight:800,fontVariantNumeric:"tabular-nums",
                    color:p.profit>0?G.win:p.profit<0?G.lose:G.muted,
                  }}>{p.profit>=0?"+":""}¥{p.profit.toLocaleString()}</div>
                  <div style={{fontSize:9,color:G.muted}}>収支</div>
                </div>
              </div>
            ))}
            {ranking.length===0&&(
              <div style={{textAlign:"center",padding:"48px 0",color:G.muted,fontSize:13}}>
                まだ参加者がいません
              </div>
            )}
          </div>
        )}

        {/* 優勝予想タブ */}
        {tab==="champ"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* プール */}
            <div style={{
              background:"linear-gradient(135deg,#1C2A3A,#1A2234)",
              border:`1px solid ${G.gold}44`,
              borderRadius:14,padding:"14px 18px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
            }}>
              <div>
                <div style={{fontSize:22,fontWeight:800,color:G.gold,fontVariantNumeric:"tabular-nums"}}>
                  ¥{champPool.toLocaleString()}
                </div>
                <div style={{fontSize:10,color:G.muted}}>優勝予想プール</div>
              </div>
              {champResult&&(
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22}}>{FLAG[champResult]||"🏆"}</div>
                  <div style={{fontSize:12,fontWeight:700,color:G.win}}>
                    {ALL_TEAMS.find(t=>t.code===champResult)?.name}
                  </div>
                  <div style={{fontSize:9,color:G.win}}>優勝確定</div>
                </div>
              )}
            </div>

            {/* ルール */}
            <div style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:12,padding:"12px 14px",fontSize:12,color:G.muted,lineHeight:1.8}}>
              <div style={{color:G.gold,fontWeight:700,fontSize:11,marginBottom:4}}>ルール</div>
              全員のベット額をプールに積立。大会終了後、優勝国を的中した人でベット額比率に応じて山分け。誰も当たらなければ全額没収。
            </div>

            {/* 自分の予想 */}
            {!champResult&&(
              <div style={{background:G.card,border:`1px solid ${G.gold}44`,borderRadius:12,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:11,color:G.muted}}>あなたの優勝予想</div>
                <select
                  value={champPicks[me.id]||""}
                  onChange={e=>setChampPicks(prev=>({...prev,[me.id]:e.target.value}))}
                  style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,color:G.text,padding:"9px 12px",fontSize:14,outline:"none",width:"100%"}}
                >
                  <option value="">国を選んでください</option>
                  {ALL_TEAMS.map(t=>(
                    <option key={t.code} value={t.code}>{FLAG[t.code]||"🏳"} {t.name}</option>
                  ))}
                </select>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:G.muted}}>賭け金：</span>
                  {[500,1000,2000,5000].map(v=>(
                    <button key={v} onClick={()=>setChampBets(prev=>({...prev,[me.id]:v}))} style={{
                      padding:"5px 9px",borderRadius:6,fontSize:11,fontWeight:600,
                      background:(champBets[me.id]||0)===v?G.gold:G.card2,
                      color:(champBets[me.id]||0)===v?G.bg:G.muted,
                      border:`1px solid ${(champBets[me.id]||0)===v?G.gold:G.border}`,
                    }}>¥{v>=1000?v/1000+"k":v}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 全員の予想一覧 */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {playerList.map(p=>{
                const pick=champPicks[p.id], bet=champBets[p.id]||0;
                const hit=!!champResult&&pick===champResult;
                const ps=playerSummary.find(s=>s.id===p.id);
                const net=(ps?.champPayout||0)-bet;
                return(
                  <div key={p.id} style={{
                    background:G.card,
                    border:`1px solid ${p.id===me.id?G.gold+"44":G.border}`,
                    borderRadius:10,padding:"10px 14px",
                    display:"flex",alignItems:"center",gap:10,
                  }}>
                    <span style={{fontSize:20}}>{FLAG[pick]||"🏳"}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
                        {p.name}
                        {p.id===me.id&&<span style={{fontSize:9,color:G.gold}}>あなた</span>}
                      </div>
                      <div style={{fontSize:11,color:G.muted,marginTop:1}}>
                        {ALL_TEAMS.find(t=>t.code===pick)?.name||"未選択"} · ¥{bet.toLocaleString()}
                      </div>
                    </div>
                    {champResult&&(
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",color:net>0?G.win:net<0?G.lose:G.muted}}>
                          {net>=0?"+":""}¥{net.toLocaleString()}
                        </div>
                        <div style={{fontSize:9,color:hit?G.win:G.muted}}>{hit?"✓ 的中":"✗ 外れ"}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 優勝国確定 */}
            {!champResult&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:"12px 14px"}}>
                <div style={{fontSize:11,color:G.muted,marginBottom:8}}>優勝国を確定（大会終了後）</div>
                <div style={{display:"flex",gap:8}}>
                  <select
                    value={champSelVal}
                    onChange={e=>setChampSelVal(e.target.value)}
                    style={{flex:1,background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,color:G.text,padding:"8px 10px",fontSize:13,outline:"none"}}
                  >
                    {ALL_TEAMS.map(t=>(
                      <option key={t.code} value={t.code}>{FLAG[t.code]||""} {t.name}</option>
                    ))}
                  </select>
                  <button onClick={()=>champSelVal&&setChampResult(champSelVal)} style={{
                    background:G.gold,color:G.bg,borderRadius:8,
                    padding:"8px 14px",fontSize:13,fontWeight:700,border:"none",
                  }}>確定</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
