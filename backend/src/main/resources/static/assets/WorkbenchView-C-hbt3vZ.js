import{d as ie,k as T,I as Se,x as De,o as y,D as ce,L as Ee,c as x,w as ze,a as t,t as P,j as N,g as W,z as Ke,F as se,i as Y,A as G,H as Qe,M as bt,_ as Pe,y as ve,N as yt,n as ee,O as me,P as et,Q as Re,R as wt,S as kt,U as $t,T as he,h as ge,e as xt,v as St,V as Ue,p as Pt,W as Ct,m,B as tt,C as At,b as It,X as Et,Y as Mt,Z as Ft,$ as $e,a0 as Bt,a1 as Ot,a2 as We,u as Nt,a3 as Tt,a4 as Dt,a5 as zt,a6 as Rt}from"./index-CRL94DfI.js";import{u as Ht}from"./useFeedback-BD4wPpt7.js";const Lt={class:"selector-dialog"},jt={class:"selector-header"},_t={class:"header-main"},Vt={key:0,class:"pub-title"},Ut={class:"selector-content"},Wt={key:0,class:"state-placeholder"},Gt={key:1,class:"state-placeholder error"},Yt={key:2,class:"canvas-container"},Xt={class:"selector-footer"},Jt={class:"selection-status"},qt={class:"selected-name"},Zt={class:"actions"},Kt=["disabled"],Qt=ie({__name:"SubtreeRootSelector",props:{modelValue:{type:Boolean},publicationId:{},publicationTitle:{}},emits:["update:modelValue","selected","cancel"],setup(e,{emit:n}){const s=e,o=n,d=T(!0),c=T(null),r=T(null),u=T(structuredClone(Se)),a=T(null),i=T(null),l=G(()=>a.value||""),v=G(()=>r.value?bt(r.value,u.value):null);function A(k){if(a.value=k,r.value){const p=r.value.people[k];p&&(i.value=p.name)}}async function h(){d.value=!0,c.value=null;try{const k=await Qe(s.publicationId);r.value=k.publication,u.value=structuredClone(k.settings)}catch(k){c.value=k.message||"加载族谱失败"}finally{d.value=!1}}function g(){if(a.value&&r.value){const k=r.value.people[a.value],p=k.dbId;p?(o("selected",p,k.name),o("update:modelValue",!1)):console.error("Missing dbId for person",a.value)}}function b(){o("cancel"),o("update:modelValue",!1)}return De(()=>{s.modelValue&&h()}),(k,p)=>(y(),ce(Ee,{to:"body"},[e.modelValue?(y(),x("div",{key:0,class:"selector-overlay",onClick:ze(b,["self"])},[t("div",Lt,[t("header",jt,[t("div",_t,[p[0]||(p[0]=t("h3",null,"选择子树起点",-1)),e.publicationTitle?(y(),x("span",Vt,P(e.publicationTitle),1)):N("",!0)]),p[1]||(p[1]=t("p",{class:"header-hint"}," 请在下方预览图中选择一个人物作为合并或查看的起点。选定后，将仅包含该人物及其后代。 ",-1))]),t("main",Ut,[d.value?(y(),x("div",Wt,[...p[2]||(p[2]=[t("div",{class:"spinner"},null,-1),t("p",null,"正在加载族谱数据...",-1)])])):c.value?(y(),x("div",Gt,[t("p",null,P(c.value),1),t("button",{class:"retry-btn",onClick:h},"重试")])):r.value&&v.value?(y(),x("div",Yt,[W(Ke,{publication:r.value,settings:u.value,layout:v.value,selectedPersonId:l.value,panX:0,panY:0,onSelectPerson:A},null,8,["publication","settings","layout","selectedPersonId"])])):N("",!0)]),t("footer",Xt,[t("div",Jt,[i.value?(y(),x(se,{key:0},[p[3]||(p[3]=Y(" 已选中：",-1)),t("span",qt,P(i.value),1)],64)):(y(),x(se,{key:1},[Y(" 未选择任何人物 ")],64))]),t("div",Zt,[t("button",{class:"action-btn cancel",onClick:b},"取消"),t("button",{class:"action-btn confirm",disabled:!a.value,onClick:g}," 确认选择 ",8,Kt)])])])])):N("",!0)]))}}),en=Pe(Qt,[["__scopeId","data-v-5db86803"]]),tn={class:"branch-mount-panel"},nn={class:"branch-mount-panel__header"},sn={class:"branch-mount-toggle"},on=["checked"],an={class:"branch-mount-panel__grid"},ln={class:"branch-mount-field"},rn=["disabled"],dn={key:0,class:"custom-select__options"},un={key:0,class:"custom-select__group"},cn=["onClick"],pn={key:1,class:"custom-select__group"},fn=["onClick"],vn={key:0,class:"subtree-config"},mn={class:"subtree-info"},hn={class:"root-display"},gn={key:0,class:"root-name"},bn={key:1,class:"root-none"},yn={class:"branch-mount-meta"},wn={key:0,class:"branch-mount-panel__feedback"},kn={key:0,class:"advanced-merge-zone"},$n=["disabled"],xn=ie({__name:"BranchMountManager",props:{person:{},publicationId:{}},setup(e){const n=e,s=Re("publication-context"),o=T([]),d=T(!1),c=T(!1),r=T(""),u=T(!1),a=T(!1),i=T(""),l=T(!1),v=G(()=>o.value.filter(f=>f.id!==n.publicationId&&f.accessRole!=="VIEWER")),A=G(()=>{const f={OWNER:[],EDITOR:[]};return v.value.forEach($=>{f[$.accessRole]?f[$.accessRole].push($):(f.OTHER||(f.OTHER=[]),f.OTHER.push($))}),f}),h=G(()=>v.value.find(f=>String(f.id)===i.value)??null),g=G(()=>n.person.mountPointTarget??null),b=G(()=>{var f;return((f=g.value)==null?void 0:f.rootPersonName)??""});function k(f){i.value=String(f.id),C(f),l.value=!1}function p(){i.value="",C(null),l.value=!1}ve(()=>{var f;return(f=n.person.mountPointTarget)==null?void 0:f.publicationId},f=>{i.value=f?String(f):""},{immediate:!0});async function S(){if(n.publicationId){d.value=!0;try{o.value=await wt()}finally{d.value=!1}}}function C(f){const $=g.value;if(!f){n.person.isMountPoint=!1,n.person.mountPointTarget=void 0,r.value="已清除挂载目标。";return}n.person.isMountPoint=!0,n.person.mountPointTarget={publicationId:f.id,publicationTitle:f.title,rootPersonId:$==null?void 0:$.rootPersonId,rootPersonName:$==null?void 0:$.rootPersonName},r.value=`已选择目标族谱：${f.title}`}function w(f,$){n.person.mountPointTarget&&(n.person.mountPointTarget.rootPersonId=f,n.person.mountPointTarget.rootPersonName=$,r.value=`已设定子树起点：${$}`)}function z(){n.person.mountPointTarget&&(n.person.mountPointTarget.rootPersonId=void 0,n.person.mountPointTarget.rootPersonName=void 0,r.value="已清除子树起点，将执行全量合并。")}function H(f){if(r.value="",!f){n.person.isMountPoint=!1,n.person.mountPointTarget=void 0,i.value="",r.value="已关闭挂载点。";return}const $=h.value??v.value[0]??null;if(!$){alert("当前没有可挂载的其他自有族谱。");return}i.value=String($.id),C($)}async function X(){if(!n.publicationId||!s)return;const f=await Qe(n.publicationId);s.pub.replaceReactiveObject(s.pub.publication,f.publication),s.pub.replaceReactiveObject(s.pub.settings,f.settings),s.pub.selectedPersonId.value=f.publication.people[n.person.id]?n.person.id:s.pub.getDefaultSelectedPersonId(f.publication)}async function le(){var f;if(!n.publicationId){alert("请先保存族谱到服务器，再执行物理合并。");return}if(!n.person.isMountPoint||!((f=n.person.mountPointTarget)!=null&&f.publicationId)){alert("请先将当前人物设置为有效挂载点。");return}u.value=!0}async function K(){var f;if(!(!n.publicationId||!n.person.isMountPoint||!((f=n.person.mountPointTarget)!=null&&f.publicationId))){u.value=!1,c.value=!0,r.value="";try{await kt(n.publicationId,n.person.id),await X(),r.value="物理合并已完成。"}catch($){console.error("branch merge failed",$),alert("物理合并失败，请检查权限或稍后重试。")}finally{c.value=!1}}}const M=f=>{f.target.closest(".custom-select")||(l.value=!1)};return De(()=>{S(),window.addEventListener("click",M)}),yt(()=>{window.removeEventListener("click",M)}),(f,$)=>{var F,te,de,ue;return y(),x(se,null,[t("section",tn,[t("div",nn,[$[6]||($[6]=t("div",null,[t("p",{class:"branch-mount-panel__eyebrow"},"Branch Mount"),t("h4",null,"分支挂载与物理合并")],-1)),t("label",sn,[t("input",{checked:!!e.person.isMountPoint,type:"checkbox",onChange:$[0]||($[0]=j=>H(j.target.checked))},null,40,on),t("span",null,P(e.person.isMountPoint?"已启用":"未启用"),1)])]),t("div",an,[t("div",ln,[$[11]||($[11]=t("span",null,"目标族谱",-1)),t("div",{class:ee(["custom-select",{"is-open":l.value}])},[t("button",{class:"custom-select__trigger",type:"button",disabled:d.value||!v.value.length,onClick:$[1]||($[1]=j=>l.value=!l.value)},[t("span",null,P(((F=h.value)==null?void 0:F.title)||"选择一个目标族谱"),1),$[7]||($[7]=t("svg",{class:"chevron",fill:"none",height:"12",stroke:"currentColor","stroke-width":"2",viewBox:"0 0 24 24",width:"12"},[t("polyline",{points:"6 9 12 15 18 9"})],-1))],8,rn),l.value?(y(),x("div",dn,[A.value.OWNER.length?(y(),x("div",un,[$[8]||($[8]=t("label",null,"我的族谱",-1)),(y(!0),x(se,null,me(A.value.OWNER,j=>(y(),x("button",{key:j.id,class:"custom-select__option",onClick:pe=>k(j)},P(j.title),9,cn))),128))])):N("",!0),A.value.EDITOR.length?(y(),x("div",pn,[$[9]||($[9]=t("label",null,"共享 - 编辑",-1)),(y(!0),x(se,null,me(A.value.EDITOR,j=>(y(),x("button",{key:j.id,class:"custom-select__option",onClick:pe=>k(j)},P(j.title),9,fn))),128))])):N("",!0),t("button",{class:"custom-select__option custom-select__option--clear",onClick:p}," 清除选择 ")])):N("",!0)],2),e.person.isMountPoint&&h.value?(y(),x("div",vn,[t("div",mn,[$[10]||($[10]=t("span",{class:"label"},"子树起点",-1)),t("div",hn,[b.value?(y(),x("strong",gn,P(b.value),1)):(y(),x("em",bn,"未指定（全量）")),b.value?(y(),x("button",{key:2,class:"clear-root-btn",title:"清除起点",onClick:z}," × ")):N("",!0)])]),t("button",{class:"select-root-btn",type:"button",onClick:$[2]||($[2]=j=>a.value=!0)},P(b.value?"更换起点":"视觉化指定起点"),1)])):N("",!0)]),t("article",yn,[$[12]||($[12]=t("span",null,"当前状态",-1)),t("strong",null,P(e.person.isMountPoint?"挂载点已建立":"普通人物节点"),1),t("em",null,P(((te=e.person.mountPointTarget)==null?void 0:te.publicationTitle)||"尚未选择目标族谱"),1)])]),r.value?(y(),x("p",wn,P(r.value),1)):N("",!0)]),e.person.isMountPoint&&i.value?(y(),x("section",kn,[$[13]||($[13]=t("div",{class:"advanced-merge-zone__header"},[t("svg",{fill:"none",height:"18",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"2",viewBox:"0 0 24 24",width:"18"},[t("path",{d:"M11 17l5 5 5-5M11 7l5-5 5 5M16 22V2M8 2H1.5a.5.5 0 0 0-.5.5v19a.5.5 0 0 0 .5.5H8M4 12h4"})]),t("strong",null,"高级合并操作")],-1)),t("p",null," 物理合并会不可逆地将目标族谱“"+P((de=h.value)==null?void 0:de.title)+"”的数据副本直接写入当前稿件。操作完成后，该挂载点将被清除。 ",1),t("button",{class:"relation-btn relation-btn--accent",type:"button",disabled:c.value,onClick:le},P(c.value?"正在物理合并...":"确认执行物理合并"),9,$n)])):N("",!0),W(et,{modelValue:u.value,title:"物理合并确认",message:"物理合并会把目标族谱当前快照复制进当前族谱，并清除这个挂载点。确定继续吗？",confirmLabel:"确认合并",tone:"danger",onConfirm:K,onCancel:$[3]||($[3]=j=>u.value=!1),"onUpdate:modelValue":$[4]||($[4]=j=>{j||(u.value=!1)})},null,8,["modelValue"]),a.value?(y(),ce(en,{key:1,modelValue:a.value,"onUpdate:modelValue":$[5]||($[5]=j=>a.value=j),publicationId:Number(i.value),publicationTitle:(ue=h.value)==null?void 0:ue.title,onSelected:w},null,8,["modelValue","publicationId","publicationTitle"])):N("",!0)],64)}}}),Sn=Pe(xn,[["__scopeId","data-v-3a1005b8"]]);async function Pn(e,n,s){const o=new FormData;return o.append("file",s),o.append("personId",e),o.append("publicationId",String(n)),(await $t.post("/photos",o,{headers:{"Content-Type":"multipart/form-data"}})).data.data.id}function Cn(e){return`/api/photos/${e}`}const An={key:0,class:"editor-overlay"},In={class:"editor-sheet-panel"},En={class:"editor-sheet-panel__header"},Mn={class:"editor-focus"},Fn={class:"editor-focus__title",style:{display:"flex","align-items":"center",gap:"16px"}},Bn={class:"avatar-upload",style:{position:"relative",width:"64px",height:"64px","border-radius":"50%",overflow:"hidden",background:"rgba(169, 110, 53, 0.05)",border:"1px solid var(--border-color)","flex-shrink":"0",display:"flex","align-items":"center","justify-content":"center",cursor:"pointer"}},On=["src"],Nn={key:1,style:{"font-size":"28px",opacity:"0.5"}},Tn={style:{flex:"1"}},Dn={class:"editor-focus__hint"},zn={class:"editor-focus__grid"},Rn={class:"relationship-panel"},Hn={class:"relationship-panel__header"},Ln={class:"relationship-panel__badge"},jn={class:"relationship-grid"},_n={class:"relationship-card"},Vn={class:"relationship-card"},Un={class:"relationship-card relationship-card--wide"},Wn={class:"relationship-section"},Gn={class:"relationship-actions"},Yn=["disabled"],Xn=["disabled"],Jn=["disabled"],qn={class:"relationship-section"},Zn={class:"relationship-actions"},Kn=["disabled"],Qn=["disabled"],es={class:"relationship-section"},ts={class:"relationship-actions"},ns={class:"relationship-section relationship-section--branch"},ss={class:"branch-actions"},os=["disabled"],as={key:0,class:"relationship-section relationship-section--branch"},ls={class:"relationship-actions"},rs={key:1,class:"child-order-panel"},is={class:"child-order-list"},ds=["onClick"],us={class:"child-order-item__actions"},cs=["disabled","onClick"],ps=["disabled","onClick"],fs={class:"editor-form"},vs={class:"field"},ms=["value"],hs={class:"field"},gs=["value"],bs={class:"field"},ys=["value"],ws={class:"field"},ks=["value"],$s={class:"field"},xs=["value"],Ss={class:"field"},Ps=["value"],Cs={class:"field"},As=["value"],Is={class:"field"},Es=["value"],Ms={key:0,class:"lineage-suggestion"},Fs={class:"danger-zone"},Bs=ie({__name:"PersonEditorDrawer",props:{open:{type:Boolean},person:{},publicationId:{},suggestion:{},lineageSuggestion:{},details:{},spouse:{},parents:{},children:{},childItems:{},canAddSpouse:{type:Boolean},hasCompleteParents:{type:Boolean},canSwapAdults:{type:Boolean},isSelectedBranchFocused:{type:Boolean},canSetBranchMode:{type:Boolean},branchMode:{},parentActionLabel:{},branchActionLabel:{}},emits:["close","select-person","add-spouse","add-child","add-parents","remove-spouse","remove-parents","focus-branch","update-branch-mode","swap-partners","move-child","update-person-field","update-person-gender","apply-note-suggestion","delete-person"],setup(e,{emit:n}){const s=e,o=n;function d(u,a){o("update-person-field",{field:u,value:a.target.value})}function c(u){o("update-person-gender",u.target.value)}async function r(u){const a=u.target;if(!a.files||a.files.length===0)return;if(!s.publicationId){alert("请先保存族谱到服务器后再上传照片");return}const i=a.files[0];try{const l=await Pn(s.person.id,s.publicationId,i);o("update-person-field",{field:"avatarUrl",value:Cn(l)})}catch(l){console.error("上传出错",l),alert("上传出错，请检查后端服务是否启动")}}return(u,a)=>(y(),ce(he,{name:"editor-sheet"},{default:ge(()=>{var i;return[e.open?(y(),x("div",An,[t("button",{class:"editor-overlay__scrim",type:"button","aria-label":"关闭人物编辑",onClick:a[0]||(a[0]=l=>u.$emit("close"))}),t("aside",In,[t("div",En,[t("div",null,[a[21]||(a[21]=t("p",{class:"editor-sheet-panel__eyebrow"},"卷宗编修",-1)),t("h3",null,P(e.person.name),1)]),t("button",{class:"editor-sheet-panel__close",type:"button",onClick:a[1]||(a[1]=l=>u.$emit("close"))},"合卷")]),t("div",Mn,[t("div",Fn,[t("div",Bn,[e.person.avatarUrl?(y(),x("img",{key:0,src:e.person.avatarUrl,style:{width:"100%",height:"100%","object-fit":"contain"}},null,8,On)):(y(),x("div",Nn,"👤")),t("input",{type:"file",accept:"image/*",style:{position:"absolute",inset:"0",opacity:"0",cursor:"pointer"},title:"上传照片",onChange:r},null,32)]),t("div",Tn,[a[22]||(a[22]=t("p",null,"当前传主",-1)),t("h3",null,P(e.person.name),1)]),t("span",null,P([e.person.titleName,e.person.clan,e.person.note||e.lineageSuggestion].filter(Boolean).join(" · ")||"尚未定论"),1)]),t("p",Dn,P(e.suggestion),1),t("div",zn,[(y(!0),x(se,null,me(e.details,l=>(y(),x("div",{key:l.label,class:"editor-mini-card"},[t("span",null,P(l.label),1),t("strong",null,P(l.value),1)]))),128))])]),t("section",Rn,[t("div",Hn,[a[23]||(a[23]=t("div",null,[t("p",{class:"relationship-panel__eyebrow"},"宗法关系"),t("h4",null,"世系编排")],-1)),t("span",Ln,P(e.children.length)+" 位子嗣",1)]),t("div",jn,[t("article",_n,[a[24]||(a[24]=t("span",null,"配偶",-1)),t("strong",null,P(((i=e.spouse)==null?void 0:i.name)||"未建立配偶关系"),1)]),t("article",Vn,[a[25]||(a[25]=t("span",null,"父母",-1)),t("strong",null,P(e.parents.length?e.parents.map(l=>l.name).join(" · "):"未建立父母关系"),1)]),t("article",Un,[a[26]||(a[26]=t("span",null,"子女",-1)),t("strong",null,P(e.children.length?e.children.map(l=>l.name).join(" · "):"暂无子女"),1)])]),t("div",Wn,[a[27]||(a[27]=t("div",{class:"relationship-section__header"},[t("strong",null,"配偶关系"),t("span",null,"建立或调整夫妻位置")],-1)),t("div",Gn,[t("button",{class:"relation-btn",type:"button",disabled:!e.canAddSpouse,onClick:a[2]||(a[2]=l=>u.$emit("add-spouse"))},"缔结姻亲",8,Yn),t("button",{class:"relation-btn",type:"button",disabled:!e.canSwapAdults,onClick:a[3]||(a[3]=l=>u.$emit("swap-partners"))},"调配尊卑位次",8,Xn),t("button",{class:"relation-btn relation-btn--danger relationship-actions__wide",type:"button",disabled:!e.spouse,onClick:a[4]||(a[4]=l=>u.$emit("remove-spouse"))}," 断绝姻缘 ",8,Jn)])]),t("div",qn,[a[28]||(a[28]=t("div",{class:"relationship-section__header"},[t("strong",null,"父母关系"),t("span",null,"补齐上代信息或解除引用")],-1)),t("div",Zn,[t("button",{class:"relation-btn",type:"button",disabled:e.hasCompleteParents,onClick:a[5]||(a[5]=l=>u.$emit("add-parents"))},P(e.parentActionLabel),9,Kn),t("button",{class:"relation-btn relation-btn--danger",type:"button",disabled:!e.parents.length,onClick:a[6]||(a[6]=l=>u.$emit("remove-parents"))}," 斩断血脉渊源 ",8,Qn)])]),t("div",es,[a[29]||(a[29]=t("div",{class:"relationship-section__header"},[t("strong",null,"子女关系"),t("span",null,"按性别新增，并可调整排序")],-1)),t("div",ts,[t("button",{class:"relation-btn",type:"button",onClick:a[7]||(a[7]=l=>u.$emit("add-child","male"))},"录入男丁"),t("button",{class:"relation-btn",type:"button",onClick:a[8]||(a[8]=l=>u.$emit("add-child","female"))},"录入女眷")])]),t("div",ns,[a[30]||(a[30]=t("div",{class:"relationship-section__header"},[t("strong",null,"谱系查看"),t("span",null,"切换到当前人物所在宗支")],-1)),t("div",ss,[t("button",{class:"relation-btn relation-btn--accent",type:"button",disabled:e.isSelectedBranchFocused,onClick:a[9]||(a[9]=l=>u.$emit("focus-branch"))},P(e.branchActionLabel),9,os)])]),e.canSetBranchMode?(y(),x("div",as,[a[31]||(a[31]=t("div",{class:"relationship-section__header"},[t("strong",null,"婚配归属"),t("span",null,"女性成家后可区分外嫁或招婿")],-1)),t("div",ls,[t("button",{class:ee(["relation-btn",{"relation-btn--accent":e.branchMode==="married-out"}]),type:"button",onClick:a[10]||(a[10]=l=>u.$emit("update-branch-mode","married-out"))}," 适人 ",2),t("button",{class:ee(["relation-btn",{"relation-btn--accent":e.branchMode==="uxorilocal"}]),type:"button",onClick:a[11]||(a[11]=l=>u.$emit("update-branch-mode","uxorilocal"))}," 赘婿 ",2)])])):N("",!0),e.childItems.length?(y(),x("div",rs,[a[32]||(a[32]=t("div",{class:"child-order-panel__header"},[t("span",null,"子嗣长幼"),t("strong",null,"左右顺序会影响画卷排布")],-1)),t("div",is,[(y(!0),x(se,null,me(e.childItems,l=>(y(),x("article",{key:l.person.id,class:"child-order-item"},[t("button",{class:"child-order-item__main",type:"button",onClick:v=>u.$emit("select-person",l.person.id)},[t("strong",null,P(l.index+1)+". "+P(l.person.name),1),t("span",null,P(l.person.titleName||l.person.note||"子女"),1)],8,ds),t("div",us,[t("button",{class:"relation-icon-btn",type:"button",disabled:l.isFirst,onClick:v=>u.$emit("move-child",{childId:l.person.id,direction:-1})}," ← ",8,cs),t("button",{class:"relation-icon-btn",type:"button",disabled:l.isLast,onClick:v=>u.$emit("move-child",{childId:l.person.id,direction:1})}," → ",8,ps)])]))),128))])])):N("",!0)]),W(Sn,{person:e.person,publicationId:e.publicationId},null,8,["person","publicationId"]),t("div",fs,[t("label",vs,[a[34]||(a[34]=t("span",null,"性别",-1)),t("select",{value:e.person.gender,onChange:c},[...a[33]||(a[33]=[t("option",{value:"male"},"男",-1),t("option",{value:"female"},"女",-1),t("option",{value:"unknown"},"未定",-1)])],40,ms)]),t("label",hs,[a[35]||(a[35]=t("span",null,"姓名",-1)),t("input",{value:e.person.name,type:"text",onInput:a[12]||(a[12]=l=>d("name",l))},null,40,gs)]),t("label",bs,[a[36]||(a[36]=t("span",null,"出生",-1)),t("input",{value:e.person.birth,type:"text",placeholder:"如：1978年十月初八",onInput:a[13]||(a[13]=l=>d("birth",l))},null,40,ys)]),t("label",ws,[a[37]||(a[37]=t("span",null,"称号",-1)),t("input",{value:e.person.titleName,type:"text",placeholder:"如：唐太宗 / 宣统帝 / 皇太子",onInput:a[14]||(a[14]=l=>d("titleName",l))},null,40,ks)]),t("label",$s,[a[38]||(a[38]=t("span",null,"宗族",-1)),t("input",{value:e.person.clan,type:"text",placeholder:"如：陇西李氏 / 爱新觉罗氏",onInput:a[15]||(a[15]=l=>d("clan",l))},null,40,xs)]),t("label",Ss,[a[39]||(a[39]=t("span",null,"卒年",-1)),t("input",{value:e.person.death,type:"text",placeholder:"如：2022年五月",onInput:a[16]||(a[16]=l=>d("death",l))},null,40,Ps)]),t("label",Cs,[a[40]||(a[40]=t("span",null,"年龄",-1)),t("input",{value:e.person.age,type:"text",placeholder:"支持直接填写 71岁",onInput:a[17]||(a[17]=l=>d("age",l))},null,40,As)]),t("label",Is,[a[41]||(a[41]=t("span",null,"注记",-1)),t("input",{value:e.person.note,type:"text",placeholder:"如：长房 / 次子 / 配偶",onInput:a[18]||(a[18]=l=>d("note",l))},null,40,Es)]),e.lineageSuggestion?(y(),x("div",Ms,[t("span",null,"史馆推演："+P(e.lineageSuggestion),1),e.person.note!==e.lineageSuggestion?(y(),x("button",{key:0,type:"button",onClick:a[19]||(a[19]=l=>u.$emit("apply-note-suggestion",e.lineageSuggestion))}," 落笔注记 ")):N("",!0)])):N("",!0)]),t("section",Fs,[a[42]||(a[42]=t("div",null,[t("p",null,"非常行事"),t("span",null,"除名后，此人在所有姻亲、血脉网络中的关联将一并抹除。")],-1)),t("button",{class:"relation-btn relation-btn--danger",type:"button",onClick:a[20]||(a[20]=l=>u.$emit("delete-person"))},"从宗谱除名")])])])):N("",!0)]}),_:1}))}}),Os={class:"export-dialog"},Ns={class:"tabs"},Ts={key:0,class:"tab-content"},Ds={class:"actions"},zs=["disabled"],Rs={key:1,class:"tab-content"},Hs={class:"options-group"},Ls={key:0,class:"strength-indicator"},js={class:"strength-bar"},_s={class:"actions"},Vs=["disabled"],Us=ie({__name:"ExportDialog",props:{modelValue:{type:Boolean},isProcessing:{type:Boolean}},emits:["update:modelValue","export-svg","export-share-html"],setup(e,{emit:n}){const s=n,o=T("svg"),d=T(""),c=G(()=>{const u=d.value;if(!u)return null;let a=0;return u.length>=6&&a++,u.length>=10&&a++,/[a-z]/.test(u)&&/[A-Z]/.test(u)&&a++,/\d/.test(u)&&a++,/[^a-zA-Z0-9]/.test(u)&&a++,a<=1?{level:"weak",label:"弱",color:"#e74c3c",percent:25}:a<=2?{level:"fair",label:"一般",color:"#f39c12",percent:50}:a<=3?{level:"medium",label:"中等",color:"#e67e22",percent:70}:{level:"strong",label:"强",color:"#27ae60",percent:100}});function r(){s("export-share-html",{password:d.value})}return(u,a)=>e.modelValue?(y(),x("div",{key:0,class:"export-dialog-backdrop",onClick:a[5]||(a[5]=ze(i=>u.$emit("update:modelValue",!1),["self"]))},[t("div",Os,[t("button",{class:"close-btn",onClick:a[0]||(a[0]=i=>u.$emit("update:modelValue",!1))},"×"),a[10]||(a[10]=t("header",{class:"dialog-header"},[t("span",{class:"dialog-eyebrow"},"导出"),t("h2",null,"导出与分享")],-1)),t("div",Ns,[t("button",{class:ee(["tab-btn",{active:o.value==="svg"}]),onClick:a[1]||(a[1]=i=>o.value="svg")}," 矢量 SVG ",2),t("button",{class:ee(["tab-btn",{active:o.value==="share"}]),onClick:a[2]||(a[2]=i=>o.value="share")}," 分享网页 ",2)]),o.value==="svg"?(y(),x("div",Ts,[a[6]||(a[6]=t("p",{class:"description"},"导出为无限放大的矢量文件。这是最保真的格式，适合专业排版、印刷或作为原始备份。",-1)),t("div",Ds,[t("button",{class:"btn btn--primary",disabled:e.isProcessing,onClick:a[3]||(a[3]=i=>u.$emit("export-svg"))}," 立即下载矢量 SVG ",8,zs)])])):N("",!0),o.value==="share"?(y(),x("div",Rs,[a[9]||(a[9]=t("p",{class:"description"},"生成一个独立的 HTML 文件，无需服务器即可在任何浏览器中打开查看交互式族谱。支持可选的密码保护。",-1)),t("div",Hs,[a[7]||(a[7]=t("label",{class:"field-label"},"密码保护（可选）",-1)),xt(t("input",{"onUpdate:modelValue":a[4]||(a[4]=i=>d.value=i),type:"password",placeholder:"留空则不加密",class:"share-password-input"},null,512),[[St,d.value]]),a[8]||(a[8]=t("p",{class:"field-hint"},"设置密码后，打开文件时需要输入密码才能查看内容。",-1)),c.value?(y(),x("div",Ls,[t("div",js,[t("div",{class:"strength-fill",style:Ue({width:c.value.percent+"%",backgroundColor:c.value.color})},null,4)]),t("span",{class:"strength-label",style:Ue({color:c.value.color})}," 密码强度："+P(c.value.label),5)])):N("",!0)]),t("div",_s,[t("button",{class:"btn btn--primary",disabled:e.isProcessing,onClick:r},P(e.isProcessing?"正在生成...":"生成分享网页"),9,Vs)])])):N("",!0)])])):N("",!0)}}),Ws=Pe(Us,[["__scopeId","data-v-75670d97"]]),Gs={class:"topbar"},Ys={class:"topbar__intro"},Xs={class:"sync-icon"},Js={key:0,class:"spinner",width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round"},qs={key:1,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},Zs={key:2,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},Ks={key:3,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},Qs={key:4,width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"3","stroke-linecap":"round","stroke-linejoin":"round"},eo={class:"sync-text"},to={class:"sync-text sync-text--resolved"},no={class:"topbar__actions","aria-label":"工作台操作"},so={class:"topbar__action-strip"},oo={class:"dropdown"},ao={class:"dropdown-menu"},lo={class:"dropdown"},ro={class:"dropdown-menu"},io={class:"user-dropdown-container"},uo={class:"avatar-ring"},co={class:"avatar-text"},po={class:"username"},fo={key:0,class:"user-popover"},vo={class:"popover-header"},mo={class:"popover-account"},ho={class:"glass-sheet collab-sheet"},go={class:"sheet-header"},bo={class:"sheet-body"},yo=ie({__name:"WorkbenchHeader",props:{fileName:{default:""},dirty:{type:Boolean,default:!1},nativeFileAccess:{type:Boolean,default:!1},currentTheme:{default:"parchment"},currentUsername:{default:""},syncStatus:{default:"saved"}},emits:["import-json","open-file","create-blank","save-file","save-file-as","download-svg","print-publication","export-json","export-share-html","change-theme","logout","go-back","view-stats","view-timeline"],setup(e,{emit:n}){const s=T(null),o=T(!1),d=T(!1),c=T(!1),r=tt(),u=Re("publication-context"),a=G(()=>{var k;return((k=u==null?void 0:u.currentAccessRole)==null?void 0:k.value)==="OWNER"});function i(){var k;(k=s.value)==null||k.click()}function l(k){o.value=!1,A("export-share-html",k.password)}const v=e,A=n,h=T(!1),g=G(()=>(v.currentUsername||"总").charAt(0).toUpperCase());function b(){h.value=!h.value}return(k,p)=>(y(),x("header",Gs,[t("input",{ref_key:"fileInputRef",ref:s,type:"file",accept:".json",style:{display:"none"},onChange:p[0]||(p[0]=S=>A("import-json",S))},null,544),t("div",Ys,[t("h1",{class:"clickable-title",onClick:p[1]||(p[1]=S=>A("go-back"))},"无涯画布"),t("div",{class:ee(["sync-status",[`sync-status--${e.syncStatus}`]])},[t("span",Xs,[e.syncStatus==="syncing"?(y(),x("svg",Js,[...p[13]||(p[13]=[t("path",{d:"M21 12a9 9 0 1 1-6.219-8.56"},null,-1)])])):e.syncStatus==="saved"?(y(),x("svg",qs,[...p[14]||(p[14]=[t("polyline",{points:"20 6 9 17 4 12"},null,-1)])])):e.syncStatus==="error"?(y(),x("svg",Zs,[...p[15]||(p[15]=[t("circle",{cx:"12",cy:"12",r:"10"},null,-1),t("line",{x1:"12",y1:"8",x2:"12",y2:"12"},null,-1),t("line",{x1:"12",y1:"16",x2:"12.01",y2:"16"},null,-1)])])):e.syncStatus==="conflict"?(y(),x("svg",Ks,[...p[16]||(p[16]=[t("path",{d:"M12 9v4"},null,-1),t("path",{d:"M12 17h.01"},null,-1),t("path",{d:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"},null,-1)])])):(y(),x("svg",Qs,[...p[17]||(p[17]=[t("circle",{cx:"12",cy:"12",r:"1"},null,-1)])]))]),t("span",eo,P(e.syncStatus==="syncing"?"正在封存卷宗...":e.syncStatus==="saved"?"卷宗已妥善归档":e.syncStatus==="error"?"归档遇挫":"等待封存..."),1),t("span",to,P(e.syncStatus==="syncing"?"正在封存卷宗...":e.syncStatus==="saved"?"卷宗已妥善归档":e.syncStatus==="error"?"归档遇挫":e.syncStatus==="conflict"?"数据发生冲突，请刷新后继续":"等待封存..."),1)],2)]),t("div",no,[t("div",so,[t("div",oo,[p[19]||(p[19]=t("button",{class:"btn btn--secondary dropdown-trigger",type:"button"},[Y("考据 "),t("span",{class:"caret"},"▾")],-1)),t("div",ao,[t("button",{class:"dropdown-item",type:"button",onClick:p[2]||(p[2]=S=>A("view-stats"))},"宗族纪略"),t("button",{class:"dropdown-item",type:"button",onClick:p[3]||(p[3]=S=>A("view-timeline"))},"家族编年史"),p[18]||(p[18]=t("div",{class:"dropdown-divider"},null,-1)),t("button",{class:"dropdown-item",type:"button",onClick:i},"引入前朝旧卷 (JSON)")])]),t("div",lo,[p[21]||(p[21]=t("button",{class:"btn btn--secondary dropdown-trigger",type:"button"},[Y("付梓 "),t("span",{class:"caret"},"▾")],-1)),t("div",ro,[t("button",{class:"dropdown-item",type:"button",onClick:p[4]||(p[4]=S=>o.value=!0)},"付梓发行 (高精影印/PDF)"),p[20]||(p[20]=t("div",{class:"dropdown-divider"},null,-1)),t("button",{class:"dropdown-item",type:"button",onClick:p[5]||(p[5]=S=>A("download-svg"))},"拓印长卷 (SVG)"),t("button",{class:"dropdown-item",type:"button",onClick:p[6]||(p[6]=S=>A("export-json"))},"封存卷宗草本 (JSON)")])]),a.value?(y(),x("button",{key:0,class:"btn btn--secondary",type:"button",onClick:p[7]||(p[7]=S=>d.value=!0)}," 同修编委 ")):N("",!0),p[25]||(p[25]=t("span",{class:"topbar__action-divider","aria-hidden":"true"},null,-1)),W(Pt,{currentTheme:e.currentTheme,onChangeTheme:p[8]||(p[8]=S=>A("change-theme",S))},null,8,["currentTheme"]),p[26]||(p[26]=t("span",{class:"topbar__action-divider","aria-hidden":"true"},null,-1)),t("div",io,[t("button",{class:ee(["user-profile-pill",{"is-open":h.value}]),onClick:b},[t("div",uo,[t("span",co,P(g.value),1)]),t("span",po,P(e.currentUsername||"总编"),1),(y(),x("svg",{class:ee(["dropdown-chevron",{rotated:h.value}]),width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[...p[22]||(p[22]=[t("path",{d:"m6 9 6 6 6-6"},null,-1)])],2))],2),W(he,{name:"glass-pop"},{default:ge(()=>[h.value?(y(),x("div",fo,[t("div",vo,[p[23]||(p[23]=t("span",{class:"popover-title"},"当前账号",-1)),t("div",mo,P(e.currentUsername||"总编"),1)]),p[24]||(p[24]=t("div",{class:"popover-menu"},[t("div",{class:"popover-hint"},"您正在编辑无限画布")],-1))])):N("",!0)]),_:1})])])]),(y(),ce(Ee,{to:"body"},[W(Ws,{modelValue:o.value,"onUpdate:modelValue":p[9]||(p[9]=S=>o.value=S),isProcessing:c.value,onExportSvg:p[10]||(p[10]=S=>{A("download-svg"),o.value=!1}),onExportShareHtml:l},null,8,["modelValue","isProcessing"])])),(y(),ce(Ee,{defer:"",to:"body"},[W(he,{name:"fade"},{default:ge(()=>[d.value?(y(),x("div",{key:0,class:"glass-modal-overlay",onClick:p[12]||(p[12]=ze(S=>d.value=!1,["self"]))},[t("div",ho,[t("header",go,[p[27]||(p[27]=t("div",{class:"header-content"},[t("div",{class:"header-icon"},"👥"),t("div",{class:"header-text"},[t("h2",{class:"sheet-title"},"协作者管理"),t("p",{class:"sheet-subtitle"},"管理谁可以查看或编辑您的族谱")])],-1)),t("button",{class:"close-btn",onClick:p[11]||(p[11]=S=>d.value=!1)},"×")]),t("div",bo,[W(Ct,{publicationId:Number(m(r).params.id)},null,8,["publicationId"])])])])):N("",!0)]),_:1})]))]))}}),wo=Pe(yo,[["__scopeId","data-v-dd9306d2"]]),ko={class:"floating-toolbar floating-toolbar--left","aria-label":"画布工具"},$o={class:"tool-switcher",role:"group","aria-label":"面板切换"},xo=["aria-pressed"],So=["aria-pressed"],Po={class:"floating-toolbar floating-toolbar--right"},Co={key:0,class:"status-chip status-chip--compact"},Ao={key:1,class:"selection-chip"},Io={class:"selection-chip__content"},Eo={class:"selection-chip__header"},Mo={class:"selection-chip__family"},Fo={class:"selection-chip__actions"},Bo=["disabled"],Oo={class:"zoom-control"},No={key:0,class:"floating-panel floating-panel--left"},To={class:"floating-panel__header"},Do={class:"field"},zo=["value"],Ro={class:"field"},Ho=["value"],Lo={class:"field"},jo=["value"],_o={class:"field"},Vo=["value"],Uo={class:"field"},Wo=["value"],Go={class:"toggle-row"},Yo={class:"toggle"},Xo=["checked"],Jo={class:"toggle"},qo=["checked"],Zo={class:"toggle"},Ko=["checked"],Qo={class:"toggle"},ea=["checked"],ta={key:0,class:"floating-panel floating-panel--left floating-panel--history"},na={class:"floating-panel__header"},sa={class:"history-panel__summary"},oa={class:"history-panel__actions"},aa=["disabled"],la=["disabled"],ra={key:0,class:"history-list"},ia={class:"history-entry__meta"},da={key:0},ua={key:1,class:"history-empty history-empty--animated"},ca=ie({__name:"WorkbenchPanels",props:{layoutPanelOpen:{type:Boolean},historyOpen:{type:Boolean},focusFamilyLabel:{},canReturnToMainBranch:{type:Boolean},canUndo:{type:Boolean},canRedo:{type:Boolean},zoom:{},hasSelectedPerson:{type:Boolean},selectedPersonName:{},selectedPersonMeta:{},canFocusSelectedBranch:{type:Boolean},settings:{},historyPastCount:{},historyFutureCount:{},visibleHistoryEntries:{}},emits:["toggle-layout","toggle-history","return-main-branch","reset-canvas-view","undo","redo","adjust-zoom","open-editor","reveal-selected-person","focus-selected-branch","close-layout","close-history","update-settings"],setup(e,{emit:n}){const s=e,o=n;function d(i,l){o("update-settings",{[i]:l})}function c(i){return Number(i.target.value)}function r(i){return i.target.checked}function u(i){return i.target.value}function a(i){const l=i.target;l&&(l.closest(".floating-panel")||l.closest(".tool-btn--panel")||(s.layoutPanelOpen&&o("close-layout"),s.historyOpen&&o("close-history")))}return De(()=>{document.addEventListener("click",a,{capture:!0})}),At(()=>{document.removeEventListener("click",a,{capture:!0})}),(i,l)=>(y(),x(se,null,[t("div",ko,[t("div",$o,[t("button",{class:ee(["tool-btn tool-btn--panel",{"tool-btn--active":e.layoutPanelOpen}]),type:"button","aria-pressed":e.layoutPanelOpen,onClick:l[0]||(l[0]=v=>i.$emit("toggle-layout"))},[...l[22]||(l[22]=[t("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("rect",{x:"3",y:"3",width:"14",height:"14",rx:"2"}),t("line",{x1:"3",y1:"8",x2:"17",y2:"8"}),t("line",{x1:"10",y1:"8",x2:"10",y2:"17"})],-1),Y(" 版式 ",-1)])],10,xo),t("button",{class:ee(["tool-btn tool-btn--panel",{"tool-btn--active":e.historyOpen}]),type:"button","aria-pressed":e.historyOpen,onClick:l[1]||(l[1]=v=>i.$emit("toggle-history"))},[...l[23]||(l[23]=[t("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("path",{d:"M4 7h5l-2-3"}),t("path",{d:"M4 7a6 6 0 1 1 0 6"}),t("circle",{cx:"12",cy:"10",r:"1",fill:"currentColor",stroke:"none"})],-1),Y(" 历史 ",-1)])],10,So)]),e.canReturnToMainBranch?(y(),x("button",{key:0,class:"tool-btn tool-btn--quiet",type:"button","aria-label":"返回父系主谱",onClick:l[2]||(l[2]=v=>i.$emit("return-main-branch"))},[...l[24]||(l[24]=[t("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[t("path",{d:"M12 4L6 10l6 6"}),t("line",{x1:"6",y1:"10",x2:"16",y2:"10"})],-1),Y(" 回主谱 ",-1)])])):N("",!0),t("button",{class:"tool-btn tool-btn--quiet",type:"button","aria-label":"查看当前宗支全览",onClick:l[3]||(l[3]=v=>i.$emit("reset-canvas-view"))},[...l[25]||(l[25]=[t("svg",{class:"tool-icon",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("rect",{x:"2",y:"5",width:"16",height:"10",rx:"2"}),t("circle",{cx:"10",cy:"10",r:"3"}),t("path",{d:"M4.5 7.5l2 2"})],-1),Y(" 全览 ",-1)])])]),t("div",Po,[e.hasSelectedPerson?N("",!0):(y(),x("div",Co,[l[26]||(l[26]=t("span",null,"宗支",-1)),t("strong",null,P(e.focusFamilyLabel),1)])),e.hasSelectedPerson?(y(),x("div",Ao,[t("div",Io,[t("div",Eo,[t("strong",null,P(e.selectedPersonName),1),t("span",Mo,"宗支 "+P(e.focusFamilyLabel),1)]),t("em",null,P(e.selectedPersonMeta),1)]),t("div",Fo,[t("button",{class:"selection-chip__btn",type:"button",onClick:l[4]||(l[4]=v=>i.$emit("reveal-selected-person"))},[...l[27]||(l[27]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("circle",{cx:"7",cy:"7",r:"4.5"}),t("line",{x1:"10.2",y1:"10.2",x2:"14",y2:"14"})],-1),Y(" 定位 ",-1)])]),t("button",{class:"selection-chip__btn",type:"button",disabled:!e.canFocusSelectedBranch,onClick:l[5]||(l[5]=v=>i.$emit("focus-selected-branch"))},[...l[28]||(l[28]=[It('<svg class="btn-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M8 2v5"></path><path d="M4 9v5"></path><path d="M12 9v5"></path><path d="M4 9h8"></path></svg> 切到该支 ',2)])],8,Bo),t("button",{class:"selection-chip__btn selection-chip__btn--accent",type:"button",onClick:l[6]||(l[6]=v=>i.$emit("open-editor"))},[...l[29]||(l[29]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[t("path",{d:"M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"})],-1),Y(" 编辑 ",-1)])])])])):N("",!0),t("div",Oo,[t("button",{class:"zoom-control__btn",type:"button","aria-label":"缩小",onClick:l[7]||(l[7]=v=>i.$emit("adjust-zoom",-.05))},[...l[30]||(l[30]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("line",{x1:"4",y1:"8",x2:"12",y2:"8"})],-1)])]),t("span",null,P(Math.round(e.zoom*100))+"%",1),t("button",{class:"zoom-control__btn",type:"button","aria-label":"放大",onClick:l[8]||(l[8]=v=>i.$emit("adjust-zoom",.05))},[...l[31]||(l[31]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("line",{x1:"4",y1:"8",x2:"12",y2:"8"}),t("line",{x1:"8",y1:"4",x2:"8",y2:"12"})],-1)])])])]),W(he,{name:"float-panel"},{default:ge(()=>[e.layoutPanelOpen?(y(),x("section",No,[t("div",To,[l[33]||(l[33]=t("div",null,[t("p",{class:"floating-panel__eyebrow"},"Layout"),t("h2",null,"版式设置")],-1)),t("button",{class:"floating-panel__close",type:"button",onClick:l[9]||(l[9]=v=>i.$emit("close-layout"))},[...l[32]||(l[32]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("line",{x1:"4",y1:"4",x2:"12",y2:"12"}),t("line",{x1:"12",y1:"4",x2:"4",y2:"12"})],-1),Y(" 关闭 ",-1)])])]),t("label",Do,[l[35]||(l[35]=t("span",null,"纸张尺寸",-1)),t("select",{value:e.settings.paper,onChange:l[10]||(l[10]=v=>d("paper",u(v)))},[...l[34]||(l[34]=[t("option",{value:"A3"},"A3 横向",-1),t("option",{value:"A4"},"A4 横向",-1)])],40,zo)]),t("label",Ro,[t("span",null,"人物卡宽度 "+P(e.settings.cardWidth)+"px",1),t("input",{value:e.settings.cardWidth,type:"range",min:"142",max:"176",step:"2",onInput:l[11]||(l[11]=v=>d("cardWidth",c(v)))},null,40,Ho)]),t("label",Lo,[t("span",null,"代际间距 "+P(e.settings.generationGap)+"px",1),t("input",{value:e.settings.generationGap,type:"range",min:"120",max:"220",step:"10",onInput:l[12]||(l[12]=v=>d("generationGap",c(v)))},null,40,jo)]),t("label",_o,[t("span",null,"兄弟间距 "+P(e.settings.siblingGap)+"px",1),t("input",{value:e.settings.siblingGap,type:"range",min:"56",max:"140",step:"4",onInput:l[13]||(l[13]=v=>d("siblingGap",c(v)))},null,40,Vo)]),t("label",Uo,[t("span",null,"字体倍率 "+P(e.settings.fontScale.toFixed(2)),1),t("input",{value:e.settings.fontScale,type:"range",min:"0.88",max:"1.18",step:"0.02",onInput:l[14]||(l[14]=v=>d("fontScale",c(v)))},null,40,Wo)]),t("div",Go,[t("label",Yo,[t("input",{checked:e.settings.showDeath,type:"checkbox",onChange:l[15]||(l[15]=v=>d("showDeath",r(v)))},null,40,Xo),l[36]||(l[36]=t("span",null,"显示卒年",-1))]),t("label",Jo,[t("input",{checked:e.settings.showAge,type:"checkbox",onChange:l[16]||(l[16]=v=>d("showAge",r(v)))},null,40,qo),l[37]||(l[37]=t("span",null,"显示年龄",-1))]),t("label",Zo,[t("input",{checked:e.settings.showNote,type:"checkbox",onChange:l[17]||(l[17]=v=>d("showNote",r(v)))},null,40,Ko),l[38]||(l[38]=t("span",null,"显示注记",-1))]),t("label",Qo,[t("input",{checked:e.settings.showPhoto,type:"checkbox",onChange:l[18]||(l[18]=v=>d("showPhoto",r(v)))},null,40,ea),l[39]||(l[39]=t("span",null,"显示照片",-1))])])])):N("",!0)]),_:1}),W(he,{name:"float-panel"},{default:ge(()=>[e.historyOpen?(y(),x("section",ta,[t("div",na,[l[41]||(l[41]=t("div",null,[t("p",{class:"floating-panel__eyebrow"},"History"),t("h2",null,"操作历史")],-1)),t("button",{class:"floating-panel__close",type:"button",onClick:l[19]||(l[19]=v=>i.$emit("close-history"))},[...l[40]||(l[40]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round"},[t("line",{x1:"4",y1:"4",x2:"12",y2:"12"}),t("line",{x1:"12",y1:"4",x2:"4",y2:"12"})],-1),Y(" 关闭 ",-1)])])]),t("div",sa,[t("strong",null,"可撤销 "+P(e.historyPastCount)+" 步",1),t("span",null,"可重做 "+P(e.historyFutureCount)+" 步",1)]),t("div",oa,[t("button",{class:"relation-btn",type:"button",disabled:!e.canUndo,onClick:l[20]||(l[20]=v=>i.$emit("undo"))},[...l[42]||(l[42]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[t("path",{d:"M4 6h7a3 3 0 0 1 0 6H9"}),t("path",{d:"M7 3L4 6l3 3"})],-1),Y(" 撤销上一步 ",-1)])],8,aa),t("button",{class:"relation-btn",type:"button",disabled:!e.canRedo,onClick:l[21]||(l[21]=v=>i.$emit("redo"))},[...l[43]||(l[43]=[t("svg",{class:"btn-icon",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor","stroke-width":"1.4","stroke-linecap":"round","stroke-linejoin":"round"},[t("path",{d:"M12 6H5a3 3 0 0 0 0 6h2"}),t("path",{d:"M9 3l3 3-3 3"})],-1),Y(" 重做上一步 ",-1)])],8,la)]),l[45]||(l[45]=t("p",{class:"history-panel__hint"},"快捷键支持 `Ctrl/Command + Z`，重做支持 `Ctrl/Command + Y` 或 `Shift + Z`。",-1)),e.visibleHistoryEntries.length?(y(),x("div",ra,[(y(!0),x(se,null,me(e.visibleHistoryEntries,(v,A)=>(y(),x("article",{key:v.id,class:"history-entry"},[t("div",ia,[t("span",null,P(v.time),1),A===0?(y(),x("em",da,"最近")):N("",!0)]),t("strong",null,P(v.label),1)]))),128))])):(y(),x("div",ua,[...l[44]||(l[44]=[t("svg",{class:"empty-state-svg",viewBox:"0 0 120 120",fill:"none",stroke:"currentColor","stroke-width":"1.5","stroke-linecap":"round","stroke-linejoin":"round"},[t("path",{class:"empty-path empty-path-1",d:"M30 40 C 30 20, 50 10, 60 20 C 70 30, 90 20, 90 40 C 90 60, 70 80, 60 70 C 50 60, 30 80, 30 60 Z"}),t("path",{class:"empty-path empty-path-2",d:"M60 20 L 60 70"}),t("path",{class:"empty-path empty-path-3",d:"M45 45 L 75 45"}),t("circle",{class:"empty-dot",cx:"60",cy:"90",r:"2",fill:"currentColor"})],-1),t("p",null,"当前还没有可撤销的操作，开始编辑后会在这里记录。",-1)])]))])):N("",!0)]),_:1})],64))}});function pa(){const e=T(!1),n=T(!1),s=T(!1);function o(){e.value=!e.value,e.value&&(s.value=!1)}function d(){s.value=!s.value,s.value&&(e.value=!1)}function c(){e.value=!1,n.value=!1,s.value=!1}return{layoutPanelOpen:e,editorOpen:n,historyOpen:s,toggleLayoutPanel:o,toggleHistoryPanel:d,closeAllPanels:c}}function fa(e){const{selectedPerson:n,selectedSpouse:s,selectedChildren:o,selectedPersonLineageSuggestion:d,selectedOutMarriedDaughter:c,selectedInLawOfOutMarriedDaughter:r,isSelectedBranchFocused:u,canSetSelectedBranchMode:a,selectedBranchMode:i,branchActionLabel:l,getPersonStatus:v,getGenderLabel:A}=e,h=G(()=>{const w=n.value;return w?w.birth?Et(w)?w.note?d.value&&w.note!==d.value?`系统按当前宗支推算的称谓是"${d.value}"，如果你们家谱记法不同，可以保留现有注记。`:a.value?i.value==="uxorilocal"?'当前家庭按"招婿承支"处理，配偶会标为婿，后代继续留在本支。':'当前家庭按"外嫁支系"处理，配偶会标为婿，后代按外支显示。':"当前人物信息较完整，可以继续整理其配偶、子女和相关宗支关系。":d.value?`系统可按当前宗支推算为"${d.value}"，你可以一键填入后再微调。`:"建议补充房次、排行或配偶身份，方便读者快速识别宗支位置。":"建议补录卒年或享年，让出版卡片的信息闭环更完整。":"建议优先补录出生时间，这会影响谱图的时间表达。":"点击人物卡即可在右侧浮层里编辑。"}),g=G(()=>{var H;const w=n.value;if(!w)return[];const z=[{label:"状态",value:v(w)},{label:"性别",value:A(w.gender)},{label:"称号",value:w.titleName||"未录入"},{label:"宗族",value:w.clan||"未录入"},{label:"身份",value:w.note||d.value||"待补充注记"},{label:"出生",value:w.birth||"待补全"},{label:"卒年",value:w.death||(Mt(w)?"已故（未录卒年）":"未录入")},{label:"年龄",value:w.age||"自动推算 / 待补全"},{label:"配偶",value:((H=s.value)==null?void 0:H.name)||"未建立配偶关系"}];return a.value&&z.push({label:"婚配归属",value:i.value==="uxorilocal"?"招婿承支":"外嫁支系"}),z}),b=G(()=>c.value||r.value?u.value?"已在外嫁支系":"查看外嫁支系":l.value),k=G(()=>{if(c.value){const H=o.value.length;return u.value?H?`这是外嫁女。当前已切到她自己的家庭支系，名下 ${H} 位子女会在这里正常展开。`:"这是外嫁女。当前已切到她自己的家庭支系，可以继续在这里整理她的配偶与子女。":H?`这是外嫁女。父系主谱会继续显示她的配偶和 ${H} 位子女，并用"外嫁/婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦她这一支。`:'这是外嫁女。父系主谱会显示她本人和配偶，并用"外嫁/婿"标识婚配关系；如需单独整理她这一支，请点击"查看外嫁支系"。'}const z=r.value;if(z){const H=o.value.length;return u.value?H?`这是外嫁女 ${z.name} 的配偶。当前已进入他们自己的家庭支系，可继续整理名下 ${H} 位子女。`:`这是外嫁女 ${z.name} 的配偶。当前已进入他们自己的家庭支系，可以继续补录后代信息。`:H?`这是外嫁女 ${z.name} 的配偶。父系主谱会继续显示他们名下 ${H} 位子女，并用"婿"标识婚配关系；点击"查看外嫁支系"可单独聚焦他们这一支。`:`这是外嫁女 ${z.name} 的配偶。父系主谱会用"婿"标识婚配关系；点击"查看外嫁支系"可进入他们自己的家庭支系。`}return h.value}),p=G(()=>c.value?[...g.value,{label:"谱系提示",value:u.value?"当前查看外嫁支系":"父系主谱会继续显示其配偶与子女"}]:r.value?[...g.value,{label:"谱系提示",value:u.value?"当前查看外嫁支系":"父系主谱中作为婿/配偶显示，并保留后代"}]:g.value);function S(w){const z=n.value;z&&(z[w.field]=w.value)}function C(w){const z=n.value;z&&(z.gender=w)}return{selectedPersonSuggestion:h,selectedPersonDetails:g,editorBranchActionLabel:b,editorSelectedPersonSuggestion:k,editorSelectedPersonDetails:p,updateSelectedPersonField:S,updateSelectedPersonGender:C}}const J="http://www.w3.org/2000/svg",nt="http://www.w3.org/1999/xlink",va='<?xml version="1.0" encoding="UTF-8"?>',ma="'SimSun', 'Songti SC', 'STSong', serif",ha="'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', sans-serif",st=["--canvas-bg","--bg-paper","--bg-shell","--text-main","--text-soft","--tree-line-color","--card-panel-fill","--card-panel-stroke","--card-inner-stroke","--card-header-fill","--card-selected-stroke","--card-status-fill","--card-name-fill","--card-detail-fill","--card-male-header","--card-female-header","--accent-amber","--border-color","--line-soft","--shell-bg-image","--bg-panel","--text-sub"],ga={A4:"A4 landscape",A3:"A3 landscape"},ba={A4:{width:297,height:210},A3:{width:420,height:297}},Ge=`
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
`;function _(e){return Number.isInteger(e)?String(e):e.toFixed(2).replace(/\.?0+$/,"")}function ne(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ot(e){const n=e.querySelector("defs");if(n)return n;const s=document.createElementNS(J,"defs");return e.insertBefore(s,e.firstChild),s}function ya(e,n){var o;(o=e.querySelector(":scope > title"))==null||o.remove();const s=document.createElementNS(J,"title");s.textContent=n,e.insertBefore(s,e.firstChild)}function Ce(){if(typeof window>"u")return{};const e=document.documentElement,n=getComputedStyle(e),s={};for(const o of st){const d=n.getPropertyValue(o).trim();d&&(s[o]=d)}return s}function at(){const e=Ce();let n=`:root {
`;for(const s of st){const o=e[s];o&&(n+=`  ${s}: ${o};
`)}return n+=`}
`,n}function He(e,n){let s=e;for(;s.includes("var(");){const o=s.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)/g,(d,c,r)=>{const u=n[c];return u||(r?He(r.trim(),n):"")});if(o===s)break;s=o}return s}function wa(e=!1){if(!e)return at()+`
`+Ge;const n=Ce();return He(Ge.replace(/^\s*@import\s+url\([^)]*\)\s*;\s*/m,`
`).replaceAll("'Noto Serif SC', 'Songti SC', serif",ma).replaceAll("'Manrope', sans-serif",ha),n)}function ka(e,n=!1){var d;const s=ot(e);(d=s.querySelector('[data-export-style="publication"]'))==null||d.remove();const o=document.createElementNS(J,"style");o.setAttribute("data-export-style","publication"),o.textContent=wa(n),s.insertBefore(o,s.firstChild)}function $a(e,n){var r,u;if((r=e.querySelector('[data-export-header="publication"]'))==null||r.remove(),!n)return;const s=e.querySelector(":scope > title");s&&s.remove();const o=document.createElementNS(J,"g");o.setAttribute("data-export-header","publication"),o.setAttribute("transform","translate(72 56)");const d=document.createElementNS(J,"text");d.setAttribute("x","0"),d.setAttribute("y","0"),d.setAttribute("fill","var(--text-main, #241a10)"),d.setAttribute("font-size","28"),d.setAttribute("font-weight","700"),d.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),d.textContent=n.title,o.appendChild(d);let c=34;if(n.subtitle){const a=document.createElementNS(J,"text");a.setAttribute("x","0"),a.setAttribute("y",String(c)),a.setAttribute("fill","var(--text-soft, #8a6845)"),a.setAttribute("font-size","15"),a.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),a.textContent=n.subtitle,o.appendChild(a),c+=24}(u=n.lines)==null||u.forEach(a=>{const i=document.createElementNS(J,"text");i.setAttribute("x","0"),i.setAttribute("y",String(c)),i.setAttribute("fill","var(--text-soft, #8a6845)"),i.setAttribute("font-size","12"),i.setAttribute("font-family","'Noto Serif SC', 'Songti SC', serif"),i.textContent=a,o.appendChild(i),c+=20}),e.insertBefore(o,e.firstChild)}function xa(e,n){var a,i;(a=e.querySelector('[data-export-background="publication"]'))==null||a.remove(),(i=e.querySelector("#canvas-bg-gradient"))==null||i.remove();const s=document.documentElement,o=getComputedStyle(s);let d=o.getPropertyValue("--canvas-bg").trim();d||(d=o.getPropertyValue("--bg-paper").trim()||"#fff9ef");let c=d;if(d.includes("linear-gradient")||d.includes("radial-gradient")){const l=/(rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8})/g,v=d.match(l);if(v&&v.length>=2){const A=ot(e),h=document.createElementNS(J,"linearGradient");h.id="canvas-bg-gradient",h.setAttribute("x1","0%"),h.setAttribute("y1","0%"),h.setAttribute("x2","0%"),h.setAttribute("y2","100%");const g=document.createElementNS(J,"stop");g.setAttribute("offset","0%"),g.setAttribute("stop-color",v[0]);const b=document.createElementNS(J,"stop");b.setAttribute("offset","100%"),b.setAttribute("stop-color",v[v.length-1]),h.appendChild(g),h.appendChild(b),A.appendChild(h),c="url(#canvas-bg-gradient)"}else c=o.getPropertyValue("--bg-shell").trim()||"#e8ddc8"}const r=document.createElementNS(J,"rect");r.setAttribute("data-export-background","publication"),r.setAttribute("class","publication-svg__background"),r.setAttribute("x","0"),r.setAttribute("y","0"),r.setAttribute("width",_(n.width)),r.setAttribute("height",_(n.height)),r.style.fill=c;const u=e.querySelector(":scope > defs");e.insertBefore(r,(u==null?void 0:u.nextSibling)??e.firstChild)}function Sa(e){e.querySelectorAll(".person-card--selected").forEach(n=>{n.classList.remove("person-card--selected")})}function Pa(e){const n=Ce();[e,...Array.from(e.querySelectorAll("*"))].forEach(o=>{Array.from(o.attributes).forEach(d=>{d.value.includes("var(")&&o.setAttribute(d.name,He(d.value,n))})})}function Ca(e){e.querySelectorAll("filter").forEach(n=>n.remove()),e.querySelectorAll("[filter]").forEach(n=>n.removeAttribute("filter"))}function Aa(e,n){const s=new Map;if(Array.from(e.querySelectorAll("[id]")).forEach(r=>{const u=`${r.id}-${n}`;s.set(r.id,u),r.id=u}),s.size===0)return;const d=[e,...Array.from(e.querySelectorAll("*"))],c=["filter","clip-path","mask","fill","stroke","href","xlink:href"];d.forEach(r=>{c.forEach(u=>{const a=r.getAttribute(u);if(!a)return;let i=a;s.forEach((l,v)=>{i=i.replaceAll(`url(#${v})`,`url(#${l})`).replaceAll(`#${v}`,`#${l}`)}),i!==a&&r.setAttribute(u,i)})})}function Ia(e,n){if(!e||e.startsWith("data:")||e.startsWith("blob:")||/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(e)||!n)return e;try{return new URL(e,n).toString()}catch{return e}}function Ae(e,n){e.setAttribute("href",n),e.setAttributeNS(nt,"xlink:href",n)}async function lt(e){const n=e.svgElement.cloneNode(!0),s=e.exportHeader?120:0,o=e.layout.height+s;if(n.setAttribute("xmlns",J),n.setAttribute("xmlns:xlink",nt),n.setAttribute("version","1.1"),n.setAttribute("role","img"),n.setAttribute("aria-label",e.title),n.setAttribute("viewBox",`0 0 ${_(e.layout.width)} ${_(o)}`),n.setAttribute("width",_(e.layout.width)),n.setAttribute("height",_(o)),n.removeAttribute("style"),e.includeSelection||Sa(n),s>0){const r=document.createElementNS(J,"g");for(r.setAttribute("data-export-content","publication"),r.setAttribute("transform",`translate(0, ${s})`);n.firstChild;)r.appendChild(n.firstChild);n.appendChild(r),$a(n,e.exportHeader)}ya(n,e.title),ka(n,e.pdfFriendly),xa(n,{...e.layout,height:o});const d=Array.from(n.querySelectorAll("image")),c=e.embedImages??!0;return await Promise.all(d.map(async r=>{const u=r.getAttribute("href")||r.getAttribute("xlink:href");if(!u||u.startsWith("data:")){u&&Ae(r,u);return}if(!c){Ae(r,Ia(u,e.resourceBaseUrl));return}try{const i=await(await fetch(u)).blob(),l=new FileReader,v=await new Promise(A=>{l.onloadend=()=>A(l.result),l.readAsDataURL(i)});Ae(r,v)}catch(a){console.error("Failed to embed image in SVG export",u,a)}})),e.pdfFriendly&&(Ca(n),Pa(n)),n}function Ea(e,n,s){var d;const o=e.cloneNode(!0);return o.setAttribute("aria-label",`${s} ${n.index}/${n.total}`),o.setAttribute("viewBox",`${_(n.x)} ${_(n.y)} ${_(n.width)} ${_(n.height)}`),o.setAttribute("width",_(n.width)),o.setAttribute("height",_(n.height)),(d=o.querySelector(":scope > title"))==null||d.replaceChildren(`${s} ${n.index}/${n.total}`),Aa(o,`print-${n.index}`),o}function Me(e,n=!0){const s=new XMLSerializer().serializeToString(e);return n?`${va}
${s}
`:s}function Ma(e,n){const o=ba[n].width/e.paperPixelWidth;return[{index:1,total:1,row:0,column:0,x:0,y:0,width:e.width,height:e.height,widthMm:e.width*o,heightMm:e.height*o}]}function Fa(e){const n=ne(e.title),s=e.pages[0],o=s?`${_(s.widthMm)}mm`:ga[e.paper],d=s?`${_(s.heightMm)}mm`:"auto",c=e.pages.map((r,u)=>{const a=e.pageSvgMarkups[u]??"";return`
        <section class="print-sheet" aria-label="排版画布">
          <div
            class="print-canvas"
            style="width: ${_(r.widthMm)}mm; height: ${_(r.heightMm)}mm;"
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
    <title>${n} - 打印排版</title>
    <style>
      ${at()}
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

      @page {
        size: ${o} ${d};
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
        width: ${s?_(s.widthMm):"auto"}mm;
        height: ${s?_(s.heightMm):"auto"}mm;
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
    ${c}
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
`}const fe=1,Ba=new Set(["male","female","unknown"]),Oa=new Set(["A3","A4"]),Na=new Set(["married-out","uxorilocal"]);function ae(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Z(e){return typeof e=="string"}function Ta(e){return e===void 0||typeof e=="string"}function Da(e){return e===void 0||typeof e=="boolean"}function D(e,n,s){return{code:e,path:n,message:s}}function oe(e,n,s){return Math.min(s,Math.max(n,e))}function za(e,n){if(!ae(n))return[D("invalid-person",`people.${e}`,`人物 ${e} 必须是对象。`)];const s=n,o=[];return s.id!==e&&o.push(D("invalid-person",`people.${e}.id`,`人物 ${e} 的 id 必须与键名一致。`)),(!Z(s.name)||!s.name.trim())&&o.push(D("invalid-person",`people.${e}.name`,`人物 ${e} 缺少姓名。`)),(!Z(s.gender)||!Ba.has(s.gender))&&o.push(D("invalid-person",`people.${e}.gender`,`人物 ${e} 的性别值无效。`)),["birth","death","age","titleName","clan","note"].forEach(d=>{Ta(s[d])||o.push(D("invalid-person",`people.${e}.${d}`,`人物 ${e} 的 ${d} 必须是字符串。`))}),Da(s.deceased)||o.push(D("invalid-person",`people.${e}.deceased`,`人物 ${e} 的 deceased 必须是布尔值。`)),o}function Ye(e,n,s,o){if(!Array.isArray(s))return[D("invalid-family",`families.${e}.${n}`,`家庭 ${e} 缺少 ${n} 数组。`)];const d=new Set,c=[];return s.forEach((r,u)=>{const a=`families.${e}.${n}[${u}]`;if(!Z(r)||!r){c.push(D("invalid-family",a,`家庭 ${e} 的成员 ID 必须是非空字符串。`));return}o[r]||c.push(D("missing-person-reference",a,`家庭 ${e} 引用了不存在的人物 ${r}。`)),d.has(r)&&c.push(D("duplicate-family-member",a,`人物 ${r} 在家庭 ${e} 中重复出现。`)),d.add(r)}),c}function Ra(e,n,s){if(!ae(n))return[D("invalid-family",`families.${e}`,`家庭 ${e} 必须是对象。`)];const o=n,d=[];if(o.id!==e&&d.push(D("invalid-family",`families.${e}.id`,`家庭 ${e} 的 id 必须与键名一致。`)),o.branchMode!==void 0&&(!Z(o.branchMode)||!Na.has(o.branchMode))&&d.push(D("invalid-family",`families.${e}.branchMode`,`家庭 ${e} 的 branchMode 值无效。`)),d.push(...Ye(e,"adults",o.adults,s)),d.push(...Ye(e,"children",o.children,s)),Array.isArray(o.adults)&&Array.isArray(o.children)){const c=new Set(o.adults.filter(r=>Z(r)&&r.length>0));o.children.forEach((r,u)=>{Z(r)&&c.has(r)&&d.push(D("duplicate-family-member",`families.${e}.children[${u}]`,`人物 ${r} 不能同时作为家庭 ${e} 的父母和子女。`))})}return d}function Le(e){if(!ae(e))return[D("invalid-root","publication","族谱数据必须是对象。")];const n=e,s=[];if((!Z(n.title)||!n.title.trim())&&s.push(D("invalid-root","title","族谱标题不能为空。")),(!Z(n.subtitle)||!n.subtitle.trim())&&s.push(D("invalid-root","subtitle","族谱副标题不能为空。")),(!Z(n.focusFamilyId)||!n.focusFamilyId.trim())&&s.push(D("invalid-root","focusFamilyId","当前宗支 ID 必须是字符串。")),ae(n.people)||s.push(D("missing-people","people","族谱数据缺少 people 对象。")),ae(n.families)||s.push(D("missing-families","families","族谱数据缺少 families 对象。")),!ae(n.people)||!ae(n.families))return s;Object.entries(n.people).forEach(([r,u])=>{s.push(...za(r,u))}),Object.entries(n.families).forEach(([r,u])=>{s.push(...Ra(r,u,n.people))}),Z(n.focusFamilyId)&&!n.families[n.focusFamilyId]&&s.push(D("missing-focus-family","focusFamilyId",`当前宗支 ${n.focusFamilyId} 不存在。`));const o=new Map,d=new Map;Object.entries(n.families??{}).forEach(([r,u])=>{Array.isArray(u.adults)&&u.adults.forEach(a=>{o.has(a)||o.set(a,[]),o.get(a).push(r)}),Array.isArray(u.children)&&u.children.forEach(a=>{d.has(a)||d.set(a,[]),d.get(a).push(r)})});const c=n.families??{};return o.forEach((r,u)=>{r.length>1&&r.slice(1).forEach(a=>{var l;const i=(((l=c[a])==null?void 0:l.adults)??[]).indexOf(u);s.push(D("cross-family-duplicate-adult",`families.${a}.adults[${i}]`,`人物 ${u} 已在家庭 ${r[0]} 中作为父母，不能同时作为家庭 ${a} 的父母。`))})}),d.forEach((r,u)=>{r.length>1&&r.slice(1).forEach(a=>{var l;const i=(((l=c[a])==null?void 0:l.children)??[]).indexOf(u);s.push(D("cross-family-duplicate-child",`families.${a}.children[${i}]`,`人物 ${u} 已在家庭 ${r[0]} 中作为子女，不能同时作为家庭 ${a} 的子女。`))})}),s}function rt(e){const n=JSON.parse(JSON.stringify(e));return La(n),Object.values(n.families).forEach(s=>{const o=new Set,d=new Set;s.adults=s.adults.filter(c=>!n.people[c]||o.has(c)?!1:(o.add(c),!0)),s.children=s.children.filter(c=>!n.people[c]||o.has(c)||d.has(c)?!1:(d.add(c),!0))}),n.families[n.focusFamilyId]||(n.focusFamilyId=Object.keys(n.families)[0]??""),n}function it(e){return{...e,cardWidth:oe(e.cardWidth,142,176),generationGap:oe(e.generationGap,120,220),siblingGap:oe(e.siblingGap,56,140),partnerGap:oe(e.partnerGap,72,128),fontScale:oe(e.fontScale,.88,1.18),zoom:oe(e.zoom,.1,1.35),paddingX:oe(e.paddingX,72,220),paddingY:oe(e.paddingY,48,180)}}function Ha(e){if(!ae(e))return[D("missing-settings","settings","排版设置必须是对象。")];const n=e,s=[];return(!Z(n.paper)||!Oa.has(n.paper))&&s.push(D("invalid-settings","settings.paper","纸张尺寸必须是 A3 或 A4。")),[["cardWidth",142,176],["generationGap",120,220],["siblingGap",56,140],["partnerGap",72,128],["fontScale",.88,1.18],["zoom",.1,1.35],["paddingX",72,220],["paddingY",48,180]].forEach(([o,d,c])=>{if(typeof n[o]!="number"||!Number.isFinite(n[o])){s.push(D("invalid-settings",`settings.${o}`,`${o} 必须是数字。`));return}(n[o]<d||n[o]>c)&&s.push(D("invalid-settings",`settings.${o}`,`${o} 必须在 ${d} 到 ${c} 之间。`))}),["showDeath","showAge","showNote"].forEach(o=>{typeof n[o]!="boolean"&&s.push(D("invalid-settings",`settings.${o}`,`${o} 必须是布尔值。`))}),s}function La(e){const n=new Map,s=new Map;Object.entries(e.families).forEach(([o,d])=>{var c,r;(c=d.adults)==null||c.forEach(u=>{n.has(u)||n.set(u,[]),n.get(u).push(o)}),(r=d.children)==null||r.forEach(u=>{s.has(u)||s.set(u,[]),s.get(u).push(o)})}),n.forEach(o=>{o.length>1&&o.slice(1).forEach(d=>{const c=e.families[d];c&&(c.adults=c.adults.filter(r=>r!==o[0]))})}),s.forEach(o=>{o.length>1&&o.slice(1).forEach(d=>{const c=e.families[d];c&&(c.children=c.children.filter(r=>r!==o[0]))})})}function Fe(e){return e.map(n=>`${n.path}: ${n.message}`).join(`
`)}function xe(e){return JSON.parse(JSON.stringify(e))}function Be(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function Oe(e,n,s){return{code:e,path:n,message:s}}function dt(e){return{...Se,...Be(e)?e:{}}}function ja(e){try{return{ok:!0,value:JSON.parse(e)}}catch{return{ok:!1,issues:[Oe("invalid-json","json","JSON 格式错误，无法解析。")]}}}function _a(e,n=new Date().toISOString()){if(!Be(e))return{ok:!1,issues:[Oe("invalid-root","draft","导入内容必须是对象。")]};const s=Be(e.publication),o=s?e.publication:e,d=s?e.settings:Se,c=s?e.version??fe:fe;if(c!==fe)return{ok:!1,issues:[Oe("unsupported-draft-version","version",`不支持的草稿版本：${String(c)}。`)]};const r=Le(o),u=it(dt(d)),a=Ha(u),i=[...r,...a];return i.length>0?{ok:!1,issues:i}:{ok:!0,value:{version:fe,savedAt:typeof e.savedAt=="string"?e.savedAt:n,publication:rt(xe(o)),settings:xe(u)}}}function Xe(e,n,s=new Date().toISOString()){return{version:fe,savedAt:s,publication:rt(xe(e)),settings:it(dt(xe(n)))}}function Je(e){return JSON.stringify(e,null,2)}async function ut(e){const n=JSON.parse(JSON.stringify(e)),o=Object.values(n.people).map(async d=>{if(d.avatarUrl&&Va(d.avatarUrl))try{const c=await fetch(d.avatarUrl);if(!c.ok)return;const r=await c.blob(),u=await new Promise((a,i)=>{const l=new FileReader;l.onloadend=()=>a(l.result),l.onerror=i,l.readAsDataURL(r)});d.avatarUrl=u}catch(c){console.error(`无法转换图片为 Base64 (person: ${d.name}):`,c)}});return await Promise.all(o),n}function Va(e){return e.startsWith("/api/photos/")||e.startsWith("/uploads/")||e.startsWith("uploads/")||e.includes("/uploads/")}function qe(e){const n=ja(e);return n.ok?_a(n.value):n}function Ie(e){const n=e instanceof Uint8Array?e:new Uint8Array(e);let s="";for(let o=0;o<n.length;o++)s+=String.fromCharCode(n[o]);return btoa(s)}async function Ua(e,n){const s=new TextEncoder,o=crypto.getRandomValues(new Uint8Array(16)),d=crypto.getRandomValues(new Uint8Array(12)),c=await crypto.subtle.importKey("raw",s.encode(n),"PBKDF2",!1,["deriveKey"]),r=await crypto.subtle.deriveKey({name:"PBKDF2",salt:o,iterations:1e5,hash:"SHA-256"},c,{name:"AES-GCM",length:256},!1,["encrypt"]),u=await crypto.subtle.encrypt({name:"AES-GCM",iv:d},r,s.encode(e));return{v:1,salt:Ie(o),iv:Ie(d),data:Ie(new Uint8Array(u))}}function Wa(e){var o,d,c,r;const n=[];e.title&&n.push(`<h1>${ne(e.title)}</h1>`),e.subtitle&&n.push(`<h2>${ne(e.subtitle)}</h2>`);const s=[];return(o=e.info)!=null&&o.description&&s.push(`<p class="info-desc">${ne(e.info.description)}</p>`),(d=e.info)!=null&&d.ancestralOrigin&&s.push(`<span class="info-tag">郡望/祖籍：${ne(e.info.ancestralOrigin)}</span>`),(c=e.info)!=null&&c.hallName&&s.push(`<span class="info-tag">堂号：${ne(e.info.hallName)}</span>`),(r=e.info)!=null&&r.familyMotto&&s.push(`<span class="info-tag">族训：${ne(e.info.familyMotto)}</span>`),s.length&&n.push(`<div class="pub-info">${s.join("")}</div>`),n.join(`
`)}function Ga(e){let n=`:root {
`;for(const[s,o]of Object.entries(e))o&&(n+=`  ${s}: ${o};
`);return n+=`}
`,n}function Ya(e){const n=Object.values(e.people),s=n.length,o=n.filter(r=>r.deceased).length,d=s-o,c=[`<span>共 ${s} 人</span>`];return d>0&&c.push(`<span>在世 ${d} 人</span>`),o>0&&c.push(`<span>已故 ${o} 人</span>`),c.join(" ? ")}function Xa(e,n){return`
(function() {
  'use strict';

  var DATA_JSON = ${n?"null":JSON.stringify(e)};
  var ENCRYPTED_BLOB = ${n?e:"null"};

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
    html += '<span class="detail-gender">' + (person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未知') + '</span>';
    if (person.deceased) html += '<span class="detail-status deceased">已故</span>';
    else html += '<span class="detail-status alive">在世</span>';
    html += '</div>';

    var details = [];
    if (person.birth) details.push({ label: '出生', value: person.birth });
    if (person.death) details.push({ label: '逝世', value: person.death });
    if (person.age) details.push({ label: '享年', value: person.age });
    if (person.clan) details.push({ label: '世系', value: person.clan });
    if (person.titleName) details.push({ label: '称号', value: person.titleName });
    if (person.note) details.push({ label: '备注', value: person.note });

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
      relHtml += '<div class="rel-group"><span class="rel-label">父母</span>';
      for (var j = 0; j < rels.parents.length; j++) {
        var pp = data.publication.people[rels.parents[j]];
        if (pp) relHtml += '<span class="rel-item" data-pid="' + rels.parents[j] + '">' + escapeHtml(pp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.spouses.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">父母</span>';
      for (var k = 0; k < rels.spouses.length; k++) {
        var sp = data.publication.people[rels.spouses[k]];
        if (sp) relHtml += '<span class="rel-item" data-pid="' + rels.spouses[k] + '">' + escapeHtml(sp.name) + '</span>';
      }
      relHtml += '</div>';
    }
    if (rels.children.length > 0) {
      relHtml += '<div class="rel-group"><span class="rel-label">父母</span>';
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
      btn.textContent = header.classList.contains('collapsed') ? '展开' : '收起';
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
  if (${n}) {
    // Encrypted mode
    var gate = document.getElementById('password-gate');
    gate.style.display = 'flex';
    document.getElementById('pwd-submit').addEventListener('click', async function() {
      var pwd = document.getElementById('pwd-input').value;
      var errEl = document.getElementById('pwd-error');
      if (!pwd) { errEl.textContent = '请输入密码'; return; }
      errEl.textContent = '解密中...';
      try {
        var json = await decryptPayload(ENCRYPTED_BLOB, pwd);
        var data = JSON.parse(json);
        gate.style.display = 'none';
        init(data);
      } catch (err) {
        errEl.textContent = '密码错误或文件已损坏';
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
})();`}function Ja(e){return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ne(e.title)} - 族谱分享</title>
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
    <button id="pwd-submit">解密</button>
    <div id="pwd-error"></div>
  </div>
</div>

<div id="app">
  <header id="pub-header">
    <button id="header-toggle">收起</button>
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
    <span>生成于：${ne(e.generatedAt)} · 族谱分享</span>
  </footer>
</div>

<script>
${e.script}
<\/script>
</body>
</html>`}async function qa(e){const{publication:n,settings:s,layout:o,svgElement:d,password:c,onProgress:r}=e;r==null||r("capturing",10);const u=await lt({svgElement:d,layout:o,title:n.title.trim()||"未命名族谱",embedImages:!0});r==null||r("capturing",25);const a=Ce();r==null||r("capturing",30);const i=Me(u,!1);r==null||r("building",40);const l=await ut(n);r==null||r("building",60);const v=JSON.stringify({publication:l,settings:s,themeVars:a,svgMarkup:i});r==null||r("building",70);let A,h=!1;if(c){r==null||r("encrypting",75);const w=await Ua(v,c);A=JSON.stringify(w),h=!0,r==null||r("encrypting",85)}else A=v,r==null||r("assembling",85);r==null||r("assembling",90);const g=Ga(a),b=Wa(n),k=Ya(n),p=new Date().toLocaleString("zh-CN"),S=Xa(A,h),C=Ja({title:n.title.trim()||"未命名",themeCss:g,infoHeader:b,statsHtml:k,script:S,generatedAt:p});return r==null||r("done",100),C}const ct={types:[{description:"Guiyuan draft JSON",accept:{"application/json":[".json"]}}],excludeAcceptAllOption:!1};function je(){return window}function pt(e){return e instanceof DOMException&&e.name==="AbortError"}function Za(){const e=je();return typeof e.showOpenFilePicker=="function"&&typeof e.showSaveFilePicker=="function"}async function Ka(){const e=je();if(!e.showOpenFilePicker)return null;try{const[n]=await e.showOpenFilePicker({...ct,multiple:!1});if(!n)return null;const s=await n.getFile();return{handle:n,name:n.name||s.name,content:await s.text()}}catch(n){if(pt(n))return null;throw n}}async function Qa(e,n){const s=je();if(!s.showSaveFilePicker)return null;try{const o=await s.showSaveFilePicker({...ct,suggestedName:e});return await ft(o,n),o}catch(o){if(pt(o))return null;throw o}}async function ft(e,n){const s=await e.createWritable();await s.write(n),await s.close()}function el(e){const{pub:n,statusMessage:s,errorMessage:o,getErrorMessage:d,initializeHistoryBaseline:c,canvasRef:r,layout:u}=e,{publication:a,settings:i,selectedPersonId:l,replaceReactiveObject:v,getDefaultSelectedPersonId:A}=n,h=e.onImport,g=Ft(null),b=T(""),k=T(!1),p=Za();let S=!1;function C(){return S}function w(I){return I.replace(/[\\/:*?"<>|]/g,"-").trim()||"Guiyuan-archive-preview"}async function z(){var O,B;const I=(B=(O=r.value)==null?void 0:O.getSvgElement)==null?void 0:B.call(O);return!I||u.value.cards.length===0||u.value.width<=0||u.value.height<=0?null:await lt({svgElement:I,layout:u.value,title:a.title.trim()||"归元档案预览"})}async function H(){const I=await z();return I?Me(I):null}function X(I,O,B){const L=new Blob([O],{type:B}),U=URL.createObjectURL(L),E=document.createElement("a");E.href=U,E.download=I,E.click(),window.setTimeout(()=>URL.revokeObjectURL(U),0)}function le(){return Je(Xe(a,i))}function K(){const I=b.value.trim()||w(a.title);return I.toLowerCase().endsWith(".json")?I:`${I}.json`}function M(){return k.value?window.confirm("当前草稿还有未保存到文件的修改，继续打开其他文件会覆盖当前内容。是否继续？"):!0}function f(I,O){var B,L;S=!0,v(a,I.publication),v(i,I.settings),l.value=A(I.publication),g.value=O.handle??null,b.value=O.fileName??"",k.value=!1,o.value="",s.value=O.statusMessage,c(),(L=(B=r.value)==null?void 0:B.resetView)==null||L.call(B),h==null||h(),$e(()=>{S=!1})}async function $(){if(p&&M())try{const I=await Ka();if(!I)return;const O=qe(I.content);if(!O.ok){o.value=Fe(O.issues),s.value="";return}f(O.value,{fileName:I.name,handle:I.handle,statusMessage:`Opened file: ${I.name}`})}catch(I){o.value=d(I,"打开文件失败。"),s.value=""}}async function F(I=!1){const O=le(),B=K();try{if(g.value&&!I){await ft(g.value,O),b.value=g.value.name||B,k.value=!1,o.value="",s.value=`Saved to file: ${b.value}`;return}if(p){const L=await Qa(B,O);if(!L)return;g.value=L,b.value=L.name||B,k.value=!1,o.value="",s.value=`Saved to file: ${b.value}`;return}X(B,O,"application/json;charset=utf-8"),g.value=null,b.value=B,k.value=!1,o.value="",s.value=`Downloaded file: ${B}`}catch(L){o.value=d(L,"保存文件失败。"),s.value=""}}async function te(){const I=await H();if(!I){o.value="当前画布没有可导出的SVG。",s.value="";return}o.value="",X(`${w(a.title)}.svg`,I,"image/svg+xml;charset=utf-8")}async function de(){const I=await z();if(!I){o.value="当前画布没有可导出的SVG。",s.value="";return}const O=a.title.trim()||"归元档案预览",B=Ma(u.value,i.paper),L=B.map(E=>Me(Ea(I,E,O),!1)),U=window.open("","_blank","width=1440,height=960");if(!U){o.value="浏览器阻止了打印窗口。请允许弹出窗口后重试。",s.value="";return}o.value="",s.value=`已生成${B.length}个打印页面。`,U.document.open(),U.document.write(Fa({title:O,paper:i.paper,pages:B,pageSvgMarkups:L})),U.document.close()}async function ue(){s.value="正在导出JSON...";try{const I=await ut(a),O=Xe(I,i);X(`${w(a.title)}.json`,Je(O),"application/json;charset=utf-8"),s.value="已导出包含图片的JSON包。",o.value=""}catch(I){o.value=d(I,"导出失败"),s.value=""}}async function j(I){var U;const O=I.target,B=(U=O.files)==null?void 0:U[0];if(O.value="",!B||!M())return;const L=qe(await B.text());if(!L.ok){o.value=Fe(L.issues),s.value="";return}f(L.value,{fileName:B.name,handle:null,statusMessage:`已导入文件：${B.name}`})}async function pe(I){var B,L;const O=(L=(B=r.value)==null?void 0:B.getSvgElement)==null?void 0:L.call(B);if(!O||u.value.cards.length===0){o.value="当前画布没有可导出的内容。",s.value="";return}s.value="正在生成分享页面...",o.value="";try{const U=await qa({publication:a,settings:i,layout:u.value,svgElement:O,password:I||void 0,onProgress:(R,V)=>{s.value=`Generating share page... ${V}%`}}),E=`${w(a.title)}-分享.html`;X(E,U,"text/html;charset=utf-8"),s.value="分享页面已生成并下载。",o.value=""}catch(U){o.value=d(U,"生成分享页面失败。"),s.value=""}}return{draftFileHandle:g,draftFileName:b,hasUnsavedFileChanges:k,nativeFileAccessSupported:p,getIsApplyingFileDraft:C,sanitizeFileName:w,shouldReplaceCurrentDraft:M,openDraftFile:$,saveDraftFile:F,downloadSvg:te,printPublication:de,exportJson:ue,exportShareHtml:pe,importDraftFromFileEvent:j}}function vt(e){return JSON.parse(JSON.stringify(e))}function tl(e,n){return{code:"operation-conflict",path:e,message:n}}function q(e,n){return{ok:!1,issues:[tl(e,n)]}}function nl(e){return{ok:!0,value:e}}function mt(e){return Object.values(e.families)}function be(e){return typeof e=="string"&&e.length>0}function sl(e,n){var s;return((s=e.people[n])==null?void 0:s.name)??n}function _e(e,n){const s=Object.keys(n==="p"?e.people:e.families);let o=0;return s.forEach(d=>{if(!d.startsWith(n))return;const c=Number(d.slice(1));Number.isFinite(c)&&(o=Math.max(o,c))}),`${n}${o+1}`}function re(e,n){const s=_e(e,"p"),o={id:s,name:n.name,gender:n.gender,note:n.note};return e.people[s]=o,o}function Q(e,n){var s;return(s=mt(e).find(o=>o.adults.includes(n)))==null?void 0:s.id}function ye(e,n){var s;return(s=mt(e).find(o=>o.children.includes(n)))==null?void 0:s.id}function we(e,n){const s=Q(e,n);if(s)return e.families[s];const o=_e(e,"f"),d={id:o,adults:[n],children:[]};return e.families[o]=d,d}function Ze(e,n){const s=[];n.adults.forEach(d=>{be(d)&&e.people[d]&&!s.includes(d)&&s.push(d)});const o=[];n.children.forEach(d=>{e.people[d]&&!s.includes(d)&&!o.includes(d)&&o.push(d)}),n.adults=s,n.children=o}function Ne(e,n){if(!e.people[n])return;const s=Q(e,n);return s||we(e,n).id}function ke(e){Object.values(e.families).forEach(n=>Ze(e,n)),Object.values(e.families).filter(n=>n.adults.length===0).forEach(n=>{const s=[...n.children];delete e.families[n.id],s.forEach(o=>{Ne(e,o)})}),Object.values(e.families).forEach(n=>Ze(e,n))}function ol(e,n={}){const s=[...n.focusCandidates??[],e.focusFamilyId,Object.keys(e.families)[0]].find(d=>!!(d&&e.families[d]))??"",o=[...n.selectionCandidates??[],Object.keys(e.people)[0]].find(d=>!!(d&&e.people[d]))??"";return e.focusFamilyId=s,{focusFamilyId:s,selectedPersonId:o}}function al(e){return Le(e)}function Te(e,n){const s=Q(e,n);if(!s)return null;const o=e.families[s].adults.find(d=>d!==n);return o?e.people[o]??null:null}function ht(e,n){const s=Q(e,n);return s?e.families[s].children.map(o=>e.people[o]).filter(o=>!!o):[]}function gt(e,n){const s=ye(e,n);return s?e.families[s].adults.map(o=>e.people[o]).filter(o=>!!o):[]}function ll(e,n){if(!e.people[n])return null;const o=Te(e,n)?[Te(e,n).name]:[],d=gt(e,n).map(l=>l.name),c=ht(e,n).map(l=>l.name),r=vt(e);Object.values(r.families).forEach(l=>{l.adults=l.adults.filter(v=>v!==n),l.children=l.children.filter(v=>v!==n)}),delete r.people[n];const u=new Set(Object.keys(e.families));ke(r);const a=new Set(Object.keys(r.families)),i=[...u].filter(l=>!a.has(l));return{spouseNames:o,parentNames:d,childNames:c,removedFamilyIds:i}}function rl(e,n){var A;const s=vt(e),o=Le(s);if(o.length>0)return{ok:!1,issues:o};const c="personId"in n?n.personId:n.parentPersonId,r=s.people[c];if(!r)return q("personId","目标人物不存在。");let u=[],a=[],i="";switch(n.type){case"add-spouse":{const h=we(s,n.personId);if(h.adults.filter(be).length>=2)return q("personId",`${r.name} 已有配偶关系。`);const g=r.gender==="male"?"female":r.gender==="female"?"male":"unknown",b=re(s,{name:"待命名配偶",gender:g,note:"配偶"});h.adults=[n.personId,b.id],a=[b.id],i=`新增配偶 · ${r.name}`;break}case"add-child":{const h=we(s,n.personId),g=n.gender==="female",b=re(s,{name:g?"待命名女儿":"待命名儿子",gender:n.gender});h.children=[...h.children,b.id],b.note=Ot(s,b.id)||(g?"女儿":"儿子"),r.gender==="female"&&(u=[h.id]),a=[b.id],i=`${g?"新增女儿":"新增儿子"} · ${r.name}`;break}case"add-parents":{const h=ye(s,n.personId);if(!h){const C=re(s,{name:"待命名父亲",gender:"male",note:"父亲"}),w=re(s,{name:"待命名母亲",gender:"female",note:"母亲"}),z=_e(s,"f");s.families[z]={id:z,adults:[C.id,w.id],children:[n.personId]},u=[z],a=[C.id],i=`新增父母 · ${r.name}`;break}const g=s.families[h],b=g.adults.filter(be);if(b.length>=2)return q("personId",`${r.name} 已有完整父母关系。`);if(b.length===0){const C=re(s,{name:"待命名父亲",gender:"male",note:"父亲"}),w=re(s,{name:"待命名母亲",gender:"female",note:"母亲"});g.adults=[C.id,w.id],u=[g.id],a=[C.id],i=`新增父母 · ${r.name}`;break}const k=s.people[b[0]],p=(k==null?void 0:k.gender)==="male"?"female":(k==null?void 0:k.gender)==="female"?"male":"unknown",S=re(s,{name:p==="male"?"待命名父亲":p==="female"?"待命名母亲":"待命名父母",gender:p,note:p==="male"?"父亲":p==="female"?"母亲":"父母"});g.adults=p==="male"?[S.id,...b]:[...b,S.id],u=[g.id],a=[S.id],i=`新增父母 · ${r.name}`;break}case"focus-branch":{const h=we(s,n.personId);h.adults[0]!==n.personId&&(h.adults=[n.personId,...h.adults.filter(g=>g!==n.personId)]),u=[h.id],a=[n.personId],i=`设为当前宗支 · ${r.name}`;break}case"set-branch-mode":{const h=Q(s,n.personId);if(!h)return q("personId",`${r.name} 暂无可设置的婚配归属。`);const g=Bt(s,h),b=g?s.people[g]:null;if(!b||b.gender!=="female")return q("personId","只有女性承支家庭需要区分外嫁或招婿。");s.families[h].branchMode=n.branchMode,u=[h],a=[n.personId],i=`${n.branchMode==="uxorilocal"?"设为招婿支":"设为外嫁支"} · ${b.name}`;break}case"swap-partners":{const h=Q(s,n.personId);if(!h)return q("personId",`${r.name} 暂无可切换的配偶关系。`);const g=s.families[h];if(g.adults.filter(be).length<2)return q("personId",`${r.name} 暂无可切换的配偶关系。`);g.adults=[...g.adults].reverse(),a=[n.personId],u=[g.id],i="切换夫妻位置";break}case"move-child":{const h=Q(s,n.parentPersonId);if(!h)return q("parentPersonId",`${r.name} 暂无子女排序可调整。`);const g=s.families[h],b=g.children.indexOf(n.childId),k=b+n.direction;if(b<0||k<0||k>=g.children.length)return q("childId","子女顺序调整目标无效。");const p=[...g.children];[p[b],p[k]]=[p[k],p[b]],g.children=p,a=[n.parentPersonId],u=[g.id],i=`调整子女顺序 · ${sl(s,n.childId)}`;break}case"remove-spouse":{const h=Q(s,n.personId);if(!h)return q("personId",`${r.name} 当前没有配偶关系。`);const g=s.families[h],b=g.adults.find(k=>k!==n.personId);if(!b)return q("personId",`${r.name} 当前没有配偶关系。`);g.adults=g.adults.filter(k=>k!==b),Ne(s,b),ke(s),u=[s.focusFamilyId,g.id],a=[n.personId,b],i=`解除配偶关系 · ${r.name}`;break}case"remove-parents":{const h=ye(s,n.personId);if(!h)return q("personId",`${r.name} 当前没有父母关系。`);const g=s.families[h];g.children=g.children.filter(k=>k!==n.personId);const b=Ne(s,n.personId);ke(s),u=[b,s.focusFamilyId,g.id],a=[n.personId],i=`解除父母关系 · ${r.name}`;break}case"delete-person":{const h=(A=Te(s,n.personId))==null?void 0:A.id,g=ht(s,n.personId).map(C=>C.id),b=gt(s,n.personId).map(C=>C.id),k=Q(s,n.personId),p=ye(s,n.personId);Object.values(s.families).forEach(C=>{C.adults=C.adults.filter(w=>w!==n.personId),C.children=C.children.filter(w=>w!==n.personId)}),delete s.people[n.personId],ke(s);const S=g.map(C=>Q(s,C));u=[s.focusFamilyId,k,...S,p],a=[h,...g,...b],i=`删除人物 · ${r.name}`;break}}const l=ol(s,{focusCandidates:u,selectionCandidates:a}),v=al(s);return v.length>0?{ok:!1,issues:v}:nl({publication:s,selectedPersonId:l.selectedPersonId,focusFamilyId:l.focusFamilyId,historyLabel:i})}function il(e){const{pub:n,statusMessage:s,errorMessage:o,editorOpen:d,layoutPanelOpen:c,historyOpen:r,markHistory:u,initializeHistoryBaseline:a,canvasRef:i,revealPersonInCanvas:l,shouldReplaceCurrentDraft:v,draftFileHandle:A,draftFileName:h,hasUnsavedFileChanges:g,confirmFn:b}=e;async function k(E){return b?b(E):window.confirm(E)}const{publication:p,settings:S,selectedPersonId:C,selectedPerson:w,selectedSpouse:z,selectedParents:H,rootFamilyId:X,isPersonId:le,replaceReactiveObject:K,getDefaultSelectedPersonId:M}=n;async function f(E,R){if(R&&!await k(R))return;const V=rl(p,E);if(!V.ok){o.value=Fe(V.issues),s.value="";return}o.value="",u(V.value.historyLabel),K(p,V.value.publication),p.focusFamilyId=V.value.focusFamilyId,C.value=V.value.selectedPersonId,d.value=!!C.value,(E.type==="add-spouse"||E.type==="add-child"||E.type==="add-parents")&&l(V.value.selectedPersonId)}function $(){w.value&&f({type:"add-spouse",personId:w.value.id})}function F(E){w.value&&f({type:"add-child",personId:w.value.id,gender:E})}function te(){w.value&&f({type:"add-parents",personId:w.value.id})}function de(){w.value&&f({type:"focus-branch",personId:w.value.id})}function ue(E){w.value&&f({type:"set-branch-mode",personId:w.value.id,branchMode:E})}function j(){const E=p.families[X.value];if(!E)return;const R=E.adults.find(le);R?f({type:"focus-branch",personId:R}):(p.focusFamilyId=E.id,C.value=Object.keys(p.people)[0]??""),o.value="",s.value="已返回父系主谱",$e(()=>{var V,Ve;(Ve=(V=i.value)==null?void 0:V.resetView)==null||Ve.call(V)})}function pe(){w.value&&f({type:"swap-partners",personId:w.value.id})}function I(E,R){w.value&&f({type:"move-child",parentPersonId:w.value.id,childId:E,direction:R})}async function O(){const E=w.value,R=z.value;!E||!R||await f({type:"remove-spouse",personId:E.id},`将解除 ${E.name} 与 ${R.name} 的配偶关系，是否继续？`)}async function B(){const E=w.value;!E||!H.value.length||await f({type:"remove-parents",personId:E.id},`将解除 ${E.name} 与 ${H.value.map(R=>R.name).join("、")} 的父母关系，是否继续？`)}async function L(){const E=w.value;if(!E)return;const R=ll(p,E.id),V=R?[R.spouseNames.length?`配偶：${R.spouseNames.join("、")}`:"",R.parentNames.length?`父母：${R.parentNames.join("、")}`:"",R.childNames.length?`子女：${R.childNames.join("、")}`:"",R.removedFamilyIds.length?`清理家庭：${R.removedFamilyIds.join("、")}`:""].filter(Boolean).join(`
`):"";await f({type:"delete-person",personId:E.id},`将删除人物"${E.name}"。${V?`
${V}
`:`
`}是否继续？`)}function U(){v()&&(K(p,structuredClone(We)),K(S,structuredClone(Se)),C.value=M(We),A.value=null,h.value="",g.value=!0,c.value=!1,d.value=!0,r.value=!1,o.value="",s.value="已新建空白族谱，可先修改始祖姓名，再继续补配偶和子女。",a(),$e(()=>{var E,R;(R=(E=i.value)==null?void 0:E.resetView)==null||R.call(E)}))}return{applyEditorAction:f,addSpouse:$,addChild:F,addParents:te,focusSelectedBranch:de,updateSelectedBranchMode:ue,returnToMainBranch:j,swapPartnerOrder:pe,moveChild:I,removeSpouseRelation:O,removeParentsRelation:B,deleteSelectedPerson:L,createBlankDraft:U}}function dl(e){return typeof e=="string"?e:Array.isArray(e)&&typeof e[0]=="string"?e[0]:""}function ul({route:e,router:n,publication:s,targetPublicationId:o,loadedPublicationId:d,selectedPersonId:c,editorOpen:r,revealPersonInCanvas:u}){let a="";ve(()=>{const i=dl(e.query.personId);return{personId:i,targetPublicationId:o.value,loadedPublicationId:d.value,personPresent:i?!!s.people[i]:!1}},async({personId:i,targetPublicationId:l,loadedPublicationId:v,personPresent:A})=>{if(!i){a="";return}if(!l||v!==l||!A)return;const h=`${l}:${i}`;if(a===h)return;a=h,c.value=i,r.value=!0,u(i);const g={...e.query};delete g.personId,await n.replace({name:e.name??"workbench",params:e.params,query:g})},{immediate:!0})}const cl={class:"app-shell"},pl={class:"workspace"},fl={class:"editor-workspace"},hl=ie({__name:"WorkbenchView",props:{publicationId:{}},setup(e){const n=e,s=tt(),o=Dt(),d=T(Rt()??""),c=T(null);let r=null;async function u(M){return c.value=M,new Promise(f=>{r=f})}function a(M){c.value=null,r&&(r(M),r=null)}const i=Re("publication-context"),l=pa(),v=Ht(),A=fa(i.pub),h=Nt(),g=T(null);function b(M){$e(()=>{var F,te;const f=l.historyOpen.value?388:l.layoutPanelOpen.value?360:24,$=l.editorOpen.value?444:24;(te=(F=g.value)==null?void 0:F.revealPerson)==null||te.call(F,M,{padding:40,leftInset:f,rightInset:$,topInset:84,bottomInset:48})})}function k(){var M,f;(f=(M=g.value)==null?void 0:M.resetView)==null||f.call(M)}function p(M){const f=Number((i.pub.settings.zoom+M).toFixed(2));i.pub.settings.zoom=Math.min(1.35,Math.max(.1,f))}const S=el({pub:i.pub,statusMessage:v.statusMessage,errorMessage:v.errorMessage,getErrorMessage:v.getErrorMessage,initializeHistoryBaseline:i.history.initializeHistoryBaseline,canvasRef:g,layout:i.pub.layout,onImport(){i.serverPublicationId.value=null,setTimeout(i.saveToServer,100)}}),C=il({pub:i.pub,statusMessage:v.statusMessage,errorMessage:v.errorMessage,editorOpen:l.editorOpen,layoutPanelOpen:l.layoutPanelOpen,historyOpen:l.historyOpen,markHistory:i.history.markHistory,initializeHistoryBaseline:i.history.initializeHistoryBaseline,canvasRef:g,revealPersonInCanvas:b,shouldReplaceCurrentDraft:S.shouldReplaceCurrentDraft,draftFileHandle:S.draftFileHandle,draftFileName:S.draftFileName,hasUnsavedFileChanges:S.hasUnsavedFileChanges,confirmFn:u});function w(M){i.pub.selectedPersonId.value===M?l.editorOpen.value=!0:i.pub.selectedPersonId.value=M}function z(){i.pub.selectedPerson.value&&(l.editorOpen.value=!0)}function H(){l.editorOpen.value=!1}function X(M){Object.assign(i.pub.settings,M)}function le(){i.pub.selectedPerson.value&&b(i.pub.selectedPerson.value.id)}function K(){o.push({name:"publications"})}return ul({route:s,router:o,publication:i.pub.publication,targetPublicationId:zt(n,"publicationId"),loadedPublicationId:i.serverPublicationId,selectedPersonId:i.pub.selectedPersonId,editorOpen:l.editorOpen,revealPersonInCanvas:b}),ve(()=>h.currentTheme.value,M=>{X(M==="su-style"?{layoutMode:"su"}:M==="ou-style"?{layoutMode:"ou"}:{layoutMode:"modern"})},{immediate:!0}),ve(()=>i.pub.selectedPerson.value,M=>{M||(l.editorOpen.value=!1)}),ve(()=>[i.pub.publication,i.pub.settings],()=>{S.getIsApplyingFileDraft()||(S.hasUnsavedFileChanges.value=!0)},{deep:!0}),(M,f)=>{var $;return y(),x("div",cl,[W(wo,{fileName:m(S).draftFileName.value,dirty:m(S).hasUnsavedFileChanges.value,nativeFileAccess:m(S).nativeFileAccessSupported,currentTheme:m(h).currentTheme.value,currentUsername:d.value,syncStatus:m(i).syncStatus.value,onImportJson:m(S).importDraftFromFileEvent,onOpenFile:m(S).openDraftFile,onCreateBlank:m(C).createBlankDraft,onSaveFile:f[0]||(f[0]=F=>m(S).saveDraftFile()),onSaveFileAs:f[1]||(f[1]=F=>m(S).saveDraftFile(!0)),onDownloadSvg:m(S).downloadSvg,onExportJson:m(S).exportJson,onExportShareHtml:m(S).exportShareHtml,onChangeTheme:m(h).setTheme,onLogout:K,onGoBack:K,onViewStats:f[2]||(f[2]=F=>m(o).push({name:"publication-stats"})),onViewTimeline:f[3]||(f[3]=F=>m(o).push({name:"publication-timeline"}))},null,8,["fileName","dirty","nativeFileAccess","currentTheme","currentUsername","syncStatus","onImportJson","onOpenFile","onCreateBlank","onDownloadSvg","onExportJson","onExportShareHtml","onChangeTheme"]),W(Tt,{errorMessage:m(v).errorMessage.value,statusMessage:m(v).statusMessage.value,onDismiss:m(v).dismiss},null,8,["errorMessage","statusMessage","onDismiss"]),t("main",pl,[t("section",fl,[W(ca,{layoutPanelOpen:m(l).layoutPanelOpen.value,historyOpen:m(l).historyOpen.value,focusFamilyLabel:m(i).pub.focusFamilyLabel.value,canReturnToMainBranch:!m(i).pub.isRootFamilyFocused.value,canUndo:m(i).history.canUndo.value,canRedo:m(i).history.canRedo.value,zoom:m(i).pub.settings.zoom,hasSelectedPerson:!!m(i).pub.selectedPerson.value,selectedPersonName:(($=m(i).pub.selectedPerson.value)==null?void 0:$.name)||"",selectedPersonMeta:m(i).pub.selectedPersonMeta.value,canFocusSelectedBranch:!!(m(i).pub.selectedPerson.value&&!m(i).pub.isSelectedBranchFocused.value),settings:m(i).pub.settings,historyPastCount:m(i).history.historyPast.value.length,historyFutureCount:m(i).history.historyFuture.value.length,visibleHistoryEntries:m(i).history.visibleHistoryEntries.value,onToggleLayout:m(l).toggleLayoutPanel,onToggleHistory:m(l).toggleHistoryPanel,onReturnMainBranch:m(C).returnToMainBranch,onResetCanvasView:k,onUndo:m(i).history.undoChange,onRedo:m(i).history.redoChange,onAdjustZoom:p,onUpdateSettings:X,onOpenEditor:z,onRevealSelectedPerson:le,onFocusSelectedBranch:m(C).focusSelectedBranch,onCloseLayout:f[4]||(f[4]=F=>m(l).layoutPanelOpen.value=!1),onCloseHistory:f[5]||(f[5]=F=>m(l).historyOpen.value=!1)},null,8,["layoutPanelOpen","historyOpen","focusFamilyLabel","canReturnToMainBranch","canUndo","canRedo","zoom","hasSelectedPerson","selectedPersonName","selectedPersonMeta","canFocusSelectedBranch","settings","historyPastCount","historyFutureCount","visibleHistoryEntries","onToggleLayout","onToggleHistory","onReturnMainBranch","onUndo","onRedo","onFocusSelectedBranch"]),W(Ke,{ref_key:"canvasRef",ref:g,panX:m(i).viewportPan.value.x,"onUpdate:panX":f[6]||(f[6]=F=>m(i).viewportPan.value.x=F),panY:m(i).viewportPan.value.y,"onUpdate:panY":f[7]||(f[7]=F=>m(i).viewportPan.value.y=F),publication:m(i).pub.publication,settings:m(i).pub.settings,layout:m(i).pub.layout.value,selectedPersonId:m(i).pub.selectedPersonId.value,onUpdateZoom:f[8]||(f[8]=F=>m(i).pub.settings.zoom=F),onSelectPerson:w},null,8,["panX","panY","publication","settings","layout","selectedPersonId"]),m(i).pub.selectedPerson.value?(y(),ce(Bs,{key:0,open:m(l).editorOpen.value,person:m(i).pub.selectedPerson.value,publicationId:m(i).serverPublicationId.value,suggestion:m(A).editorSelectedPersonSuggestion.value,lineageSuggestion:m(i).pub.selectedPersonLineageSuggestion.value,details:m(A).editorSelectedPersonDetails.value,spouse:m(i).pub.selectedSpouse.value,parents:m(i).pub.selectedParents.value,children:m(i).pub.selectedChildren.value,childItems:m(i).pub.selectedChildItems.value,canAddSpouse:m(i).pub.canAddSpouse.value,hasCompleteParents:m(i).pub.hasCompleteParents.value,canSwapAdults:m(i).pub.canSwapAdults.value,isSelectedBranchFocused:m(i).pub.isSelectedBranchFocused.value,canSetBranchMode:m(i).pub.canSetSelectedBranchMode.value,branchMode:m(i).pub.selectedBranchMode.value,parentActionLabel:m(i).pub.parentActionLabel.value,branchActionLabel:m(A).editorBranchActionLabel.value,onClose:H,onSelectPerson:w,onAddSpouse:m(C).addSpouse,onAddChild:m(C).addChild,onAddParents:m(C).addParents,onRemoveSpouse:m(C).removeSpouseRelation,onRemoveParents:m(C).removeParentsRelation,onFocusBranch:m(C).focusSelectedBranch,onUpdateBranchMode:m(C).updateSelectedBranchMode,onSwapPartners:m(C).swapPartnerOrder,onMoveChild:f[9]||(f[9]=F=>m(C).moveChild(F.childId,F.direction)),onUpdatePersonField:m(A).updateSelectedPersonField,onUpdatePersonGender:m(A).updateSelectedPersonGender,onApplyNoteSuggestion:f[10]||(f[10]=F=>m(A).updateSelectedPersonField({field:"note",value:F})),onDeletePerson:m(C).deleteSelectedPerson},null,8,["open","person","publicationId","suggestion","lineageSuggestion","details","spouse","parents","children","childItems","canAddSpouse","hasCompleteParents","canSwapAdults","isSelectedBranchFocused","canSetBranchMode","branchMode","parentActionLabel","branchActionLabel","onAddSpouse","onAddChild","onAddParents","onRemoveSpouse","onRemoveParents","onFocusBranch","onUpdateBranchMode","onSwapPartners","onUpdatePersonField","onUpdatePersonGender","onDeletePerson"])):N("",!0)])]),W(et,{modelValue:c.value!==null,title:"确认操作",message:c.value||"",confirmLabel:"确认",tone:"danger",onConfirm:f[11]||(f[11]=F=>a(!0)),onCancel:f[12]||(f[12]=F=>a(!1)),"onUpdate:modelValue":f[13]||(f[13]=F=>{F||a(!1)})},null,8,["modelValue","message"])])}}});export{hl as default};
