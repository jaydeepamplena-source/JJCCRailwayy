(() => {
  'use strict';
  const URL='https://ocjyyfzuoiprwajwyize.supabase.co';
  const KEY='sb_publishable_XZu8suOKCWB9Zp7dYhzxgQ_Yaq5zxo8';
  const db=window.supabase.createClient(URL,KEY);
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const peso=n=>'₱'+Number(n||0).toFixed(2);
  const fmt=d=>d?new Date(d).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'—';
  const statusLabel=s=>String(s||'').replaceAll('_',' ');
  async function currentUser(){const {data,error}=await db.auth.getUser();if(error)throw error;if(!data.user){location.href='index.html';throw new Error('Please sign in first.');}return data.user;}
  function changeLines(changes){
    const out=[];
    if(changes.travel_date)out.push(`Travel date: ${changes.travel_date}`);
    if(changes.booking_class)out.push(`Class upgrade: ${changes.booking_class}`);
    (changes.passengers||[]).forEach(p=>out.push(`Additional passenger: ${p.full_name}`));
    return out.join('\n')||'No changes listed';
  }
  async function initHistory(){
    const message=$('#changeHistoryMessage'),list=$('#changeHistoryList');
    try{
      const user=await currentUser();
      const {data,error}=await db.from('booking_change_requests').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
      if(error)throw error;
      if(!data?.length){message.textContent='You have no booking modification requests yet.';list.innerHTML='';return;}
      message.textContent='Your modification requests are shown below.';
      list.innerHTML=data.map(r=>`<article class="bc-request"><div class="bc-row"><strong>Request #${r.request_id} · ${esc(r.booking_reference)}</strong><span class="bc-status ${esc(r.status)}">${esc(statusLabel(r.status))}</span></div><p>${esc(changeLines(r.requested_changes)).replaceAll('\n','<br>')}</p><div class="bc-row"><span>Amount: <b>${peso(r.amount_due)}</b></span><small>Created: ${fmt(r.created_at)}</small></div>${['pending_payment','rejected'].includes(r.status)?`<p>Payment deadline: <b>${fmt(r.payment_deadline_at)}</b></p><a class="btn-primary" href="booking-change-payment.html?id=${r.request_id}">Continue Payment</a>`:''}${r.admin_note?`<p class="notice notice-warn">${esc(r.admin_note)}</p>`:''}</article>`).join('');
    }catch(e){message.textContent=e.message||'Unable to load booking changes.';message.className='notice notice-err';}
  }
  async function initPayment(){
    const id=new URLSearchParams(location.search).get('id');
    const message=$('#mcpMessage'),panel=$('#mcpPayPanel'),submit=$('#mcpSubmit'),cancel=$('#mcpCancel'),file=$('#mcpReceipt');
    const preview=$('#mcpReceiptPreview'),previewName=$('#mcpReceiptFileName'),previewImage=$('#mcpReceiptImagePreview');
    let previewUrl=null;
    if(!id){message.textContent='Missing modification request ID.';return;}
    try{
      const user=await currentUser();
      const {data:r,error}=await db.from('booking_change_requests').select('*').eq('request_id',id).eq('user_id',user.id).maybeSingle();
      if(error)throw error;if(!r)throw new Error('Modification request not found.');
      $('#mcpRef').textContent=r.booking_reference;
      $('#mcpAmount').textContent=peso(r.amount_due);
      if($('#mcpExactAmount')) $('#mcpExactAmount').textContent=peso(r.amount_due);
      $('#mcpDeadline').textContent=fmt(r.payment_deadline_at);
      $('#mcpStatus').textContent=statusLabel(r.status);
      $('#mcpChanges').textContent=changeLines(r.requested_changes);

      // Match the standard ticket-payment page: copyable bank details and receipt preview.
      document.querySelectorAll('[data-copy]').forEach(button=>{
        button.addEventListener('click',async()=>{
          try{
            await navigator.clipboard.writeText(button.dataset.copy);
            const old=button.textContent;button.textContent='Copied!';
            setTimeout(()=>button.textContent=old,1400);
          }catch(e){message.textContent='Unable to copy. Please copy the details manually.';}
        });
      });
      file.addEventListener('change',()=>{
        const f=file.files?.[0];
        if(!f){preview.classList.remove('show');return;}
        previewName.textContent=f.name;
        if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
        if(f.type.startsWith('image/')){
          previewUrl=URL.createObjectURL(f);
          previewImage.src=previewUrl;previewImage.hidden=false;
        }else{previewImage.hidden=true;previewImage.removeAttribute('src');}
        preview.classList.add('show');
      });
      $('#mcpRemoveReceipt')?.addEventListener('click',()=>{
        file.value='';
        if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
        previewImage.removeAttribute('src');previewImage.hidden=true;
        preview.classList.remove('show');
      });
      const deadline=new Date(r.payment_deadline_at).getTime();
      if(r.status==='pending_review'){message.textContent='Your receipt is already submitted and is awaiting Admin review.';return;}
      if(r.status!=='pending_payment' && r.status!=='rejected'){message.textContent=`This request is ${statusLabel(r.status)} and cannot accept payment.`;return;}
      if(deadline<=Date.now()){message.textContent='The 10-minute payment deadline has expired. This modification request can no longer be paid.';return;}
      panel.hidden=false;
      const tick=()=>{const left=Math.max(0,deadline-Date.now());const sec=Math.floor(left/1000);$('#mcpDeadline').textContent=`${Math.floor(sec/60)}m ${String(sec%60).padStart(2,'0')}s remaining`;if(left<=0){panel.hidden=true;message.textContent='Payment deadline expired. Your original booking remains unchanged.';}};
      tick();const timer=setInterval(()=>{tick();if(deadline<=Date.now())clearInterval(timer);},1000);
      submit.addEventListener('click',async()=>{
        const f=file.files?.[0];if(!f){message.textContent='Please choose your receipt image.';return;}
        if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type)){message.textContent='Upload a JPG, PNG, WEBP, or PDF receipt.';return;}
        if(f.size>5*1024*1024){message.textContent='Receipt must be 5 MB or smaller.';return;}
        if(Date.now()>=deadline){message.textContent='The payment deadline has expired.';panel.hidden=true;return;}
        submit.disabled=true;submit.textContent='Uploading receipt…';
        let path='';
        try{
          const safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
          path=`${user.id}/change-${r.request_id}/${Date.now()}-${safe}`;
          const {error:upErr}=await db.storage.from('payment-receipts').upload(path,f,{upsert:false,contentType:f.type});
          if(upErr)throw upErr;
          const {data:res,error:rpcErr}=await db.rpc('submit_booking_change_receipt',{p_request_id:Number(id),p_receipt_path:path});
          if(rpcErr)throw rpcErr;
          panel.hidden=true;message.textContent='Receipt submitted successfully. Your combined modification is now awaiting Admin approval.';
          $('#mcpStatus').textContent='Pending review';
        }catch(e){
          if(path)await db.storage.from('payment-receipts').remove([path]);
          message.textContent=e.message||'Unable to submit receipt.';
          submit.disabled=false;submit.textContent='Submit Receipt for Admin Review';
        }
      });
      cancel.addEventListener('click',async()=>{
        if(!confirm('Cancel this unpaid modification request? Your original booking will remain unchanged.'))return;
        cancel.disabled=true;
        const {error}=await db.rpc('cancel_booking_change_request',{p_request_id:Number(id)});
        if(error){message.textContent=error.message;cancel.disabled=false;return;}
        clearInterval(timer);panel.hidden=true;message.textContent='Modification request cancelled. Your original booking is unchanged.';
        $('#mcpStatus').textContent='Cancelled';
      });
    }catch(e){message.textContent=e.message||'Unable to load payment request.';}
  }
  document.addEventListener('DOMContentLoaded',()=>{const page=document.body.dataset.page;if(page==='booking-changes')initHistory();if(page==='booking-change-payment')initPayment();});
})();