export function Footer() {
  return (
    <footer className="mt-12 border-t bg-muted/30">
      <div className="container py-8 text-xs text-muted-foreground">
        <p>
          🔍 V1 演示数据为模拟数据(基于公开就业报告分布生成),正式版将对接智联真实合作数据。
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} 学长说 · 「数智时代职业引路人」
        </p>
      </div>
    </footer>
  );
}
