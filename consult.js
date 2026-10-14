/* MM LAB 상담 접수 공용 모듈 — consult.js
   ─────────────────────────────────────────────────────────────
   · 창호 페이지는 창호 상담, 인테리어 페이지는 인테리어 상담이 기본입니다.
   · 방문자는 상담창 상단에서 상담 종류를 바꿀 수 있습니다.
   · 접수 방식은 기존 mailto(메일 앱 열기)를 유지합니다.
   · 'service'와 'demo' 모드는 추후 필요할 때 그대로 사용할 수 있습니다. */
(function(){
'use strict';
window.MM_CONSULT = window.MM_CONSULT || {
  mode: 'mailto',
  endpoint: '',                    /* 예: 'https://formspree.io/f/xxxxxxx' */
  email: 'urbanroad@mmlab.co.kr',
  tel: '02-6012-0033',
  kakao: ''                        /* 값을 넣으면 카카오톡 상담 링크가 표시됩니다 */
};
var C = window.MM_CONSULT;
var formCount = 0;

function routeDefaultType(){
  return /\/interior(?:\/|$|\/index\.html$)/.test(location.pathname) ? 'interior' : 'window';
}

function typeLabel(type){
  return type === 'interior' ? '인테리어' : '창호';
}

function valueOf(form, name){
  var el = form.querySelector('[name="' + name + '"]');
  return el && !el.disabled && el.value ? el.value.trim() : '';
}

function fields(form){
  var type = valueOf(form, 'consultType') || routeDefaultType();
  return {
    type: type,
    name: valueOf(form, 'name'),
    tel: valueOf(form, 'tel'),
    address: valueOf(form, 'address'),
    scope: valueOf(form, 'scope'),
    trades: Array.from(form.querySelectorAll('[name=trade]:checked:not(:disabled)')).map(function(el){return el.value;}).join(', '),
    size: valueOf(form, 'size'),
    brand: valueOf(form, 'brand'),
    when: valueOf(form, 'when'),
    message: valueOf(form, 'message')
  };
}

function mailtoUrl(d){
  var label = typeLabel(d.type);
  var body = [
    '상담 종류: ' + label,
    '이름: ' + d.name,
    '연락처: ' + d.tel,
    '시공 주소: ' + d.address,
    '시공 희망 시기: ' + (d.when || '미정')
  ];
  if(d.type === 'window'){
    body.push(
      '평형: ' + (d.size || '-'),
      '관심 브랜드: ' + (d.brand || '-')
    );
  }
  if(d.type === 'interior'){ body.push('시공 범위: ' + d.scope); if(d.scope === '부분 시공') body.push('시공 항목: ' + d.trades); }
  body.push('', '문의 내용:', d.message);
  return 'mailto:' + C.email
    + '?subject=' + encodeURIComponent('[' + label + ' 상담] ' + d.name + ' 님')
    + '&body=' + encodeURIComponent(body.join('\n'));
}

/* 메일 앱을 열지 않고도 생성 결과를 검증할 수 있는 읽기 전용 빌더입니다. */
window.mmConsultBuildMailto = function(form){ return mailtoUrl(fields(form)); };

/* 상담 모드에 필요한 창호 입력란이 없는 폼(인테리어 페이지)에만 추가합니다. */
function ensureWindowFields(form, uid){
  // Keep shared contact / consent fields and replace model fields once.
  ['size','brand','when'].forEach(function(name){
    form.querySelectorAll('[name="'+name+'"]').forEach(function(el){
      var wrap=el.parentElement;
      if(wrap && wrap.tagName!=='FORM' && wrap.querySelectorAll('input,select,textarea').length===1) wrap.remove();
      else el.remove();
    });
  });
  var block=document.createElement('div');block.className='mm-consult-generated';
  function field(name,label,content){return '<div><label for="'+uid+'-'+name+'">'+label+'</label>'+content.replace('FIELD','id="'+uid+'-'+name+'" name="'+name+'"')+'</div>';}
  block.innerHTML=field('address','시공 주소 *','<input FIELD required autocomplete="street-address" placeholder="시·구, 도로명 주소 또는 아파트명">')
    +field('when','시공 희망 시기','<select FIELD><option>미정</option><option>1개월 이내</option><option>1~3개월</option><option>3~6개월</option><option>6개월 이후</option></select>')
    +'<div data-mm-window-section class="mm-consult-window-grid">'
    +field('size','평형','<select FIELD><option value="">선택</option><option>20평 미만</option><option>20평대</option><option>30평대</option><option>40평대</option><option>50평 이상</option><option>잘 모르겠음</option></select>')
    +field('brand','관심 브랜드','<select FIELD><option value="">추천받기 / 미정</option><option>LX하우시스</option><option>KCC</option><option>PROFINE</option><option>고구려안전방충망</option></select>')+'</div>'
    +'<div data-mm-interior-section>'+field('scope','시공 범위 *','<select FIELD required><option value="">선택해주세요</option><option>전체 시공</option><option>부분 시공</option></select>')
    +'<fieldset class="mm-trades" hidden><legend>부분 시공 항목 · 여러 개 선택 가능</legend>'
    +['주방','욕실','거실·방','현관','도배·바닥','조명·전기','기타 / 상담 후 결정'].map(function(v){return '<label><input type="checkbox" name="trade" value="'+v+'"> '+v+'</label>';}).join('')+'</fieldset></div>';
  var message=form.querySelector('[name="message"]');
  form.insertBefore(block,message?message.parentElement:null);
  function updateTrades(){var group=form.querySelector('.mm-trades'),show=form.dataset.consultType==='interior' && valueOf(form,'scope')==='부분 시공';group.hidden=!show;group.querySelectorAll('input').forEach(function(el){el.disabled=!show;});}
  form.addEventListener('change',updateTrades);form._updateTrades=updateTrades;
}

function setType(form, type, focusTab){
  type = type === 'interior' ? 'interior' : 'window';
  form.dataset.consultType = type;
  var hidden = form.querySelector('[name="consultType"]');
  if(hidden) hidden.value = type;
  form.querySelectorAll('[data-consult-type]').forEach(function(button){
    var selected = button.getAttribute('data-consult-type') === type;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
    button.tabIndex = selected ? 0 : -1;
    if(selected && focusTab) button.focus();
  });
  form.querySelectorAll('[data-mm-window-section]').forEach(function(section){
    section.hidden = type !== 'window';
  });
  form.querySelectorAll('[data-mm-interior-section]').forEach(function(section){section.hidden=type!=='interior';section.querySelectorAll('input,select').forEach(function(el){el.disabled=type!=='interior';});});
  if(form._updateTrades) form._updateTrades();
  ['size','brand'].forEach(function(name){
    var el = form.querySelector('[name="' + name + '"]');
    if(el) el.disabled = type !== 'window';
  });
  var message = form.querySelector('[name="message"]');
  if(message){
    message.placeholder = type === 'interior'
      ? '원하시는 공간·예산·일정을 적어주세요.'
      : '관심 모델·평형 등을 적어주세요.';
  }
  var note = form.querySelector('.mm-consult-kind-note');
  if(note){
    note.textContent = type === 'interior'
      ? '원하는 공간과 예산, 일정을 편하게 알려주세요.'
      : '평형과 관심 브랜드를 알려주시면 빠르게 확인해드려요.';
  }
}

window.mmConsultSetType = function(form, type){
  if(typeof form === 'string'){ type = form; form = document.querySelector('form.mf, #mmForm'); }
  if(form) setType(form, type, false);
};

function enhanceForm(form){
  if(!form || form.dataset.mmConsultEnhanced) return;
  form.dataset.mmConsultEnhanced = 'true';
  form.classList.add('mm-consult-form');
  var overlay = form.closest('.ov, .modal-overlay');
  if(overlay) overlay.classList.add('mm-consult-overlay');
  formCount += 1;
  var uid = 'mm-consult-' + formCount;
  var defaultType = routeDefaultType();
  form.dataset.defaultConsultType = defaultType;

  var hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.name = 'consultType';
  hidden.value = defaultType;
  form.appendChild(hidden);

  var chooser = document.createElement('div');
  chooser.className = 'mm-consult-kind';
  chooser.innerHTML = ''
    + '<div class="mm-consult-kind-tabs" role="tablist" aria-label="상담 종류">'
    +   '<button type="button" role="tab" data-consult-type="window">창호 상담</button>'
    +   '<button type="button" role="tab" data-consult-type="interior">인테리어 상담</button>'
    + '</div>'
    + '<p class="mm-consult-kind-note" aria-live="polite"></p>';
  form.insertBefore(chooser, form.firstChild);
  ensureWindowFields(form, uid);

  chooser.addEventListener('click', function(e){
    var button = e.target.closest('[data-consult-type]');
    if(button) setType(form, button.getAttribute('data-consult-type'), false);
  });
  chooser.addEventListener('keydown', function(e){
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setType(form, form.dataset.consultType === 'window' ? 'interior' : 'window', true);
  });
  form.addEventListener('reset', function(){
    setTimeout(function(){ setType(form, form.dataset.defaultConsultType, false); }, 0);
  });
  var status=document.createElement('p');status.className='mm-consult-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.appendChild(status);
  var submit=form.querySelector('[type=submit]');if(submit) submit.textContent='상담 메일 작성하기';
  form.addEventListener('submit',function(e){
    e.preventDefault();e.stopImmediatePropagation();
    if(!form.reportValidity()) return;
    if(valueOf(form,'scope')==='부분 시공' && form.dataset.consultType==='interior' && !form.querySelector('[name=trade]:checked:not(:disabled)')){
      status.textContent='부분 시공 항목을 한 개 이상 선택해주세요.';form.querySelector('[name=trade]').focus();return;
    }
    window.mmConsultSubmit(form,function(result){status.textContent=result.title+' — '+result.message;});
  },true);
  setType(form, defaultType, false);
}

/* 폼 제출 공용 처리 — 기존 메일 앱 열기 방식을 그대로 유지합니다. */
window.mmConsultSubmit = function(form, cb){
  var d = fields(form);
  if(C.mode === 'service' && C.endpoint){
    fetch(C.endpoint, {method:'POST', body:new FormData(form), headers:{'Accept':'application/json'}})
      .then(function(r){
        if(!r.ok) throw new Error(r.status);
        cb({ok:true, title:'접수됐습니다', message:'영업일 24시간 안에 연락드릴게요.'});
      })
      .catch(function(){
        cb({ok:false, title:'접수에 실패했습니다', message:'잠시 후 다시 시도하시거나 ' + C.tel + ' 로 전화 주세요.'});
      });
    return;
  }
  if(C.mode === 'mailto'){
    location.href = mailtoUrl(d);
    cb({ok:true, title:'메일 앱에서 발송을 완료해주세요', message:'메일 초안 열기를 요청했습니다. 아직 발송되지 않았습니다. 초안을 확인하고 메일 앱에서 보내기를 눌러주세요.\n메일 앱이 없다면 ' + C.tel + ' 로 전화 주세요.'});
    return;
  }
  cb({ok:true, title:'데모 화면입니다', message:'실제 발송은 사이트 오픈 시 연결됩니다.'});
};

function addAltRow(form){
  if(!form || form.querySelector('.mm-consult-alt')) return;
  var p = document.createElement('p');
  p.className = 'mm-consult-alt';
  var links = '<a href="tel:' + C.tel.replace(/-/g, '') + '">전화 ' + C.tel + '</a> · <a href="mailto:' + C.email + '">이메일 보내기</a>';
  if(C.kakao){ links += ' · <a href="' + C.kakao + '" target="_blank" rel="noopener">카카오톡 상담</a>'; }
  p.innerHTML = '폼이 번거로우시면 — ' + links;
  form.appendChild(p);
}

function ready(fn){
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', fn); }
  else { fn(); }
}

ready(function(){
  var st = document.createElement('style');
  st.textContent = ''
    + '.mm-consult-overlay{z-index:1700!important}'
    + '.mm-consult-kind{margin:0 0 6px}'
    + '.mm-consult-kind-tabs{display:grid;grid-template-columns:1fr 1fr;border:1px solid #2F5233;background:#F4F0E6}'
    + '.mm-consult-kind-tabs button{appearance:none;min-height:46px;padding:10px 14px;border:0;border-radius:0;background:transparent;color:#2F5233;font:inherit;font-size:14px;font-weight:700;letter-spacing:-.01em;cursor:pointer;transition:background-color .18s ease,color .18s ease}'
    + '.mm-consult-kind-tabs button+button{border-left:1px solid #2F5233}'
    + '.mm-consult-kind-tabs button.is-selected{background:#2F5233;color:#fff}'
    + '.mm-consult-kind-tabs button:focus-visible{position:relative;z-index:1;outline:2px solid #111;outline-offset:3px}'
    + '.mm-consult-kind-note{min-height:18px;margin:8px 1px 0;color:#6F7866;font-size:12px;line-height:1.5;word-break:keep-all}'
    + '.mm-consult-generated{display:flex;flex-direction:column;gap:12px}'
    + '.mm-consult-window-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
    + '[data-mm-window-section][hidden],[data-mm-interior-section][hidden],.mm-trades[hidden]{display:none!important}'
    + '.mm-consult-generated label{display:block;margin-bottom:6px}.mm-consult-generated input:not([type=checkbox]),.mm-consult-generated select{width:100%;min-height:46px;box-sizing:border-box;font:inherit;padding:10px;border:1px solid #A5AD9C;background:#fff;color:#203E27}.mm-trades{margin:14px 0 0;padding:12px;border:1px solid #A5AD9C;display:flex;flex-wrap:wrap;gap:8px 16px}.mm-trades label{display:flex;align-items:center;gap:6px;min-height:36px}.mm-trades input{width:18px;height:18px;accent-color:#2F5233}.mm-consult-status:not(:empty){padding:12px;border-left:3px solid #2F5233;background:#E9EBDD;font-size:13px;line-height:1.7}.mm-consult-generated{min-width:0}.mm-consult-form{min-width:0}'
    + '.mm-consult-alt{margin:10px 0 0;font-size:13px;color:#6f6f6f;text-align:center;word-break:keep-all}'
    + '.mm-consult-alt a{display:inline-block;padding:8px 4px;color:inherit;text-decoration:underline;text-underline-offset:3px}'
    + '@media(max-width:480px){.mm-consult-form input:not([type=checkbox]),.mm-consult-form select,.mm-consult-form textarea{font-size:16px}.mm-consult-window-grid{grid-template-columns:1fr}.mm-consult-kind-tabs button{min-height:44px;padding:9px 8px;font-size:13px}.mm-consult-kind-note{margin-top:7px}}'
    + '@media(prefers-reduced-motion:reduce){.mm-consult-kind-tabs button{transition:none}}';
  document.head.appendChild(st);

  document.querySelectorAll('form.mf, #mmForm').forEach(function(form){
    enhanceForm(form);
    addAltRow(form);
  });

  if(C.mode !== 'demo'){
    var note = document.querySelector('#mmSuccess p span');
    if(note && /데모/.test(note.textContent)){
      var br = note.previousElementSibling;
      if(br && br.tagName === 'BR') br.remove();
      note.remove();
    }
  }
});
})();
