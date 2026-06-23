
const express=require('express');
const session=require('express-session');
const fs=require('fs');
const mineflayer=require('mineflayer');

const app=express();
const PORT=process.env.PORT||3000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'));
app.use(session({secret:process.env.DASHBOARD_PASSWORD||'admin',resave:false,saveUninitialized:false}));

const SETTINGS_FILE='settings.json';
let settings=fs.existsSync(SETTINGS_FILE)?JSON.parse(fs.readFileSync(SETTINGS_FILE)):
{host:process.env.SERVER_IP||'localhost',port:Number(process.env.SERVER_PORT||25565),username:process.env.BOT_NAME||'RenderBot',
password:'admin',features:{logs:true,chat:true,players:true,health:true,autoreconnect:true}};

let bot=null;
let logs=[];

function save(){fs.writeFileSync(SETTINGS_FILE,JSON.stringify(settings,null,2));}
function log(m){logs.push(`[${new Date().toLocaleTimeString()}] ${m}`); if(logs.length>200) logs.shift(); console.log(m);}

function connectBot(){
 if(bot) try{bot.quit();}catch(e){}
 bot=mineflayer.createBot({host:settings.host,port:settings.port,username:settings.username});
 bot.on('login',()=>log('Bot logged in'));
 bot.on('chat',(u,m)=>log(`<${u}> ${m}`));
 bot.on('kicked',(r)=>{log('Kicked'); if(settings.features.autoreconnect) setTimeout(connectBot,5000);});
 bot.on('error',(e)=>log('Error '+e.message));
}
connectBot();

function auth(req,res,next){ if(req.session.ok) return next(); res.redirect('/login.html'); }

app.post('/login',(req,res)=>{ if(req.body.password===settings.password){req.session.ok=true;} res.redirect('/'); });
app.get('/api/status',auth,(req,res)=>res.json({
 online:!!bot, logs,
 players: bot?Object.keys(bot.players):[],
 health: bot?.health ?? 0,
 food: bot?.food ?? 0,
 settings
}));
app.post('/api/chat',auth,(req,res)=>{ if(bot&&req.body.message) bot.chat(req.body.message); res.json({ok:true}); });
app.post('/api/toggle',auth,(req,res)=>{ settings.features[req.body.feature]=!!req.body.value; save(); res.json({ok:true}); });

app.get('/',auth,(req,res)=>res.sendFile(require('path').join(__dirname,'public/index.html')));
app.listen(PORT,()=>console.log('Dashboard on '+PORT));
