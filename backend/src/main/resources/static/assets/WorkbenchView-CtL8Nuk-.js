import{d as he,k as N,I as Be,x as Je,o as y,D as be,L as _e,c as k,w as qe,a as o,t as C,j as D,g as Y,z as St,F as ue,i as X,A as J,H as $t,M as Qt,_ as Oe,y as we,N as en,n as ae,O as xe,P as Ct,Q as Ke,R as tn,S as nn,U as sn,T as ke,h as Se,e as on,v as an,V as rt,p as rn,W as ln,X as un,m as h,Y as Pt,B as Et,C as dn,b as cn,Z as pn,$ as fn,a0 as mn,a1 as Ie,a2 as hn,a3 as vn,a4 as it,u as gn,a5 as bn,a6 as yn,a7 as wn}from"./index-sg-HSsnF.js";import{u as xn}from"./useExportState-ZbZhRw5O.js";import{u as kn}from"./useFeedback-TUSL72Tx.js";const Sn={class:"selector-dialog"},$n={class:"selector-header"},Cn={class:"header-main"},Pn={key:0,class:"pub-title"},En={class:"selector-content"},An={key:0,class:"state-placeholder"},In={key:1,class:"state-placeholder error"},Fn={key:2,class:"canvas-container"},Mn={class:"selector-footer"},Tn={class:"selection-status"},Rn={class:"selected-name"},Bn={class:"actions"},On=["disabled"],Dn=he({__name:"SubtreeRootSelector",props:{modelValue:{type:Boolean},publicationId:{},publicationTitle:{}},emits:["update:modelValue","selected","cancel"],setup(e,{emit:t}){const n=e,s=t,r=N(!0),u=N(null),i=N(null),d=N(structuredClone(Be)),a=N(null),c=N(null),l=J(()=>a.value||""),m=J(()=>i.value?Qt(i.value,d.value):null);function M(x){if(a.value=x,i.value){const S=i.value.people[x];S&&(c.value=S.name)}}async function g(){r.value=!0,u.value=null;try{const x=await $t(n.publicationId);i.value=x.publication,d.value=structuredClone(x.settings)}catch(x){u.value=x.message||"加载族谱失败"}finally{r.value=!1}}function v(){if(a.value&&i.value){const x=i.value.people[a.value],S=x.dbId;S?(s("selected",S,x.name),s("update:modelValue",!1)):console.error("Missing dbId for person",a.value)}}function b(){s("cancel"),s("update:modelValue",!1)}return Je(()=>{n.modelValue&&g()}),(x,S)=>(y(),be(_e,{to:"body"},[e.modelValue?(y(),k("div",{key:0,class:"selector-overlay",onClick:qe(b,["self"])},[o("div",Sn,[o("header",$n,[o("div",Cn,[S[0]||(S[0]=o("h3",null,"选择子树起点",-1)),e.publicationTitle?(y(),k("span",Pn,C(e.publicationTitle),1)):D("",!0)]),S[1]||(S[1]=o("p",{class:"header-hint"}," 请在下方预览图中选择一个人物作为合并或查看的起点。选定后，将仅包含该人物及其后代。 ",-1))]),o("main",En,[r.value?(y(),k("div",An,[...S[2]||(S[2]=[o("div",{class:"spinner"},null,-1),o("p",null,"正在加载族谱数据...",-1)])])):u.value?(y(),k("div",In,[o("p",null,C(u.value),1),o("button",{onClick:g,class:"retry-btn"},"重试")])):i.value&&m.value?(y(),k("div",Fn,[Y(St,{publication:i.value,settings:d.value,layout:m.value,"selected-person-id":l.value,"pan-x":0,"pan-y":0,onSelectPerson:M},null,8,["publication","settings","layout","selected-person-id"])])):D("",!0)]),o("footer",Mn,[o("div",Tn,[c.value?(y(),k(ue,{key:0},[S[3]||(S[3]=X(" 已选中：",-1)),o("span",Rn,C(c.value),1)],64)):(y(),k(ue,{key:1},[X(" 未选择任何人物 ")],64))]),o("div",Bn,[o("button",{class:"action-btn cancel",onClick:b},"取消"),o("button",{class:"action-btn confirm",disabled:!a.value,onClick:v}," 确认选择 ",8,On)])])])])):D("",!0)]))}}),Nn=Oe(Dn,[["__scopeId","data-v-d22896c2"]]),Hn={class:"branch-mount-panel"},Ln={class:"branch-mount-panel__header"},zn={class:"branch-mount-toggle"},Vn=["checked"],_n={class:"branch-mount-panel__grid"},jn={class:"branch-mount-field"},Un=["disabled"],Gn={key:0,class:"custom-select__options"},Wn={key:0,class:"custom-select__group"},Xn=["onClick"],Yn={key:1,class:"custom-select__group"},Jn=["onClick"],qn={key:0,class:"subtree-config"},Kn={class:"subtree-info"},Zn={class:"root-display"},Qn={key:0,class:"root-name"},es={key:1,class:"root-none"},ts={class:"branch-mount-meta"},ns={key:0,class:"branch-mount-panel__feedback"},ss={key:0,class:"advanced-merge-zone"},os=["disabled"],as=he({__name:"BranchMountManager",props:{person:{},publicationId:{}},setup(e){const t=e,n=Ke("publication-context"),s=N([]),r=N(!1),u=N(!1),i=N(""),d=N(!1),a=N(!1),c=N(""),l=N(!1),m=J(()=>s.value.filter(f=>f.id!==t.publicationId&&f.accessRole!=="VIEWER")),M=J(()=>{const f={OWNER:[],EDITOR:[]};return m.value.forEach(w=>{f[w.accessRole]?f[w.accessRole].push(w):(f.OTHER||(f.OTHER=[]),f.OTHER.push(w))}),f}),g=J(()=>m.value.find(f=>String(f.id)===c.value)??null),v=J(()=>t.person.mountPointTarget??null),b=J(()=>{var f;return((f=v.value)==null?void 0:f.rootPersonName)??""});function x(f){c.value=String(f.id),E(f),l.value=!1}function S(){c.value="",E(null),l.value=!1}we(()=>{var f;return(f=t.person.mountPointTarget)==null?void 0:f.publicationId},f=>{c.value=f?String(f):""},{immediate:!0});async function R(){if(t.publicationId){r.value=!0;try{s.value=await tn()}finally{r.value=!1}}}function E(f){const w=v.value;if(!f){t.person.isMountPoint=!1,t.person.mountPointTarget=void 0,i.value="已清除挂载目标。";return}t.person.isMountPoint=!0,t.person.mountPointTarget={publicationId:f.id,publicationTitle:f.title,rootPersonId:w==null?void 0:w.rootPersonId,rootPersonName:w==null?void 0:w.rootPersonName},i.value=`已选择目标族谱：${f.title}`}function $(f,w){t.person.mountPointTarget&&(t.person.mountPointTarget.rootPersonId=f,t.person.mountPointTarget.rootPersonName=w,i.value=`已设定子树起点：${w}`)}function p(){t.person.mountPointTarget&&(t.person.mountPointTarget.rootPersonId=void 0,t.person.mountPointTarget.rootPersonName=void 0,i.value="已清除子树起点，将执行全量合并。")}function A(f){if(i.value="",!f){t.person.isMountPoint=!1,t.person.mountPointTarget=void 0,c.value="",i.value="已关闭挂载点。";return}const w=g.value??m.value[0]??null;if(!w){alert("当前没有可挂载的其他自有族谱。");return}c.value=String(w.id),E(w)}async function H(){if(!t.publicationId||!n)return;const f=await $t(t.publicationId);n.pub.replaceReactiveObject(n.pub.publication,f.publication),n.pub.replaceReactiveObject(n.pub.settings,f.settings),n.pub.selectedPersonId.value=f.publication.people[t.person.id]?t.person.id:n.pub.getDefaultSelectedPersonId(f.publication)}async function re(){var f;if(!t.publicationId){alert("请先保存族谱到服务器，再执行物理合并。");return}if(!t.person.isMountPoint||!((f=t.person.mountPointTarget)!=null&&f.publicationId)){alert("请先将当前人物设置为有效挂载点。");return}d.value=!0}async function G(){var f;if(!(!t.publicationId||!t.person.isMountPoint||!((f=t.person.mountPointTarget)!=null&&f.publicationId))){d.value=!1,u.value=!0,i.value="";try{await nn(t.publicationId,t.person.id),await H(),i.value="物理合并已完成。"}catch(w){console.error("branch merge failed",w),alert("物理合并失败，请检查权限或稍后重试。")}finally{u.value=!1}}}const P=f=>{f.target.closest(".custom-select")||(l.value=!1)};return Je(()=>{R(),window.addEventListener("click",P)}),en(()=>{window.removeEventListener("click",P)}),(f,w)=>{var F,te,Q,de;return y(),k(ue,null,[o("section",Hn,[o("div",Ln,[w[6]||(w[6]=o("div",null,[o("p",{class:"branch-mount-panel__eyebrow"},"Branch Mount"),o("h4",null,"分支挂载与物理合并")],-1)),o("label",zn,[o("input",{checked:!!e.person.isMountPoint,type:"checkbox",onChange:w[0]||(w[0]=V=>A(V.target.checked))},null,40,Vn),o("span",null,C(e.person.isMountPoint?"已启用":"未启用"),1)])]),o("div",_n,[o("div",jn,[w[11]||(w[11]=o("span",null,"目标族谱",-1)),o("div",{class:ae(["custom-select",{"is-open":l.value}])},[o("button",{class:"custom-select__trigger",type:"button",disabled:r.value||!m.value.length,onClick:w[1]||(w[1]=V=>l.value=!l.value)},[o("span",null,C(((F=g.value)==null?void 0:F.title)||"选择一个目标族谱"),1),w[7]||(w[7]=o("svg",{class:"chevron",fill:"none",height:"12",stroke:"currentColor","stroke-width":"2",viewBox:"0 0 24 24",width:"12"},[o("polyline",{points:"6 9 12 15 18 9"})],-1))],8,Un),l.value?(y(),k("div",Gn,[M.value.OWNER.length?(y(),k("div",Wn,[w[8]||(w[8]=o("label",null,"我的族谱",-1)),(y(!0),k(ue,null,xe(M.value.OWNER,V=>(y(),k("button",{key:V.id,class:"custom-select__option",onClick:ne=>x(V)},C(V.title),9,Xn))),128))])):D("",!0),M.value.EDITOR.length?(y(),k("div",Yn,[w[9]||(w[9]=o("label",null,"共享 - 编辑",-1)),(y(!0),k(ue,null,xe(M.value.EDITOR,V=>(y(),k("button",{key:V.id,class:"custom-select__option",onClick:ne=>x(V)},C(V.title),9,Jn))),128))])):D("",!0),o("button",{class:"custom-select__option custom-select__option--clear",onClick:S}," 清除选择 ")])):D("",!0)],2),e.person.isMountPoint&&g.value?(y(),k("div",qn,[o("div",Kn,[w[10]||(w[10]=o("span",{class:"label"},"子树起点",-1)),o("div",Zn,[b.value?(y(),k("strong",Qn,C(b.value),1)):(y(),k("em",es,"未指定（全量）")),b.value?(y(),k("button",{key:2,class:"clear-root-btn",title:"清除起点",onClick:p}," × ")):D("",!0)])]),o("button",{class:"select-root-btn",type:"button",onClick:w[2]||(w[2]=V=>a.value=!0)},C(b.value?"更换起点":"视觉化指定起点"),1)])):D("",!0)]),o("article",ts,[w[12]||(w[12]=o("span",null,"当前状态",-1)),o("strong",null,C(e.person.isMountPoint?"挂载点已建立":"普通人物节点"),1),o("em",null,C(((te=e.person.mountPointTarget)==null?void 0:te.publicationTitle)||"尚未选择目标族谱"),1)])]),i.value?(y(),k("p",ns,C(i.value),1)):D("",!0)]),e.person.isMountPoint&&c.value?(y(),k("section",ss,[w[13]||(w[13]=o("div",{class:"advanced-merge-zone__header"},[o("svg",{fill:"none",height:"18",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",viewBox:"0 0 24 24",width:"18"},[o("path",{d:"M11 17l5 5 5-5M11 7l5-5 5 5M16 22V2M8 2H1.5a.5.5 0 0 0-.5.5v19a.5.5 0 0 0 .5.5H8M4 12h4"})]),o("strong",null,"高级合并操作")],-1)),o("p",null," 物理合并会不可逆地将目标族谱“"+C((Q=g.value)==null?void 0:Q.title)+"”的数据副本直接写入当前稿件。操作完成后，该挂载点将被清除。 ",1),o("button",{class:"relation-btn relation-btn--accent",type:"button",disabled:u.value,onClick:re},C(u.value?"正在物理合并...":"确认执行物理合并"),9,os)])):D("",!0),Y(Ct,{modelValue:d.value,title:"物理合并确认",message:"物理合并会把目标族谱当前快照复制进当前族谱，并清除这个挂载点。确定继续吗？",confirmLabel:"确认合并",tone:"danger",onConfirm:G,onCancel:w[3]||(w[3]=V=>d.value=!1),"onUpdate:modelValue":w[4]||(w[4]=V=>{V||(d.value=!1)})},null,8,["modelValue"]),a.value?(y(),be(Nn,{key:1,modelValue:a.value,"onUpdate:modelValue":w[5]||(w[5]=V=>a.value=V),"publication-id":Number(c.value),"publication-title":(de=g.value)==null?void 0:de.title,onSelected:$},null,8,["modelValue","publication-id","publication-title"])):D("",!0)],64)}}}),rs=Oe(as,[["__scopeId","data-v-e244dfe2"]]);async function is(e,t,n){const s=new FormData;return s.append("file",n),s.append("personId",e),s.append("publicationId",String(t)),(await sn.post("/photos",s,{headers:{"Content-Type":"multipart/form-data"}})).data.data.id}function ls(e){return`/api/photos/${e}`}const us={key:0,class:"editor-overlay"},ds={class:"editor-sheet-panel"},cs={class:"editor-sheet-panel__header"},ps={class:"editor-focus"},fs={class:"editor-focus__title",style:{display:"flex","align-items":"center",gap:"16px"}},ms={class:"avatar-upload",style:{position:"relative",width:"64px",height:"64px","border-radius":"50%",overflow:"hidden",background:"rgba(169, 110, 53, 0.05)",border:"1px solid var(--border-color)","flex-shrink":"0",display:"flex","align-items":"center","justify-content":"center",cursor:"pointer"}},hs=["src"],vs={key:1,style:{"font-size":"28px",opacity:"0.5"}},gs={style:{flex:"1"}},bs={class:"editor-focus__hint"},ys={class:"editor-focus__grid"},ws={class:"relationship-panel"},xs={class:"relationship-panel__header"},ks={class:"relationship-panel__badge"},Ss={class:"relationship-grid"},$s={class:"relationship-card"},Cs={class:"relationship-card"},Ps={class:"relationship-card relationship-card--wide"},Es={class:"relationship-section"},As={class:"relationship-actions"},Is=["disabled"],Fs=["disabled"],Ms=["disabled"],Ts={class:"relationship-section"},Rs={class:"relationship-actions"},Bs=["disabled"],Os=["disabled"],Ds={class:"relationship-section"},Ns={class:"relationship-actions"},Hs={class:"relationship-section relationship-section--branch"},Ls={class:"branch-actions"},zs=["disabled"],Vs={key:0,class:"relationship-section relationship-section--branch"},_s={class:"relationship-actions"},js={key:1,class:"child-order-panel"},Us={class:"child-order-list"},Gs=["onClick"],Ws={class:"child-order-item__actions"},Xs=["disabled","onClick"],Ys=["disabled","onClick"],Js={class:"editor-form"},qs={class:"field"},Ks=["value"],Zs={class:"field"},Qs=["value"],eo={class:"field"},to=["value"],no={class:"field"},so=["value"],oo={class:"field"},ao=["value"],ro={class:"field"},io=["value"],lo={class:"field"},uo=["value"],co={class:"field"},po=["value"],fo={key:0,class:"lineage-suggestion"},mo={class:"detail-link-zone"},ho={class:"danger-zone"},vo=he({__name:"PersonEditorDrawer",props:{open:{type:Boolean},person:{},publicationId:{},suggestion:{},lineageSuggestion:{},details:{},spouse:{},parents:{},children:{},childItems:{},canAddSpouse:{type:Boolean},hasCompleteParents:{type:Boolean},canSwapAdults:{type:Boolean},isSelectedBranchFocused:{type:Boolean},canSetBranchMode:{type:Boolean},branchMode:{},parentActionLabel:{},branchActionLabel:{}},emits:["close","select-person","add-spouse","add-child","add-parents","remove-spouse","remove-parents","focus-branch","update-branch-mode","swap-partners","move-child","update-person-field","update-person-gender","apply-note-suggestion","delete-person","view-detail"],setup(e,{emit:t}){const n=e,s=t;function r(d,a){s("update-person-field",{field:d,value:a.target.value})}function u(d){s("update-person-gender",d.target.value)}async function i(d){const a=d.target;if(!a.files||a.files.length===0)return;if(!n.publicationId){alert("请先保存族谱到服务器后再上传照片");return}const c=a.files[0];try{const l=await is(n.person.id,n.publicationId,c);s("update-person-field",{field:"avatarUrl",value:ls(l)})}catch(l){console.error("上传出错",l),alert("上传出错，请检查后端服务是否启动")}}return(d,a)=>(y(),be(ke,{name:"editor-sheet"},{default:Se(()=>{var c;return[e.open?(y(),k("div",us,[o("button",{class:"editor-overlay__scrim",type:"button","aria-label":"关闭人物编辑",onClick:a[0]||(a[0]=l=>d.$emit("close"))}),o("aside",ds,[o("div",cs,[o("div",null,[a[22]||(a[22]=o("p",{class:"editor-sheet-panel__eyebrow"},"卷宗编修",-1)),o("h3",null,C(e.person.name),1)]),o("button",{class:"editor-sheet-panel__close",type:"button",onClick:a[1]||(a[1]=l=>d.$emit("close"))},"合卷")]),o("div",ps,[o("div",fs,[o("div",ms,[e.person.avatarUrl?(y(),k("img",{key:0,src:e.person.avatarUrl,style:{width:"100%",height:"100%","object-fit":"contain"}},null,8,hs)):(y(),k("div",vs,"👤")),o("input",{type:"file",accept:"image/*",onChange:i,style:{position:"absolute",inset:"0",opacity:"0",cursor:"pointer"},title:"上传照片"},null,32)]),o("div",gs,[a[23]||(a[23]=o("p",null,"当前传主",-1)),o("h3",null,C(e.person.name),1)]),o("span",null,C([e.person.titleName,e.person.clan,e.person.note||e.lineageSuggestion].filter(Boolean).join(" · ")||"尚未定论"),1)]),o("p",bs,C(e.suggestion),1),o("div",ys,[(y(!0),k(ue,null,xe(e.details,l=>(y(),k("div",{key:l.label,class:"editor-mini-card"},[o("span",null,C(l.label),1),o("strong",null,C(l.value),1)]))),128))])]),o("section",ws,[o("div",xs,[a[24]||(a[24]=o("div",null,[o("p",{class:"relationship-panel__eyebrow"},"宗法关系"),o("h4",null,"世系编排")],-1)),o("span",ks,C(e.children.length)+" 位子嗣",1)]),o("div",Ss,[o("article",$s,[a[25]||(a[25]=o("span",null,"配偶",-1)),o("strong",null,C(((c=e.spouse)==null?void 0:c.name)||"未建立配偶关系"),1)]),o("article",Cs,[a[26]||(a[26]=o("span",null,"父母",-1)),o("strong",null,C(e.parents.length?e.parents.map(l=>l.name).join(" · "):"未建立父母关系"),1)]),o("article",Ps,[a[27]||(a[27]=o("span",null,"子女",-1)),o("strong",null,C(e.children.length?e.children.map(l=>l.name).join(" · "):"暂无子女"),1)])]),o("div",Es,[a[28]||(a[28]=o("div",{class:"relationship-section__header"},[o("strong",null,"配偶关系"),o("span",null,"建立或调整夫妻位置")],-1)),o("div",As,[o("button",{class:"relation-btn",type:"button",disabled:!e.canAddSpouse,onClick:a[2]||(a[2]=l=>d.$emit("add-spouse"))},"缔结姻亲",8,Is),o("button",{class:"relation-btn",type:"button",disabled:!e.canSwapAdults,onClick:a[3]||(a[3]=l=>d.$emit("swap-partners"))},"调配尊卑位次",8,Fs),o("button",{class:"relation-btn relation-btn--danger relationship-actions__wide",type:"button",disabled:!e.spouse,onClick:a[4]||(a[4]=l=>d.$emit("remove-spouse"))}," 断绝姻缘 ",8,Ms)])]),o("div",Ts,[a[29]||(a[29]=o("div",{class:"relationship-section__header"},[o("strong",null,"父母关系"),o("span",null,"补齐上代信息或解除引用")],-1)),o("div",Rs,[o("button",{class:"relation-btn",type:"button",disabled:e.hasCompleteParents,onClick:a[5]||(a[5]=l=>d.$emit("add-parents"))},C(e.parentActionLabel),9,Bs),o("button",{class:"relation-btn relation-btn--danger",type:"button",disabled:!e.parents.length,onClick:a[6]||(a[6]=l=>d.$emit("remove-parents"))}," 斩断血脉渊源 ",8,Os)])]),o("div",Ds,[a[30]||(a[30]=o("div",{class:"relationship-section__header"},[o("strong",null,"子女关系"),o("span",null,"按性别新增，并可调整排序")],-1)),o("div",Ns,[o("button",{class:"relation-btn",type:"button",onClick:a[7]||(a[7]=l=>d.$emit("add-child","male"))},"录入男丁"),o("button",{class:"relation-btn",type:"button",onClick:a[8]||(a[8]=l=>d.$emit("add-child","female"))},"录入女眷")])]),o("div",Hs,[a[31]||(a[31]=o("div",{class:"relationship-section__header"},[o("strong",null,"谱系查看"),o("span",null,"切换到当前人物所在宗支")],-1)),o("div",Ls,[o("button",{class:"relation-btn relation-btn--accent",type:"button",disabled:e.isSelectedBranchFocused,onClick:a[9]||(a[9]=l=>d.$emit("focus-branch"))},C(e.branchActionLabel),9,zs)])]),e.canSetBranchMode?(y(),k("div",Vs,[a[32]||(a[32]=o("div",{class:"relationship-section__header"},[o("strong",null,"婚配归属"),o("span",null,"女性成家后可区分外嫁或招婿")],-1)),o("div",_s,[o("button",{class:ae(["relation-btn",{"relation-btn--accent":e.branchMode==="married-out"}]),type:"button",onClick:a[10]||(a[10]=l=>d.$emit("update-branch-mode","married-out"))}," 适人 ",2),o("button",{class:ae(["relation-btn",{"relation-btn--accent":e.branchMode==="uxorilocal"}]),type:"button",onClick:a[11]||(a[11]=l=>d.$emit("update-branch-mode","uxorilocal"))}," 赘婿 ",2)])])):D("",!0),e.childItems.length?(y(),k("div",js,[a[33]||(a[33]=o("div",{class:"child-order-panel__header"},[o("span",null,"子嗣长幼"),o("strong",null,"左右顺序会影响画卷排布")],-1)),o("div",Us,[(y(!0),k(ue,null,xe(e.childItems,l=>(y(),k("article",{key:l.person.id,class:"child-order-item"},[o("button",{class:"child-order-item__main",type:"button",onClick:m=>d.$emit("select-person",l.person.id)},[o("strong",null,C(l.index+1)+". "+C(l.person.name),1),o("span",null,C(l.person.titleName||l.person.note||"子女"),1)],8,Gs),o("div",Ws,[o("button",{class:"relation-icon-btn",type:"button",disabled:l.isFirst,onClick:m=>d.$emit("move-child",{childId:l.person.id,direction:-1})}," ← ",8,Xs),o("button",{class:"relation-icon-btn",type:"button",disabled:l.isLast,onClick:m=>d.$emit("move-child",{childId:l.person.id,direction:1})}," → ",8,Ys)])]))),128))])])):D("",!0)]),Y(rs,{person:e.person,"publication-id":e.publicationId},null,8,["person","publication-id"]),o("div",Js,[o("label",qs,[a[35]||(a[35]=o("span",null,"性别",-1)),o("select",{value:e.person.gender,onChange:u},[...a[34]||(a[34]=[o("option",{value:"male"},"男",-1),o("option",{value:"female"},"女",-1),o("option",{value:"unknown"},"未定",-1)])],40,Ks)]),o("label",Zs,[a[36]||(a[36]=o("span",null,"姓名",-1)),o("input",{value:e.person.name,type:"text",onInput:a[12]||(a[12]=l=>r("name",l))},null,40,Qs)]),o("label",eo,[a[37]||(a[37]=o("span",null,"出生",-1)),o("input",{value:e.person.birth,type:"text",placeholder:"如：1978年十月初八",onInput:a[13]||(a[13]=l=>r("birth",l))},null,40,to)]),o("label",no,[a[38]||(a[38]=o("span",null,"称号",-1)),o("input",{value:e.person.titleName,type:"text",placeholder:"如：唐太宗 / 宣统帝 / 皇太子",onInput:a[14]||(a[14]=l=>r("titleName",l))},null,40,so)]),o("label",oo,[a[39]||(a[39]=o("span",null,"宗族",-1)),o("input",{value:e.person.clan,type:"text",placeholder:"如：陇西李氏 / 爱新觉罗氏",onInput:a[15]||(a[15]=l=>r("clan",l))},null,40,ao)]),o("label",ro,[a[40]||(a[40]=o("span",null,"卒年",-1)),o("input",{value:e.person.death,type:"text",placeholder:"如：2022年五月",onInput:a[16]||(a[16]=l=>r("death",l))},null,40,io)]),o("label",lo,[a[41]||(a[41]=o("span",null,"年龄",-1)),o("input",{value:e.person.age,type:"text",placeholder:"支持直接填写 71岁",onInput:a[17]||(a[17]=l=>r("age",l))},null,40,uo)]),o("label",co,[a[42]||(a[42]=o("span",null,"注记",-1)),o("input",{value:e.person.note,type:"text",placeholder:"如：长房 / 次子 / 配偶",onInput:a[18]||(a[18]=l=>r("note",l))},null,40,po)]),e.lineageSuggestion?(y(),k("div",fo,[o("span",null,"史馆推演："+C(e.lineageSuggestion),1),e.person.note!==e.lineageSuggestion?(y(),k("button",{key:0,type:"button",onClick:a[19]||(a[19]=l=>d.$emit("apply-note-suggestion",e.lineageSuggestion))}," 落笔注记 ")):D("",!0)])):D("",!0)]),o("section",mo,[o("button",{class:"relation-btn relation-btn--secondary",type:"button",onClick:a[20]||(a[20]=l=>d.$emit("view-detail"))},[...a[43]||(a[43]=[X(" 披阅本纪 (详情) ",-1),o("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},[o("polyline",{points:"9 18 15 12 9 6"})],-1)])])]),o("section",ho,[a[44]||(a[44]=o("div",null,[o("p",null,"非常行事"),o("span",null,"除名后，此人在所有姻亲、血脉网络中的关联将一并抹除。")],-1)),o("button",{class:"relation-btn relation-btn--danger",type:"button",onClick:a[21]||(a[21]=l=>d.$emit("delete-person"))},"从宗谱除名")])])])):D("",!0)]}),_:1}))}}),go={class:"export-dialog"},bo={class:"tabs"},yo={key:0,class:"tab-content"},wo={class:"actions"},xo=["disabled"],ko={key:1,class:"tab-content"},So={class:"options-group"},$o={key:0,class:"strength-indicator"},Co={class:"strength-bar"},Po={class:"actions"},Eo=["disabled"],Ao=he({__name:"ExportDialog",props:{modelValue:{type:Boolean},isProcessing:{type:Boolean}},emits:["update:modelValue","export-svg","export-share-html"],setup(e,{emit:t}){const n=t,s=N("svg"),r=N(""),u=J(()=>{const d=r.value;if(!d)return null;let a=0;return d.length>=6&&a++,d.length>=10&&a++,/[a-z]/.test(d)&&/[A-Z]/.test(d)&&a++,/\d/.test(d)&&a++,/[^a-zA-Z0-9]/.test(d)&&a++,a<=1?{level:"weak",label:"弱",color:"#e74c3c",percent:25}:a<=2?{level:"fair",label:"一般",color:"#f39c12",percent:50}:a<=3?{level:"medium",label:"中等",color:"#e67e22",percent:70}:{level:"strong",label:"强",color:"#27ae60",percent:100}});function i(){n("export-share-html",{password:r.value})}return(d,a)=>e.modelValue?(y(),k("div",{key:0,class:"export-dialog-backdrop",onClick:a[5]||(a[5]=qe(c=>d.$emit("update:modelValue",!1),["self"]))},[o("div",go,[o("button",{class:"close-btn",onClick:a[0]||(a[0]=c=>d.$emit("update:modelValue",!1))},"×"),a[10]||(a[10]=o("header",{class:"dialog-header"},[o("span",{class:"dialog-eyebrow"},"Export"),o("h2",null,"导出与分享")],-1)),o("div",bo,[o("button",{onClick:a[1]||(a[1]=c=>s.value="svg"),class:ae(["tab-btn",{active:s.value==="svg"}])}," 矢量 SVG ",2),o("button",{onClick:a[2]||(a[2]=c=>s.value="share"),class:ae(["tab-btn",{active:s.value==="share"}])}," 分享网页 ",2)]),s.value==="svg"?(y(),k("div",yo,[a[6]||(a[6]=o("p",{class:"description"},"导出为无限放大的矢量文件。这是最保真的格式，适合专业排版、印刷或作为原始备份。",-1)),o("div",wo,[o("button",{class:"btn btn--primary",onClick:a[3]||(a[3]=c=>d.$emit("export-svg")),disabled:e.isProcessing}," 立即下载矢量 SVG ",8,xo)])])):D("",!0),s.value==="share"?(y(),k("div",ko,[a[9]||(a[9]=o("p",{class:"description"},"生成一个独立的 HTML 文件，无需服务器即可在任何浏览器中打开查看交互式族谱。支持可选的密码保护。",-1)),o("div",So,[a[7]||(a[7]=o("label",{class:"field-label"},"密码保护（可选）",-1)),on(o("input",{"onUpdate:modelValue":a[4]||(a[4]=c=>r.value=c),type:"password",placeholder:"留空则不加密",class:"share-password-input"},null,512),[[an,r.value]]),a[8]||(a[8]=o("p",{class:"field-hint"},"设置密码后，打开文件时需要输入密码才能查看内容。",-1)),u.value?(y(),k("div",$o,[o("div",Co,[o("div",{class:"strength-fill",style:rt({width:u.value.percent+"%",backgroundColor:u.value.color})},null,4)]),o("span",{class:"strength-label",style:rt({color:u.value.color})}," 密码强度："+C(u.value.label),5)])):D("",!0)]),o("div",Po,[o("button",{class:"btn btn--primary",onClick:i,disabled:e.isProcessing},C(e.isProcessing?"正在生成...":"生成分享网页"),9,Eo)])])):D("",!0)])])):D("",!0)}}),Io=Oe(Ao,[["__scopeId","data-v-5731e8df"]]);function Fo(e,t){if(e.match(/^[a-z]+:\/\//i))return e;if(e.match(/^\/\//))return window.location.protocol+e;if(e.match(/^[a-z]+:/i))return e;const n=document.implementation.createHTMLDocument(),s=n.createElement("base"),r=n.createElement("a");return n.head.appendChild(s),n.body.appendChild(r),t&&(s.href=t),r.href=e,r.href}const Mo=(()=>{let e=0;const t=()=>`0000${(Math.random()*36**4<<0).toString(36)}`.slice(-4);return()=>(e+=1,`u${t()}${e}`)})();function fe(e){const t=[];for(let n=0,s=e.length;n<s;n++)t.push(e[n]);return t}let ve=null;function At(e={}){return ve||(e.includeStyleProperties?(ve=e.includeStyleProperties,ve):(ve=fe(window.getComputedStyle(document.documentElement)),ve))}function Fe(e,t){const s=(e.ownerDocument.defaultView||window).getComputedStyle(e).getPropertyValue(t);return s?parseFloat(s.replace("px","")):0}function To(e){const t=Fe(e,"border-left-width"),n=Fe(e,"border-right-width");return e.clientWidth+t+n}function Ro(e){const t=Fe(e,"border-top-width"),n=Fe(e,"border-bottom-width");return e.clientHeight+t+n}function It(e,t={}){const n=t.width||To(e),s=t.height||Ro(e);return{width:n,height:s}}function Bo(){let e,t;try{t=process}catch{}const n=t&&t.env?t.env.devicePixelRatio:null;return n&&(e=parseInt(n,10),Number.isNaN(e)&&(e=1)),e||window.devicePixelRatio||1}const K=16384;function Oo(e){(e.width>K||e.height>K)&&(e.width>K&&e.height>K?e.width>e.height?(e.height*=K/e.width,e.width=K):(e.width*=K/e.height,e.height=K):e.width>K?(e.height*=K/e.width,e.width=K):(e.width*=K/e.height,e.height=K))}function Me(e){return new Promise((t,n)=>{const s=new Image;s.onload=()=>{s.decode().then(()=>{requestAnimationFrame(()=>t(s))})},s.onerror=n,s.crossOrigin="anonymous",s.decoding="async",s.src=e})}async function Do(e){return Promise.resolve().then(()=>new XMLSerializer().serializeToString(e)).then(encodeURIComponent).then(t=>`data:image/svg+xml;charset=utf-8,${t}`)}async function No(e,t,n){const s="http://www.w3.org/2000/svg",r=document.createElementNS(s,"svg"),u=document.createElementNS(s,"foreignObject");return r.setAttribute("width",`${t}`),r.setAttribute("height",`${n}`),r.setAttribute("viewBox",`0 0 ${t} ${n}`),u.setAttribute("width","100%"),u.setAttribute("height","100%"),u.setAttribute("x","0"),u.setAttribute("y","0"),u.setAttribute("externalResourcesRequired","true"),r.appendChild(u),u.appendChild(e),Do(r)}const q=(e,t)=>{if(e instanceof t)return!0;const n=Object.getPrototypeOf(e);return n===null?!1:n.constructor.name===t.name||q(n,t)};function Ho(e){const t=e.getPropertyValue("content");return`${e.cssText} content: '${t.replace(/'|"/g,"")}';`}function Lo(e,t){return At(t).map(n=>{const s=e.getPropertyValue(n),r=e.getPropertyPriority(n);return`${n}: ${s}${r?" !important":""};`}).join(" ")}function zo(e,t,n,s){const r=`.${e}:${t}`,u=n.cssText?Ho(n):Lo(n,s);return document.createTextNode(`${r}{${u}}`)}function lt(e,t,n,s){const r=window.getComputedStyle(e,n),u=r.getPropertyValue("content");if(u===""||u==="none")return;const i=Mo();try{t.className=`${t.className} ${i}`}catch{return}const d=document.createElement("style");d.appendChild(zo(i,n,r,s)),t.appendChild(d)}function Vo(e,t,n){lt(e,t,":before",n),lt(e,t,":after",n)}const ut="application/font-woff",dt="image/jpeg",_o={woff:ut,woff2:ut,ttf:"application/font-truetype",eot:"application/vnd.ms-fontobject",png:"image/png",jpg:dt,jpeg:dt,gif:"image/gif",tiff:"image/tiff",svg:"image/svg+xml",webp:"image/webp"};function jo(e){const t=/\.([^./]*?)$/g.exec(e);return t?t[1]:""}function Ze(e){const t=jo(e).toLowerCase();return _o[t]||""}function Uo(e){return e.split(/,/)[1]}function je(e){return e.search(/^(data:)/)!==-1}function Go(e,t){return`data:${t};base64,${e}`}async function Ft(e,t,n){const s=await fetch(e,t);if(s.status===404)throw new Error(`Resource "${s.url}" not found`);const r=await s.blob();return new Promise((u,i)=>{const d=new FileReader;d.onerror=i,d.onloadend=()=>{try{u(n({res:s,result:d.result}))}catch(a){i(a)}},d.readAsDataURL(r)})}const He={};function Wo(e,t,n){let s=e.replace(/\?.*/,"");return n&&(s=e),/ttf|otf|eot|woff2?/i.test(s)&&(s=s.replace(/.*\//,"")),t?`[${t}]${s}`:s}async function Qe(e,t,n){const s=Wo(e,t,n.includeQueryParams);if(He[s]!=null)return He[s];n.cacheBust&&(e+=(/\?/.test(e)?"&":"?")+new Date().getTime());let r;try{const u=await Ft(e,n.fetchRequestInit,({res:i,result:d})=>(t||(t=i.headers.get("Content-Type")||""),Uo(d)));r=Go(u,t)}catch(u){r=n.imagePlaceholder||"";let i=`Failed to fetch resource: ${e}`;u&&(i=typeof u=="string"?u:u.message),i&&console.warn(i)}return He[s]=r,r}async function Xo(e){const t=e.toDataURL();return t==="data:,"?e.cloneNode(!1):Me(t)}async function Yo(e,t){if(e.currentSrc){const u=document.createElement("canvas"),i=u.getContext("2d");u.width=e.clientWidth,u.height=e.clientHeight,i==null||i.drawImage(e,0,0,u.width,u.height);const d=u.toDataURL();return Me(d)}const n=e.poster,s=Ze(n),r=await Qe(n,s,t);return Me(r)}async function Jo(e,t){var n;try{if(!((n=e==null?void 0:e.contentDocument)===null||n===void 0)&&n.body)return await De(e.contentDocument.body,t,!0)}catch{}return e.cloneNode(!1)}async function qo(e,t){return q(e,HTMLCanvasElement)?Xo(e):q(e,HTMLVideoElement)?Yo(e,t):q(e,HTMLIFrameElement)?Jo(e,t):e.cloneNode(Mt(e))}const Ko=e=>e.tagName!=null&&e.tagName.toUpperCase()==="SLOT",Mt=e=>e.tagName!=null&&e.tagName.toUpperCase()==="SVG";async function Zo(e,t,n){var s,r;if(Mt(t))return t;let u=[];return Ko(e)&&e.assignedNodes?u=fe(e.assignedNodes()):q(e,HTMLIFrameElement)&&(!((s=e.contentDocument)===null||s===void 0)&&s.body)?u=fe(e.contentDocument.body.childNodes):u=fe(((r=e.shadowRoot)!==null&&r!==void 0?r:e).childNodes),u.length===0||q(e,HTMLVideoElement)||await u.reduce((i,d)=>i.then(()=>De(d,n)).then(a=>{a&&t.appendChild(a)}),Promise.resolve()),t}function Qo(e,t,n){const s=t.style;if(!s)return;const r=window.getComputedStyle(e);r.cssText?(s.cssText=r.cssText,s.transformOrigin=r.transformOrigin):At(n).forEach(u=>{let i=r.getPropertyValue(u);u==="font-size"&&i.endsWith("px")&&(i=`${Math.floor(parseFloat(i.substring(0,i.length-2)))-.1}px`),q(e,HTMLIFrameElement)&&u==="display"&&i==="inline"&&(i="block"),u==="d"&&t.getAttribute("d")&&(i=`path(${t.getAttribute("d")})`),s.setProperty(u,i,r.getPropertyPriority(u))})}function ea(e,t){q(e,HTMLTextAreaElement)&&(t.innerHTML=e.value),q(e,HTMLInputElement)&&t.setAttribute("value",e.value)}function ta(e,t){if(q(e,HTMLSelectElement)){const s=Array.from(t.children).find(r=>e.value===r.getAttribute("value"));s&&s.setAttribute("selected","")}}function na(e,t,n){return q(t,Element)&&(Qo(e,t,n),Vo(e,t,n),ea(e,t),ta(e,t)),t}async function sa(e,t){const n=e.querySelectorAll?e.querySelectorAll("use"):[];if(n.length===0)return e;const s={};for(let u=0;u<n.length;u++){const d=n[u].getAttribute("xlink:href");if(d){const a=e.querySelector(d),c=document.querySelector(d);!a&&c&&!s[d]&&(s[d]=await De(c,t,!0))}}const r=Object.values(s);if(r.length){const u="http://www.w3.org/1999/xhtml",i=document.createElementNS(u,"svg");i.setAttribute("xmlns",u),i.style.position="absolute",i.style.width="0",i.style.height="0",i.style.overflow="hidden",i.style.display="none";const d=document.createElementNS(u,"defs");i.appendChild(d);for(let a=0;a<r.length;a++)d.appendChild(r[a]);e.appendChild(i)}return e}async function De(e,t,n){return!n&&t.filter&&!t.filter(e)?null:Promise.resolve(e).then(s=>qo(s,t)).then(s=>Zo(e,s,t)).then(s=>na(e,s,t)).then(s=>sa(s,t))}const Tt=/url\((['"]?)([^'"]+?)\1\)/g,oa=/url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g,aa=/src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;function ra(e){const t=e.replace(/([.*+?^${}()|\[\]\/\\])/g,"\\$1");return new RegExp(`(url\\(['"]?)(${t})(['"]?\\))`,"g")}function ia(e){const t=[];return e.replace(Tt,(n,s,r)=>(t.push(r),n)),t.filter(n=>!je(n))}async function la(e,t,n,s,r){try{const u=n?Fo(t,n):t,i=Ze(t);let d;return r||(d=await Qe(u,i,s)),e.replace(ra(t),`$1${d}$3`)}catch{}return e}function ua(e,{preferredFontFormat:t}){return t?e.replace(aa,n=>{for(;;){const[s,,r]=oa.exec(n)||[];if(!r)return"";if(r===t)return`src: ${s};`}}):e}function Rt(e){return e.search(Tt)!==-1}async function Bt(e,t,n){if(!Rt(e))return e;const s=ua(e,n);return ia(s).reduce((u,i)=>u.then(d=>la(d,i,t,n)),Promise.resolve(s))}async function ge(e,t,n){var s;const r=(s=t.style)===null||s===void 0?void 0:s.getPropertyValue(e);if(r){const u=await Bt(r,null,n);return t.style.setProperty(e,u,t.style.getPropertyPriority(e)),!0}return!1}async function da(e,t){await ge("background",e,t)||await ge("background-image",e,t),await ge("mask",e,t)||await ge("-webkit-mask",e,t)||await ge("mask-image",e,t)||await ge("-webkit-mask-image",e,t)}async function ca(e,t){const n=q(e,HTMLImageElement);if(!(n&&!je(e.src))&&!(q(e,SVGImageElement)&&!je(e.href.baseVal)))return;const s=n?e.src:e.href.baseVal,r=await Qe(s,Ze(s),t);await new Promise((u,i)=>{e.onload=u,e.onerror=t.onImageErrorHandler?(...a)=>{try{u(t.onImageErrorHandler(...a))}catch(c){i(c)}}:i;const d=e;d.decode&&(d.decode=u),d.loading==="lazy"&&(d.loading="eager"),n?(e.srcset="",e.src=r):e.href.baseVal=r})}async function pa(e,t){const s=fe(e.childNodes).map(r=>Ot(r,t));await Promise.all(s).then(()=>e)}async function Ot(e,t){q(e,Element)&&(await da(e,t),await ca(e,t),await pa(e,t))}function fa(e,t){const{style:n}=e;t.backgroundColor&&(n.backgroundColor=t.backgroundColor),t.width&&(n.width=`${t.width}px`),t.height&&(n.height=`${t.height}px`);const s=t.style;return s!=null&&Object.keys(s).forEach(r=>{n[r]=s[r]}),e}const ct={};async function pt(e){let t=ct[e];if(t!=null)return t;const s=await(await fetch(e)).text();return t={url:e,cssText:s},ct[e]=t,t}async function ft(e,t){let n=e.cssText;const s=/url\(["']?([^"')]+)["']?\)/g,u=(n.match(/url\([^)]+\)/g)||[]).map(async i=>{let d=i.replace(s,"$1");return d.startsWith("https://")||(d=new URL(d,e.url).href),Ft(d,t.fetchRequestInit,({result:a})=>(n=n.replace(i,`url(${a})`),[i,a]))});return Promise.all(u).then(()=>n)}function mt(e){if(e==null)return[];const t=[],n=/(\/\*[\s\S]*?\*\/)/gi;let s=e.replace(n,"");const r=new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})","gi");for(;;){const a=r.exec(s);if(a===null)break;t.push(a[0])}s=s.replace(r,"");const u=/@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi,i="((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})",d=new RegExp(i,"gi");for(;;){let a=u.exec(s);if(a===null){if(a=d.exec(s),a===null)break;u.lastIndex=d.lastIndex}else d.lastIndex=u.lastIndex;t.push(a[0])}return t}async function ma(e,t){const n=[],s=[];return e.forEach(r=>{if("cssRules"in r)try{fe(r.cssRules||[]).forEach((u,i)=>{if(u.type===CSSRule.IMPORT_RULE){let d=i+1;const a=u.href,c=pt(a).then(l=>ft(l,t)).then(l=>mt(l).forEach(m=>{try{r.insertRule(m,m.startsWith("@import")?d+=1:r.cssRules.length)}catch(M){console.error("Error inserting rule from remote css",{rule:m,error:M})}})).catch(l=>{console.error("Error loading remote css",l.toString())});s.push(c)}})}catch(u){const i=e.find(d=>d.href==null)||document.styleSheets[0];r.href!=null&&s.push(pt(r.href).then(d=>ft(d,t)).then(d=>mt(d).forEach(a=>{i.insertRule(a,i.cssRules.length)})).catch(d=>{console.error("Error loading remote stylesheet",d)})),console.error("Error inlining remote css file",u)}}),Promise.all(s).then(()=>(e.forEach(r=>{if("cssRules"in r)try{fe(r.cssRules||[]).forEach(u=>{n.push(u)})}catch(u){console.error(`Error while reading CSS rules from ${r.href}`,u)}}),n))}function ha(e){return e.filter(t=>t.type===CSSRule.FONT_FACE_RULE).filter(t=>Rt(t.style.getPropertyValue("src")))}async function va(e,t){if(e.ownerDocument==null)throw new Error("Provided element is not within a Document");const n=fe(e.ownerDocument.styleSheets),s=await ma(n,t);return ha(s)}function Dt(e){return e.trim().replace(/["']/g,"")}function ga(e){const t=new Set;function n(s){(s.style.fontFamily||getComputedStyle(s).fontFamily).split(",").forEach(u=>{t.add(Dt(u))}),Array.from(s.children).forEach(u=>{u instanceof HTMLElement&&n(u)})}return n(e),t}async function ba(e,t){const n=await va(e,t),s=ga(e);return(await Promise.all(n.filter(u=>s.has(Dt(u.style.fontFamily))).map(u=>{const i=u.parentStyleSheet?u.parentStyleSheet.href:null;return Bt(u.cssText,i,t)}))).join(`
`)}async function ya(e,t){const n=t.fontEmbedCSS!=null?t.fontEmbedCSS:t.skipFonts?null:await ba(e,t);if(n){const s=document.createElement("style"),r=document.createTextNode(n);s.appendChild(r),e.firstChild?e.insertBefore(s,e.firstChild):e.appendChild(s)}}async function wa(e,t={}){const{width:n,height:s}=It(e,t),r=await De(e,t,!0);return await ya(r,t),await Ot(r,t),fa(r,t),await No(r,n,s)}async function xa(e,t={}){const{width:n,height:s}=It(e,t),r=await wa(e,t),u=await Me(r),i=document.createElement("canvas"),d=i.getContext("2d"),a=t.pixelRatio||Bo(),c=t.canvasWidth||n,l=t.canvasHeight||s;return i.width=c*a,i.height=l*a,t.skipAutoScale||Oo(i),i.style.width=`${c}`,i.style.height=`${l}`,t.backgroundColor&&(d.fillStyle=t.backgroundColor,d.fillRect(0,0,i.width,i.height)),d.drawImage(u,0,0,i.width,i.height),i}async function ka(e,t={}){return(await xa(e,t)).toDataURL()}const Z="http://www.w3.org/2000/svg",Nt="http://www.w3.org/1999/xlink",Sa='<?xml version="1.0" encoding="UTF-8"?>',$a="'SimSun', 'Songti SC', 'STSong', serif",Ca="'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif",Ht=["--canvas-bg","--bg-paper","--bg-shell","--text-main","--text-soft","--tree-line-color","--card-panel-fill","--card-panel-stroke","--card-inner-stroke","--card-header-fill","--card-selected-stroke","--card-status-fill","--card-name-fill","--card-detail-fill","--card-male-header","--card-female-header","--accent-amber","--border-color","--line-soft","--shell-bg-image","--bg-panel","--text-sub"],Pa={A4:"A4 landscape",A3:"A3 landscape"},Ea={A4:{width:297,height:210},A3:{width:420,height:297}},ht=`
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

  .publication-svg {
    background: var(--canvas-bg, var(--bg-paper, #fff9ef));
    color: var(--text-main, #241a10);
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    overflow: visible;
    text-rendering: geometricPrecision;
    shape-rendering: geometricPrecision;
  }

  .tree-lines line {
    stroke: var(--tree-line-color, rgba(95, 73, 50, 0.88));
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  .person-card {
    cursor: default;
  }

  .person-card text {
    pointer-events: none;
    user-select: none;
  }

  .person-card__panel {
    fill: var(--card-panel-fill, rgba(248, 244, 237, 0.97));
    stroke: var(--card-panel-stroke, #6f5943);
    stroke-width: 1.2;
  }

  .person-card__inner {
    fill: none;
    stroke: var(--card-inner-stroke, rgba(120, 94, 63, 0.16));
    stroke-width: 1;
  }

  .person-card__accent-frame {
    fill: none;
    stroke: transparent;
    stroke-width: 0;
  }

  .person-card__header {
    fill: var(--card-header-fill, rgba(119, 90, 56, 0.08));
  }

  .person-card__divider {
    stroke: rgba(126, 101, 74, 0.24);
    stroke-width: 1;
  }

  .person-card__seal {
    fill: rgba(170, 138, 103, 0.08);
    stroke: rgba(143, 113, 78, 0.16);
    stroke-width: 1;
  }

  .person-card__seal-mark {
    fill: none;
    stroke: rgba(126, 90, 49, 0.56);
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  .person-card__status {
    font-family: 'Manrope', sans-serif;
    font-weight: 700;
    letter-spacing: 0.16em;
    fill: var(--card-status-fill, #6b5338);
  }

  .person-card__name {
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    font-weight: 600;
    fill: var(--card-name-fill, #24170d);
    letter-spacing: 0.08em;
  }

  .person-card__note-pill {
    fill: var(--card-header-fill);
  }

  .person-card__lineage-pill {
    fill: var(--card-header-fill);
    stroke: var(--card-inner-stroke);
    stroke-width: 0.8;
  }

  .person-card__imperial-ribbon {
    stroke: rgba(255, 255, 255, 0.16);
    stroke-width: 0.8;
  }

  .person-card__imperial-ribbon--emperor {
    fill: #c6932f;
  }

  .person-card__imperial-ribbon--heir {
    fill: #9a4d36;
  }

  .person-card__imperial-label {
    font-family: 'Manrope', sans-serif;
    font-weight: 800;
    letter-spacing: 0.12em;
    fill: #fffaf0;
  }

  .person-card__note,
  .person-card__detail,
  .person-card__lineage-text {
    font-family: 'Noto Serif SC', 'Songti SC', serif;
    fill: var(--card-detail-fill, #463425);
  }

  .person-card__note {
    letter-spacing: 0.1em;
  }

  .person-card__lineage-text {
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .person-card__detail-band {
    fill: var(--card-header-fill);
    stroke: var(--card-inner-stroke);
    stroke-width: 0.8;
  }

  .person-card--male .person-card__header,
  .person-card--male .person-card__note-pill,
  .person-card--male .person-card__detail-band {
    fill: var(--card-male-header);
  }

  .person-card--female .person-card__header,
  .person-card--female .person-card__note-pill,
  .person-card--female .person-card__detail-band {
    fill: var(--card-female-header);
  }

  .person-card--emperor .person-card__accent-frame--emperor {
    stroke: rgba(198, 147, 47, 0.92);
    stroke-width: 2.6;
  }

  .person-card--emperor .person-card__panel {
    stroke: rgba(198, 147, 47, 0.56);
    stroke-width: 2.2;
  }

  .person-card--emperor .person-card__header,
  .person-card--emperor .person-card__note-pill,
  .person-card--emperor .person-card__detail-band,
  .person-card--emperor .person-card__lineage-pill {
    fill: rgba(198, 147, 47, 0.18);
    stroke: rgba(198, 147, 47, 0.26);
  }

  .person-card--heir .person-card__accent-frame--heir {
    stroke: rgba(154, 77, 54, 0.82);
    stroke-width: 2.2;
    stroke-dasharray: 8 5;
  }

  .person-card--heir .person-card__panel {
    stroke: rgba(154, 77, 54, 0.48);
    stroke-width: 2;
  }

  .person-card--heir .person-card__header,
  .person-card--heir .person-card__note-pill,
  .person-card--heir .person-card__detail-band,
  .person-card--heir .person-card__lineage-pill {
    fill: rgba(154, 77, 54, 0.15);
    stroke: rgba(154, 77, 54, 0.22);
  }

  .person-card--selected .person-card__panel {
    stroke: var(--card-selected-stroke, #ab6d30);
    stroke-width: 2.4;
  }

  .person-card--selected .person-card__inner {
    stroke: rgba(171, 109, 48, 0.28);
  }
`;function j(e){return Number.isInteger(e)?String(e):e.toFixed(2).replace(/\.?0+$/,"")}function le(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Lt(e){const t=e.querySelector("defs");if(t)return t;const n=document.createElementNS(Z,"defs");return e.insertBefore(n,e.firstChild),n}function Aa(e,t){var s;(s=e.querySelector(":scope > title"))==null||s.remove();const n=document.createElementNS(Z,"title");n.textContent=t,e.insertBefore(n,e.firstChild)}function Ne(){if(typeof window>"u")return{};const e=document.documentElement,t=getComputedStyle(e),n={};for(const s of Ht){const r=t.getPropertyValue(s).trim();r&&(n[s]=r)}return n}function zt(){const e=Ne();let t=`:root {
`;for(const n of Ht){const s=e[n];s&&(t+=`  ${n}: ${s};
`)}return t+=`}
`,t}function et(e,t){let n=e;for(;n.includes("var(");){const s=n.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g,(r,u,i)=>{const d=t[u];return d||(i?et(i.trim(),t):"")});if(s===n)break;n=s}return n}function Ia(e=!1){if(!e)return zt()+`
`+ht;const t=Ne();return et(ht.replace(/^\s*@import\s+url\([^)]*\)\s*;\s*/m,`
`).replaceAll("'Noto Serif SC', 'Songti SC', serif",$a).replaceAll("'Manrope', sans-serif",Ca),t)}function Fa(e,t=!1){var r;const n=Lt(e);(r=n.querySelector('[data-export-style="publication"]'))==null||r.remove();const s=document.createElementNS(Z,"style");s.setAttribute("data-export-style","publication"),s.textContent=Ia(t),n.insertBefore(s,n.firstChild)}function Ma(e,t){var i,d;if((i=e.querySelector('[data-export-header="publication"]'))==null||i.remove(),!t)return;const n=e.querySelector(":scope > title");n&&n.remove();const s=document.createElementNS(Z,"g");s.setAttribute("data-export-header","publication"),s.setAttribute("transform","translate(72 56)");const r=document.createElementNS(Z,"text");r.setAttribute("x","0"),r.setAttribute("y","0"),r.setAttribute("fill","var(--text-main, #241a10)"),r.setAttribute("font-size","28"),r.setAttribute("font-weight","700"),r.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),r.textContent=t.title,s.appendChild(r);let u=34;if(t.subtitle){const a=document.createElementNS(Z,"text");a.setAttribute("x","0"),a.setAttribute("y",String(u)),a.setAttribute("fill","var(--text-soft, #8a6845)"),a.setAttribute("font-size","15"),a.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),a.textContent=t.subtitle,s.appendChild(a),u+=24}(d=t.lines)==null||d.forEach(a=>{const c=document.createElementNS(Z,"text");c.setAttribute("x","0"),c.setAttribute("y",String(u)),c.setAttribute("fill","var(--text-soft, #8a6845)"),c.setAttribute("font-size","12"),c.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),c.textContent=a,s.appendChild(c),u+=20}),e.insertBefore(s,e.firstChild)}function Ta(e,t){var a,c;(a=e.querySelector('[data-export-background="publication"]'))==null||a.remove(),(c=e.querySelector("#canvas-bg-gradient"))==null||c.remove();const n=document.documentElement,s=getComputedStyle(n);let r=s.getPropertyValue("--canvas-bg").trim();r||(r=s.getPropertyValue("--bg-paper").trim()||"#fff9ef");let u=r;if(r.includes("linear-gradient")||r.includes("radial-gradient")){const l=/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/g,m=r.match(l);if(m&&m.length>=2){const M=Lt(e),g=document.createElementNS(Z,"linearGradient");g.id="canvas-bg-gradient",g.setAttribute("x1","0%"),g.setAttribute("y1","0%"),g.setAttribute("x2","0%"),g.setAttribute("y2","100%");const v=document.createElementNS(Z,"stop");v.setAttribute("offset","0%"),v.setAttribute("stop-color",m[0]);const b=document.createElementNS(Z,"stop");b.setAttribute("offset","100%"),b.setAttribute("stop-color",m[m.length-1]),g.appendChild(v),g.appendChild(b),M.appendChild(g),u="url(#canvas-bg-gradient)"}else u=s.getPropertyValue("--bg-shell").trim()||"#e8ddc8"}const i=document.createElementNS(Z,"rect");i.setAttribute("data-export-background","publication"),i.setAttribute("class","publication-svg__background"),i.setAttribute("x","0"),i.setAttribute("y","0"),i.setAttribute("width",j(t.width)),i.setAttribute("height",j(t.height)),i.style.fill=u;const d=e.querySelector(":scope > defs");e.insertBefore(i,(d==null?void 0:d.nextSibling)??e.firstChild)}function Ra(e){e.querySelectorAll(".person-card--selected").forEach(t=>{t.classList.remove("person-card--selected")})}function Ba(e){const t=Ne();[e,...Array.from(e.querySelectorAll("*"))].forEach(s=>{Array.from(s.attributes).forEach(r=>{r.value.includes("var(")&&s.setAttribute(r.name,et(r.value,t))})})}function Oa(e){e.querySelectorAll("filter").forEach(t=>t.remove()),e.querySelectorAll("[filter]").forEach(t=>t.removeAttribute("filter"))}function Da(e,t){const n=new Map;if(Array.from(e.querySelectorAll("[id]")).forEach(i=>{const d=`${i.id}-${t}`;n.set(i.id,d),i.id=d}),n.size===0)return;const r=[e,...Array.from(e.querySelectorAll("*"))],u=["filter","clip-path","mask","fill","stroke","href","xlink:href"];r.forEach(i=>{u.forEach(d=>{const a=i.getAttribute(d);if(!a)return;let c=a;n.forEach((l,m)=>{c=c.replaceAll(`url(#${m})`,`url(#${l})`).replaceAll(`#${m}`,`#${l}`)}),c!==a&&i.setAttribute(d,c)})})}function Na(e,t){if(!e||e.startsWith("data:")||e.startsWith("blob:")||/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(e)||!t)return e;try{return new URL(e,t).toString()}catch{return e}}function Le(e,t){e.setAttribute("href",t),e.setAttributeNS(Nt,"xlink:href",t)}async function Te(e){const t=e.svgElement.cloneNode(!0),n=e.exportHeader?120:0,s=e.layout.height+n;if(t.setAttribute("xmlns",Z),t.setAttribute("xmlns:xlink",Nt),t.setAttribute("version","1.1"),t.setAttribute("role","img"),t.setAttribute("aria-label",e.title),t.setAttribute("viewBox",`0 0 ${j(e.layout.width)} ${j(s)}`),t.setAttribute("width",j(e.layout.width)),t.setAttribute("height",j(s)),t.removeAttribute("style"),e.includeSelection||Ra(t),n>0){const i=document.createElementNS(Z,"g");for(i.setAttribute("data-export-content","publication"),i.setAttribute("transform",`translate(0, ${n})`);t.firstChild;)i.appendChild(t.firstChild);t.appendChild(i),Ma(t,e.exportHeader)}Aa(t,e.title),Fa(t,e.pdfFriendly),Ta(t,{...e.layout,height:s});const r=Array.from(t.querySelectorAll("image")),u=e.embedImages??!0;return await Promise.all(r.map(async i=>{const d=i.getAttribute("href")||i.getAttribute("xlink:href");if(!d||d.startsWith("data:")){d&&Le(i,d);return}if(!u){Le(i,Na(d,e.resourceBaseUrl));return}try{const c=await(await fetch(d)).blob(),l=new FileReader,m=await new Promise(M=>{l.onloadend=()=>M(l.result),l.readAsDataURL(c)});Le(i,m)}catch(a){console.error("Failed to embed image in SVG export",d,a)}})),e.pdfFriendly&&(Oa(t),Ba(t)),t}function Ha(e,t,n){var r;const s=e.cloneNode(!0);return s.setAttribute("aria-label",`${n} ${t.index}/${t.total}`),s.setAttribute("viewBox",`${j(t.x)} ${j(t.y)} ${j(t.width)} ${j(t.height)}`),s.setAttribute("width",j(t.width)),s.setAttribute("height",j(t.height)),(r=s.querySelector(":scope > title"))==null||r.replaceChildren(`${n} ${t.index}/${t.total}`),Da(s,`print-${t.index}`),s}function $e(e,t=!0){const n=new XMLSerializer().serializeToString(e);return t?`${Sa}
${n}
`:n}function La(e,t){const s=Ea[t].width/e.paperPixelWidth;return[{index:1,total:1,row:0,column:0,x:0,y:0,width:e.width,height:e.height,widthMm:e.width*s,heightMm:e.height*s}]}function za(e){const t=le(e.title),n=e.pages[0],s=n?`${j(n.widthMm)}mm`:Pa[e.paper],r=n?`${j(n.heightMm)}mm`:"auto",u=e.pages.map((i,d)=>{const a=e.pageSvgMarkups[d]??"";return`
        <section class="print-sheet" aria-label="排版画布">
          <div
            class="print-canvas"
            style="width: ${j(i.widthMm)}mm; height: ${j(i.heightMm)}mm;"
          >
            ${a}
          </div>
        </section>
      `}).join(`
`);return`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${t} - 打印排版</title>
    <style>
      ${zt()}
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

      @page {
        size: ${s} ${r};
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        min-height: 100%;
        background: var(--bg-shell, #e8ddc8);
      }

      body {
        color: var(--text-main, #241a10);
        font-family: 'Manrope', 'Noto Serif SC', sans-serif;
      }

      .print-sheet {
        position: relative;
        width: ${n?j(n.widthMm):"auto"}mm;
        height: ${n?j(n.heightMm):"auto"}mm;
        overflow: hidden;
        background: var(--canvas-bg, var(--bg-paper, #fff9ef));
        break-after: page;
        page-break-after: always;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .print-sheet:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .print-canvas {
        display: block;
        overflow: hidden;
      }

      .print-canvas > svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .print-page-label {
        position: absolute;
        right: 5mm;
        bottom: 4mm;
        padding: 1.5mm 2.4mm;
        border-radius: 999px;
        background: rgba(255, 249, 239, 0.82);
        border: 0.2mm solid rgba(117, 90, 57, 0.16);
        color: rgba(87, 66, 43, 0.62);
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      @media screen {
        body {
          display: grid;
          gap: 14px;
          justify-content: center;
          padding: 18px;
        }

        .print-sheet {
          box-shadow: 0 18px 48px rgba(70, 48, 24, 0.18);
        }
      }
    </style>
  </head>
  <body>
    ${u}
    <script>
      const runPrint = () => {
        window.focus();
        window.setTimeout(() => window.print(), 120);
      };

      if (document.readyState === 'complete') {
        runPrint();
      } else {
        window.addEventListener('load', runPrint, { once: true });
      }
    <\/script>
  </body>
</html>
`}const vt=72/96,Va=/<svg\b[^>]*>/i,_a="'SimSun', 'Songti SC', 'STSong', serif",ja="'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif";function Ua(e){const t={};for(const n of e.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g))t[`--${n[1]}`]=n[2].trim();return t}function Vt(e,t){let n=e;for(;n.includes("var(");){const s=n.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g,(r,u,i)=>{const d=t[u];return d||(i?Vt(i.trim(),t):"")});if(s===n)break;n=s}return n}function Ga(e,t){var s;const n=(s=e.match(Va))==null?void 0:s[0];return n?e.replace(n,t(n)):e}function ze(e,t,n){return new RegExp(`\\s${t}="[^"]*"`).test(e)?e.replace(new RegExp(`${t}="[^"]*"`),`${t}="${n}"`):e.replace("<svg",`<svg ${t}="${n}"`)}function Wa(e){const t=Ua(e);return Vt(e.replace(/@import\s+url\([^)]*\)\s*;\s*/gi,"").replace(/:root\s*\{[\s\S]*?\}\s*/gi,"").replace(/background\s*:\s*[^;]+;/gi,"").replace(/cursor\s*:\s*[^;]+;/gi,"").replace(/user-select\s*:\s*[^;]+;/gi,"").replace(/<filter\b[\s\S]*?<\/filter>/gi,"").replace(/\sfilter="url\(#.+?\)"/gi,"").replaceAll("'Noto Serif SC', 'Songti SC', serif",_a).replaceAll("'Manrope', sans-serif",ja),t)}function Xa(e,t,n){return Ga(e,s=>{let r=ze(s,"width",`${t}pt`);return r=ze(r,"height",`${n}pt`),r=ze(r,"preserveAspectRatio","xMidYMid meet"),r})}function Ya(e){const t=e.match(/viewBox="([^"]+)"/);if(!t)return null;const n=t[1].trim().split(/\s+/).map(Number);return n.length!==4||n.some(isNaN)?null:{width:n[2],height:n[3]}}async function Ja(e,t){const n=document.getElementById(e);if(!n)throw new Error(`Element ${e} not found`);return await ka(n,{pixelRatio:t.scale,backgroundColor:t.backgroundColor==="transparent"?"rgba(0,0,0,0)":t.backgroundColor})}function qa(e){const t=Wa(e.svgMarkup),n=Ya(t),s=(n==null?void 0:n.width)??e.layout.width,r=(n==null?void 0:n.height)??e.layout.height,u=Number((s*vt).toFixed(2)),i=Number((r*vt).toFixed(2));return{svgMarkup:Xa(t,u,i),pdfWidth:u,pdfHeight:i,title:e.title,prefaceText:e.prefaceText,exportHeader:e.exportHeader}}async function gt(e,t,n,s={}){console.log(`[Export] Capturing SVG for element: ${e}`);const r=document.getElementById(e);if(!r)throw console.error(`[Export] Element with ID ${e} not found in DOM`),new Error(`Element ${e} not found`);if(!(r instanceof SVGSVGElement)){console.log(`[Export] Element ${e} is not an SVG, searching for nested SVG...`);const i=r.querySelector("svg");if(!i)throw console.error(`[Export] No <svg> tag found inside #${e}`),new Error(`SVG element not found in ${e}`);console.log("[Export] Found nested SVG, creating standalone clone...");const d=await Te({svgElement:i,layout:t,title:n,pdfFriendly:s.forPdf,embedImages:s.embedImages,resourceBaseUrl:s.resourceBaseUrl,exportHeader:s.exportHeader});return $e(d)}console.log(`[Export] Element #${e} is an SVG, cloning...`);const u=await Te({svgElement:r,layout:t,title:n,pdfFriendly:s.forPdf,embedImages:s.embedImages,resourceBaseUrl:s.resourceBaseUrl,exportHeader:s.exportHeader});return $e(u)}const Ka={class:"topbar"},Za={class:"topbar__intro"},Qa={class:"sync-icon"},er={key:0,class:"spinner",width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round"},tr={key:1,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},nr={key:2,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},sr={key:3,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},or={key:4,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},ar={class:"sync-text"},rr={class:"sync-text sync-text--resolved"},ir={class:"topbar__actions","aria-label":"工作台操作"},lr={class:"topbar__action-strip"},ur={class:"dropdown"},dr={class:"dropdown-menu"},cr={class:"dropdown"},pr={class:"dropdown-menu"},fr={class:"user-dropdown-container"},mr={class:"avatar-ring"},hr={class:"avatar-text"},vr={class:"username"},gr={key:0,class:"user-popover"},br={class:"popover-header"},yr={class:"popover-account"},wr={class:"glass-sheet collab-sheet"},xr={class:"sheet-header"},kr={class:"sheet-body"},Sr=he({__name:"WorkbenchHeader",props:{fileName:{default:""},dirty:{type:Boolean,default:!1},nativeFileAccess:{type:Boolean,default:!1},currentTheme:{default:"parchment"},currentUsername:{default:""},syncStatus:{default:"saved"}},emits:["import-json","open-file","create-blank","save-file","save-file-as","download-svg","print-publication","export-json","export-share-html","change-theme","logout","go-back","view-stats","view-timeline"],setup(e,{emit:t}){const n=N(null),s=N(!1),r=N(!1),u=N(!1),i=Pt(),d=Et(),a=Ke("publication-context"),{setExportData:c}=xn(),l=J(()=>{var $;return(($=a==null?void 0:a.currentAccessRole)==null?void 0:$.value)==="OWNER"});function m(){var $;($=n.value)==null||$.click()}async function M(){var $,p,A,H,re;try{u.value=!0;const G=a.pub.layout.value,P=a.pub.publication,f=[];($=P.info)!=null&&$.ancestralOrigin&&f.push(`郡望/祖籍：${P.info.ancestralOrigin}`),(p=P.info)!=null&&p.hallName&&f.push(`堂号：${P.info.hallName}`),(A=P.info)!=null&&A.familyMotto&&f.push(`族训：${P.info.familyMotto}`),(H=P.info)!=null&&H.revisionNotes&&f.push(`修订说明：${P.info.revisionNotes}`);const w={title:P.title||"归源档案预览",subtitle:P.subtitle||void 0,lines:f.length>0?f:void 0},F=await gt("publication-canvas-root",G,P.title,{forPdf:!0,embedImages:!1,exportHeader:w}),te=qa({svgMarkup:F,layout:G,title:P.title,prefaceText:((re=P.info)==null?void 0:re.description)??"",exportHeader:w}),Q=await fetch(`/api/publications/${d.params.id}/export/pdf/single-page`,{method:"POST",headers:ln({"Content-Type":"application/json"}),body:JSON.stringify(te)});if(!Q.ok){const I=await Q.text();throw console.error("[Export] Backend error:",Q.status,I),new Error(`服务器生成失败 (${Q.status}): ${I}`)}const de=await Q.blob(),V=window.URL.createObjectURL(de),ne=document.createElement("a");ne.href=V,ne.download=`${a.pub.publication.title}-全尺寸世系图.pdf`,document.body.appendChild(ne),ne.click(),document.body.removeChild(ne),window.URL.revokeObjectURL(V),s.value=!1}catch(G){console.error("[Export] Fatal error in handleExportPdfSingle:",G);const P=G instanceof Error?G.message:"网络或未知错误";alert(`导出单页 PDF 失败!

具体错误: ${P}`)}finally{u.value=!1}}async function g($){try{u.value=!0;const p=await Ja("publication-canvas-root",{scale:1,backgroundColor:"#ffffff"}),A=await gt("publication-canvas-root",a.pub.layout.value,a.pub.publication.title,{forPdf:!0,embedImages:!1});c(p,$,A),s.value=!1,i.push(`/publication/${d.params.id}/print-preview`)}catch(p){console.error("[Export] Fatal error in handlePreviewPdf:",p);const A=p instanceof Error?p.message:"未知错误";alert(`准备预览失败!

具体错误: ${A}`)}finally{u.value=!1}}function v($){s.value=!1,x("export-share-html",$.password)}const b=e,x=t,S=N(!1),R=J(()=>(b.currentUsername||"总").charAt(0).toUpperCase());function E(){S.value=!S.value}return($,p)=>(y(),k("header",Ka,[o("input",{ref_key:"fileInputRef",ref:n,type:"file",accept:".json",style:{display:"none"},onChange:p[0]||(p[0]=A=>x("import-json",A))},null,544),o("div",Za,[o("h1",{class:"clickable-title",onClick:p[1]||(p[1]=A=>x("go-back"))},"无涯画布"),o("div",{class:ae(["sync-status",[`sync-status--${e.syncStatus}`]])},[o("span",Qa,[e.syncStatus==="syncing"?(y(),k("svg",er,[...p[13]||(p[13]=[o("path",{d:"M21 12a9 9 0 1 1-6.219-8.56"},null,-1)])])):e.syncStatus==="saved"?(y(),k("svg",tr,[...p[14]||(p[14]=[o("polyline",{points:"20 6 9 17 4 12"},null,-1)])])):e.syncStatus==="error"?(y(),k("svg",nr,[...p[15]||(p[15]=[o("circle",{cx:"12",cy:"12",r:"10"},null,-1),o("line",{x1:"12",y1:"8",x2:"12",y2:"12"},null,-1),o("line",{x1:"12",y1:"16",x2:"12.01",y2:"16"},null,-1)])])):e.syncStatus==="conflict"?(y(),k("svg",sr,[...p[16]||(p[16]=[o("path",{d:"M12 9v4"},null,-1),o("path",{d:"M12 17h.01"},null,-1),o("path",{d:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"},null,-1)])])):(y(),k("svg",or,[...p[17]||(p[17]=[o("circle",{cx:"12",cy:"12",r:"1"},null,-1)])]))]),o("span",ar,C(e.syncStatus==="syncing"?"正在封存卷宗...":e.syncStatus==="saved"?"卷宗已妥善归档":e.syncStatus==="error"?"归档遇挫":"等待封存..."),1),o("span",rr,C(e.syncStatus==="syncing"?"正在封存卷宗...":e.syncStatus==="saved"?"卷宗已妥善归档":e.syncStatus==="error"?"归档遇挫":e.syncStatus==="conflict"?"数据发生冲突，请刷新后继续":"等待封存..."),1)],2)]),o("div",ir,[o("div",lr,[o("div",ur,[p[19]||(p[19]=o("button",{class:"btn btn--secondary dropdown-trigger",type:"button"},[X("考据 "),o("span",{class:"caret"},"▾")],-1)),o("div",dr,[o("button",{class:"dropdown-item",type:"button",onClick:p[2]||(p[2]=A=>x("view-stats"))},"宗族纪略"),o("button",{class:"dropdown-item",type:"button",onClick:p[3]||(p[3]=A=>x("view-timeline"))},"家族编年史"),p[18]||(p[18]=o("div",{class:"dropdown-divider"},null,-1)),o("button",{class:"dropdown-item",type:"button",onClick:m},"引入前朝旧卷 (JSON)")])]),o("div",cr,[p[21]||(p[21]=o("button",{class:"btn btn--secondary dropdown-trigger",type:"button"},[X("付梓 "),o("span",{class:"caret"},"▾")],-1)),o("div",pr,[o("button",{class:"dropdown-item",type:"button",onClick:p[4]||(p[4]=A=>s.value=!0)},"付梓发行 (高精影印/PDF)"),p[20]||(p[20]=o("div",{class:"dropdown-divider"},null,-1)),o("button",{class:"dropdown-item",type:"button",onClick:p[5]||(p[5]=A=>x("download-svg"))},"拓印长卷 (SVG)"),o("button",{class:"dropdown-item",type:"button",onClick:p[6]||(p[6]=A=>x("export-json"))},"封存卷宗草本 (JSON)")])]),l.value?(y(),k("button",{key:0,class:"btn btn--secondary",type:"button",onClick:p[7]||(p[7]=A=>r.value=!0)}," 同修编委 ")):D("",!0),p[25]||(p[25]=o("span",{class:"topbar__action-divider","aria-hidden":"true"},null,-1)),Y(rn,{"current-theme":e.currentTheme,onChangeTheme:p[8]||(p[8]=A=>x("change-theme",A))},null,8,["current-theme"]),p[26]||(p[26]=o("span",{class:"topbar__action-divider","aria-hidden":"true"},null,-1)),o("div",fr,[o("button",{class:ae(["user-profile-pill",{"is-open":S.value}]),onClick:E},[o("div",mr,[o("span",hr,C(R.value),1)]),o("span",vr,C(e.currentUsername||"总编"),1),(y(),k("svg",{class:ae(["dropdown-chevron",{rotated:S.value}]),width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[...p[22]||(p[22]=[o("path",{d:"m6 9 6 6 6-6"},null,-1)])],2))],2),Y(ke,{name:"glass-pop"},{default:Se(()=>[S.value?(y(),k("div",gr,[o("div",br,[p[23]||(p[23]=o("span",{class:"popover-title"},"当前账号",-1)),o("div",yr,C(e.currentUsername||"总编"),1)]),p[24]||(p[24]=o("div",{class:"popover-menu"},[o("div",{class:"popover-hint"},"您正在编辑无限画布")],-1))])):D("",!0)]),_:1})])])]),(y(),be(_e,{to:"body"},[Y(Io,{modelValue:s.value,"onUpdate:modelValue":p[9]||(p[9]=A=>s.value=A),"is-processing":u.value,onExportPdfSingle:M,onExportSvg:p[10]||(p[10]=A=>{x("download-svg"),s.value=!1}),onPreviewPdf:g,onExportShareHtml:v},null,8,["modelValue","is-processing"])])),(y(),be(_e,{defer:"",to:"body"},[Y(ke,{name:"fade"},{default:Se(()=>[r.value?(y(),k("div",{key:0,class:"glass-modal-overlay",onClick:p[12]||(p[12]=qe(A=>r.value=!1,["self"]))},[o("div",wr,[o("header",xr,[p[27]||(p[27]=o("div",{class:"header-content"},[o("div",{class:"header-icon"},"👥"),o("div",{class:"header-text"},[o("h2",{class:"sheet-title"},"协作者管理"),o("p",{class:"sheet-subtitle"},"管理谁可以查看或编辑您的族谱")])],-1)),o("button",{class:"close-btn",onClick:p[11]||(p[11]=A=>r.value=!1)},"×")]),o("div",kr,[Y(un,{"publication-id":Number(h(d).params.id)},null,8,["publication-id"])])])])):D("",!0)]),_:1})]))]))}}),$r=Oe(Sr,[["__scopeId","data-v-4712463e"]]),Cr={class:"floating-toolbar floating-toolbar--left","aria-label":"画布工具"},Pr={class:"tool-switcher",role:"group","aria-label":"面板切换"},Er=["aria-pressed"],Ar=["aria-pressed"],Ir={class:"floating-toolbar floating-toolbar--right"},Fr={key:0,class:"status-chip status-chip--compact"},Mr={key:1,class:"selection-chip"},Tr={class:"selection-chip__content"},Rr={class:"selection-chip__header"},Br={class:"selection-chip__family"},Or={class:"selection-chip__actions"},Dr=["disabled"],Nr={class:"zoom-control"},Hr={key:0,class:"floating-panel floating-panel--left"},Lr={class:"floating-panel__header"},zr={class:"field"},Vr=["value"],_r={class:"field"},jr=["value"],Ur={class:"field"},Gr=["value"],Wr={class:"field"},Xr=["value"],Yr={class:"field"},Jr=["value"],qr={class:"toggle-row"},Kr={class:"toggle"},Zr=["checked"],Qr={class:"toggle"},ei=["checked"],ti={class:"toggle"},ni=["checked"],si={class:"toggle"},oi=["checked"],ai={key:0,class:"floating-panel floating-panel--left floating-panel--history"},ri={class:"floating-panel__header"},ii={class:"history-panel__summary"},li={class:"history-panel__actions"},ui=["disabled"],di=["disabled"],ci={key:0,class:"history-list"},pi={class:"history-entry__meta"},fi={key:0},mi={key:1,class:"history-empty"},hi=he({__name:"WorkbenchPanels",props:{layoutPanelOpen:{type:Boolean},historyOpen:{type:Boolean},focusFamilyLabel:{},canReturnToMainBranch:{type:Boolean},canUndo:{type:Boolean},canRedo:{type:Boolean},zoom:{},hasSelectedPerson:{type:Boolean},selectedPersonName:{},selectedPersonMeta:{},canFocusSelectedBranch:{type:Boolean},settings:{},historyPastCount:{},historyFutureCount:{},visibleHistoryEntries:{}},emits:["toggle-layout","toggle-history","return-main-branch","reset-canvas-view","undo","redo","adjust-zoom","open-editor","reveal-selected-person","focus-selected-branch","close-layout","close-history","update-settings"],setup(e,{emit:t}){const n=e,s=t;function r(c,l){s("update-settings",{[c]:l})}function u(c){return Number(c.target.value)}function i(c){return c.target.checked}function d(c){return c.target.value}function a(c){const l=c.target;l&&(l.closest(".floating-panel")||l.closest(".tool-btn--panel")||(n.layoutPanelOpen&&s("close-layout"),n.historyOpen&&s("close-history")))}return Je(()=>{document.addEventListener("click",a,{capture:!0})}),dn(()=>{document.removeEventListener("click",a,{capture:!0})}),(c,l)=>(y(),k(ue,null,[o("div",Cr,[o("div",Pr,[o("button",{class:ae(["tool-btn tool-btn--panel",{"tool-btn--active":e.layoutPanelOpen}]),type:"button","aria-pressed":e.layoutPanelOpen,onClick:l[0]||(l[0]=m=>c.$emit("toggle-layout"))},[...l[22]||(l[22]=[o("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("rect",{x:"3",y:"3",width:"14",height:"14",rx:"2"}),o("line",{x1:"3",y1:"8",x2:"17",y2:"8"}),o("line",{x1:"10",y1:"8",x2:"10",y2:"17"})],-1),X(" 版式 ",-1)])],10,Er),o("button",{class:ae(["tool-btn tool-btn--panel",{"tool-btn--active":e.historyOpen}]),type:"button","aria-pressed":e.historyOpen,onClick:l[1]||(l[1]=m=>c.$emit("toggle-history"))},[...l[23]||(l[23]=[o("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("path",{d:"M4 7h5l-2-3"}),o("path",{d:"M4 7a6 6 0 1 1 0 6"}),o("circle",{cx:"12",cy:"10",r:"1",fill:"currentColor",stroke:"none"})],-1),X(" 历史 ",-1)])],10,Ar)]),e.canReturnToMainBranch?(y(),k("button",{key:0,class:"tool-btn tool-btn--quiet",type:"button","aria-label":"返回父系主谱",onClick:l[2]||(l[2]=m=>c.$emit("return-main-branch"))},[...l[24]||(l[24]=[o("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[o("path",{d:"M12 4L6 10l6 6"}),o("line",{x1:"6",y1:"10",x2:"16",y2:"10"})],-1),X(" 回主谱 ",-1)])])):D("",!0),o("button",{class:"tool-btn tool-btn--quiet",type:"button","aria-label":"查看当前宗支全览",onClick:l[3]||(l[3]=m=>c.$emit("reset-canvas-view"))},[...l[25]||(l[25]=[o("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("rect",{x:"2",y:"5",width:"16",height:"10",rx:"2"}),o("circle",{cx:"10",cy:"10",r:"3"}),o("path",{d:"M4.5 7.5l2 2"})],-1),X(" 全览 ",-1)])])]),o("div",Ir,[e.hasSelectedPerson?D("",!0):(y(),k("div",Fr,[l[26]||(l[26]=o("span",null,"宗支",-1)),o("strong",null,C(e.focusFamilyLabel),1)])),e.hasSelectedPerson?(y(),k("div",Mr,[o("div",Tr,[o("div",Rr,[o("strong",null,C(e.selectedPersonName),1),o("span",Br,"宗支 "+C(e.focusFamilyLabel),1)]),o("em",null,C(e.selectedPersonMeta),1)]),o("div",Or,[o("button",{class:"selection-chip__btn",type:"button",onClick:l[4]||(l[4]=m=>c.$emit("reveal-selected-person"))},[...l[27]||(l[27]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("circle",{cx:"7",cy:"7",r:"4.5"}),o("line",{x1:"10.2",y1:"10.2",x2:"14",y2:"14"})],-1),X(" 定位 ",-1)])]),o("button",{class:"selection-chip__btn",type:"button",disabled:!e.canFocusSelectedBranch,onClick:l[5]||(l[5]=m=>c.$emit("focus-selected-branch"))},[...l[28]||(l[28]=[cn('<svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 2v5"></path><path d="M4 9v5"></path><path d="M12 9v5"></path><path d="M4 9h8"></path></svg> 切到该支 ',2)])],8,Dr),o("button",{class:"selection-chip__btn selection-chip__btn--accent",type:"button",onClick:l[6]||(l[6]=m=>c.$emit("open-editor"))},[...l[29]||(l[29]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[o("path",{d:"M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"})],-1),X(" 编辑 ",-1)])])])])):D("",!0),o("div",Nr,[o("button",{class:"zoom-control__btn",type:"button","aria-label":"缩小",onClick:l[7]||(l[7]=m=>c.$emit("adjust-zoom",-.05))},[...l[30]||(l[30]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("line",{x1:"4",y1:"8",x2:"12",y2:"8"})],-1)])]),o("span",null,C(Math.round(e.zoom*100))+"%",1),o("button",{class:"zoom-control__btn",type:"button","aria-label":"放大",onClick:l[8]||(l[8]=m=>c.$emit("adjust-zoom",.05))},[...l[31]||(l[31]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("line",{x1:"4",y1:"8",x2:"12",y2:"8"}),o("line",{x1:"8",y1:"4",x2:"8",y2:"12"})],-1)])])])]),Y(ke,{name:"float-panel"},{default:Se(()=>[e.layoutPanelOpen?(y(),k("section",Hr,[o("div",Lr,[l[33]||(l[33]=o("div",null,[o("p",{class:"floating-panel__eyebrow"},"Layout"),o("h2",null,"版式设置")],-1)),o("button",{class:"floating-panel__close",type:"button",onClick:l[9]||(l[9]=m=>c.$emit("close-layout"))},[...l[32]||(l[32]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("line",{x1:"4",y1:"4",x2:"12",y2:"12"}),o("line",{x1:"12",y1:"4",x2:"4",y2:"12"})],-1),X(" 关闭 ",-1)])])]),o("label",zr,[l[35]||(l[35]=o("span",null,"纸张尺寸",-1)),o("select",{value:e.settings.paper,onChange:l[10]||(l[10]=m=>r("paper",d(m)))},[...l[34]||(l[34]=[o("option",{value:"A3"},"A3 横向",-1),o("option",{value:"A4"},"A4 横向",-1)])],40,Vr)]),o("label",_r,[o("span",null,"人物卡宽度 "+C(e.settings.cardWidth)+"px",1),o("input",{value:e.settings.cardWidth,type:"range",min:"142",max:"176",step:"2",onInput:l[11]||(l[11]=m=>r("cardWidth",u(m)))},null,40,jr)]),o("label",Ur,[o("span",null,"代际间距 "+C(e.settings.generationGap)+"px",1),o("input",{value:e.settings.generationGap,type:"range",min:"120",max:"220",step:"10",onInput:l[12]||(l[12]=m=>r("generationGap",u(m)))},null,40,Gr)]),o("label",Wr,[o("span",null,"兄弟间距 "+C(e.settings.siblingGap)+"px",1),o("input",{value:e.settings.siblingGap,type:"range",min:"56",max:"140",step:"4",onInput:l[13]||(l[13]=m=>r("siblingGap",u(m)))},null,40,Xr)]),o("label",Yr,[o("span",null,"字体倍率 "+C(e.settings.fontScale.toFixed(2)),1),o("input",{value:e.settings.fontScale,type:"range",min:"0.88",max:"1.18",step:"0.02",onInput:l[14]||(l[14]=m=>r("fontScale",u(m)))},null,40,Jr)]),o("div",qr,[o("label",Kr,[o("input",{checked:e.settings.showDeath,type:"checkbox",onChange:l[15]||(l[15]=m=>r("showDeath",i(m)))},null,40,Zr),l[36]||(l[36]=o("span",null,"显示卒年",-1))]),o("label",Qr,[o("input",{checked:e.settings.showAge,type:"checkbox",onChange:l[16]||(l[16]=m=>r("showAge",i(m)))},null,40,ei),l[37]||(l[37]=o("span",null,"显示年龄",-1))]),o("label",ti,[o("input",{checked:e.settings.showNote,type:"checkbox",onChange:l[17]||(l[17]=m=>r("showNote",i(m)))},null,40,ni),l[38]||(l[38]=o("span",null,"显示注记",-1))]),o("label",si,[o("input",{checked:e.settings.showPhoto,type:"checkbox",onChange:l[18]||(l[18]=m=>r("showPhoto",i(m)))},null,40,oi),l[39]||(l[39]=o("span",null,"显示照片",-1))])])])):D("",!0)]),_:1}),Y(ke,{name:"float-panel"},{default:Se(()=>[e.historyOpen?(y(),k("section",ai,[o("div",ri,[l[41]||(l[41]=o("div",null,[o("p",{class:"floating-panel__eyebrow"},"History"),o("h2",null,"操作历史")],-1)),o("button",{class:"floating-panel__close",type:"button",onClick:l[19]||(l[19]=m=>c.$emit("close-history"))},[...l[40]||(l[40]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[o("line",{x1:"4",y1:"4",x2:"12",y2:"12"}),o("line",{x1:"12",y1:"4",x2:"4",y2:"12"})],-1),X(" 关闭 ",-1)])])]),o("div",ii,[o("strong",null,"可撤销 "+C(e.historyPastCount)+" 步",1),o("span",null,"可重做 "+C(e.historyFutureCount)+" 步",1)]),o("div",li,[o("button",{class:"relation-btn",type:"button",disabled:!e.canUndo,onClick:l[20]||(l[20]=m=>c.$emit("undo"))},[...l[42]||(l[42]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[o("path",{d:"M4 6h7a3 3 0 0 1 0 6H9"}),o("path",{d:"M7 3L4 6l3 3"})],-1),X(" 撤销上一步 ",-1)])],8,ui),o("button",{class:"relation-btn",type:"button",disabled:!e.canRedo,onClick:l[21]||(l[21]=m=>c.$emit("redo"))},[...l[43]||(l[43]=[o("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[o("path",{d:"M12 6H5a3 3 0 0 0 0 6h2"}),o("path",{d:"M9 3l3 3-3 3"})],-1),X(" 重做上一步 ",-1)])],8,di)]),l[44]||(l[44]=o("p",{class:"history-panel__hint"},"快捷键支持 `Ctrl/Command + Z`，重做支持 `Ctrl/Command + Y` 或 `Shift + Z`。",-1)),e.visibleHistoryEntries.length?(y(),k("div",ci,[(y(!0),k(ue,null,xe(e.visibleHistoryEntries,(m,M)=>(y(),k("article",{key:m.id,class:"history-entry"},[o("div",pi,[o("span",null,C(m.time),1),M===0?(y(),k("em",fi,"最近")):D("",!0)]),o("strong",null,C(m.label),1)]))),128))])):(y(),k("p",mi,"当前还没有可撤销的操作，开始编辑后会在这里记录。"))])):D("",!0)]),_:1})],64))}});function vi(){const e=N(!1),t=N(!1),n=N(!1);function s(){e.value=!e.value,e.value&&(n.value=!1)}function r(){n.value=!n.value,n.value&&(e.value=!1)}function u(){e.value=!1,t.value=!1,n.value=!1}return{layoutPanelOpen:e,editorOpen:t,historyOpen:n,toggleLayoutPanel:s,toggleHistoryPanel:r,closeAllPanels:u}}function gi(e){const{selectedPerson:t,selectedSpouse:n,selectedChildren:s,selectedPersonLineageSuggestion:r,selectedOutMarriedDaughter:u,selectedInLawOfOutMarriedDaughter:i,isSelectedBranchFocused:d,canSetSelectedBranchMode:a,selectedBranchMode:c,branchActionLabel:l,getPersonStatus:m,getGenderLabel:M,selectedParents:g}=e,v=J(()=>{const p=t.value;return p?p.birth?pn(p)?p.note?r.value&&p.note!==r.value?`系统按当前宗支推算的称谓是"${r.value}"，如果你们家谱记法不同，可以保留现有注记。`:a.value?c.value==="uxorilocal"?'当前家庭按"招婿承支"处理，配偶会标为婿，后代继续留在本支。':'当前家庭按"外嫁支系"处理，配偶会标为婿，后代按外支显示。':"当前人物信息较完整，可以继续整理其配偶、子女和相关宗支关系。":r.value?`系统可按当前宗支推算为"${r.value}"，你可以一键填入后再微调。`:"建议补充房次、排行或配偶身份，方便读者快速识别宗支位置。":"建议补录卒年或享年，让出版卡片的信息闭环更完整。":"建议优先补录出生时间，这会影响谱图的时间表达。":"点击人物卡即可在右侧浮层里编辑。"}),b=J(()=>{var H;const p=t.value;if(!p)return[];const A=[{label:"状态",value:m(p)},{label:"性别",value:M(p.gender)},{label:"称号",value:p.titleName||"未录入"},{label:"宗族",value:p.clan||"未录入"},{label:"身份",value:p.note||r.value||"待补充注记"},{label:"出生",value:p.birth||"待补全"},{label:"卒年",value:p.death||(fn(p)?"已故（未录卒年）":"未录入")},{label:"年龄",value:p.age||"自动推算 / 待补全"},{label:"配偶",value:((H=n.value)==null?void 0:H.name)||"未建立配偶关系"}];return a.value&&A.push({label:"婚配归属",value:c.value==="uxorilocal"?"招婿承支":"外嫁支系"}),A}),x=J(()=>u.value||i.value?d.value?"已在外嫁支系":"查看外嫁支系":l.value),S=J(()=>{if(u.value){const H=s.value.length;return d.value?H?`这是外嫁女。当前已切到她自己的家庭支系，名下 ${H} 位子女会在这里正常展开。`:"这是外嫁女。当前已切到她自己的家庭支系，可以继续在这里整理她的配偶与子女。":H?`这是外嫁女。父系主谱会继续显示她的配偶和 ${H} 位子女，并用"外嫁/婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦她这一支。`:'这是外嫁女。父系主谱会显示她本人和配偶，并用"外嫁/婿"标识婚配关系；如需单独整理她这一支，请点击"查看外嫁支系"。'}const A=i.value;if(A){const H=s.value.length;return d.value?H?`这是外嫁女 ${A.name} 的配偶。当前已进入他们自己的家庭支系，可继续整理名下 ${H} 位子女。`:`这是外嫁女 ${A.name} 的配偶。当前已进入他们自己的家庭支系，可以继续补录后代信息。`:H?`这是外嫁女 ${A.name} 的配偶。父系主谱会继续显示他们名下 ${H} 位子女，并用"婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦他们这一支。`:`这是外嫁女 ${A.name} 的配偶。父系主谱会用"婿"标识婚配关系；点击"查看外嫁支系"可进入他们自己的家庭支系。`}return v.value}),R=J(()=>u.value?[...b.value,{label:"谱系提示",value:d.value?"当前查看外嫁支系":"父系主谱会继续显示其配偶与子女"}]:i.value?[...b.value,{label:"谱系提示",value:d.value?"当前查看外嫁支系":"父系主谱中作为婿/配偶显示，并保留后代"}]:b.value);function E(p){const A=t.value;A&&(A[p.field]=p.value)}function $(p){const A=t.value;A&&(A.gender=p)}return{selectedPersonSuggestion:v,selectedPersonDetails:b,editorBranchActionLabel:x,editorSelectedPersonSuggestion:S,editorSelectedPersonDetails:R,updateSelectedPersonField:E,updateSelectedPersonGender:$}}const ye=1,bi=new Set(["male","female","unknown"]),yi=new Set(["A3","A4"]),wi=new Set(["married-out","uxorilocal"]);function pe(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function se(e){return typeof e=="string"}function xi(e){return e===void 0||typeof e=="string"}function ki(e){return e===void 0||typeof e=="boolean"}function L(e,t,n){return{code:e,path:t,message:n}}function ce(e,t,n){return Math.min(n,Math.max(t,e))}function Si(e,t){if(!pe(t))return[L("invalid-person",`people.${e}`,`人物 ${e} 必须是对象。`)];const n=t,s=[];return n.id!==e&&s.push(L("invalid-person",`people.${e}.id`,`人物 ${e} 的 id 必须与键名一致。`)),(!se(n.name)||!n.name.trim())&&s.push(L("invalid-person",`people.${e}.name`,`人物 ${e} 缺少姓名。`)),(!se(n.gender)||!bi.has(n.gender))&&s.push(L("invalid-person",`people.${e}.gender`,`人物 ${e} 的性别值无效。`)),["birth","death","age","titleName","clan","note"].forEach(r=>{xi(n[r])||s.push(L("invalid-person",`people.${e}.${r}`,`人物 ${e} 的 ${r} 必须是字符串。`))}),ki(n.deceased)||s.push(L("invalid-person",`people.${e}.deceased`,`人物 ${e} 的 deceased 必须是布尔值。`)),s}function bt(e,t,n,s){if(!Array.isArray(n))return[L("invalid-family",`families.${e}.${t}`,`家庭 ${e} 缺少 ${t} 数组。`)];const r=new Set,u=[];return n.forEach((i,d)=>{const a=`families.${e}.${t}[${d}]`;if(!se(i)||!i){u.push(L("invalid-family",a,`家庭 ${e} 的成员 ID 必须是非空字符串。`));return}s[i]||u.push(L("missing-person-reference",a,`家庭 ${e} 引用了不存在的人物 ${i}。`)),r.has(i)&&u.push(L("duplicate-family-member",a,`人物 ${i} 在家庭 ${e} 中重复出现。`)),r.add(i)}),u}function $i(e,t,n){if(!pe(t))return[L("invalid-family",`families.${e}`,`家庭 ${e} 必须是对象。`)];const s=t,r=[];if(s.id!==e&&r.push(L("invalid-family",`families.${e}.id`,`家庭 ${e} 的 id 必须与键名一致。`)),s.branchMode!==void 0&&(!se(s.branchMode)||!wi.has(s.branchMode))&&r.push(L("invalid-family",`families.${e}.branchMode`,`家庭 ${e} 的 branchMode 值无效。`)),r.push(...bt(e,"adults",s.adults,n)),r.push(...bt(e,"children",s.children,n)),Array.isArray(s.adults)&&Array.isArray(s.children)){const u=new Set(s.adults.filter(i=>se(i)&&i.length>0));s.children.forEach((i,d)=>{se(i)&&u.has(i)&&r.push(L("duplicate-family-member",`families.${e}.children[${d}]`,`人物 ${i} 不能同时作为家庭 ${e} 的父母和子女。`))})}return r}function tt(e){if(!pe(e))return[L("invalid-root","publication","族谱数据必须是对象。")];const t=e,n=[];if((!se(t.title)||!t.title.trim())&&n.push(L("invalid-root","title","族谱标题不能为空。")),(!se(t.subtitle)||!t.subtitle.trim())&&n.push(L("invalid-root","subtitle","族谱副标题不能为空。")),(!se(t.focusFamilyId)||!t.focusFamilyId.trim())&&n.push(L("invalid-root","focusFamilyId","当前宗支 ID 必须是字符串。")),pe(t.people)||n.push(L("missing-people","people","族谱数据缺少 people 对象。")),pe(t.families)||n.push(L("missing-families","families","族谱数据缺少 families 对象。")),!pe(t.people)||!pe(t.families))return n;Object.entries(t.people).forEach(([i,d])=>{n.push(...Si(i,d))}),Object.entries(t.families).forEach(([i,d])=>{n.push(...$i(i,d,t.people))}),se(t.focusFamilyId)&&!t.families[t.focusFamilyId]&&n.push(L("missing-focus-family","focusFamilyId",`当前宗支 ${t.focusFamilyId} 不存在。`));const s=new Map,r=new Map;Object.entries(t.families??{}).forEach(([i,d])=>{Array.isArray(d.adults)&&d.adults.forEach(a=>{s.has(a)||s.set(a,[]),s.get(a).push(i)}),Array.isArray(d.children)&&d.children.forEach(a=>{r.has(a)||r.set(a,[]),r.get(a).push(i)})});const u=t.families??{};return s.forEach((i,d)=>{i.length>1&&i.slice(1).forEach(a=>{var l;const c=(((l=u[a])==null?void 0:l.adults)??[]).indexOf(d);n.push(L("cross-family-duplicate-adult",`families.${a}.adults[${c}]`,`人物 ${d} 已在家庭 ${i[0]} 中作为父母，不能同时作为家庭 ${a} 的父母。`))})}),r.forEach((i,d)=>{i.length>1&&i.slice(1).forEach(a=>{var l;const c=(((l=u[a])==null?void 0:l.children)??[]).indexOf(d);n.push(L("cross-family-duplicate-child",`families.${a}.children[${c}]`,`人物 ${d} 已在家庭 ${i[0]} 中作为子女，不能同时作为家庭 ${a} 的子女。`))})}),n}function _t(e){const t=JSON.parse(JSON.stringify(e));return Pi(t),Object.values(t.families).forEach(n=>{const s=new Set,r=new Set;n.adults=n.adults.filter(u=>!t.people[u]||s.has(u)?!1:(s.add(u),!0)),n.children=n.children.filter(u=>!t.people[u]||s.has(u)||r.has(u)?!1:(r.add(u),!0))}),t.families[t.focusFamilyId]||(t.focusFamilyId=Object.keys(t.families)[0]??""),t}function jt(e){return{...e,cardWidth:ce(e.cardWidth,142,176),generationGap:ce(e.generationGap,120,220),siblingGap:ce(e.siblingGap,56,140),partnerGap:ce(e.partnerGap,72,128),fontScale:ce(e.fontScale,.88,1.18),zoom:ce(e.zoom,.55,1.35),paddingX:ce(e.paddingX,72,220),paddingY:ce(e.paddingY,48,180)}}function Ci(e){if(!pe(e))return[L("missing-settings","settings","排版设置必须是对象。")];const t=e,n=[];return(!se(t.paper)||!yi.has(t.paper))&&n.push(L("invalid-settings","settings.paper","纸张尺寸必须是 A3 或 A4。")),[["cardWidth",142,176],["generationGap",120,220],["siblingGap",56,140],["partnerGap",72,128],["fontScale",.88,1.18],["zoom",.55,1.35],["paddingX",72,220],["paddingY",48,180]].forEach(([s,r,u])=>{if(typeof t[s]!="number"||!Number.isFinite(t[s])){n.push(L("invalid-settings",`settings.${s}`,`${s} 必须是数字。`));return}(t[s]<r||t[s]>u)&&n.push(L("invalid-settings",`settings.${s}`,`${s} 必须在 ${r} 到 ${u} 之间。`))}),["showDeath","showAge","showNote"].forEach(s=>{typeof t[s]!="boolean"&&n.push(L("invalid-settings",`settings.${s}`,`${s} 必须是布尔值。`))}),n}function Pi(e){const t=new Map,n=new Map;Object.entries(e.families).forEach(([s,r])=>{var u,i;(u=r.adults)==null||u.forEach(d=>{t.has(d)||t.set(d,[]),t.get(d).push(s)}),(i=r.children)==null||i.forEach(d=>{n.has(d)||n.set(d,[]),n.get(d).push(s)})}),t.forEach(s=>{s.length>1&&s.slice(1).forEach(r=>{const u=e.families[r];u&&(u.adults=u.adults.filter(i=>i!==s[0]))})}),n.forEach(s=>{s.length>1&&s.slice(1).forEach(r=>{const u=e.families[r];u&&(u.children=u.children.filter(i=>i!==s[0]))})})}function Ue(e){return e.map(t=>`${t.path}: ${t.message}`).join(`
`)}function Re(e){return JSON.parse(JSON.stringify(e))}function Ge(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function We(e,t,n){return{code:e,path:t,message:n}}function Ut(e){return{...Be,...Ge(e)?e:{}}}function Ei(e){try{return{ok:!0,value:JSON.parse(e)}}catch{return{ok:!1,issues:[We("invalid-json","json","JSON 格式错误，无法解析。")]}}}function Ai(e,t=new Date().toISOString()){if(!Ge(e))return{ok:!1,issues:[We("invalid-root","draft","导入内容必须是对象。")]};const n=Ge(e.publication),s=n?e.publication:e,r=n?e.settings:Be,u=n?e.version??ye:ye;if(u!==ye)return{ok:!1,issues:[We("unsupported-draft-version","version",`不支持的草稿版本：${String(u)}。`)]};const i=tt(s),d=jt(Ut(r)),a=Ci(d),c=[...i,...a];return c.length>0?{ok:!1,issues:c}:{ok:!0,value:{version:ye,savedAt:typeof e.savedAt=="string"?e.savedAt:t,publication:_t(Re(s)),settings:Re(d)}}}function yt(e,t,n=new Date().toISOString()){return{version:ye,savedAt:n,publication:_t(Re(e)),settings:jt(Ut(Re(t)))}}function wt(e){return JSON.stringify(e,null,2)}async function Gt(e){const t=JSON.parse(JSON.stringify(e)),s=Object.values(t.people).map(async r=>{if(r.avatarUrl&&Ii(r.avatarUrl))try{const u=await fetch(r.avatarUrl);if(!u.ok)return;const i=await u.blob(),d=await new Promise((a,c)=>{const l=new FileReader;l.onloadend=()=>a(l.result),l.onerror=c,l.readAsDataURL(i)});r.avatarUrl=d}catch(u){console.error(`无法转换图片为 Base64 (person: ${r.name}):`,u)}});return await Promise.all(s),t}function Ii(e){return e.startsWith("/api/photos/")||e.startsWith("/uploads/")||e.startsWith("uploads/")||e.includes("/uploads/")}function xt(e){const t=Ei(e);return t.ok?Ai(t.value):t}function Ve(e){const t=e instanceof Uint8Array?e:new Uint8Array(e);let n="";for(let s=0;s<t.length;s++)n+=String.fromCharCode(t[s]);return btoa(n)}async function Fi(e,t){const n=new TextEncoder,s=crypto.getRandomValues(new Uint8Array(16)),r=crypto.getRandomValues(new Uint8Array(12)),u=await crypto.subtle.importKey("raw",n.encode(t),"PBKDF2",!1,["deriveKey"]),i=await crypto.subtle.deriveKey({name:"PBKDF2",salt:s,iterations:1e5,hash:"SHA-256"},u,{name:"AES-GCM",length:256},!1,["encrypt"]),d=await crypto.subtle.encrypt({name:"AES-GCM",iv:r},i,n.encode(e));return{v:1,salt:Ve(s),iv:Ve(r),data:Ve(new Uint8Array(d))}}function Mi(e){var s,r,u,i;const t=[];e.title&&t.push(`<h1>${le(e.title)}</h1>`),e.subtitle&&t.push(`<h2>${le(e.subtitle)}</h2>`);const n=[];return(s=e.info)!=null&&s.description&&n.push(`<p class="info-desc">${le(e.info.description)}</p>`),(r=e.info)!=null&&r.ancestralOrigin&&n.push(`<span class="info-tag">郡望/祖籍：${le(e.info.ancestralOrigin)}</span>`),(u=e.info)!=null&&u.hallName&&n.push(`<span class="info-tag">堂号：${le(e.info.hallName)}</span>`),(i=e.info)!=null&&i.familyMotto&&n.push(`<span class="info-tag">族训：${le(e.info.familyMotto)}</span>`),n.length&&t.push(`<div class="pub-info">${n.join("")}</div>`),t.join(`
`)}function Ti(e){let t=`:root {
`;for(const[n,s]of Object.entries(e))s&&(t+=`  ${n}: ${s};
`);return t+=`}
`,t}function Ri(e){const t=Object.values(e.people),n=t.length,s=t.filter(i=>i.deceased).length,r=n-s,u=[`<span>共 ${n} 人</span>`];return r>0&&u.push(`<span>在世 ${r} 人</span>`),s>0&&u.push(`<span>已故 ${s} 人</span>`),u.join(" ? ")}function Bi(e,t){return`
(function() {
  'use strict';

  var DATA_JSON = ${t?"null":JSON.stringify(e)};
  var ENCRYPTED_BLOB = ${t?e:"null"};

  // --- Base64 helpers ---
  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // --- AES Decryption ---
  async function decryptPayload(blob, password) {
    var encoder = new TextEncoder();
    var salt = base64ToArrayBuffer(blob.salt);
    var iv = base64ToArrayBuffer(blob.iv);
    var data = base64ToArrayBuffer(blob.data);

    var keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  }

  // --- Relationship lookup ---
  function getRelationships(personId, families) {
    var parents = [], spouses = [], children = [];
    var keys = Object.keys(families);
    for (var i = 0; i < keys.length; i++) {
      var f = families[keys[i]];
      if (f.children && f.children.indexOf(personId) !== -1) {
        parents = parents.concat(f.adults || []);
      }
      if (f.adults && f.adults.indexOf(personId) !== -1) {
        spouses = spouses.concat((f.adults || []).filter(function(id) { return id !== personId; }));
        children = children.concat(f.children || []);
      }
    }
    return { parents: parents, spouses: spouses, children: children };
  }

  // --- Detail panel ---
  function showDetail(personId, data) {
    var person = data.publication.people[personId];
    if (!person) return;
    var rels = getRelationships(personId, data.publication.families);
    var panel = document.getElementById('detail-panel');
    var content = document.getElementById('detail-content');
    var html = '';

    html += '<div class="detail-header">';
    if (person.avatarUrl && person.avatarUrl.startsWith('data:')) {
      html += '<img class="detail-photo" src="' + person.avatarUrl + '" alt="' + escapeAttr(person.name) + '">';
    }
    html += '<h3>' + escapeHtml(person.name) + '</h3>';
    html += '<span class="detail-gender">' + (person.gender === 'male' ? '?' : person.gender === 'female' ? '?' : '??') + '</span>';
    if (person.deceased) html += '<span class="detail-status deceased">??</span>';
    else html += '<span class="detail-status alive">??</span>';
    html += '</div>';

    var details = [];
    if (person.birth) details.push({ label: '??', value: person.birth });
    if (person.death) details.push({ label: '??', value: person.death });
    if (person.age) details.push({ label: '??', value: person.age });
    if (person.clan) details.push({ label: '??', value: person.clan });
    if (person.titleName) details.push({ label: '??', value: person.titleName });
    if (person.note) details.push({ label: '??', value: person.note });

    if (details.length > 0) {
      html += '<div class="detail-fields">';
      for (var i = 0; i < details.length; i++) {
        html += '<div class="detail-field"><span class="detail-label">' + escapeHtml(details[i].label) + '</span><span class="detail-value">' + escapeHtml(details[i].value) + '</span></div>';
      }
      html += '</div>';
    }

    // Relationships
    var relHtml = '';
    if (rels.parents.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">??</span>';
      for (var j = 0; j < rels.parents.length; j++) {
        var pp = data.publication.people[rels.parents[j]];
        if (pp) relHtml += '<span class="rel-item" data-pid="' + rels.parents[j] + '">' + escapeHtml(pp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.spouses.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">??</span>';
      for (var k = 0; k < rels.spouses.length; k++) {
        var sp = data.publication.people[rels.spouses[k]];
        if (sp) relHtml += '<span class="rel-item" data-pid="' + rels.spouses[k] + '">' + escapeHtml(sp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.children.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">??</span>';
      for (var m = 0; m < rels.children.length; m++) {
        var cp = data.publication.people[rels.children[m]];
        if (cp) relHtml += '<span class="rel-item" data-pid="' + rels.children[m] + '">' + escapeHtml(cp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (relHtml) {
      html += '<div class="detail-relations">' + relHtml + '</div>';
    }

    content.innerHTML = html;
    panel.classList.add('visible');

    // Click on relationship items
    var relItems = content.querySelectorAll('.rel-item');
    for (var n = 0; n < relItems.length; n++) {
      relItems[n].addEventListener('click', function() {
        showDetail(this.getAttribute('data-pid'), data);
      });
    }
  }

  function hideDetail() {
    document.getElementById('detail-panel').classList.remove('visible');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  // --- Pan / Zoom ---
  function setupInteraction(viewport, camera) {
    var zoom = 1, panX = 0, panY = 0;
    var svg = camera.querySelector('svg');
    var vb = svg ? svg.getAttribute('viewBox') : null;
    var vbW = 0, vbH = 0;
    if (vb) {
      var parts = vb.split(/[s,]+/);
      vbW = parseFloat(parts[2]) || 0;
      vbH = parseFloat(parts[3]) || 0;
    }

    function updateTransform() {
      camera.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + zoom + ')';
    }

    function fitToView() {
      var vw = viewport.clientWidth;
      var vh = viewport.clientHeight;
      if (vbW > 0 && vbH > 0) {
        zoom = Math.min(vw / vbW, vh / vbH) * 0.92;
        panX = (vw - vbW * zoom) / 2;
        panY = (vh - vbH * zoom) / 2;
      }
      updateTransform();
    }

    fitToView();

    // Mouse wheel zoom
    viewport.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      var newZoom = Math.min(5, Math.max(0.1, zoom * delta));
      var rect = viewport.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      panX = cx - (cx - panX) * (newZoom / zoom);
      panY = cy - (cy - panY) * (newZoom / zoom);
      zoom = newZoom;
      updateTransform();
    }, { passive: false });

    // Pointer drag
    var dragging = false, startX, startY, startPanX, startPanY;
    viewport.addEventListener('pointerdown', function(e) {
      if (e.target.closest('.person-card')) return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startPanX = panX; startPanY = panY;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      panX = startPanX + (e.clientX - startX);
      panY = startPanY + (e.clientY - startY);
      updateTransform();
    });
    viewport.addEventListener('pointerup', function() { dragging = false; });

    // Touch pinch
    var lastTouchDist = 0;
    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });
    viewport.addEventListener('touchmove', function(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        var dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        var scale = dist / lastTouchDist;
        zoom = Math.min(5, Math.max(0.1, zoom * scale));
        lastTouchDist = dist;
        updateTransform();
      }
    }, { passive: false });

    // Double-tap to zoom on a person card
    var lastTapTime = 0;
    camera.addEventListener('click', function(e) {
      var card = e.target.closest('[data-person-id]');
      if (!card) return;
      var now = Date.now();
      if (now - lastTapTime < 350) {
        // Double tap: zoom to this card
        e.preventDefault();
        e.stopPropagation();
        try {
          var bbox = card.getBBox();
          var cardCenterX = bbox.x + bbox.width / 2;
          var cardCenterY = bbox.y + bbox.height / 2;
          var targetZoom = 1.5;
          var viewW = viewport.clientWidth;
          var viewH = viewport.clientHeight;
          zoom = targetZoom;
          panX = viewW / 2 - cardCenterX * targetZoom;
          panY = viewH / 2 - cardCenterY * targetZoom;
          updateTransform();
        } catch(e) {}
      }
      lastTapTime = now;
    });
  }

  // --- Card click ---
  function setupCardClick(viewport, data) {
    viewport.addEventListener('click', function(e) {
      var card = e.target.closest('.person-card');
      if (!card) return;
      var personId = card.getAttribute('data-person-id');
      if (personId) showDetail(personId, data);
    });
  }

  // --- Close panel ---
  function setupClosePanel() {
    document.getElementById('detail-close').addEventListener('click', hideDetail);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') hideDetail();
    });
  }

  // --- Header toggle ---
  function setupHeaderToggle() {
    var btn = document.getElementById('header-toggle');
    var header = document.getElementById('pub-header');
    if (!btn || !header) return;
    btn.addEventListener('click', function() {
      header.classList.toggle('collapsed');
      btn.textContent = header.classList.contains('collapsed') ? '??' : '??';
    });
  }

  // --- Init ---
  function init(data) {
    var app = document.getElementById('app');
    var camera = document.getElementById('tree-camera');
    var viewport = document.getElementById('tree-viewport');

    // Inject SVG
    camera.innerHTML = data.svgMarkup;

    // Show app
    app.style.display = 'flex';

    setupInteraction(viewport, camera);
    setupCardClick(viewport, data);
    setupClosePanel();
    setupHeaderToggle();
  }

  // --- Entry ---
  if (${t}) {
    // Encrypted mode
    var gate = document.getElementById('password-gate');
    gate.style.display = 'flex';
    document.getElementById('pwd-submit').addEventListener('click', async function() {
      var pwd = document.getElementById('pwd-input').value;
      var errEl = document.getElementById('pwd-error');
      if (!pwd) { errEl.textContent = '?????'; return; }
      errEl.textContent = '???...';
      try {
        var json = await decryptPayload(ENCRYPTED_BLOB, pwd);
        var data = JSON.parse(json);
        gate.style.display = 'none';
        init(data);
      } catch (err) {
        errEl.textContent = '??????????';
      }
    });
    document.getElementById('pwd-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('pwd-submit').click();
    });
  } else {
    // Plain mode
    var data = JSON.parse(DATA_JSON);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { init(data); });
    } else {
      init(data);
    }
  }
})();`}function Oi(e){return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${le(e.title)} - ????</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

${e.themeCss}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Manrope', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  color: var(--text-main, #241a10);
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Password gate */
#password-gate {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--shell-bg-image, var(--bg-shell, #f5f0e8));
  z-index: 9999;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20px;
}
#password-gate .gate-box {
  background: var(--bg-paper, #fff9ef);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
  border-radius: 8px;
  padding: 48px;
  text-align: center;
  max-width: 380px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.06);
}
#password-gate h2 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.2rem;
  margin-bottom: 8px;
}
#password-gate p {
  font-size: 0.85rem;
  color: var(--text-soft, #8a8078);
  margin-bottom: 24px;
}
#pwd-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--card-panel-stroke, #e0ddd8);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--bg-shell, #f5f0e8);
  color: var(--text-main, #241a10);
  outline: none;
  margin-bottom: 12px;
}
#pwd-input:focus {
  border-color: var(--accent-amber, #b08d57);
}
#pwd-submit {
  width: 100%;
  padding: 14px;
  background: var(--accent-amber, #b08d57);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
#pwd-submit:hover { opacity: 0.9; }
#pwd-error {
  color: #c0392b;
  font-size: 0.8rem;
  min-height: 1.2em;
  margin-top: 4px;
}

/* App layout */
#app {
  display: none;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* Header */
#pub-header {
  padding: 20px 32px 16px;
  background: var(--bg-paper, #fff9ef);
  border-bottom: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
  position: relative;
  flex-shrink: 0;
  transition: max-height 0.3s ease, padding 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}
#pub-header.collapsed {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-bottom: none;
}
#pub-header h1 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}
#pub-header h2 {
  font-family: 'Noto Serif SC', serif;
  font-size: 0.95rem;
  font-weight: 400;
  color: var(--text-soft, #8a8078);
  margin-bottom: 10px;
}
.pub-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.info-desc {
  font-size: 0.85rem;
  color: var(--text-soft, #8a8078);
  line-height: 1.6;
  width: 100%;
  margin-bottom: 4px;
}
.info-tag {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--bg-shell, #f5f0e8);
  border-radius: 3px;
  color: var(--text-main, #241a10);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.04));
}
#header-toggle {
  position: absolute;
  right: 32px;
  top: 20px;
  font-size: 0.7rem;
  padding: 4px 10px;
  background: var(--bg-shell, #f5f0e8);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
  border-radius: 3px;
  cursor: pointer;
  color: var(--text-soft, #8a8078);
}
#header-toggle:hover { color: var(--text-main, #241a10); }

/* Tree viewport */
#tree-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--canvas-bg, var(--bg-paper, #fff9ef));
  cursor: grab;
}
#tree-viewport:active { cursor: grabbing; }
#tree-camera {
  position: absolute;
  transform-origin: 0 0;
  will-change: transform;
}
#tree-camera svg {
  display: block;
}

/* Detail panel */
#detail-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100%;
  width: 360px;
  max-width: 90vw;
  background: var(--bg-paper, #fff9ef);
  border-left: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
  box-shadow: -8px 0 32px rgba(0,0,0,0.06);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  z-index: 1000;
  overflow-y: auto;
  padding: 32px 24px;
}
#detail-panel.visible {
  transform: translateX(0);
}
#detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-soft, #8a8078);
  cursor: pointer;
  line-height: 1;
}
#detail-close:hover { color: var(--text-main, #241a10); }

.detail-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
}
.detail-photo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--card-panel-stroke, rgba(0,0,0,0.08));
}
.detail-header h3 {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.25rem;
  flex: 1;
}
.detail-gender {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--bg-shell, #f5f0e8);
  border-radius: 3px;
}
.detail-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 3px;
}
.detail-status.deceased { color: #8a8078; background: #f0ede8; }
.detail-status.alive { color: #2d8a4e; background: #e8f5e9; }

.detail-fields {
  margin-bottom: 20px;
}
.detail-field {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  font-size: 0.85rem;
}
.detail-label {
  color: var(--text-soft, #8a8078);
  min-width: 48px;
  flex-shrink: 0;
}
.detail-value {
  color: var(--text-main, #241a10);
  word-break: break-all;
}

.detail-relations {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
}
.rel-group {
  margin-bottom: 12px;
}
.rel-label {
  font-size: 0.75rem;
  color: var(--text-soft, #8a8078);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
  margin-bottom: 6px;
}
.rel-item {
  display: inline-block;
  font-size: 0.85rem;
  padding: 4px 10px;
  margin: 2px 4px 2px 0;
  background: var(--bg-shell, #f5f0e8);
  border: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.04));
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
}
.rel-item:hover {
  border-color: var(--accent-amber, #b08d57);
  color: var(--accent-amber, #b08d57);
}

/* Footer */
#pub-footer {
  padding: 10px 32px;
  background: var(--bg-paper, #fff9ef);
  border-top: 1px solid var(--card-panel-stroke, rgba(0,0,0,0.06));
  font-size: 0.75rem;
  color: var(--text-soft, #8a8078);
  display: flex;
  justify-content: space-between;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  #pub-header { padding: 10px 14px; }
  #pub-header h1 { font-size: 1.1rem; }
  #detail-panel {
    top: auto; bottom: 0; left: 0; right: 0;
    width: 100vw; max-width: 100vw;
    height: 45vh;
    border-radius: 16px 16px 0 0;
    padding-top: 24px;
  }
  #detail-panel::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #ccc;
  }
  #tree-viewport { font-size: 16px; }
  .detail-close { width: 44px; height: 44px; font-size: 18px; }
  #pub-footer { padding: 8px 12px; flex-direction: column; gap: 4px; font-size: 0.78rem; }
  #password-gate input {
    font-size: 16px;
    padding: 12px 16px;
  }
  #password-gate button {
    padding: 12px 24px;
    font-size: 16px;
  }
}
</style>
</head>
<body>

<div id="password-gate">
  <div class="gate-box">
    <h2>族谱已加密</h2>
    <p>请输入密码以查看内容</p>
    <input type="password" id="pwd-input" placeholder="请输入密码" autocomplete="off">
    <button id="pwd-submit">??</button>
    <div id="pwd-error"></div>
  </div>
</div>

<div id="app">
  <header id="pub-header">
    <button id="header-toggle">??</button>
    ${e.infoHeader}
  </header>

  <main id="tree-viewport">
    <div id="tree-camera"></div>
  </main>

  <aside id="detail-panel">
    <button id="detail-close">&times;</button>
    <div id="detail-content"></div>
  </aside>

  <footer id="pub-footer">
    <span>${e.statsHtml}</span>
    <span>????${le(e.generatedAt)} ? ??????</span>
  </footer>
</div>

<script>
${e.script}
<\/script>
</body>
</html>`}async function Di(e){const{publication:t,settings:n,layout:s,svgElement:r,password:u,onProgress:i}=e;i==null||i("capturing",10);const d=await Te({svgElement:r,layout:s,title:t.title.trim()||"??????",embedImages:!0});i==null||i("capturing",25);const a=Ne();i==null||i("capturing",30);const c=$e(d,!1);i==null||i("building",40);const l=await Gt(t);i==null||i("building",60);const m=JSON.stringify({publication:l,settings:n,themeVars:a,svgMarkup:c});i==null||i("building",70);let M,g=!1;if(u){i==null||i("encrypting",75);const $=await Fi(m,u);M=JSON.stringify($),g=!0,i==null||i("encrypting",85)}else M=m,i==null||i("assembling",85);i==null||i("assembling",90);const v=Ti(a),b=Mi(t),x=Ri(t),S=new Date().toLocaleString("zh-CN"),R=Bi(M,g),E=Oi({title:t.title.trim()||"????",themeCss:v,infoHeader:b,statsHtml:x,script:R,generatedAt:S});return i==null||i("done",100),E}const Wt={types:[{description:"Guiyuan draft JSON",accept:{"application/json":[".json"]}}],excludeAcceptAllOption:!1};function nt(){return window}function Xt(e){return e instanceof DOMException&&e.name==="AbortError"}function Ni(){const e=nt();return typeof e.showOpenFilePicker=="function"&&typeof e.showSaveFilePicker=="function"}async function Hi(){const e=nt();if(!e.showOpenFilePicker)return null;try{const[t]=await e.showOpenFilePicker({...Wt,multiple:!1});if(!t)return null;const n=await t.getFile();return{handle:t,name:t.name||n.name,content:await n.text()}}catch(t){if(Xt(t))return null;throw t}}async function Li(e,t){const n=nt();if(!n.showSaveFilePicker)return null;try{const s=await n.showSaveFilePicker({...Wt,suggestedName:e});return await Yt(s,t),s}catch(s){if(Xt(s))return null;throw s}}async function Yt(e,t){const n=await e.createWritable();await n.write(t),await n.close()}function zi(e){const{pub:t,statusMessage:n,errorMessage:s,getErrorMessage:r,initializeHistoryBaseline:u,canvasRef:i,layout:d}=e,{publication:a,settings:c,selectedPersonId:l,replaceReactiveObject:m,getDefaultSelectedPersonId:M}=t,g=e.onImport,v=mn(null),b=N(""),x=N(!1),S=Ni();let R=!1;function E(){return R}function $(I){return I.replace(/[\\/:*?\"<>|]/g,"-").trim()||"Guiyuan-archive-preview"}async function p(){var O,B;const I=(B=(O=i.value)==null?void 0:O.getSvgElement)==null?void 0:B.call(O);return!I||d.value.cards.length===0||d.value.width<=0||d.value.height<=0?null:await Te({svgElement:I,layout:d.value,title:a.title.trim()||"Guiyuan Archive Preview"})}async function A(){const I=await p();return I?$e(I):null}function H(I,O,B){const _=new Blob([O],{type:B}),U=URL.createObjectURL(_),ie=document.createElement("a");ie.href=U,ie.download=I,ie.click(),window.setTimeout(()=>URL.revokeObjectURL(U),0)}function re(){return wt(yt(a,c))}function G(){const I=b.value.trim()||$(a.title);return I.toLowerCase().endsWith(".json")?I:`${I}.json`}function P(){return x.value?window.confirm("当前草稿还有未保存到文件的修改，继续打开其他文件会覆盖当前内容。是否继续？"):!0}function f(I,O){var B,_;R=!0,m(a,I.publication),m(c,I.settings),l.value=M(I.publication),v.value=O.handle??null,b.value=O.fileName??"",x.value=!1,s.value="",n.value=O.statusMessage,u(),(_=(B=i.value)==null?void 0:B.resetView)==null||_.call(B),g==null||g(),Ie(()=>{R=!1})}async function w(){if(S&&P())try{const I=await Hi();if(!I)return;const O=xt(I.content);if(!O.ok){s.value=Ue(O.issues),n.value="";return}f(O.value,{fileName:I.name,handle:I.handle,statusMessage:`Opened file: ${I.name}`})}catch(I){s.value=r(I,"Failed to open file."),n.value=""}}async function F(I=!1){const O=re(),B=G();try{if(v.value&&!I){await Yt(v.value,O),b.value=v.value.name||B,x.value=!1,s.value="",n.value=`Saved to file: ${b.value}`;return}if(S){const _=await Li(B,O);if(!_)return;v.value=_,b.value=_.name||B,x.value=!1,s.value="",n.value=`Saved to file: ${b.value}`;return}H(B,O,"application/json;charset=utf-8"),v.value=null,b.value=B,x.value=!1,s.value="",n.value=`Downloaded file: ${B}`}catch(_){s.value=r(_,"Failed to save file."),n.value=""}}async function te(){const I=await A();if(!I){s.value="There is no exportable SVG on the current canvas.",n.value="";return}s.value="",H(`${$(a.title)}.svg`,I,"image/svg+xml;charset=utf-8")}async function Q(){const I=await p();if(!I){s.value="There is no exportable SVG on the current canvas.",n.value="";return}const O=a.title.trim()||"Guiyuan Archive Preview",B=La(d.value,c.paper),_=B.map(ie=>$e(Ha(I,ie,O),!1)),U=window.open("","_blank","width=1440,height=960");if(!U){s.value="The browser blocked the print window. Please allow popups and try again.",n.value="";return}s.value="",n.value=`Generated ${B.length} print pages.`,U.document.open(),U.document.write(za({title:O,paper:c.paper,pages:B,pageSvgMarkups:_})),U.document.close()}async function de(){n.value="Exporting JSON package...";try{const I=await Gt(a),O=yt(I,c);H(`${$(a.title)}.json`,wt(O),"application/json;charset=utf-8"),n.value="Exported JSON package with embedded images.",s.value=""}catch(I){s.value=r(I,"导出失败"),n.value=""}}async function V(I){var U;const O=I.target,B=(U=O.files)==null?void 0:U[0];if(O.value="",!B||!P())return;const _=xt(await B.text());if(!_.ok){s.value=Ue(_.issues),n.value="";return}f(_.value,{fileName:B.name,handle:null,statusMessage:`Imported file: ${B.name}`})}async function ne(I){var B,_;const O=(_=(B=i.value)==null?void 0:B.getSvgElement)==null?void 0:_.call(B);if(!O||d.value.cards.length===0){s.value="There is no exportable content on the current canvas.",n.value="";return}n.value="Generating share page...",s.value="";try{const U=await Di({publication:a,settings:c,layout:d.value,svgElement:O,password:I||void 0,onProgress:(ot,T)=>{n.value=`Generating share page... ${T}%`}}),ie=`${$(a.title)}-分享.html`;H(ie,U,"text/html;charset=utf-8"),n.value="Share page generated and downloaded.",s.value=""}catch(U){s.value=r(U,"Failed to generate share page."),n.value=""}}return{draftFileHandle:v,draftFileName:b,hasUnsavedFileChanges:x,nativeFileAccessSupported:S,getIsApplyingFileDraft:E,sanitizeFileName:$,shouldReplaceCurrentDraft:P,openDraftFile:w,saveDraftFile:F,downloadSvg:te,printPublication:Q,exportJson:de,exportShareHtml:ne,importDraftFromFileEvent:V}}function Jt(e){return JSON.parse(JSON.stringify(e))}function Vi(e,t){return{code:"operation-conflict",path:e,message:t}}function ee(e,t){return{ok:!1,issues:[Vi(e,t)]}}function _i(e){return{ok:!0,value:e}}function qt(e){return Object.values(e.families)}function Ce(e){return typeof e=="string"&&e.length>0}function ji(e,t){var n;return((n=e.people[t])==null?void 0:n.name)??t}function st(e,t){const n=Object.keys(t==="p"?e.people:e.families);let s=0;return n.forEach(r=>{if(!r.startsWith(t))return;const u=Number(r.slice(1));Number.isFinite(u)&&(s=Math.max(s,u))}),`${t}${s+1}`}function me(e,t){const n=st(e,"p"),s={id:n,name:t.name,gender:t.gender,note:t.note};return e.people[n]=s,s}function oe(e,t){var n;return(n=qt(e).find(s=>s.adults.includes(t)))==null?void 0:n.id}function Pe(e,t){var n;return(n=qt(e).find(s=>s.children.includes(t)))==null?void 0:n.id}function Ee(e,t){const n=oe(e,t);if(n)return e.families[n];const s=st(e,"f"),r={id:s,adults:[t],children:[]};return e.families[s]=r,r}function kt(e,t){const n=[];t.adults.forEach(r=>{Ce(r)&&e.people[r]&&!n.includes(r)&&n.push(r)});const s=[];t.children.forEach(r=>{e.people[r]&&!n.includes(r)&&!s.includes(r)&&s.push(r)}),t.adults=n,t.children=s}function Xe(e,t){if(!e.people[t])return;const n=oe(e,t);return n||Ee(e,t).id}function Ae(e){Object.values(e.families).forEach(t=>kt(e,t)),Object.values(e.families).filter(t=>t.adults.length===0).forEach(t=>{const n=[...t.children];delete e.families[t.id],n.forEach(s=>{Xe(e,s)})}),Object.values(e.families).forEach(t=>kt(e,t))}function Ui(e,t={}){const n=[...t.focusCandidates??[],e.focusFamilyId,Object.keys(e.families)[0]].find(r=>!!(r&&e.families[r]))??"",s=[...t.selectionCandidates??[],Object.keys(e.people)[0]].find(r=>!!(r&&e.people[r]))??"";return e.focusFamilyId=n,{focusFamilyId:n,selectedPersonId:s}}function Gi(e){return tt(e)}function Ye(e,t){const n=oe(e,t);if(!n)return null;const s=e.families[n].adults.find(r=>r!==t);return s?e.people[s]??null:null}function Kt(e,t){const n=oe(e,t);return n?e.families[n].children.map(s=>e.people[s]).filter(s=>!!s):[]}function Zt(e,t){const n=Pe(e,t);return n?e.families[n].adults.map(s=>e.people[s]).filter(s=>!!s):[]}function Wi(e,t){if(!e.people[t])return null;const s=Ye(e,t)?[Ye(e,t).name]:[],r=Zt(e,t).map(l=>l.name),u=Kt(e,t).map(l=>l.name),i=Jt(e);Object.values(i.families).forEach(l=>{l.adults=l.adults.filter(m=>m!==t),l.children=l.children.filter(m=>m!==t)}),delete i.people[t];const d=new Set(Object.keys(e.families));Ae(i);const a=new Set(Object.keys(i.families)),c=[...d].filter(l=>!a.has(l));return{spouseNames:s,parentNames:r,childNames:u,removedFamilyIds:c}}function Xi(e,t){var M;const n=Jt(e),s=tt(n);if(s.length>0)return{ok:!1,issues:s};const u="personId"in t?t.personId:t.parentPersonId,i=n.people[u];if(!i)return ee("personId","目标人物不存在。");let d=[],a=[],c="";switch(t.type){case"add-spouse":{const g=Ee(n,t.personId);if(g.adults.filter(Ce).length>=2)return ee("personId",`${i.name} 已有配偶关系。`);const v=i.gender==="male"?"female":i.gender==="female"?"male":"unknown",b=me(n,{name:"待命名配偶",gender:v,note:"配偶"});g.adults=[t.personId,b.id],a=[b.id],c=`新增配偶 · ${i.name}`;break}case"add-child":{const g=Ee(n,t.personId),v=t.gender==="female",b=me(n,{name:v?"待命名女儿":"待命名儿子",gender:t.gender});g.children=[...g.children,b.id],b.note=vn(n,b.id)||(v?"女儿":"儿子"),i.gender==="female"&&(d=[g.id]),a=[b.id],c=`${v?"新增女儿":"新增儿子"} · ${i.name}`;break}case"add-parents":{const g=Pe(n,t.personId);if(!g){const E=me(n,{name:"待命名父亲",gender:"male",note:"父亲"}),$=me(n,{name:"待命名母亲",gender:"female",note:"母亲"}),p=st(n,"f");n.families[p]={id:p,adults:[E.id,$.id],children:[t.personId]},d=[p],a=[E.id],c=`新增父母 · ${i.name}`;break}const v=n.families[g],b=v.adults.filter(Ce);if(b.length>=2)return ee("personId",`${i.name} 已有完整父母关系。`);if(b.length===0){const E=me(n,{name:"待命名父亲",gender:"male",note:"父亲"}),$=me(n,{name:"待命名母亲",gender:"female",note:"母亲"});v.adults=[E.id,$.id],d=[v.id],a=[E.id],c=`新增父母 · ${i.name}`;break}const x=n.people[b[0]],S=(x==null?void 0:x.gender)==="male"?"female":(x==null?void 0:x.gender)==="female"?"male":"unknown",R=me(n,{name:S==="male"?"待命名父亲":S==="female"?"待命名母亲":"待命名父母",gender:S,note:S==="male"?"父亲":S==="female"?"母亲":"父母"});v.adults=S==="male"?[R.id,...b]:[...b,R.id],d=[v.id],a=[R.id],c=`新增父母 · ${i.name}`;break}case"focus-branch":{const g=Ee(n,t.personId);g.adults[0]!==t.personId&&(g.adults=[t.personId,...g.adults.filter(v=>v!==t.personId)]),d=[g.id],a=[t.personId],c=`设为当前宗支 · ${i.name}`;break}case"set-branch-mode":{const g=oe(n,t.personId);if(!g)return ee("personId",`${i.name} 暂无可设置的婚配归属。`);const v=hn(n,g),b=v?n.people[v]:null;if(!b||b.gender!=="female")return ee("personId","只有女性承支家庭需要区分外嫁或招婿。");n.families[g].branchMode=t.branchMode,d=[g],a=[t.personId],c=`${t.branchMode==="uxorilocal"?"设为招婿支":"设为外嫁支"} · ${b.name}`;break}case"swap-partners":{const g=oe(n,t.personId);if(!g)return ee("personId",`${i.name} 暂无可切换的配偶关系。`);const v=n.families[g];if(v.adults.filter(Ce).length<2)return ee("personId",`${i.name} 暂无可切换的配偶关系。`);v.adults=[...v.adults].reverse(),a=[t.personId],d=[v.id],c="切换夫妻位置";break}case"move-child":{const g=oe(n,t.parentPersonId);if(!g)return ee("parentPersonId",`${i.name} 暂无子女排序可调整。`);const v=n.families[g],b=v.children.indexOf(t.childId),x=b+t.direction;if(b<0||x<0||x>=v.children.length)return ee("childId","子女顺序调整目标无效。");const S=[...v.children];[S[b],S[x]]=[S[x],S[b]],v.children=S,a=[t.parentPersonId],d=[v.id],c=`调整子女顺序 · ${ji(n,t.childId)}`;break}case"remove-spouse":{const g=oe(n,t.personId);if(!g)return ee("personId",`${i.name} 当前没有配偶关系。`);const v=n.families[g],b=v.adults.find(x=>x!==t.personId);if(!b)return ee("personId",`${i.name} 当前没有配偶关系。`);v.adults=v.adults.filter(x=>x!==b),Xe(n,b),Ae(n),d=[n.focusFamilyId,v.id],a=[t.personId,b],c=`解除配偶关系 · ${i.name}`;break}case"remove-parents":{const g=Pe(n,t.personId);if(!g)return ee("personId",`${i.name} 当前没有父母关系。`);const v=n.families[g];v.children=v.children.filter(x=>x!==t.personId);const b=Xe(n,t.personId);Ae(n),d=[b,n.focusFamilyId,v.id],a=[t.personId],c=`解除父母关系 · ${i.name}`;break}case"delete-person":{const g=(M=Ye(n,t.personId))==null?void 0:M.id,v=Kt(n,t.personId).map(E=>E.id),b=Zt(n,t.personId).map(E=>E.id),x=oe(n,t.personId),S=Pe(n,t.personId);Object.values(n.families).forEach(E=>{E.adults=E.adults.filter($=>$!==t.personId),E.children=E.children.filter($=>$!==t.personId)}),delete n.people[t.personId],Ae(n);const R=v.map(E=>oe(n,E));d=[n.focusFamilyId,x,...R,S],a=[g,...v,...b],c=`删除人物 · ${i.name}`;break}}const l=Ui(n,{focusCandidates:d,selectionCandidates:a}),m=Gi(n);return m.length>0?{ok:!1,issues:m}:_i({publication:n,selectedPersonId:l.selectedPersonId,focusFamilyId:l.focusFamilyId,historyLabel:c})}function Yi(e){const{pub:t,statusMessage:n,errorMessage:s,editorOpen:r,layoutPanelOpen:u,historyOpen:i,markHistory:d,initializeHistoryBaseline:a,canvasRef:c,revealPersonInCanvas:l,shouldReplaceCurrentDraft:m,draftFileHandle:M,draftFileName:g,hasUnsavedFileChanges:v,confirmFn:b}=e;async function x(T){return b?b(T):window.confirm(T)}const{publication:S,settings:R,selectedPersonId:E,selectedPerson:$,selectedSpouse:p,selectedParents:A,selectedChildren:H,isSelectedBranchFocused:re,rootFamilyId:G,isPersonId:P,replaceReactiveObject:f,getDefaultSelectedPersonId:w}=t;async function F(T,z){if(z&&!await x(z))return;const W=Xi(S,T);if(!W.ok){s.value=Ue(W.issues),n.value="";return}s.value="",d(W.value.historyLabel),f(S,W.value.publication),S.focusFamilyId=W.value.focusFamilyId,E.value=W.value.selectedPersonId,r.value=!!E.value,(T.type==="add-spouse"||T.type==="add-child"||T.type==="add-parents")&&l(W.value.selectedPersonId)}function te(){$.value&&F({type:"add-spouse",personId:$.value.id})}function Q(T){$.value&&F({type:"add-child",personId:$.value.id,gender:T})}function de(){$.value&&F({type:"add-parents",personId:$.value.id})}function V(){$.value&&F({type:"focus-branch",personId:$.value.id})}function ne(T){$.value&&F({type:"set-branch-mode",personId:$.value.id,branchMode:T})}function I(){const T=S.families[G.value];if(!T)return;const z=T.adults.find(P);z?F({type:"focus-branch",personId:z}):(S.focusFamilyId=T.id,E.value=Object.keys(S.people)[0]??""),s.value="",n.value="已返回父系主谱",Ie(()=>{var W,at;(at=(W=c.value)==null?void 0:W.resetView)==null||at.call(W)})}function O(){$.value&&F({type:"swap-partners",personId:$.value.id})}function B(T,z){$.value&&F({type:"move-child",parentPersonId:$.value.id,childId:T,direction:z})}async function _(){const T=$.value,z=p.value;!T||!z||await F({type:"remove-spouse",personId:T.id},`将解除 ${T.name} 与 ${z.name} 的配偶关系，是否继续？`)}async function U(){const T=$.value;!T||!A.value.length||await F({type:"remove-parents",personId:T.id},`将解除 ${T.name} 与 ${A.value.map(z=>z.name).join("、")} 的父母关系，是否继续？`)}async function ie(){const T=$.value;if(!T)return;const z=Wi(S,T.id),W=z?[z.spouseNames.length?`配偶：${z.spouseNames.join("、")}`:"",z.parentNames.length?`父母：${z.parentNames.join("、")}`:"",z.childNames.length?`子女：${z.childNames.join("、")}`:"",z.removedFamilyIds.length?`清理家庭：${z.removedFamilyIds.join("、")}`:""].filter(Boolean).join(`
`):"";await F({type:"delete-person",personId:T.id},`将删除人物"${T.name}"。${W?`
${W}
`:`
`}是否继续？`)}function ot(){m()&&(f(S,structuredClone(it)),f(R,structuredClone(Be)),E.value=w(it),M.value=null,g.value="",v.value=!0,u.value=!1,r.value=!0,i.value=!1,s.value="",n.value="已新建空白族谱，可先修改始祖姓名，再继续补配偶和子女。",a(),Ie(()=>{var T,z;(z=(T=c.value)==null?void 0:T.resetView)==null||z.call(T)}))}return{applyEditorAction:F,addSpouse:te,addChild:Q,addParents:de,focusSelectedBranch:V,updateSelectedBranchMode:ne,returnToMainBranch:I,swapPartnerOrder:O,moveChild:B,removeSpouseRelation:_,removeParentsRelation:U,deleteSelectedPerson:ie,createBlankDraft:ot}}function Ji(e){return typeof e=="string"?e:Array.isArray(e)&&typeof e[0]=="string"?e[0]:""}function qi({route:e,router:t,publication:n,targetPublicationId:s,loadedPublicationId:r,selectedPersonId:u,editorOpen:i,revealPersonInCanvas:d}){let a="";we(()=>{const c=Ji(e.query.personId);return{personId:c,targetPublicationId:s.value,loadedPublicationId:r.value,personPresent:c?!!n.people[c]:!1}},async({personId:c,targetPublicationId:l,loadedPublicationId:m,personPresent:M})=>{if(!c){a="";return}if(!l||m!==l||!M)return;const g=`${l}:${c}`;if(a===g)return;a=g,u.value=c,i.value=!0,d(c);const v={...e.query};delete v.personId,await t.replace({name:e.name??"workbench",params:e.params,query:v})},{immediate:!0})}const Ki={class:"app-shell"},Zi={class:"workspace"},Qi={class:"editor-workspace"},sl=he({__name:"WorkbenchView",props:{publicationId:{}},setup(e){const t=e,n=Et(),s=Pt(),r=N(wn()??""),u=N(null);let i=null;async function d(P){return u.value=P,new Promise(f=>{i=f})}function a(P){u.value=null,i&&(i(P),i=null)}const c=Ke("publication-context"),l=vi(),m=kn(),M=gi(c.pub),g=gn(),v=N(null);function b(P){Ie(()=>{var F,te;const f=l.historyOpen.value?388:l.layoutPanelOpen.value?360:24,w=l.editorOpen.value?444:24;(te=(F=v.value)==null?void 0:F.revealPerson)==null||te.call(F,P,{padding:40,leftInset:f,rightInset:w,topInset:84,bottomInset:48})})}function x(){var P,f;(f=(P=v.value)==null?void 0:P.resetView)==null||f.call(P)}function S(P){const f=Number((c.pub.settings.zoom+P).toFixed(2));c.pub.settings.zoom=Math.min(1.35,Math.max(.55,f))}const R=zi({pub:c.pub,statusMessage:m.statusMessage,errorMessage:m.errorMessage,getErrorMessage:m.getErrorMessage,initializeHistoryBaseline:c.history.initializeHistoryBaseline,canvasRef:v,layout:c.pub.layout,onImport(){c.serverPublicationId.value=null,setTimeout(c.saveToServer,100)}}),E=Yi({pub:c.pub,statusMessage:m.statusMessage,errorMessage:m.errorMessage,editorOpen:l.editorOpen,layoutPanelOpen:l.layoutPanelOpen,historyOpen:l.historyOpen,markHistory:c.history.markHistory,initializeHistoryBaseline:c.history.initializeHistoryBaseline,canvasRef:v,revealPersonInCanvas:b,shouldReplaceCurrentDraft:R.shouldReplaceCurrentDraft,draftFileHandle:R.draftFileHandle,draftFileName:R.draftFileName,hasUnsavedFileChanges:R.hasUnsavedFileChanges,confirmFn:d});function $(P){c.pub.selectedPersonId.value===P?l.editorOpen.value=!0:c.pub.selectedPersonId.value=P}function p(){c.pub.selectedPerson.value&&(l.editorOpen.value=!0)}function A(){l.editorOpen.value=!1}function H(P){Object.assign(c.pub.settings,P)}function re(){c.pub.selectedPerson.value&&b(c.pub.selectedPerson.value.id)}function G(){s.push({name:"publications"})}return qi({route:n,router:s,publication:c.pub.publication,targetPublicationId:yn(t,"publicationId"),loadedPublicationId:c.serverPublicationId,selectedPersonId:c.pub.selectedPersonId,editorOpen:l.editorOpen,revealPersonInCanvas:b}),we(()=>g.currentTheme.value,P=>{H(P==="su-style"?{layoutMode:"su"}:P==="ou-style"?{layoutMode:"ou"}:{layoutMode:"modern"})},{immediate:!0}),we(()=>c.pub.selectedPerson.value,P=>{P||(l.editorOpen.value=!1)}),we(()=>[c.pub.publication,c.pub.settings],()=>{R.getIsApplyingFileDraft()||(R.hasUnsavedFileChanges.value=!0)},{deep:!0}),(P,f)=>{var w;return y(),k("div",Ki,[Y($r,{"file-name":h(R).draftFileName.value,dirty:h(R).hasUnsavedFileChanges.value,"native-file-access":h(R).nativeFileAccessSupported,"current-theme":h(g).currentTheme.value,"current-username":r.value,"sync-status":h(c).syncStatus.value,onImportJson:h(R).importDraftFromFileEvent,onOpenFile:h(R).openDraftFile,onCreateBlank:h(E).createBlankDraft,onSaveFile:f[0]||(f[0]=F=>h(R).saveDraftFile()),onSaveFileAs:f[1]||(f[1]=F=>h(R).saveDraftFile(!0)),onDownloadSvg:h(R).downloadSvg,onExportJson:h(R).exportJson,onExportShareHtml:h(R).exportShareHtml,onChangeTheme:h(g).setTheme,onLogout:G,onGoBack:G,onViewStats:f[2]||(f[2]=F=>h(s).push({name:"publication-stats"})),onViewTimeline:f[3]||(f[3]=F=>h(s).push({name:"publication-timeline"}))},null,8,["file-name","dirty","native-file-access","current-theme","current-username","sync-status","onImportJson","onOpenFile","onCreateBlank","onDownloadSvg","onExportJson","onExportShareHtml","onChangeTheme"]),Y(bn,{"error-message":h(m).errorMessage.value,"status-message":h(m).statusMessage.value,onDismiss:h(m).dismiss},null,8,["error-message","status-message","onDismiss"]),o("main",Zi,[o("section",Qi,[Y(hi,{"layout-panel-open":h(l).layoutPanelOpen.value,"history-open":h(l).historyOpen.value,"focus-family-label":h(c).pub.focusFamilyLabel.value,"can-return-to-main-branch":!h(c).pub.isRootFamilyFocused.value,"can-undo":h(c).history.canUndo.value,"can-redo":h(c).history.canRedo.value,zoom:h(c).pub.settings.zoom,"has-selected-person":!!h(c).pub.selectedPerson.value,"selected-person-name":((w=h(c).pub.selectedPerson.value)==null?void 0:w.name)||"","selected-person-meta":h(c).pub.selectedPersonMeta.value,"can-focus-selected-branch":!!(h(c).pub.selectedPerson.value&&!h(c).pub.isSelectedBranchFocused.value),settings:h(c).pub.settings,"history-past-count":h(c).history.historyPast.value.length,"history-future-count":h(c).history.historyFuture.value.length,"visible-history-entries":h(c).history.visibleHistoryEntries.value,onToggleLayout:h(l).toggleLayoutPanel,onToggleHistory:h(l).toggleHistoryPanel,onReturnMainBranch:h(E).returnToMainBranch,onResetCanvasView:x,onUndo:h(c).history.undoChange,onRedo:h(c).history.redoChange,onAdjustZoom:S,onUpdateSettings:H,onOpenEditor:p,onRevealSelectedPerson:re,onFocusSelectedBranch:h(E).focusSelectedBranch,onCloseLayout:f[4]||(f[4]=F=>h(l).layoutPanelOpen.value=!1),onCloseHistory:f[5]||(f[5]=F=>h(l).historyOpen.value=!1)},null,8,["layout-panel-open","history-open","focus-family-label","can-return-to-main-branch","can-undo","can-redo","zoom","has-selected-person","selected-person-name","selected-person-meta","can-focus-selected-branch","settings","history-past-count","history-future-count","visible-history-entries","onToggleLayout","onToggleHistory","onReturnMainBranch","onUndo","onRedo","onFocusSelectedBranch"]),Y(St,{ref_key:"canvasRef",ref:v,panX:h(c).viewportPan.value.x,"onUpdate:panX":f[6]||(f[6]=F=>h(c).viewportPan.value.x=F),panY:h(c).viewportPan.value.y,"onUpdate:panY":f[7]||(f[7]=F=>h(c).viewportPan.value.y=F),publication:h(c).pub.publication,settings:h(c).pub.settings,layout:h(c).pub.layout.value,"selected-person-id":h(c).pub.selectedPersonId.value,onUpdateZoom:f[8]||(f[8]=F=>h(c).pub.settings.zoom=F),onSelectPerson:$},null,8,["panX","panY","publication","settings","layout","selected-person-id"]),h(c).pub.selectedPerson.value?(y(),be(vo,{key:0,open:h(l).editorOpen.value,person:h(c).pub.selectedPerson.value,"publication-id":h(c).serverPublicationId.value,suggestion:h(M).editorSelectedPersonSuggestion.value,"lineage-suggestion":h(c).pub.selectedPersonLineageSuggestion.value,details:h(M).editorSelectedPersonDetails.value,spouse:h(c).pub.selectedSpouse.value,parents:h(c).pub.selectedParents.value,children:h(c).pub.selectedChildren.value,"child-items":h(c).pub.selectedChildItems.value,"can-add-spouse":h(c).pub.canAddSpouse.value,"has-complete-parents":h(c).pub.hasCompleteParents.value,"can-swap-adults":h(c).pub.canSwapAdults.value,"is-selected-branch-focused":h(c).pub.isSelectedBranchFocused.value,"can-set-branch-mode":h(c).pub.canSetSelectedBranchMode.value,"branch-mode":h(c).pub.selectedBranchMode.value,"parent-action-label":h(c).pub.parentActionLabel.value,"branch-action-label":h(M).editorBranchActionLabel.value,onClose:A,onSelectPerson:$,onAddSpouse:h(E).addSpouse,onAddChild:h(E).addChild,onAddParents:h(E).addParents,onRemoveSpouse:h(E).removeSpouseRelation,onRemoveParents:h(E).removeParentsRelation,onFocusBranch:h(E).focusSelectedBranch,onUpdateBranchMode:h(E).updateSelectedBranchMode,onSwapPartners:h(E).swapPartnerOrder,onMoveChild:f[9]||(f[9]=F=>h(E).moveChild(F.childId,F.direction)),onUpdatePersonField:h(M).updateSelectedPersonField,onUpdatePersonGender:h(M).updateSelectedPersonGender,onApplyNoteSuggestion:f[10]||(f[10]=F=>h(M).updateSelectedPersonField({field:"note",value:F})),onDeletePerson:h(E).deleteSelectedPerson},null,8,["open","person","publication-id","suggestion","lineage-suggestion","details","spouse","parents","children","child-items","can-add-spouse","has-complete-parents","can-swap-adults","is-selected-branch-focused","can-set-branch-mode","branch-mode","parent-action-label","branch-action-label","onAddSpouse","onAddChild","onAddParents","onRemoveSpouse","onRemoveParents","onFocusBranch","onUpdateBranchMode","onSwapPartners","onUpdatePersonField","onUpdatePersonGender","onDeletePerson"])):D("",!0)])]),Y(Ct,{"model-value":u.value!==null,title:"确认操作",message:u.value||"","confirm-label":"确认",tone:"danger",onConfirm:f[11]||(f[11]=F=>a(!0)),onCancel:f[12]||(f[12]=F=>a(!1)),"onUpdate:modelValue":f[13]||(f[13]=F=>{F||a(!1)})},null,8,["model-value","message"])])}}});export{sl as default};
