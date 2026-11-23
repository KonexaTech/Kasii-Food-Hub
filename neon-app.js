import { createAuthClient } from "https://esm.sh/@neon/auth@latest";
import { parseMenuText, formatMenuText, planMenuChanges } from "./menu-text.mjs";
import { APP_CONFIG } from "./app-config.js";
const AUTH_URL=APP_CONFIG.authUrl || "https://unconfigured.invalid/neondb/auth";
const auth=createAuthClient(AUTH_URL,{fetchOptions:{credentials:"include"}});
const $=id=>document.getElementById(id), role=document.body.dataset.role;
const API=APP_CONFIG.apiUrl || "https://unconfigured.invalid";
let requestId=null,menu=[],cart=[];
if(!APP_CONFIG.authUrl||!APP_CONFIG.apiUrl)document.getElementById("result").textContent="Preview only: this app needs its own Neon Auth and API before live orders can work.";
let dashboardAccess=false;
function showDashboardPanels(allowed){dashboardAccess=Boolean(allowed);document.querySelectorAll('[data-restricted-panel]').forEach(panel=>{panel.hidden=!dashboardAccess})}
const out=(message)=>{$("result").textContent=typeof message==="string"?message:JSON.stringify(message,null,2)};
const safe=(fn)=>async()=>{try{await fn()}catch(e){out("Error: "+(e?.message||"Request failed. Please try again."))}};
function required(id,label){const value=$(id)?.value?.trim();if(!value)throw Error(label+" is required");return value}
async function verifyAdminAccess(){if(role!=="admin")return;try{await api("/api/admin/orders");out("Signed in. Administrator access verified.")}catch(e){out("Signed in, but administrator access could not be verified: "+e.message+". Your account must be assigned the administrator role in Neon.")}}
async function api(path,method="GET",body,publicRoute=false){const headers={"content-type":"application/json"};if(!publicRoute){const r=await auth.token();if(r.error)throw Error(r.error.message);if(!r.data?.token)throw Error("Sign in to continue");headers.authorization="Bearer "+r.data.token;}const response=await fetch(API+path,{method,headers,body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||"Request failed");return data}
function option(select,items,label){select.replaceChildren(new Option("Select",""),...items.map(x=>new Option(label(x),x.id)))}
async function showIdentity(){
  if($("requestDelivery"))$("requestDelivery").hidden=true;
  showDashboardPanels(false);
  const r=await auth.getSession();
  if(r.error)throw Error(r.error.message);
  if(!r.data?.user){$("identity").textContent="Not signed in";return}
  if(role==="owner"){try{const delivery=await api("/api/delivery/capabilities");if($("requestDelivery"))$("requestDelivery").hidden=!delivery.dispatch_enabled;}catch{}}
  if(role!=="owner"&&role!=="admin"){showDashboardPanels(true);$("identity").textContent=r.data.user.email;return}
  try{
    const me=await api("/api/me");
    const allowed=role==="admin"?me.admin===true:me.admin===false;
    showDashboardPanels(allowed);
    $("identity").textContent=allowed?r.data.user.email:(role==="owner"?"Owner access denied: an administrator account is signed in. Sign out and use a different shop-owner email.":"Administrator access denied: this account is not an approved administrator.");
  }catch(e){
    $("identity").textContent="Unable to verify "+role+" access. Try signing in again.";
    throw e;
  }
}
$("signin").addEventListener("submit",e=>{e.preventDefault();safe(async()=>{const r=await auth.signIn.email({email:$("email").value,password:$("password").value});if(r.error)throw Error(r.error.message);if(!r.data)throw Error("Sign-in did not return an account");await showIdentity();if(role==="owner"&&!dashboardAccess)throw Error("Administrator accounts cannot sign in as shop owners. Sign out and use another owner account.");if(role==="admin"&&!dashboardAccess)throw Error("This account is not authorized as an administrator.");out(role==="admin"?"Signed in. Administrator access verified.":"Signed in")})()});
bind("sendVerification",async()=>{const email=required("email","Email");const r=await auth.emailOtp.sendVerificationOtp({email,type:"email-verification"});if(r.error)throw Error(r.error.message);out("Verification code requested. Check your inbox and spam folder.")});
bind("verifyEmail",async()=>{const email=required("email","Email"),otp=required("verificationCode","Verification code");const r=await auth.emailOtp.verifyEmail({email,otp});if(r.error)throw Error(r.error.message);out("Email verified. You can sign in with your password. Use Reset password only if you need to change it.")});
bind("forgotPassword",async()=>{const email=required("email","Email");const r=await auth.requestPasswordReset({email,redirectTo:new URL("./neon-reset-password.html",location.href).href});if(r.error)throw Error(r.error.message);out("If this account exists, a password reset email has been sent. Check your inbox and spam folder. The link expires after one hour.")});
$("signup").onclick=safe(async()=>{const email=required("email","Email");required("password","Password");const r=await auth.signUp.email({email,password:$("password").value,name:email.split("@")[0]});if(r.error)throw Error(r.error.message);await showIdentity();out(role==="admin"?"Account created. Administrator access requires an existing administrator to assign your account the admin role.":role==="owner"?"Account created. Send a verification code and verify your email before signing in or applying for a shop.":"Account created")});
$("signout").onclick=safe(async()=>{await auth.signOut();await showIdentity();out("Signed out")});
function bind(id,fn){const el=$(id);if(el)el.onclick=safe(fn)}
if(role==="customer"){
bind("loadShops",async()=>{const data=await api("/api/shops","GET",null,true);option($("shop"),data.shops,x=>x.name+" — "+x.area);out(data.shops.length+" approved shops")});
$("shop").onchange=safe(async()=>{const id=$("shop").value;if(!id)return;const data=await api("/api/shops/"+encodeURIComponent(id)+"/menu","GET",null,true);menu=data.items;option($("item"),menu,x=>x.name+" — R"+(x.price_cents/100).toFixed(2));cart=[];requestId=null;$("cart").textContent="Cart empty";out(data.items.length+" menu items")});
bind("addCart",async()=>{const item=menu.find(x=>x.id===$("item").value),quantity=Number($("quantity").value);if(!item||!Number.isInteger(quantity)||quantity<1||quantity>50)throw Error("Select a menu item and quantity");const current=cart.find(x=>x.itemId===item.id);if(current){if(current.quantity+quantity>50)throw Error("Maximum 50 per item");current.quantity+=quantity}else cart.push({itemId:item.id,quantity});requestId=null;$("cart").textContent=cart.map(x=>{const m=menu.find(i=>i.id===x.itemId);return m.name+" × "+x.quantity}).join(", ");out("Added to cart")});
bind("clearCart",async()=>{cart=[];requestId=null;$("cart").textContent="Cart empty";out("Cart cleared")});
$("checkout").onsubmit=e=>{e.preventDefault();safe(async()=>{if(!requestId)requestId=crypto.randomUUID();const data=await api("/api/orders","POST",{requestId,shopId:$("shop").value,items:cart.length?cart:[{itemId:$("item").value,quantity:Number($("quantity").value)}],customerName:$("customerName").value,customerPhone:$("customerPhone").value,area:$("area").value,fulfillmentType:$("fulfillment").value,deliveryAddress:$("address").value});requestId=null;cart=[];$("cart").textContent="Cart empty";$("orderId").value=data.order.id;out(data)})()};
bind("requestDelivery",async()=>out(await api("/api/owner/orders/"+encodeURIComponent(required("orderId","Order ID"))+"/delivery","POST",{})));
bind("myOrders",async()=>out(await api("/api/orders/mine")));
bind("track",async()=>{const path="/api/orders/"+encodeURIComponent($("orderId").value);const result=await api(path);let capability;try{capability=await api("/api/delivery/capabilities");}catch{}if(capability?.dispatch_enabled)result.delivery=(await api(path+"/delivery")).delivery;out(result)});
bind("items",async()=>out(await api("/api/orders/"+encodeURIComponent($("orderId").value)+"/items")));
bind("timeline",async()=>out(await api("/api/orders/"+encodeURIComponent($("orderId").value)+"/history")));
}
if(role==="owner"){
let menuLoadedShop="",menuSnapshot="";
const menuUrl=shopId=>"/api/owner/shops/"+encodeURIComponent(shopId)+"/menu";
const menuFingerprint=items=>JSON.stringify(items.map(item=>[item.id,item.name,item.price_cents,item.available]));
async function ownerMenu(shopId){const data=await api(menuUrl(shopId));if(!Array.isArray(data.items))throw Error("Unable to read shop menu");return data.items}
async function viewOwnerMenu(){
  const shopId=required("shop","Shop"),items=await ownerMenu(shopId);
  menuLoadedShop=shopId;menuSnapshot=menuFingerprint(items);
  $("menuText").value=formatMenuText(items);
  out("Loaded "+items.filter(item=>item.available).length+" available menu items. Edit the text and press Save menu and prices.");
}
$("shop").addEventListener("change",()=>{menuLoadedShop="";menuSnapshot="";$("menuText").value="";});
bind("apply",async()=>out(await api("/api/shop-applications","POST",{ownerName:$("ownerName").value,shopName:$("shopName").value,phone:$("phone").value,area:$("area").value,address:$("address").value,description:$("description").value})));
bind("applications",async()=>out(await api("/api/shop-applications/mine")));
bind("myShops",async()=>{const r=await api("/api/owner/shops");option($("shop"),r.shops,x=>x.name);menuLoadedShop="";menuSnapshot="";$("menuText").value="";out(r.shops.length+" shops found. Select your shop and press View menu.");});
bind("myMenu",viewOwnerMenu);
bind("saveMenu",async()=>{
  const shopId=required("shop","Shop");
  if(menuLoadedShop!==shopId||!menuSnapshot)throw Error("Press View menu to load this shop's current menu before saving.");
  const desired=parseMenuText($("menuText").value);
  const existing=await ownerMenu(shopId);
  if(menuFingerprint(existing)!==menuSnapshot)throw Error("This menu was changed since it was loaded. Press View menu to reload before saving.");
  const changes=planMenuChanges(existing,desired);
  const removed=changes.filter(change=>change.type==="hide").length;
  if(removed&&!window.confirm("Make "+removed+" item(s) unavailable for customers? Existing orders will be preserved.")){out("Save cancelled. No menu changes made.");return}
  if(!changes.length){out("Menu already up to date. "+desired.length+" items.");return}
  let saved=0;
  try{
    for(const change of changes){
      if(change.type==="create"){
        await api(menuUrl(shopId),"POST",{name:change.name,priceCents:change.priceCents});
      }else{
        await api(menuUrl(shopId)+"/"+encodeURIComponent(change.id),"PATCH",{name:change.name,priceCents:change.priceCents,available:change.available});
      }
      saved++;
    }
  }catch(e){throw Error("Menu save incomplete ("+saved+"/"+changes.length+" changes applied): "+e.message+". Keep your draft and press View menu to review current data before trying again.")}
  await viewOwnerMenu();
  out("Menu saved: "+desired.length+" available items; "+removed+" made unavailable. Existing order history preserved.");
});
bind("requestDelivery",async()=>out(await api("/api/owner/orders/"+encodeURIComponent(required("orderId","Order ID"))+"/delivery","POST",{})));
bind("myOrders",async()=>out(await api("/api/owner/orders")));
bind("orderItems",async()=>out(await api("/api/orders/"+encodeURIComponent($("orderId").value)+"/items")));
bind("updateStatus",async()=>out(await api("/api/owner/orders/"+encodeURIComponent($("orderId").value)+"/status","PATCH",{status:$("status").value,note:$("note").value})));
}
if(role==="admin"){
bind("applications",async()=>out(await api("/api/admin/shop-applications")));
bind("approve",async()=>out(await api("/api/admin/shop-applications/"+encodeURIComponent(required("applicationId","Application ID"))+"/review","PATCH",{status:"approved"})));
bind("reject",async()=>out(await api("/api/admin/shop-applications/"+encodeURIComponent(required("applicationId","Application ID"))+"/review","PATCH",{status:"rejected"})));
bind("orders",async()=>out(await api("/api/admin/orders")));
}
bind("notifications",async()=>out(await api("/api/notifications")));
bind("markRead",async()=>out(await api("/api/notifications/"+encodeURIComponent(required("notificationId","Notification ID"))+"/read","PATCH")));
async function pollNotifications(){if(document.visibilityState!=="visible"||(role==="owner"||role==="admin")&&!dashboardAccess)return;try{const r=await api("/api/notifications");const unread=r.notifications.filter(n=>!n.read_at).length;$("unread").textContent=unread?unread+" unread notifications":"No unread notifications"}catch{$("unread").textContent="Sign in to see notifications"}}
showIdentity().then(pollNotifications).catch(()=>{});
setInterval(pollNotifications,20000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")pollNotifications()});
