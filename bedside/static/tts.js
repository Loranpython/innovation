/* Local-only text-to-speech. window.BedsideTTS */
(function(){
  function voicesFor(lang){
    const vs=(window.speechSynthesis&&speechSynthesis.getVoices())||[];
    const re=lang==="no"?/^(nb|no|nn)([-_]|$)/i:/^en([-_]|$)/i;
    return vs.filter(v=>v.localService===true&&re.test(v.lang));
  }
  function ready(lang){
    return new Promise(res=>{
      if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined") return res(false);
      if(voicesFor(lang).length) return res(true);
      let done=false;
      const fin=()=>{ if(done) return; done=true; speechSynthesis.removeEventListener("voiceschanged",fin); res(voicesFor(lang).length>0); };
      speechSynthesis.addEventListener("voiceschanged",fin);
      setTimeout(fin,1200);
    });
  }
  function speak(text,lang){
    const vs=voicesFor(lang); if(!vs.length) return false;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.voice=vs[0]; u.lang=vs[0].lang; u.rate=0.9;
    speechSynthesis.speak(u); return true;
  }
  function stop(){ if(window.speechSynthesis) speechSynthesis.cancel(); }
  window.BedsideTTS={ready,speak,stop};
})();
