(window.webpackJsonpapp=window.webpackJsonpapp||[]).push([[0],{165:function(e,t,a){e.exports=a(297)},170:function(e,t,a){},297:function(e,t,a){"use strict";a.r(t);var n=a(1),r=a.n(n),l=a(76),c=a.n(l),o=(a(170),a(147)),s=a(20),i=a(148),u=a.n(i),m=(a(181),a(303)),p=a(306),d=a(305),y=a(311),b=a(63),f=a(149),E=a(313),h=a(304),g=a(315),v=a(317),O=a(325),j=a(321),k=a(316),x=a(323),S=a(319),w=a(318),N=a(314);function C(e){return e.replace(/_/," ").replace(/(?:(^|\(|"|\s|-|,)\w)\w+/g,function(e){return e===e.toUpperCase()?e.toLowerCase():e}).replace(/(?:^|\(|"|\s|-|,)\w/g,function(e){return e.toUpperCase()})}function D(e){var t=new Date;return t.setDate(t.getDate()-e),t}function _(e){var t="".concat(e.getMonth()+1,"/").concat(e.getDate()),a=e.toLocaleTimeString().split(/[:\s]/);return e.getHours()?"".concat(a[0]," ").concat(a.slice(-1)):t}function A(e){return e.toISOString().split("T")[0]}function P(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),a.push.apply(a,n)}return a}function z(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?P(a,!0).forEach(function(t){Object(f.a)(e,t,a[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):P(a).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))})}return e}function L(e){var t=e.analysis,a=Object(n.useState)("temperature"),l=Object(s.a)(a,2),c=l[0],o=l[1];return r.a.createElement("div",null,r.a.createElement(m.a,null,r.a.createElement(E.a,{justify:!0,className:"flex-nowrap h6 w-100",activeKey:c,onSelect:function(e){return o(e)}},["temperature","dewpoint","wind_speed","cloud_cover","precip_chance"].map(function(e){return r.a.createElement(h.a,{eventKey:e,title:Object.keys(t).includes(e)?t[e].metadata.display_name:C(e),key:e,disabled:!Object.keys(t).includes(e)})}))),r.a.createElement(F,{className:"w-100",analysis:t[c]}))}function F(e){var t,a,l=e.analysis,c=Object(n.useState)([]),o=Object(s.a)(c,2),i=o[0],u=o[1],y=Object(n.useCallback)(u,[]);return"precip_chance"===l.metadata.prop_name?(t=r.a.createElement(J,{analysis:l,onCursorChange:y}),a=r.a.createElement(H,{displayInfo:z({},l.metadata,{},{units:{x:l.metadata.units,y:""}}),data:i})):(t=r.a.createElement(M,{analysis:l,onCursorChange:y}),a=r.a.createElement(H,{displayInfo:l.metadata,data:i})),r.a.createElement(d.a,null,r.a.createElement("div",{className:"chart-container"},t),r.a.createElement(m.a,null,r.a.createElement(p.a,null,r.a.createElement(d.a,{xs:11},a))))}var M=r.a.memo(function(e){var t=e.analysis,a=e.onCursorChange,l=Object(n.useState)(null),c=Object(s.a)(l,2),o=c[0],i=c[1],u=B(t,o),m=function(e,t){var a=[],n=B(e,t);a.push(r.a.createElement(x.a,{displayName:"Forecast",key:"Forecast",color:"red"},n.map(function(t,a){return r.a.createElement(S.a,{displayName:"".concat(t,"-Day"),name:"".concat(t,"-Day"),key:t,data:Object.entries(e.lead_days[t].fcasts),x:function(e){return new Date(e[0])},y:1,style:{data:{opacity:a>=1?(8-a)/10:1}}})}))),a.push(r.a.createElement(x.a,{displayName:"Actual",key:"Actual",color:"black"},r.a.createElement(S.a,{displayName:"Actual",name:"Actual",data:Object.entries(e.obs),x:function(e){return new Date(e[0])},y:1})));var l=[];t&&(l=Object.entries(e.lead_days[t].errors).reduce(function(a,n){var r=Object(s.a)(n,2),l=r[0],c=r[1],o=new Date(l),i={x:o,y:e.lead_days[t].fcasts[l],y0:e.obs[l],amount:c},u=a.length>0&&a[a.length-1];return u&&u.slice(-1)[0].x.valueOf()===o.valueOf()-36e5?u.push(i):a.push([i]),a},[]).map(function(e,t){return r.a.createElement(w.a,{displayName:"Error-Area-".concat(t),key:"Error-Area-".concat(t),name:"Error-Area-".concat(t),data:e})}));return a.push(r.a.createElement(x.a,{displayName:"Error",key:"Error",style:{data:{opacity:.4,fill:"magenta",stroke:"magenta"},legendSymbol:{type:"square"}}},l)),a}(t,o),y=function(e,t){var a=[],n=t.find(function(e){return"Forecast"===e.props.displayName}),r=t.filter(function(e){return"Forecast"!==e.props.displayName});return a.push.apply(a,Object(b.a)(Object.keys(e.lead_days).map(function(e){var t="".concat(e,"-Day"),a=n.props.children.find(function(e){return e.props.name===t}),r=a&&z({},a.props.theme.line.style,{},a.props.style);return{name:"".concat(e,"-Day"),symbol:{opacity:a?r.data.opacity:.1,fill:n.props.color,cursor:"pointer"},labels:{opacity:a?1:.2,cursor:"pointer"}}}))),a.push.apply(a,Object(b.a)(r.map(function(e){var t=z({},e.props.theme.line.style,{},e.props.style),a=0!==e.props.children.length;return{name:e.props.displayName,symbol:{opacity:a?t.data.opacity:.2,fill:t.data.stroke,cursor:"pointer",type:t.legendSymbol&&t.legendSymbol.type?t.legendSymbol.type:"circle"},labels:{opacity:a?1:.2,cursor:"pointer"}}}))),a}(t,m);return r.a.createElement(p.a,{className:"pt-3"},r.a.createElement(d.a,{xs:12,className:"w-100"},r.a.createElement(q,{activeDay:o,analysis:t})),r.a.createElement(d.a,{xs:12,className:"w-100"},r.a.createElement(g.a,{scale:{x:"time"},domainPadding:{y:20},padding:{top:25,bottom:50,left:50,right:75},containerComponent:r.a.createElement(v.a,{voronoiDimension:"x",labels:function(){return null},labelComponent:r.a.createElement(I,null),onActivated:function(e){return a(e)}})},r.a.createElement(O.a,{tickCount:6,tickFormat:_,style:{ticks:{stroke:"black",size:5},tickLabels:{fontSize:12},grid:{stroke:"grey"}},offsetY:50}),r.a.createElement(O.a,{dependentAxis:!0,crossAxis:!1,axisLabelComponent:r.a.createElement(j.a,{dx:-15,angle:0}),label:t.metadata.units,style:{grid:{stroke:"grey"},tickLabels:{fontSize:12}}}),r.a.createElement(k.a,{data:y,events:[{eventHandlers:{onClick:function(e,n){n&&n.datum&&function(e){var n=Object.keys(t.lead_days),r=e.split("-Day"),l=Object(s.a)(r,1)[0];!o&&e.includes("Error")?i(u[0]):o&&u.includes(l)||!n.includes(l)?("Actual"===e||u.includes(l))&&i(null):i(l),a([])}(n.datum.name)}}}],x:25,y:10,orientation:"horizontal",borderPadding:{top:0,bottom:0,left:5,right:0},gutter:10,symbolSpacer:5,style:{labels:{fontSize:9}}}),m)))});function B(e,t){return t?[t]:Object.keys(e.lead_days)}function I(e){var t=e.x,a=e.scale.y.range();return r.a.createElement("line",{style:{stroke:"lightgrey",strokeWidth:1},x1:t,x2:t,y1:Math.max.apply(Math,Object(b.a)(a)),y2:Math.min.apply(Math,Object(b.a)(a))})}function q(e){var t=e.analysis,a=e.activeDay,n=a?"".concat(a,"-Day"):"Cumulative",l=a?t.lead_days[a].stats:t.cumulative_stats;return r.a.createElement(m.a,null,r.a.createElement(p.a,{className:"d-flex justify-content-center"},r.a.createElement("h6",null,"Forecast Accuracy: ".concat(n))),r.a.createElement(p.a,{className:"d-flex justify-content-center"},Object.keys(l).map(function(e){return Object.keys(l[e]).map(function(a){return!!e.includes(a)&&r.a.createElement(U,{label:e,value:l[e][a],units:t.metadata.units,key:a})})}).flat().filter(Boolean)))}function H(e){var t=e.displayInfo,a=e.data;if(!a||0===a.length)return"";var n=t.units;n&&Object.getPrototypeOf(n)===Object.prototype||(n={x:n,y:n});var l=t.display_name||"",c="";if(a[0]._x instanceof Date){var o=a[0]._x.toLocaleString({dateStyle:"short",timeStyle:"short"}).split(","),i=Object(s.a)(o,2),u=i[0],m=i[1];c="".concat(l&&" on ").concat(u," at ").concat(m)}else c="".concat(l&&": ").concat(a[0][0]," ").concat(n.x);l="".concat(l).concat(c);var y,b=[];return a.forEach(function(e){null!==e._y&&(e.childName.includes("Error")?y=r.a.createElement(U,{label:"Forecast Error",value:e.amount,units:n.y,key:"Forecast Error",className:"text-danger"}):b.push(r.a.createElement(U,{label:e.childName,value:e._y,units:n.y,key:e.childName})))}),y&&b.push(y),r.a.createElement(d.a,{className:"h6 font-weight-normal"},r.a.createElement(p.a,{className:"pb-2"},l),r.a.createElement(p.a,null,b))}function U(e){var t,a=e.label,n=e.value,l=e.units,c=e.type,o=e.className,s=function(e,t){return"".concat(Math.round(10*e)/10," ").concat(t)};return t="accuracy"===(c||a).toLowerCase()?s(100*n,"%"):s(n,l),r.a.createElement("span",{className:"mr-3 d-inline-block ".concat(o)},r.a.createElement("span",null," ",C(a),": "),r.a.createElement("span",{className:"font-weight-light ml-2"}," ",t," "))}var J=r.a.memo(function(e){var t=e.analysis,a=e.onCursorChange,l=Object(n.useState)(null),c=Object(s.a)(l,2),o=c[0],i=c[1],u=o?t.lead_days[o].stats:t.cumulative_stats,d=Object.entries(u.bin_count.bins),y=Object.keys(t.lead_days).map(function(e){return{name:"".concat(e,"-Day"),symbol:{opacity:o===e?1:.2,fill:"darkblue",type:"square",cursor:"pointer"},labels:{opacity:o===e?1:.3,cursor:"pointer"}}});return y.push({name:"Cumulative",symbol:{opacity:o?.2:1,fill:"darkblue",type:"square",cursor:"pointer"},labels:{opacity:o?.3:1,cursor:"pointer"}}),y.push({name:"Expected",symbol:{fill:"lightblue",type:"square"}}),r.a.createElement(m.a,{className:"pt-3"},r.a.createElement(p.a,{className:"d-flex justify-content-center"},r.a.createElement("h6",null,"Precipitation Chance Bin Counts")),r.a.createElement(p.a,{className:"d-flex justify-content-center"},r.a.createElement(U,{label:"Bias",value:u.bin_count.bias,units:"%"})),r.a.createElement(p.a,null,r.a.createElement(g.a,{padding:{top:25,bottom:50,left:50,right:75},containerComponent:r.a.createElement(v.a,{voronoiDimension:"x",labels:function(){return null},labelComponent:r.a.createElement(I,null),onActivated:function(e){return a(e)}})},r.a.createElement(k.a,{x:15,y:5,orientation:"horizontal",borderPadding:{top:0,bottom:0,left:5,right:0},gutter:10,symbolSpacer:5,style:{labels:{fontSize:9}},data:y,events:[{eventHandlers:{onClick:function(e,t,n,r){t&&t.datum&&function(e){var t="Cumulative"===e?[null]:e.split("-Day"),n=Object(s.a)(t,1)[0];o!==n&&"Expected"!==n&&i(n),a([])}(t.datum.name)}}}]}),r.a.createElement(O.a,{style:{ticks:{stroke:"black",size:5},tickLabels:{fontSize:12},grid:{stroke:"grey"}},label:"Forecasted chance of pricipitation (%)",offsetY:50,axisLabelComponent:r.a.createElement(j.a,{dy:5,style:{fontSize:11}})}),r.a.createElement(O.a,{dependentAxis:!0,crossAxis:!1,style:{grid:{stroke:"grey"},tickLabels:{fontSize:12}},label:"Number of precipitation observations",axisLabelComponent:r.a.createElement(j.a,{dy:-5,angle:-90,style:{fontSize:11}})}),r.a.createElement(x.a,{colorScale:["darkblue","lightblue"],offset:5},r.a.createElement(N.a,{name:"Observed occurances",data:d,x:0,y:[1,"obs"]}),r.a.createElement(N.a,{name:"Predicted occurances",data:d,x:0,y:[1,"predicted"]})))))}),R=D(8),T=D(1),W=new Date(2019,0,24),K=D(1);function Y(e){var t=e.handleSubmit,a=Object(n.useState)(R),l=Object(s.a)(a,2),c=l[0],o=l[1],i=Object(n.useState)(T),u=Object(s.a)(i,2),b=u[0],f=u[1],E="";return null===c||null===b?E="Data not available for all selected dates.":c?b?b<c&&(E="Start date must be before end date."):E="Select valid end date.":E="Select valid start date.",r.a.createElement(m.a,null,r.a.createElement(p.a,{className:"d-flex justify-content-center"},r.a.createElement(d.a,{xs:"auto"},r.a.createElement(X,{label:"Start",value:c,onChange:o})),r.a.createElement(d.a,{xs:"auto"},r.a.createElement(X,{label:"End",value:b,onChange:f})),r.a.createElement(d.a,{md:2,className:"d-flex align-self-center justify-content-center mt-3"},r.a.createElement(y.a,{disabled:E,onClick:function(){E||t(c,b)}},"Submit"))),r.a.createElement(p.a,null,r.a.createElement(d.a,null,r.a.createElement("span",{className:"text-center text-danger position-absolute w-100"},E))))}function X(e){var t=e.label,a=e.onChange,n=Object(o.a)(e,["label","onChange"]),l={before:W,after:K};return r.a.createElement(d.a,{className:"pb-3"},r.a.createElement(p.a,null,r.a.createElement(d.a,null,r.a.createElement("label",null,"".concat(t,":")))),r.a.createElement(p.a,null,r.a.createElement(d.a,null,r.a.createElement(u.a,Object.assign({},n,{onDayChange:function(e,t){a(t.disabled?null:e)},dayPickerProps:{disabledDays:l}})))))}Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));c.a.render(r.a.createElement(function(e){var t=e.apiURL,a=e.initialData,l=void 0!==a&&a,c=Object(n.useState)(JSON.parse(l)),o=Object(s.a)(c,2),i=o[0],u=o[1],d=Object(n.useState)("Select date range."),y=Object(s.a)(d,2),b=y[0],f=y[1],E=function(e,a){f("Retrieving..."),u(null),fetch("".concat(t,"start=").concat(A(e),"&end=").concat(A(a))).then(function(e){return e.json()}).then(function(e){u(e)}).catch(function(e){return f(e.message)})};return Object(n.useEffect)(function(){l||E(R,T)},[]),r.a.createElement("div",null,r.a.createElement(m.a,null,r.a.createElement(p.a,{className:"py-5"},r.a.createElement(Y,{handleSubmit:E}))),r.a.createElement("div",null,i?r.a.createElement(L,{analysis:i}):r.a.createElement(m.a,null,r.a.createElement(p.a,{className:"d-flex justify-content-center"},b))))},{apiURL:"/OAX/forecasts/analyze?",initialData:window.CACHED_DATA}),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then(function(e){e.unregister()})}},[[165,1,2]]]);
//# sourceMappingURL=main.1b423dcf.chunk.js.map