import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migrations = [
  '001_kota_connect.sql', '002_order_status_events.sql', '003_commission_ledger.sql',
  '003_order_idempotency.sql', '004_commission_integrity.sql', '005_order_status_transitions.sql',
  '006_admin_authorization.sql', '007_fresh_shop_applications_notifications.sql',
  '008_disable_launch_commission.sql', '008_kfh_row_level_security.sql'
];
async function migrate(db, extra = []) {
  for (const name of [...migrations, ...extra]) {
    const sql = await readFile(new URL('../neon/migrations/' + name, import.meta.url), 'utf8');
    await db.exec(sql);
  }
}
test('fresh migration sequence compiles and enables RLS for every marketplace table', async () => {
  const db = new PGlite();
  try {
    await migrate(db);
    const { rows } = await db.query("SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'");
    assert.equal(rows.length, 10);
    assert.ok(rows.every(row => row.relrowsecurity), JSON.stringify(rows));
  } finally { await db.close(); }
});

test('owner status update and customer notification commit together; outsiders cannot spoof recipients', async () => {
  const db = new PGlite();
  try {
    await migrate(db);
    const shop = '00000000-0000-4000-8000-000000000001';
    const order = '00000000-0000-4000-8000-000000000002';
    await db.exec(`
      CREATE ROLE kfh_runtime NOSUPERUSER NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO kfh_runtime;
      GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO kfh_runtime;
      INSERT INTO kfh_shops(id,owner_subject,name,area,approved) VALUES('${shop}','owner','Fixture shop','Fixture area',true);
      INSERT INTO kfh_orders(id,order_number,shop_id,customer_subject,customer_name,customer_phone,area,fulfillment_type,subtotal_cents,total_cents,test_order)
        VALUES('${order}','FIXTURE-1','${shop}','customer','Fixture Customer','fixture','Fixture area','pickup',100,100,true);
      SET ROLE kfh_runtime;
      SELECT set_config('app.current_subject','owner',false);
    `);
    const notification = `INSERT INTO kfh_notifications(order_id,recipient_subject,kind,title) VALUES('${order}','customer','order_status','Fixture status')`;
    // Reproduce the existing live QA policy's failure without touching QA data.
    await assert.rejects(db.exec(notification), /row-level security policy/);
    await db.exec('RESET ROLE');
    await db.exec(await readFile(new URL('../neon/migrations/009_order_notification_participants.sql', import.meta.url), 'utf8'));
    await db.exec("SET ROLE kfh_runtime; SELECT set_config('app.current_subject','owner',false)");
    await db.exec(`BEGIN; UPDATE kfh_orders SET status='accepted' WHERE id='${order}'; ${notification}; COMMIT;`);
    assert.equal((await db.query('SELECT status FROM kfh_orders')).rows[0].status, 'accepted');
    await assert.rejects(db.exec(`INSERT INTO kfh_notifications(order_id,recipient_subject,kind,title) VALUES('${order}','outsider','order_status','Spoof')`), /row-level security policy/);
    await db.exec("SELECT set_config('app.current_subject','outsider',false)");
    assert.equal((await db.query('SELECT id FROM kfh_orders')).rows.length, 0);
    assert.equal((await db.query('SELECT id FROM kfh_notifications')).rows.length, 0);
    await assert.rejects(db.exec(notification), /row-level security policy/);
    await db.exec("SELECT set_config('app.current_subject','customer',false)");
    assert.equal((await db.query('SELECT title FROM kfh_notifications')).rows[0].title, 'Fixture status');
    await db.exec(`INSERT INTO kfh_notifications(order_id,recipient_subject,kind,title) VALUES('${order}','owner','new_order','Fixture new order')`);
    await assert.rejects(db.exec(notification), /row-level security policy/);
    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM kfh_commission_entries')).rows[0].n, 0);
  } finally { await db.close(); }
});
