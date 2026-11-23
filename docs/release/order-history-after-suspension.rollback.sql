-- QA rollback to captured previous SELECT policies. No rows/tables deleted.
BEGIN;
DROP POLICY IF EXISTS kfh_item_read ON public.kfh_order_items;
CREATE POLICY kfh_item_read ON public.kfh_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.kfh_orders o JOIN public.kfh_shops s ON s.id=o.shop_id WHERE o.id=order_id AND (o.customer_subject=NULLIF(current_setting('app.current_subject', true),'') OR s.owner_subject=NULLIF(current_setting('app.current_subject', true),'') OR EXISTS (SELECT 1 FROM public.kfh_admins a WHERE a.subject=NULLIF(current_setting('app.current_subject', true),'')))));
DROP POLICY IF EXISTS kfh_event_read ON public.kfh_order_status_events;
CREATE POLICY kfh_event_read ON public.kfh_order_status_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.kfh_orders o JOIN public.kfh_shops s ON s.id=o.shop_id WHERE o.id=order_id AND (o.customer_subject=NULLIF(current_setting('app.current_subject', true),'') OR s.owner_subject=NULLIF(current_setting('app.current_subject', true),'') OR EXISTS (SELECT 1 FROM public.kfh_admins a WHERE a.subject=NULLIF(current_setting('app.current_subject', true),'')))));
COMMIT;
