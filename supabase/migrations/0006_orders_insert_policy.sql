-- orders 表只有 SELECT 策略,用户客户端 insert 被 RLS 拒绝(下单接口 500)。
-- 补 INSERT 策略:只允许给自己建单。status/amount 由服务端代码控制。
CREATE POLICY orders_self_insert ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
