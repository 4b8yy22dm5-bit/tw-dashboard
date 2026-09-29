/* 台股每日儀表板：靜態模板，資料來自 data/<日期>.json；日期清單來自 data/index.json */
(function(){
'use strict';
var ND='<span class="nodata">今日無資料</span>';
var LAMP={y:'黃',o:'橘',r:'紅'};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
/* 行內標記：{{up:文字}} {{down:}} {{flat:}} {{b:}} {{bup:}} {{bdown:}} {{src:}} {{tag:}} {{chip:y|o|r}} {{nd}} {{val:buy|mid|sell|none}} */
function rich(s){
  if(s===null||s===undefined||s==='')return '';
  return esc(s).replace(/\{\{(\w+)(?::(.*?))?\}\}/g,function(m,k,t){
    t=t||'';
    switch(k){
      case 'up':case 'down':case 'flat':case 'src':case 'tag':return '<span class="'+k+'">'+t+'</span>';
      case 'b':return '<b>'+t+'</b>';
      case 'bup':return '<b class="up">'+t+'</b>';
      case 'bdown':return '<b class="down">'+t+'</b>';
      case 'chip':return chip(t);
      case 'nd':return ND;
      case 'val':return valChip(t);
      default:return m;
    }
  });
}
function chip(l){return LAMP[l]?'<span class="chip '+l+'">'+LAMP[l]+'</span>':'<span class="chip none">無燈號</span>';}
var VAL={buy:'買區',mid:'中間',sell:'賣區',none:'未建基準'};
function valChip(k,title){return '<span class="val '+k+'"'+(title?' title="'+esc(title)+'"':'')+'>'+VAL[k]+'</span>';}
function cls(p){return p>0?'up':p<0?'down':'flat';}
function pct(p){if(p===null||p===undefined)return ND;return (p>0?'+':p<0?'−':'')+Math.abs(p).toFixed(2)+'%';}
function num(v){if(v===null||v===undefined||v==='')return null;var n=typeof v==='number'?v:parseFloat(String(v).replace(/,/g,''));return isNaN(n)?null:n;}

/* 估價位置：價格 ≤ 參考買進帶上緣 → 買區；價格 ≥ 參考賣出帶下緣 → 賣區；其餘 → 中間；無基準 → 未建基準 */
function valPos(code,price,val){
  var v=val&&val[code];
  if(!v||!v.baseline||!v.buy||!v.sell)return {k:'none',t:v&&v.reason?v.reason:'尚未建立鎖定估價基準'};
  var p=num(price);if(p===null)return {k:'na',t:'尚無價格'};
  var t='基準 '+v.baseline+'｜參考買進帶 '+v.buy[0]+'–'+v.buy[1]+'｜參考賣出帶 '+v.sell[0]+'–'+v.sell[1]+(v.base!=null?'｜Base≈'+v.base:'')+'（參考位置，非建議）';
  if(p<=v.buy[1])return {k:'buy',t:t};
  if(p>=v.sell[0])return {k:'sell',t:t};
  return {k:'mid',t:t};
}

function kpi(c){
  return '<div class="kpi"><div class="l">'+rich(c.label)+'</div><div class="v'+(c.value_cls?' '+c.value_cls:'')+'">'+(rich(c.value)||ND)+'</div>'+
    (c.sub?'<div class="s'+(c.sub_cls?' '+c.sub_cls:'')+'">'+rich(c.sub)+'</div>':'')+
    (c.note?'<div class="n">'+rich(c.note)+'</div>':'')+'</div>';
}
function h2(t,n){return '<h2>'+t+(n?' <small>'+rich(n)+'</small>':'')+'</h2>';}
function sec(inner){return '<section class="card">'+inner+'</section>';}

function renderWL(w,val){
  var h='<div class="wl-h"><div>代號／名稱</div><div>收盤</div><div>漲跌%</div><div>量比</div><div>燈號</div><div title="參考位置，非建議">估價位置</div><div>備註</div></div>';
  (w.rows||[]).forEach(function(r){
    var vp=valPos(r.code,r.price!=null?r.price:r.price_text,val);
    var pt=r.price_text!=null?r.price_text:(r.price!=null?String(r.price):null);
    h+='<div class="wl-r" data-code="'+esc(r.code)+'"><div class="name"><span class="code">'+esc(r.code)+'</span>'+esc(r.name||'')+'</div>'+
      '<div class="close '+cls(r.chg_pct)+'">'+(pt!=null?esc(pt):ND)+'</div>'+
      '<div class="pct '+cls(r.chg_pct)+'">'+pct(r.chg_pct)+'</div>'+
      '<div class="vol"><span class="lbl">量比 </span>'+(r.vol_ratio!=null?'<b>'+num(r.vol_ratio).toFixed(2)+'×</b>':ND)+'</div>'+
      '<div class="badge">'+chip(r.lamp)+'</div>'+
      '<div class="valpos"><span class="lbl">估價</span>'+(vp.k==='na'?ND:valChip(vp.k,vp.t))+'</div>'+
      '<div class="note">'+rich(r.note)+'</div></div>';
  });
  return sec(h2('自選燈號表',w.title_note)+'<div class="wl">'+h+'</div>'+
    (w.caption?'<div class="caption">'+rich(w.caption)+'</div>':'')+
    '<div class="caption">估價位置：以價格對照估價參謀參考帶——≤ 參考買進帶上緣＝買區、≥ 參考賣出帶下緣＝賣區、其餘＝中間；未建基準＝尚無鎖定估價帶。<b>僅為參考位置，非買賣建議。</b></div>');
}
function renderTL(tl){
  if(!tl||!tl.events||!tl.events.length){
    return sec(h2('盤中燈號時間軸',tl&&tl.title_note)+'<div class="nodata" style="display:inline-block">'+esc((tl&&tl.empty)||'今日無資料')+'</div>');
  }
  var h='<ul class="tl">';
  tl.events.forEach(function(e){
    h+='<li'+(e.end?' class="end"':'')+'><span class="t">'+esc(e.time)+'</span>';
    (e.lines||[]).forEach(function(l){h+='<div class="ev">'+(typeof l==='string'?rich(l):evObj(l))+'</div>';});
    h+='</li>';
  });
  return sec(h2('盤中燈號時間軸',tl.title_note)+h+'</ul>');
}
/* 結構化事件行：{code,name,lamp,chg_pct,vol_ratio,text} */
function evObj(o){
  var s=esc(o.code||'')+(o.name?' '+esc(o.name):'')+' '+(o.lamp?chip(o.lamp):'');
  if(o.chg_pct!=null)s+='<span class="'+cls(o.chg_pct)+'">'+pct(o.chg_pct)+'</span>';
  if(o.vol_ratio!=null)s+='・量 '+num(o.vol_ratio).toFixed(2)+'×';
  if(o.text)s+=' '+rich(o.text);
  return s;
}
function renderFocus(f,val){
  if(!f)return '';
  if(!f.code){return sec(h2('重點個股')+'<div class="caption" style="margin-top:0">'+rich(f.caption)+'</div>');}
  var h=h2('重點個股｜'+esc(f.code)+' '+esc(f.name||'')+(f.lamp?' '+chip(f.lamp):''));
  h+='<div class="focus-top"><span class="big '+(f.price_cls||'')+'">'+esc(f.price_text||'')+'</span>'+
     '<span class="'+(f.price_cls||'')+'" style="font-weight:700">'+rich(f.change_text)+'</span>';
  (f.tags||[]).forEach(function(t){h+='<span class="tag">'+rich(t)+'</span>';});
  h+='</div><div class="cols2"><div>';
  (f.blocks||[]).forEach(function(b){
    h+='<div class="sub">'+rich(b.title)+'</div><ul class="b">';
    (b.items||[]).forEach(function(i){h+='<li>'+rich(i)+'</li>';});
    h+='</ul>';
  });
  h+='</div><div>';
  var v=val&&val[f.code];
  if(f.band&&v&&v.buy&&v.sell){
    var a=f.band.axis||[Math.min(v.buy[0],num(f.price))*0.8,Math.max(v.sell[1],num(f.price))*1.05];
    var P=function(x){return ((x-a[0])/(a[1]-a[0])*100).toFixed(3).replace(/\.?0+$/,'')+'%';};
    var W=function(x,y){return ((y-x)/(a[1]-a[0])*100).toFixed(3).replace(/\.?0+$/,'')+'%';};
    h+='<div class="sub">'+rich(f.band.title||'估價參考帶')+(f.band.title_note?' <span class="src">'+rich(f.band.title_note)+'</span>':'')+'</div>'+
      '<div class="band"><div class="bar" aria-label="參考帶圖">'+
      '<div class="seg buy" style="left:'+P(v.buy[0])+';width:'+W(v.buy[0],v.buy[1])+'"></div>'+
      '<div class="seg sell" style="left:'+P(v.sell[0])+';width:'+W(v.sell[0],v.sell[1])+'"></div>'+
      (v.base!=null?'<div class="mk base" style="left:'+P(v.base)+'"><span class="lab">Base≈'+esc(v.base)+'</span></div>':'')+
      (num(f.price)!=null?'<div class="mk close" style="left:'+P(num(f.price))+'"><span class="lab">'+esc(f.band.marker_label||f.price_text)+'</span></div>':'')+
      '</div><div class="ticks">'+[v.buy[0],v.buy[1],v.sell[0],v.sell[1]].map(function(x){return '<span style="left:'+P(x)+'">'+esc(x)+'</span>';}).join('')+'</div>'+
      '<div class="bandleg"><span><i class="sw" style="background:var(--buy)"></i>參考買進帶 '+v.buy[0]+'–'+v.buy[1]+'</span>'+
      '<span><i class="sw" style="background:var(--sell)"></i>參考賣出帶 '+v.sell[0]+'–'+v.sell[1]+'</span></div></div>';
  }
  if(f.warn)h+='<div class="warn">'+rich(f.warn)+'</div>';
  if(f.caption)h+='<div class="caption">'+rich(f.caption)+'</div>';
  return sec(h+'</div></div>');
}
function renderSectors(s){
  if(!s)return '';
  function ol(a){return '<ol>'+(a||[]).map(function(i){return '<li><b>'+rich(i.name)+'</b><span class="d">'+rich(i.detail)+'</span></li>';}).join('')+'</ol>';}
  return sec(h2('強勢／弱勢族群',s.title_note)+'<div class="sectors"><div class="st"><h3>▲ 強勢</h3>'+ol(s.strong)+'</div><div class="wk"><h3>▼ 弱勢</h3>'+ol(s.weak)+'</div></div>');
}
function renderWeights(w){
  if(!w)return '';
  var h='<table class="t"><thead><tr><th>個股</th><th class="num">'+esc(w.price_col||'收盤')+'</th><th class="num">漲跌%</th><th>'+esc(w.impact_col||'同日影響')+'</th></tr></thead><tbody>';
  (w.rows||[]).forEach(function(r){h+='<tr><td>'+rich(r.stock)+'</td><td class="num">'+(r.price_text!=null?esc(r.price_text):ND)+'</td><td class="num '+cls(r.chg_pct)+'">'+pct(r.chg_pct)+'</td><td>'+rich(r.impact)+'</td></tr>';});
  return sec(h2('權值股',w.title_note)+h+'</tbody></table>');
}
function renderSat(s){
  if(!s)return '';
  var h='<table class="t"><thead><tr><th>級</th><th>個股</th><th class="num">收盤</th><th class="num">漲跌%</th></tr></thead><tbody>';
  (s.rows||[]).forEach(function(r){h+='<tr><td><span class="tier '+esc(r.tier)+'">'+esc(r.tier)+'</span></td><td>'+rich(r.stock)+'</td><td class="num '+(r.price_text?cls(r.chg_pct):'')+'">'+(r.price_text?esc(r.price_text):ND)+'</td><td class="num '+cls(r.chg_pct)+'">'+pct(r.chg_pct)+'</td></tr>';});
  h+='</tbody></table>';
  if(s.bullets&&s.bullets.length)h+='<ul class="b" style="font-size:13px;margin-top:8px">'+s.bullets.map(function(b){return '<li>'+rich(b)+'</li>';}).join('')+'</ul>';
  if(s.lockup&&s.lockup.length)h+='<div class="sub">'+rich(s.lockup_title||'')+'</div><div class="lock">'+s.lockup.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')+'</div>';
  return sec(h2('衛星族群',s.title_note)+h);
}
function renderNews(n){
  if(!n||!n.length)return sec(h2('新聞提要')+ND);
  return sec(h2('新聞提要')+'<ol class="news">'+n.map(function(i){return '<li>'+rich(i)+'</li>';}).join('')+'</ol>');
}
function renderSum(s){
  if(!s)return '';
  return sec(h2('短結')+'<div class="sum"><div class="fact"><h3>'+esc(s.fact_title||'事實')+'</h3>'+(rich(s.fact)||ND)+'</div><div class="read"><h3>'+esc(s.read_title||'判讀（非建議）')+'</h3>'+(rich(s.read)||ND)+'</div></div>');
}
function renderView(tab,v,d){
  if(!v)return '<section class="card">'+ND+'</section>';
  var wl=v.watchlist&&v.watchlist.source==='intraday'?(d.intraday&&d.intraday.watchlist):v.watchlist;
  var tl=v.timeline&&v.timeline.source==='intraday'?(d.intraday&&d.intraday.timeline):v.timeline;
  var h='';
  if(v.market)h+=sec(h2('大盤',v.market.title_note)+'<div class="kpis">'+(v.market.cards||[]).map(kpi).join('')+'</div>'+(v.market.caption?'<div class="caption">'+rich(v.market.caption)+'</div>':''));
  if(v.us)h+=sec(h2(esc(v.us.title||'隔夜美股與總經'),v.us.title_note)+'<div class="us">'+(v.us.cards||[]).map(kpi).join('')+'</div>'+(v.us.caption?'<div class="caption">'+rich(v.us.caption)+'</div>':''));
  var wlh=wl?renderWL(wl,d.valuation):sec(h2('自選燈號表')+ND);
  var tlh=renderTL(tl);
  h+= tab==='pm' ? '<div class="two">'+wlh+tlh+'</div>' : wlh+tlh;
  h+=renderFocus(v.focus,d.valuation);
  h+=renderSectors(v.sectors);
  h+='<div class="two">'+renderWeights(v.weights)+renderSat(v.satellite)+'</div>';
  h+=renderNews(v.news);
  h+=renderSum(v.summary);
  return h;
}
function fmtTPE(iso){
  if(!iso)return '—';
  var t=new Date(iso);if(isNaN(t))return esc(iso);
  try{
    var p=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(t);
    var g={};p.forEach(function(x){g[x.type]=x.value;});
    return g.year+'-'+g.month+'-'+g.day+' '+(g.hour==='24'?'00':g.hour)+':'+g.minute;
  }catch(e){return esc(iso);}
}
var WD=['日','一','二','三','四','五','六'];
function render(d){
  document.title='台股每日儀表板｜'+d.date;
  document.getElementById('date-label').textContent=d.date_label||d.date;
  document.getElementById('meta-am').innerHTML=rich(d.views&&d.views.am&&d.views.am.meta)+' <a href="#sources">資料來源 ↓</a>';
  document.getElementById('meta-pm').innerHTML=rich(d.views&&d.views.pm&&d.views.pm.meta)+' <a href="#sources">資料來源 ↓</a>';
  document.getElementById('last-updated').textContent=fmtTPE(d.last_updated);
  var live=document.getElementById('live'),st=d.intraday&&d.intraday.status;
  var ST={pre:'盤前',open:'盤中更新中',closed:'已收盤'};
  if(ST[st]){live.hidden=false;live.textContent=ST[st];live.className='live '+st;}
  document.getElementById('view-pm').innerHTML=renderView('pm',d.views&&d.views.pm,d);
  document.getElementById('view-am').innerHTML=renderView('am',d.views&&d.views.am,d);
  document.getElementById('sources-list').innerHTML=(d.sources||[]).map(function(s){return '<li>'+rich(s)+'</li>';}).join('');
}
function q(k){var m=new RegExp('[?&]'+k+'=([^&#]*)').exec(location.search);return m?decodeURIComponent(m[1]):null;}
function getJSON(u){return fetch(u+(u.indexOf('?')<0?'?':'&')+'_='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status+' '+u);return r.json();});}
function showErr(msg){document.getElementById('view-pm').innerHTML=document.getElementById('view-am').innerHTML='<div class="errbox">'+esc(msg)+'</div>';document.getElementById('date-label').textContent='無法載入資料';}

