import 'dotenv/config';
import axios from 'axios';
import mysql from 'mysql2/promise';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 469회차부터 이미지가 아님. 아직 작업을 안 한건지 뭔지는 모르겠음.
// https://ihq.co.kr/channel/program/tip/?s_no=538&p_id=235
// 538이 회차명.


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


function toRad(d) { return (d * Math.PI) / 180; }
function haversineMeters(a, b) {
    if (!a || !b) return Infinity;
    const R=6371000, dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
    const s1 = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s1));
}
function normalizeName(s='') {
    return s
        .toLowerCase()
        .replace(/\s+/g,'')
        .replace(/[^\p{Letter}\p{Number}]/gu,'')
        .replace(/점|본점|지점|본관|별관|식당|맛집$/g,'');
}
function tokenizeAddr(s=''){
    return s
        .replace(/[^\p{Letter}\p{Number}\s]/gu,' ')
        .split(/\s+/).filter(Boolean)
        .map(w=>w.toLowerCase())
        .filter(w=>!['대한민국','도로명','도로','번길','길','구','동','읍','면','리','호','지하','지상','층'].includes(w));
}
function levenshtein(a='',b=''){
    const m = a.length;
    const n = b.length;
    const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
    
    for(let i = 0; i <= m; i++) dp[i][0] = i;
    for(let j = 0; j <= n; j++) dp[0][j] = j;
    for(let i = 1; i <= m; i++){
        for(let j = 1; j <= n; j++) {
            const cost = a[i-1] === b[j-1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
        }
    }
    return dp[m][n];
}

function jaccard(A=[],B=[]){
    const SA = new Set(A), SB = new Set(B);
    const inter = [...SA].filter(x=>SB.has(x)).length;
    const uni = new Set([...SA,...SB]).size||1; return inter/uni; }
function normalizePhone(p=''){ return p.replace(/[^\d]/g,''); }

async function kakaoSearchKeyword({query,x,y,radius=300,size=5}){
    const url = 'https://dapi.kakao.com/v2/local/search/keyword.json';
    const params = { query, size };
    if (x && y) Object.assign(params, { x, y, radius });
    const { data } = await axios.get(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, params });
    return data.documents || [];
}

function scoreCandidate(row, cand){
    const aName = normalizeName(row.name);
    const bName = normalizeName(cand.place_name||'');
    const nameDist = levenshtein(aName,bName);
    const nameScore = 1 - nameDist / Math.max(aName.length,bName.length,1);
    const addrScore = jaccard(tokenizeAddr(row.address||''), tokenizeAddr(cand.road_address_name||cand.address_name||''));
    const meters = haversineMeters({lat:row.latitude,lng:row.longitude},{lat:Number(cand.y),lng:Number(cand.x)});
    const geoScore = isFinite(meters) ? Math.max(0, Math.min(1, 1 - meters/200)) : 0;
    const score = 0.5*nameScore + 0.3*addrScore + 0.2*geoScore;
    const phoneMatch = !!(row.phone && cand.phone && normalizePhone(row.phone)===normalizePhone(cand.phone));
    return { score, nameScore, addrScore, geoScore, meters:Math.round(meters), phoneMatch };
}

async function main(){
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'Born2Eat',
        connectionLimit: 5
    });

    const [rows] = await pool.query(
        `SELECT id, name, address, latitude, longitude, phone FROM Restaurants ORDER BY id ASC`
    );

    const accept=0.75, review=0.55;
    for (const r of rows){
        try{
        const cands = await kakaoSearchKeyword({ query:r.name, x:r.longitude, y:r.latitude, radius:300, size:5 });
        if (!cands.length){ console.log(`[MISS] #${r.id} ${r.name}`); continue; }
        let best=null;
        for (const c of cands){ const s=scoreCandidate(r,c); if(!best || s.score>best.s.score) best={c,s}; }
        const c=best.c, s=best.s;
        const status = s.score>=accept ? 'ACCEPT' : (s.score>=review ? 'REVIEW' : 'MISS');
        console.log(`[${status}] #${r.id} ${r.name} -> ${c.place_name} (score=${s.score.toFixed(3)}, m=${s.meters}, phone=${s.phoneMatch?'=':'!='})`);

        await pool.query(`
            INSERT INTO Restaurant_Kakao_Link
            (restaurant_id, kakao_id, place_name, address_name, road_address, phone, x, y, place_url, category_code,
            distance_m, score, name_score, addr_score, geo_score, phone_match, matched_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())
            ON DUPLICATE KEY UPDATE
            kakao_id=VALUES(kakao_id),
            place_name=VALUES(place_name),
            address_name=VALUES(address_name),
            road_address=VALUES(road_address),
            phone=VALUES(phone),
            x=VALUES(x), y=VALUES(y),
            place_url=VALUES(place_url),
            category_code=VALUES(category_code),
            distance_m=VALUES(distance_m),
            score=VALUES(score),
            name_score=VALUES(name_score),
            addr_score=VALUES(addr_score),
            geo_score=VALUES(geo_score),
            phone_match=VALUES(phone_match),
            matched_at=NOW()
        `, [
            r.id,
            c.id, c.place_name, c.address_name || null, c.road_address_name || null, c.phone || null,
            c.x ? Number(c.x) : null, c.y ? Number(c.y) : null,
            c.place_url || null, c.category_group_code || null,
            s.meters, Number(s.score.toFixed(3)), Number(s.nameScore.toFixed(3)),
            Number(s.addrScore.toFixed(3)), Number(s.geoScore.toFixed(3)),
            s.phoneMatch ? 1 : 0
        ]);

        await new Promise(res=>setTimeout(res,120));  // QPS 완화
        }catch(e){
        console.error(`[ERR] #${r.id} ${r.name}:`, e.response?.data || e.message);
        await new Promise(res=>setTimeout(res,500));
        }
    }
    await pool.end();
}

main();