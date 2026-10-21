/* Shared WebSocket client with exp-backoff reconnect. window.BedsideWS */
(function(){
  function create(role, room, h){
    let ws=null, delay=500, closed=false, timer=null;
    const api={ open:false,
      send(obj){ if(ws&&ws.readyState===1){ try{ws.send(JSON.stringify(obj));return true;}catch(e){} } return false; },
      close(){ closed=true; clearTimeout(timer); if(ws) ws.close(); } };
    function connect(){
      const proto=location.protocol==="https:"?"wss":"ws";
      try{ ws=new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(room)}&role=${role}`); }
      catch(e){ schedule(); return; }
      ws.onopen=()=>{ delay=500; api.open=true; h.onOpen&&h.onOpen(); };
      ws.onmessage=(e)=>{ let m; try{m=JSON.parse(e.data);}catch(x){return;} h.onMessage&&h.onMessage(m); };
      ws.onclose=()=>{ const was=api.open; api.open=false; if(was||true) h.onClose&&h.onClose(); schedule(); };
      ws.onerror=()=>{ try{ws.close();}catch(e){} };
    }
    function schedule(){ if(closed) return; clearTimeout(timer); timer=setTimeout(connect,delay); delay=Math.min(delay*2,8000); }
    connect();
    return api;
  }
  window.BedsideWS={create};
})();
