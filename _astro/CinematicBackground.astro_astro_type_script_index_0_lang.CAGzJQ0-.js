var e=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,t=0,n=0;window.addEventListener(`pointermove`,e=>{t=e.clientX/window.innerWidth-.5,n=e.clientY/window.innerHeight-.5},{passive:!0});function r(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:null}function i(i){let a=!!i.dataset.cinebgStatic,o=!a;if(window.innerWidth<640)return;let s=i.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`});if(!s)return;let c=r(s,s.VERTEX_SHADER,`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`),l=r(s,s.FRAGMENT_SHADER,`
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uPulse;
uniform float uFade;

float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<__OCT__;i++){ v+=a*noise(p); p=p*2.03+vec2(17.0); a*=0.55; }
  return v;
}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 uv=(frag-0.5*uRes)/uRes.y;
  uv+=uMouse*0.045;
  float t=uTime;

  vec3 ink=vec3(0.043,0.043,0.049);
  vec3 gold=vec3(0.745,0.290,0.118); /* brand orange #BE4A1E (was the old gold) */
  vec3 goldL=vec3(0.941,0.663,0.498); /* pale orange #F0A97F */

  /* base — ink, faintly warmer toward the lower third */
  float warm=1.0-smoothstep(-0.6,0.9,uv.y);
  vec3 col=ink*(1.0+0.10*warm);

  /* volumetric orange haze — slow-drifting light, brightens on framework hover */
  float n1=fbm(vec2(uv.x*1.3-t*0.020, uv.y*2.0+t*0.012));
  float n2=fbm(vec2(uv.x*0.7+t*0.013, uv.y*1.1-t*0.009)+7.3);
  float band=1.0-smoothstep(0.03,0.62,abs(uv.y+0.24+(n1-0.5)*0.55));
  col+=gold*band*(n1*n1)*0.15*(1.0+0.8*uPulse);
  col+=gold*0.045*n2*(1.0-smoothstep(-0.2,1.1,uv.y));

  /* the governed plane — perspective grid receding to the horizon */
  float horizon=-0.14;
  float py=horizon-uv.y;
  if(py>0.001){
    float z=0.22/py;
    vec2 gp=vec2(uv.x*z*2.2, z+t*0.05);
    float lx=pow(0.5+0.5*cos(gp.x*6.28318),40.0);
    float lz=pow(0.5+0.5*cos(gp.y*6.28318),40.0);
    float fade=smoothstep(0.0,0.35,py)*exp(-z*0.32);
    col+=gold*(lx+lz)*fade*0.13*(1.0+1.1*uPulse);
  }

  /* a second, deeper plane — different horizon, scale and drift speed so it
     reads as further away rather than doubling the same grid */
  float horizon2=-0.05;
  float py2=horizon2-uv.y;
  if(py2>0.001){
    float z2=0.34/py2;
    vec2 gp2=vec2(uv.x*z2*1.5, z2+t*0.018);
    float lx2=pow(0.5+0.5*cos(gp2.x*3.76991),50.0);
    float lz2=pow(0.5+0.5*cos(gp2.y*3.76991),50.0);
    float fade2=smoothstep(0.0,0.4,py2)*exp(-z2*0.4);
    col+=gold*(lx2+lz2)*fade2*0.06*(1.0+0.6*uPulse);
  }

  /* audit scan — a thin gold line sweeping down every ~30s, eases out as the scene scrolls off */
  float sp=fract(t*0.033);
  float sy=0.62-sp*1.5;
  float scanEnv=smoothstep(0.0,0.12,sp)*(1.0-smoothstep(0.85,1.0,sp));
  float scanCore=exp(-abs(uv.y-sy)*110.0);
  float scanGlow=exp(-abs(uv.y-sy)*18.0);
  col+=goldL*scanCore*0.10*uFade*scanEnv;
  col+=goldL*scanGlow*0.045*uFade*scanEnv;

  /* rising evidence motes — two parallax layers, eases out as the scene scrolls off */
  for(int L=0;L<2;L++){
    float fl=float(L);
    float sc=5.0+fl*3.0;
    vec2 pv=uv*sc+vec2(fl*13.7,-t*(0.045+fl*0.03));
    vec2 id=floor(pv);
    vec2 f=fract(pv)-0.5;
    float rnd=hash(id);
    vec2 off=vec2(hash(id+4.1),hash(id+9.7))-0.5;
    float d=length(f-off*0.7);
    float tw=0.5+0.5*sin(t*(0.4+rnd*1.2)+rnd*6.28);
    float m=smoothstep(0.045+0.02*fl,0.0,d)*step(0.55,rnd);
    col+=goldL*m*tw*(0.10-fl*0.035)*uFade;
  }

  /* vignette */
  float vig=1.0-smoothstep(0.25,1.15,length(uv*vec2(0.9,1.2)));
  col*=mix(0.52,1.0,vig);

  /* film grain */
  col+=(hash(frag+fract(t)*vec2(13.1,7.7))-0.5)*0.02;

  gl_FragColor=vec4(col,1.0);
}`.replace(`__OCT__`,o?`6`:`4`));if(!c||!l)return;let u=s.createProgram();if(s.attachShader(u,c),s.attachShader(u,l),s.linkProgram(u),!s.getProgramParameter(u,s.LINK_STATUS))return;s.useProgram(u);let d=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,d),s.bufferData(s.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),s.STATIC_DRAW);let f=s.getAttribLocation(u,`p`);s.enableVertexAttribArray(f),s.vertexAttribPointer(f,2,s.FLOAT,!1,0,0);let p=s.getUniformLocation(u,`uRes`),m=s.getUniformLocation(u,`uTime`),h=s.getUniformLocation(u,`uMouse`),g=s.getUniformLocation(u,`uPulse`),_=s.getUniformLocation(u,`uFade`),v=window.innerWidth<640,y=o?Math.min(window.devicePixelRatio||1,2)*(v?.7:1):Math.min(window.devicePixelRatio||1,1.5)*(v?.55:.75);function b(){let e=Math.max(1,Math.round(i.clientWidth*y)),t=Math.max(1,Math.round(i.clientHeight*y));(i.width!==e||i.height!==t)&&(i.width=e,i.height=t,s.viewport(0,0,e,t))}b(),new ResizeObserver(b).observe(i);let x=0,S=0,C=performance.now()-Math.random()*4e4;function w(e,t,n){s.uniform2f(p,i.width,i.height),s.uniform1f(m,e),s.uniform2f(h,x,-S),s.uniform1f(g,t),s.uniform1f(_,n),s.drawArrays(s.TRIANGLES,0,3)}w(24,0,1),i.classList.add(`on`);let T=!!(navigator.connection&&navigator.connection.saveData);if(e||a||T)return;let E=0,D=0;window.addEventListener(`cinebg:pulse`,e=>{D=e.detail&&e.detail.active?1:0});let O=!0,k=1,A=Array.from({length:21},(e,t)=>t/20);new IntersectionObserver(e=>{let t=e[0];O=t.isIntersecting;let n=window.innerHeight;k=O?Math.max(0,Math.min(1,t.intersectionRect.height/Math.min(t.boundingClientRect.height,n))):0},{threshold:A}).observe(i);let j=!1,M=C,N=0,P=0,F=0;function I(e){P=requestAnimationFrame(I),!(!O||document.hidden||e-F<33)&&(F=e,x+=(t-x)*.08,S+=(n-S)*.08,E+=(D-E)*.12,w((e-M)/1e3,E,k))}let L=i.closest(`.cinebg`)?.parentElement?.querySelector(`:scope > [data-cinebg-toggle]`),R=!1,z=[`pointermove`,`pointerdown`,`scroll`,`keydown`,`touchstart`,`wheel`];function B(){R||(R=!0,z.forEach(e=>window.removeEventListener(e,B)),M=performance.now()-24e3,P=requestAnimationFrame(I),L&&(L.hidden=!1))}if(z.forEach(e=>window.addEventListener(e,B,{passive:!0})),!L)return;function V(e){j=e,L.dataset.paused=String(j),L.setAttribute(`aria-label`,j?L.dataset.labelPlay:L.dataset.labelPause),j?(N=performance.now(),cancelAnimationFrame(P)):(M+=performance.now()-N,P=requestAnimationFrame(I))}L.addEventListener(`click`,()=>V(!j))}document.querySelectorAll(`canvas[data-cinebg]`).forEach(e=>{if(!e.dataset.cinebgInit){e.dataset.cinebgInit=`1`;try{i(e)}catch{}}});