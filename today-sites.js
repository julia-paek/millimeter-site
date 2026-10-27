(function(root){
  'use strict';
  var ENDPOINT=''; // Google 연결 확인 후 발급된 읽기 전용 웹 앱 주소를 기록합니다.
  // Google 인증 대기 중 사용자가 입력한 공개용 일정. 연결 활성화 후에는 사용하지 않습니다.
  var MANUAL_SITES=[{date:'2026-10-27',area:'서울특별시 구로구',name:'개봉한마을 103동',work:'창호공사',brand:'LX하우시스 제작창'}];
  var KST=9*60*60*1000;
  var DAY=24*60*60*1000;
  function dayKey(ms){return new Date(ms+KST).toISOString().slice(0,10);}
  function clean(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
  function normalize(payload){
    if(!payload||payload.ok!==true||!Array.isArray(payload.sites))return null;
    var stamp=Date.parse(payload.generatedAt);
    if(!Number.isFinite(stamp)||payload.date!==dayKey(stamp))return null;
    var seen={};
    var sites=payload.sites.slice(0,200).map(function(site){
      if(!site||site.date!==payload.date)return null;
      var entry={date:site.date,area:clean(site.area,100),name:clean(site.name,120),work:clean(site.work,100),brand:clean(site.brand,80)};
      if(!entry.area||!entry.name||!entry.work)return null;
      var key=JSON.stringify(entry);
      if(seen[key])return null;
      seen[key]=true;return entry;
    }).filter(Boolean);
    return {date:payload.date,stamp:stamp,sites:sites};
  }
  if(typeof module==='object'&&module.exports)module.exports={dayKey:dayKey,normalize:normalize};
  if(typeof document==='undefined')return;
  var section=document.getElementById('today-sites');
  var track=document.getElementById('today-sites-track');
  var lane=document.getElementById('today-sites-lane');
  var date=document.getElementById('today-sites-date');
  if(!section||!track||!lane||!date)return;
  var current=null,offset=0,requestNo=0,inFlight=false,midnightTimer=0,lastLayoutWidth=0;
  var reduce=root.matchMedia('(prefers-reduced-motion: reduce)');
  function hide(){section.hidden=true;track.replaceChildren();current=null;clearTimeout(midnightTimer);}
  function item(site){
    var li=document.createElement('li');li.className='today-sites-item';
    var title=document.createElement('strong');title.textContent=site.area+' '+site.name;
    var detail=document.createElement('span');detail.textContent=[site.work,site.brand].filter(Boolean).join(' · ');
    li.append(title,detail);return li;
  }
  function group(sites,duplicate){
    var li=document.createElement('li');li.className='today-sites-group';
    if(duplicate)li.setAttribute('aria-hidden','true');
    var list=document.createElement('ul');sites.forEach(function(site){list.appendChild(item(site));});
    li.appendChild(list);return li;
  }
  function layout(){
    if(!current||section.hidden)return;
    track.replaceChildren();
    var first=group(current.sites,false);track.appendChild(first);
    section.classList.toggle('is-single',current.sites.length===1);
    if(current.sites.length<2||reduce.matches)return;
    var originals=Array.from(first.firstChild.children),tries=0;
    while(first.getBoundingClientRect().width<lane.clientWidth&&tries++<20){
      originals.forEach(function(node){var copy=node.cloneNode(true);copy.setAttribute('aria-hidden','true');first.firstChild.appendChild(copy);});
    }
    var width=first.getBoundingClientRect().width;
    var second=first.cloneNode(true);second.setAttribute('aria-hidden','true');track.appendChild(second);
    track.style.setProperty('--today-sites-duration',Math.max(width/22,12)+'s');
  }
  function armMidnight(){
    clearTimeout(midnightTimer);
    var serverNow=Date.now()+offset;
    var next=(Math.floor((serverNow+KST)/DAY)+1)*DAY-KST;
    midnightTimer=setTimeout(function(){hide();load();},Math.max(next-serverNow+50,50));
  }
  function render(payload){
    var result=normalize(payload);
    if(!result){hide();return;}
    offset=result.stamp-Date.now();current=result;
    if(!result.sites.length){hide();armMidnight();return;}
    date.dateTime=result.date;date.textContent=result.date.replace(/-/g,'.');
    section.hidden=false;lastLayoutWidth=lane.clientWidth;layout();armMidnight();
  }
  function load(){
    if(document.hidden)return;
    if(!ENDPOINT){
      var now=Date.now(),day=dayKey(now);
      render({ok:true,date:day,generatedAt:new Date(now).toISOString(),sites:MANUAL_SITES.filter(function(site){return site.date===day;})});
      return;
    }
    if(inFlight)return;
    if(current&&current.date!==dayKey(Date.now()+offset))hide();
    inFlight=true;
    var callback='mmTodaySites_'+Date.now()+'_'+(++requestNo);
    var script=document.createElement('script');
    var timer=setTimeout(function(){finish(null);},15000);
    function finish(payload){
      if(!inFlight||!root[callback])return;
      clearTimeout(timer);script.remove();delete root[callback];inFlight=false;
      if(payload)render(payload);else hide();
    }
    root[callback]=function(payload){finish(payload);};
    script.onerror=function(){finish(null);};
    script.src=ENDPOINT+'?callback='+callback+'&v='+Date.now();
    script.referrerPolicy='no-referrer';document.head.appendChild(script);
  }
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(function(){if(lane.clientWidth!==lastLayoutWidth){lastLayoutWidth=lane.clientWidth;layout();}}).observe(lane);
  else root.addEventListener('resize',layout);
  if(reduce.addEventListener)reduce.addEventListener('change',layout);
  lane.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')section.classList.toggle('is-paused');});
  document.addEventListener('visibilitychange',function(){if(!document.hidden){if(current&&current.date!==dayKey(Date.now()+offset))hide();load();}});
  setInterval(load,60000);load();
})(typeof window==='undefined'?globalThis:window);
