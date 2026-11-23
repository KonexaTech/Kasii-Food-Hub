// Uses the existing supported kind. Call only inside the state/receipt transaction.
export async function notifyDelivery(db,orderId,status){
 const body=status==='searching'?'Delivery queued: awaiting courier assignment.':'Delivery status: '+status;
 await db.query("INSERT INTO kfh_notifications(recipient_subject,order_id,kind,title,body) SELECT recipient,$1,'order_status','Delivery update',$2 FROM (SELECT customer_subject AS recipient FROM kfh_orders WHERE id=$1 UNION SELECT s.owner_subject AS recipient FROM kfh_orders o JOIN kfh_shops s ON s.id=o.shop_id WHERE o.id=$1) recipients WHERE recipient IS NOT NULL",[orderId,body]);
}
