-- PROPOSED ONLY: review and apply to the isolated Kasii QA branch after backup.
-- Existing owner status transactions insert a notification for the customer.
-- Preserve admin notices; bind ordinary notices to the real order participants.
BEGIN;
DROP POLICY IF EXISTS kfh_notification_insert ON public.kfh_notifications;
CREATE POLICY kfh_notification_insert ON public.kfh_notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.kfh_admins a
          WHERE a.subject=NULLIF(current_setting('app.current_subject', true),''))
  OR EXISTS (
    SELECT 1 FROM public.kfh_orders o
    JOIN public.kfh_shops s ON s.id=o.shop_id
    WHERE o.id=kfh_notifications.order_id AND (
      (kfh_notifications.kind='new_order'
       AND o.customer_subject=NULLIF(current_setting('app.current_subject', true),'')
       AND kfh_notifications.recipient_subject=s.owner_subject)
      OR (kfh_notifications.kind='order_status'
          AND s.owner_subject=NULLIF(current_setting('app.current_subject', true),'')
          AND kfh_notifications.recipient_subject=o.customer_subject)
    )
  )
);
COMMIT;
