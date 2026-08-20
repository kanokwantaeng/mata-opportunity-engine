import { calculateScore } from './shared/scoring.js';

const state = { opportunities: [], current: null, evidence: [], assumptions: [], analysis: null };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const accessKey = () => localStorage.getItem('mata_access_key') || '';

function go(id){ $$('.screen').forEach(x=>x.classList.remove('active')); $('#'+id).classList.add('active'); $$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===id)); window.scrollTo(0,0); }
$$('.nav button').forEach(b=>b.onclick=()=>{go(b.dataset.go); if(b.dataset.go==='opportunities') loadOpportunities();});

async function api(path, options={}) {
  const headers = { 'content-type':'application/json', 'x-mata-access-key':accessKey(), ...(options.headers||{}) };
  const res = await fetch('/api/'+path, {...options, headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function pill(text, cls=''){ return `<span class="pill ${cls}">${escapeHtml(text||'—')}</span>`; }

async function loadOpportunities(){
  try { const {data}=await api('opportunities'); state.opportunities=data||[]; renderList(); renderCounts(); }
  catch(e){ $('#opportunityList').innerHTML=`<div class="notice">${escapeHtml(e.message)} — ไปที่ Settings เพื่อตั้ง Access Key หรือเชื่อม backend</div>`; }
}
function renderCounts(){ $('#countAll').textContent=state.opportunities.length; $('#countTest').textContent=state.opportunities.filter(x=>x.current_decision==='TEST').length; $('#countBuild').textContent=state.opportunities.filter(x=>x.current_decision==='BUILD').length; $('#nextActions').innerHTML=state.opportunities.length?state.opportunities.slice(0,3).map(x=>`<div class="item" data-id="${x.id}"><b>${escapeHtml(x.title)}</b><div class="helper">${x.current_decision||'ยังไม่ประเมิน'} · ${x.current_confidence||'ยังไม่มี confidence'}</div></div>`).join(''):'ยังไม่มีข้อมูล'; $$('#nextActions .item').forEach(el=>el.onclick=()=>openOpportunity(el.dataset.id)); }
function renderList(){ $('#opportunityList').innerHTML=state.opportunities.length?state.opportunities.map(x=>`<div class="item" data-id="${x.id}"><div class="row" style="justify-content:space-between"><b>${escapeHtml(x.title)}</b><div>${pill(x.current_decision||'NOT READY',x.current_decision==='BUILD'?'ok':x.current_decision==='PARK'?'danger':'warn')} ${pill(x.current_confidence||'LOW')}</div></div><div class="helper">Score ${x.current_score??'—'} · ${escapeHtml(x.status)}</div></div>`).join(''):'<div class="empty">ยังไม่มี Opportunity</div>'; $$('#opportunityList .item').forEach(el=>el.onclick=()=>openOpportunity(el.dataset.id)); }

$('#saveAccess').onclick=()=>{ localStorage.setItem('mata_access_key',$('#accessKey').value.trim()); $('#settingsStatus').textContent='บันทึกแล้ว'; };
$('#accessKey').value=accessKey();

$('#analyzeBtn').onclick=async()=>{
  const raw=$('#idea').value.trim(); if(!raw)return;
  $('#analyzeStatus').textContent='กำลังวิเคราะห์...';
  try{
    const analyzed=await api('analyze',{method:'POST',body:JSON.stringify({raw_input:raw})});
    state.analysis=analyzed.data;
    const title=state.analysis.product_hypotheses?.[0]?.name || raw.slice(0,70);
    const created=await api('opportunities',{method:'POST',body:JSON.stringify({title,raw_input:raw,opportunity_type:state.analysis.opportunity_types||[],status:'NEEDS_EVIDENCE'})});
    state.current=created.data;
    for(const a of state.analysis.assumptions||[]){ await api('evidence',{method:'POST',body:JSON.stringify({kind:'assumption',opportunity_id:state.current.id,statement:a.statement,status:'UNKNOWN',impact:a.impact||'MEDIUM',category:a.category||'',ai_generated:true})}); }
    sessionStorage.setItem('mata_analysis_'+state.current.id,JSON.stringify(state.analysis));
    $('#analyzeStatus').textContent='สร้าง Opportunity แล้ว'; await openOpportunity(state.current.id);
  }catch(e){ $('#analyzeStatus').textContent=e.message; }
};

async function openOpportunity(id){
  try{
    const [{data}, ev]=await Promise.all([api('opportunities?id='+encodeURIComponent(id)),api('evidence?opportunity_id='+encodeURIComponent(id))]);
    state.current=data; state.evidence=ev.evidence||[]; state.assumptions=ev.assumptions||[];
    try{state.analysis=JSON.parse(sessionStorage.getItem('mata_analysis_'+id)||'null')}catch{state.analysis=null}
    renderDetail(); go('detail');
  }catch(e){alert(e.message)}
}

function renderDetail(){
  const o=state.current; $('#dTitle').textContent=o.title; $('#dRaw').textContent=o.raw_input; $('#dDecision').textContent=o.current_decision||'NOT READY'; $('#dConfidence').textContent='Confidence: '+(o.current_confidence||'LOW');
  const a=state.analysis;
  $('#analysisContent').innerHTML=a?`<p><b>คนจ่าย:</b> ${escapeHtml(a.buyer_hypothesis?.payer_description||'—')}</p><p><b>คนใช้:</b> ${escapeHtml(a.buyer_hypothesis?.user_description||'—')}</p><p><b>ผลลัพธ์ที่ต้องการ:</b> ${escapeHtml(a.buyer_hypothesis?.desired_outcome||'—')}</p><p><b>Product Options:</b></p>${(a.product_hypotheses||[]).map(p=>`<div class="item"><b>${p.rank}. ${escapeHtml(p.name)}</b><div class="helper">${escapeHtml(p.description)} · ราคา hypothesis ฿${p.price_hypothesis||0}</div></div>`).join('')}`:'<div class="helper">Analysis draft ไม่ได้เก็บถาวรใน V1 foundation นี้; Product tables จะเชื่อมในรอบถัดไป</div>';
  $('#assumptionList').innerHTML=state.assumptions.length?state.assumptions.map(x=>`<div class="item"><b>${escapeHtml(x.statement)}</b><div class="helper">${x.status} · Impact ${x.impact}</div></div>`).join(''):'ยังไม่มี';
  $('#evidenceList').innerHTML=state.evidence.length?state.evidence.map(x=>`<div class="item"><b>${escapeHtml(x.summary)}</b><div class="helper">${x.source_type} · ${x.strength}</div></div>`).join(''):'ยังไม่มี';
  if(o.current_score!=null) $('#scorecard').innerHTML=`<div class="row"><div><div class="kpi">${o.current_score}</div><div class="helper">Overall Score</div></div><div>${pill(o.current_decision||'TEST',o.current_decision==='BUILD'?'ok':o.current_decision==='PARK'?'danger':'warn')} ${pill(o.current_confidence||'LOW')}</div></div>`;
}

$('#addEvidenceBtn').onclick=async()=>{
  const text=$('#evidenceText').value.trim(); if(!text||!state.current)return;
  try{await api('evidence',{method:'POST',body:JSON.stringify({kind:'evidence',opportunity_id:state.current.id,source_type:$('#evidenceType').value,summary:text,raw_text:text,direction:'SUPPORTS',strength:$('#evidenceStrength').value,confidence:'MEDIUM'})}); $('#evidenceText').value=''; await openOpportunity(state.current.id);}catch(e){alert(e.message)}
};

$('#rescoreBtn').onclick=async()=>{
  if(!state.current)return;
  // Foundation defaults: editable scoring UI will be added next. These values are deliberately conservative.
  const payload={opportunity_id:state.current.id,scores:{demand:12,motivation:10,buyer:10,competition:6,differentiation:7,buildability:8,economics:10,scale:3},evidence:state.evidence,assumptions:state.assumptions,buyerClarity:3,marginViable:true,redFlags:[]};
  try{const {result}=await api('score',{method:'POST',body:JSON.stringify(payload)}); $('#scorecard').innerHTML=`<div class="row"><div><div class="kpi">${result.overall_score}</div><div class="helper">Overall Score</div></div><div>${pill(result.decision,result.decision==='BUILD'?'ok':result.decision==='PARK'?'danger':'warn')} ${pill(result.confidence)}</div></div><p>${escapeHtml(result.decision_reason)}</p>`; await loadOpportunities();}catch(e){alert(e.message)}
};

loadOpportunities();
