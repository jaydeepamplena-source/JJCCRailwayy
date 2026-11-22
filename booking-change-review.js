(() => {
'use strict';
const URL='https://ocjyyfzuoiprwajwyize.supabase.co',KEY='sb_publishable_XZu8suOKCWB9Zp7dYhzxgQ_Yaq5zxo8';
const db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const peso=n=>'₱'+Number(n||0).toFixed(2);
const lines=c=>[c.travel_date?`Travel date → ${c.travel_date}`:null,c.booking_class?`Upgrade class → ${c.booking_class}`:null,...(c.passengers||[]).map(p=>`Add passenger → ${p.full_name}`)].filter(Boolean).join('\n');
let rows=[];
function message(t,error=false){$('#bcrMessage').textContent=t;$('#bcrMessage').className='notice'+(error?' error':'');}
async function init(){
 try{
  const {data:{user},error}=await db.auth.getUser();if(error)throw error;if(!user){location.href='index.html';return;}
  const {data:role,error:re}=await db.rpc('current_user_role');if(re)throw re;
  if(!['admin','super_admin'].includes(role)){location.href='index.html';return;}
  if(role==='super_admin')$('#backDash').href='superadmin.html';
  await load();
 }catch(e){message(e.message||'Unable to load requests.',true);}
}
async function load(){
 message('Loading modification requests…');
 const {data,error}=await db.from('booking_change_requests').select('*').order('created_at',{ascending:false});
 if(error)throw error;
 const ids=(data||[]).map(x=>x.request_id);
 let subs=[];
 if(ids.length){const {data:s,error:se}=await db.from('booking_change_payment_submissions').select('*').in('request_id',ids).order('submitted_at',{ascending:false});if(se)throw se;subs=s||[];}
 rows=(data||[]).map(r=>({...r,submissions:subs.filter(s=>s.request_id===r.request_id)}));
 render();
}
function render(){
 const f=$('#bcrFilter').value;
 const shown=rows.filter(r=>f==='all'?true:f==='pending_review'?r.status==='pending_review':r.status===f);
 $('#bcrList').innerHTML=shown.length?shown.map(r=>{
  const latest=r.submissions[0];
  return `<article class="request"><div class="actions" style="justify-content:space-between"><strong>Request #${r.request_id} · ${esc(r.booking_reference)}</strong><b>${esc(r.status.replaceAll('_',' ').toUpperCase())}</b></div>
  <div class="details">${esc(lines(r.requested_changes))}\n\nAmount due: ${peso(r.amount_due)}\nDeadline: ${new Date(r.payment_deadline_at).toLocaleString('en-PH')}\nCustomer ID: ${esc(r.user_id)}</div>
  <p>Latest receipt: ${latest?esc(latest.status)+' · '+new Date(latest.submitted_at).toLocaleString('en-PH'):'No receipt submitted'}</p>
  ${latest?.status==='pending_review'?`<div class="actions"><button class="open" data-receipt="${latest.submission_id}">View receipt</button></div><textarea id="bcr-note-${latest.submission_id}" placeholder="Optional note / rejection reason"></textarea><div class="actions" style="margin-top:8px"><button class="approve" data-review="approved" data-id="${latest.submission_id}">Approve all changes</button><button class="reject" data-review="rejected" data-id="${latest.submission_id}">Reject receipt</button></div>`:''}
  ${r.admin_note?`<p class="muted">Admin note: ${esc(r.admin_note)}</p>`:''}</article>`;
 }).join(''):'<p>No booking change requests in this filter.</p>';
 message(`${shown.length} request(s) shown. Verify the receipt amount and details before approving.`);
}
$('#bcrFilter').addEventListener('change',render);
$('#bcrRefresh').addEventListener('click',()=>load().catch(e=>message(e.message,true)));
$('#bcrList').addEventListener('click',async e=>{
 const open=e.target.closest('[data-receipt]'),review=e.target.closest('[data-review]');
 try{
  if(open){const row=rows.flatMap(r=>r.submissions).find(s=>s.submission_id===Number(open.dataset.receipt));const {data,error}=await db.storage.from('payment-receipts').createSignedUrl(row.receipt_path,300);if(error)throw error;window.open(data.signedUrl,'_blank','noopener');}
  if(review){const id=Number(review.dataset.id),decision=review.dataset.review,note=$(`#bcr-note-${id}`).value.trim();if(!confirm(`${decision==='approved'?'Approve and apply ALL requested changes':'Reject this modification payment'}?`))return;review.disabled=true;const {data,error}=await db.rpc('review_booking_change_request',{p_submission_id:id,p_decision:decision,p_admin_note:note||null});if(error)throw error;if(!data?.success)throw new Error('Review was not saved.');message(decision==='approved'?'All requested changes were approved and applied.':'Receipt rejected.');await load();}
 }catch(err){message(err.message||'Unable to process request.',true);}
});
init();
})();