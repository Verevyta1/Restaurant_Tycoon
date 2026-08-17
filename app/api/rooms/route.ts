import { env } from "cloudflare:workers";

type RoomSettings = { startingCash:number; maxRounds:number; playerLimit:2|3|4; winCondition:"wealth"|"property"; gameMode:"round20"|"survival" };
type RoomRow = { code:string; status:string; game_state:string|null; settings:string|null; updated_at:number };
type PlayerRow = { id:string; name:string; seat:number; is_host:number };

const json = (body:unknown,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const cleanName = (value:unknown) => typeof value==="string" ? value.trim().slice(0,24) : "";
const cleanCode = (value:unknown) => typeof value==="string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6) : "";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => Array.from({length:6},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join("");
const cleanSettings = (value:unknown):RoomSettings => {
  const raw=(value&&typeof value==="object"?value:{}) as Record<string,unknown>;
  const startingCash=Math.max(500,Math.min(10000,Math.round(Number(raw.startingCash)||1500)));
  const maxRounds=Math.max(5,Math.min(100,Math.round(Number(raw.maxRounds)||20)));
  const playerLimit=([2,3,4].includes(Number(raw.playerLimit))?Number(raw.playerLimit):4) as 2|3|4;
  const winCondition=raw.winCondition==="property"?"property":"wealth";
  const gameMode=raw.gameMode==="survival"?"survival":"round20";
  return {startingCash,maxRounds,playerLimit,winCondition,gameMode};
};

async function ensureSchema(){
  const db=env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'lobby', game_state TEXT, settings TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS room_players (id TEXT PRIMARY KEY, room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE, name TEXT NOT NULL, token TEXT NOT NULL UNIQUE, seat INTEGER NOT NULL, is_host INTEGER NOT NULL DEFAULT 0, last_seen_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_room_players_room_code ON room_players(room_code)"),
  ]);
  const columns=await db.prepare("PRAGMA table_info(rooms)").all<{name:string}>();
  if(!columns.results.some(column=>column.name==="settings"))await db.prepare("ALTER TABLE rooms ADD COLUMN settings TEXT").run();
}

async function roomView(code:string){
  const room=await env.DB.prepare("SELECT code,status,game_state,settings,updated_at FROM rooms WHERE code=?").bind(code).first<RoomRow>();
  if(!room)return null;
  const players=await env.DB.prepare("SELECT id,name,seat,is_host FROM room_players WHERE room_code=? ORDER BY seat").bind(code).all<PlayerRow>();
  return {code:room.code,status:room.status,gameState:room.game_state?JSON.parse(room.game_state):null,settings:room.settings?cleanSettings(JSON.parse(room.settings)):cleanSettings(null),updatedAt:room.updated_at,players:players.results.map(p=>({id:p.id,name:p.name,seat:p.seat,isHost:Boolean(p.is_host)}))};
}

async function authenticate(code:string,token:string){
  return env.DB.prepare("SELECT id,is_host FROM room_players WHERE room_code=? AND token=?").bind(code,token).first<{id:string;is_host:number}>();
}

export async function GET(request:Request){
  try{
    await ensureSchema();
    const code=cleanCode(new URL(request.url).searchParams.get("code"));
    if(code.length!==6)return json({error:"请输入有效的 6 位房间代码。"},400);
    const room=await roomView(code);
    return room?json({room}):json({error:"没有找到这个房间。"},404);
  }catch(error){return json({error:error instanceof Error?error.message:"房间服务暂时不可用。"},500)}
}

export async function POST(request:Request){
  try{
    await ensureSchema();
    const body=await request.json() as Record<string,unknown>;
    const action=String(body.action||"");
    const now=Date.now();
    if(action==="create"){
      const name=cleanName(body.name); if(!name)return json({error:"请输入你的昵称。"},400);
      const settings=cleanSettings(body.settings);
      let code=makeCode();
      for(let i=0;i<4;i++){const exists=await env.DB.prepare("SELECT 1 FROM rooms WHERE code=?").bind(code).first();if(!exists)break;code=makeCode()}
      const id=crypto.randomUUID(),token=crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO rooms(code,status,settings,created_at,updated_at) VALUES(?,?,?,?,?)").bind(code,"lobby",JSON.stringify(settings),now,now),
        env.DB.prepare("INSERT INTO room_players(id,room_code,name,token,seat,is_host,last_seen_at) VALUES(?,?,?,?,?,?,?)").bind(id,code,name,token,0,1,now),
      ]);
      return json({room:await roomView(code),auth:{playerId:id,token,isHost:true}},201);
    }
    const code=cleanCode(body.code); if(code.length!==6)return json({error:"请输入有效的 6 位房间代码。"},400);
    if(action==="join"){
      const name=cleanName(body.name);if(!name)return json({error:"请输入你的昵称。"},400);
      const room=await roomView(code);if(!room)return json({error:"没有找到这个房间。"},404);
      if(room.status!=="lobby")return json({error:"这局游戏已经开始了。"},409);
      if(room.players.length>=room.settings.playerLimit)return json({error:"房间已经满员。"},409);
      const used=new Set(room.players.map(p=>p.seat));let seat=0;while(used.has(seat))seat++;
      const id=crypto.randomUUID(),token=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO room_players(id,room_code,name,token,seat,is_host,last_seen_at) VALUES(?,?,?,?,?,?,?)").bind(id,code,name,token,seat,0,now).run();
      await env.DB.prepare("UPDATE rooms SET updated_at=? WHERE code=?").bind(now,code).run();
      return json({room:await roomView(code),auth:{playerId:id,token,isHost:false}},201);
    }
    const token=typeof body.token==="string"?body.token:"";const member=await authenticate(code,token);
    if(!member)return json({error:"你不是这个房间的成员。"},403);
    if(action==="leave"){
      const room=await roomView(code);if(!room)return json({error:"没有找到这个房间。"},404);
      if(room.status!=="lobby")return json({error:"游戏已经开始，无法从等待页面取消房间。"},409);
      if(member.is_host){
        await env.DB.batch([
          env.DB.prepare("DELETE FROM room_players WHERE room_code=?").bind(code),
          env.DB.prepare("DELETE FROM rooms WHERE code=?").bind(code),
        ]);
        return json({ok:true,cancelled:true});
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM room_players WHERE room_code=? AND id=?").bind(code,member.id),
        env.DB.prepare("UPDATE rooms SET updated_at=? WHERE code=?").bind(now,code),
      ]);
      return json({ok:true,cancelled:false});
    }
    if(action==="start"){
      if(!member.is_host)return json({error:"只有房主可以开始游戏。"},403);
      const state=JSON.stringify(body.gameState??null);if(state.length>180000)return json({error:"游戏状态过大。"},413);
      await env.DB.prepare("UPDATE rooms SET status='active',game_state=?,updated_at=? WHERE code=?").bind(state,now,code).run();
      return json({room:await roomView(code)});
    }
    if(action==="sync"){
      const state=JSON.stringify(body.gameState??null);if(state.length>180000)return json({error:"游戏状态过大。"},413);
      await env.DB.prepare("UPDATE rooms SET game_state=?,updated_at=? WHERE code=? AND status='active'").bind(state,now,code).run();
      return json({ok:true,updatedAt:now});
    }
    return json({error:"不支持的操作。"},400);
  }catch(error){return json({error:error instanceof Error?error.message:"房间服务暂时不可用。"},500)}
}