/* 深色模式：?theme=dark|light 優先，其次為 localStorage */
var body=document.body,th=q('theme');
try{if(th==='dark'||(!th&&localStorage.getItem('twdash-theme')==='dark'))body.classList.add('dark');}catch(e){if(th==='dark')body.classList.add('dark');}
document.getElementById('darkbtn').addEventListener('click',function(){body.classList.toggle('dark');try{localStorage.setItem('twdash-theme',body.classList.contains('dark')?'dark':'light');}catch(e){}});

getJSON('data/index.json').then(function(idx){
  var dates=(idx.dates||[]).map(function(x){return typeof x==='string'?x:x.date;}).sort().reverse();
  if(!dates.length)throw new Error('尚無資料日期');
  var want=q('d');
  var cur=(want&&/^\d{4}-\d{2}-\d{2}$/.test(want))?want:dates[0];
  var sel=document.getElementById('date-select');
  var list=dates.indexOf(cur)<0?[cur].concat(dates):dates;
  sel.innerHTML=list.map(function(x){return '<option value="'+x+'"'+(x===cur?' selected':'')+'>'+x+'（'+WD[new Date(x+'T12:00:00Z').getUTCDay()]+'）'+(x===dates[0]?'・最新':'')+'</option>';}).join('');
  sel.addEventListener('change',function(){var p=new URLSearchParams(location.search);p.set('d',sel.value);location.search=p.toString();});
  return getJSON('data/'+cur+'.json').then(function(d){
    render(d);
    var tab=q('tab')||d.default_tab||'pm';
    var r=document.getElementById(tab==='am'?'tab-am':'tab-pm');if(r)r.checked=true;
  },function(){showErr('找不到 '+cur+' 的資料（可能非交易日或尚未發布）。請從上方選單選擇其他日期。');});
}).catch(function(e){showErr('資料載入失敗：'+e.message);});
})();
