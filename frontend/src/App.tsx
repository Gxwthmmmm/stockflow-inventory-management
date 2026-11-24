import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { Boxes, LayoutDashboard, Package, Settings as SettingsIcon, LogOut, Plus, Search, AlertTriangle, Trash2, Pencil, X, Store } from "lucide-react";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "" });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("stockflow_token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
const errorText = (e: any) => e?.response?.data?.message || "Something went wrong. Please try again.";
type User = { id: string; email: string; organization_id: string; organization_name?: string };
type Product = { id: string; name: string; sku: string; description: string | null; quantity_on_hand: number; cost_price: number | null; selling_price: number | null; low_stock_threshold: number | null };
const money = (v: number | null) => v == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v));

function Auth({ onSuccess }: { onSuccess: (token: string, user: User) => void }) {
  const [signup, setSignup] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [organizationName, setOrganizationName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api.post(signup ? "/api/auth/signup" : "/api/auth/login", signup ? { email, password, organizationName } : { email, password });
      onSuccess(result.data.token, result.data.user);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  }
  return <main className="auth"><form className="auth-card" onSubmit={submit}>
    <div className="brand centered"><Boxes size={25}/> stockflow</div><span className="eyebrow">INVENTORY, IN CONTROL</span>
    <h1>{signup ? "Create your workspace" : "Welcome back"}</h1><p className="muted">{signup ? "Set up your organization and start tracking stock." : "Sign in to manage your inventory."}</p>
    {signup && <label>Organization name<input required minLength={2} maxLength={150} value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="My Test Store"/></label>}
    <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"/></label>
    <label>Password<input type="password" required minLength={signup ? 8 : 1} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? "At least 8 characters" : "Your password"}/></label>
    {error && <div className="alert">{error}</div>}<button className="primary full" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
    <p className="switch">{signup ? "Already registered?" : "New to StockFlow?"} <button type="button" className="link" onClick={() => { setSignup(!signup); setError(""); }}>{signup ? "Sign in" : "Create an account"}</button></p>
  </form></main>;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("stockflow_token") || ""), [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<"dashboard" | "products" | "settings">("dashboard"), [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState({ total_products: 0, total_units: 0, low_stock_count: 0 }), [lowStock, setLowStock] = useState<any[]>([]);
  const [threshold, setThreshold] = useState(5), [search, setSearch] = useState(""), [modal, setModal] = useState(false), [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const logout = () => { localStorage.removeItem("stockflow_token"); setToken(""); setUser(null); };
  const refresh = async () => {
    try {
      const [p, d, s] = await Promise.all([api.get("/api/products", { params: { search } }), api.get("/api/dashboard"), api.get("/api/settings")]);
      setProducts(p.data.products); setSummary(d.data.summary); setLowStock(d.data.lowStock); setThreshold(s.data.settings.default_low_stock_threshold);
      setError("");
    } catch (e) { setError(errorText(e)); }
  };
  useEffect(() => { if (token) api.get("/api/auth/me").then(r => setUser(r.data.user)).catch(logout); else setUser(null); }, [token]);
  useEffect(() => { if (user) refresh(); }, [user, page, search]);
  const authenticated = (t: string, u: User) => { localStorage.setItem("stockflow_token", t); setToken(t); setUser(u); };
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget), val = (k: string) => String(form.get(k) || "").trim(), num = (k: string) => val(k) === "" ? null : Number(val(k));
    const body = { name: val("name"), sku: val("sku"), description: val("description") || null, quantity_on_hand: Number(val("quantity_on_hand")), cost_price: num("cost_price"), selling_price: num("selling_price"), low_stock_threshold: num("low_stock_threshold") };
    try { if (editing) await api.patch("/api/products/" + editing.id, body); else await api.post("/api/products", body); setModal(false); setEditing(null); setNotice(editing ? "Product updated" : "Product created"); await refresh(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function removeProduct(p: Product) {
    if (!window.confirm("Delete " + p.name + "? This cannot be undone.")) return;
    try { await api.delete("/api/products/" + p.id); setNotice("Product deleted"); await refresh(); } catch (e) { setError(errorText(e)); }
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    try { await api.patch("/api/settings", { default_low_stock_threshold: threshold }); setNotice("Settings saved"); await refresh(); } catch (e) { setError(errorText(e)); }
  }
  if (!token || !user) return <Auth onSuccess={authenticated}/>;
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><Boxes/> stockflow</div><div className="org"><Store size={15}/>{user.organization_name || "Your organization"}</div><small className="caption">WORKSPACE</small>
      <button className={"nav " + (page === "dashboard" ? "active" : "")} onClick={() => setPage("dashboard")}><LayoutDashboard/>Dashboard</button>
      <button className={"nav " + (page === "products" ? "active" : "")} onClick={() => setPage("products")}><Package/>Products</button>
      <button className={"nav " + (page === "settings" ? "active" : "")} onClick={() => setPage("settings")}><SettingsIcon/>Settings</button>
      <div className="side-bottom"><small>{user.email}</small><button className="nav" onClick={logout}><LogOut/>Sign out</button></div>
    </aside>
    <main className="main"><header><span>Workspace / <b>{page}</b></span><span className="muted">{user.email}</span></header><section className="content">
      {error && <div className="alert">{error}<button onClick={() => setError("")}>×</button></div>}{notice && <div className="success">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {page === "dashboard" && <>
        <div className="heading"><div><small className="eyebrow">OVERVIEW</small><h1>Good to see you.</h1><p className="muted">Here's what's happening with your inventory today.</p></div><button className="primary" onClick={() => { setEditing(null); setModal(true); }}><Plus/> Add product</button></div>
        <div className="stats"><article><Package/><span>Total products</span><strong>{summary.total_products}</strong><small>Active in your catalog</small></article><article><Boxes/><span>Units in stock</span><strong>{summary.total_units.toLocaleString()}</strong><small>Across all products</small></article><article><AlertTriangle/><span>Low stock items</span><strong>{summary.low_stock_count}</strong><small>At or below threshold</small></article></div>
        <section className="panel"><div className="panel-head"><div><h2>Low stock watchlist</h2><p className="muted">Products that need your attention</p></div><button className="link" onClick={() => setPage("products")}>View all products →</button></div>
          {lowStock.length === 0 ? <div className="empty">No products are currently below their stock threshold.</div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>On hand</th><th>Threshold</th></tr></thead><tbody>{lowStock.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.sku}</td><td><span className="pill low">{p.quantity_on_hand}</span></td><td>{p.effective_low_stock_threshold}</td></tr>)}</tbody></table></div>}
        </section>
      </>}
      {page === "products" && <>
        <div className="heading"><div><small className="eyebrow">CATALOG</small><h1>Products</h1><p className="muted">Manage products, prices and stock levels.</p></div><button className="primary" onClick={() => { setEditing(null); setModal(true); }}><Plus/> Add product</button></div>
        <div className="toolbar"><div className="search"><Search/><input placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)}/></div><span className="muted">{products.length} products</span></div>
        <section className="panel table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Status</th><th>Selling price</th><th>Actions</th></tr></thead><tbody>{products.map(p => { const low = p.quantity_on_hand <= (p.low_stock_threshold ?? threshold); return <tr key={p.id}><td><b>{p.name}</b><small className="sub">{p.description || ""}</small></td><td>{p.sku}</td><td>{p.quantity_on_hand}</td><td><span className={"pill " + (low ? "low" : "ok")}>{low ? "Low stock" : "In stock"}</span></td><td>{money(p.selling_price)}</td><td><button className="icon" title="Edit" onClick={() => { setEditing(p); setModal(true); }}><Pencil/></button><button className="icon danger" title="Delete" onClick={() => removeProduct(p)}><Trash2/></button></td></tr>; })}</tbody></table>{products.length === 0 && <div className="empty">No products yet. Add your first product.</div>}</section>
      </>}
      {page === "settings" && <><div className="heading"><div><small className="eyebrow">PREFERENCES</small><h1>Settings</h1><p className="muted">Configure inventory defaults for your organization.</p></div></div><section className="panel settings"><h2>Inventory preferences</h2><p className="muted">Used when a product has no individual threshold.</p><form onSubmit={saveSettings}><label>Default low-stock threshold<input type="number" min="0" max="100000" step="1" value={threshold} onChange={e => setThreshold(Number(e.target.value))}/></label><button className="primary">Save settings</button></form></section></>}
    </section></main>
    {modal && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><section className="modal"><div className="modal-head"><h2>{editing ? "Edit product" : "Add product"}</h2><button className="icon" onClick={() => setModal(false)}><X/></button></div><form className="product-form" onSubmit={saveProduct}>
      <label>Product name *<input name="name" required maxLength={150} defaultValue={editing?.name}/></label><label>SKU *<input name="sku" required maxLength={100} defaultValue={editing?.sku}/></label>
      <label className="wide">Description<input name="description" maxLength={2000} defaultValue={editing?.description || ""}/></label>
      <label>Quantity on hand *<input name="quantity_on_hand" type="number" min="0" step="1" required defaultValue={editing?.quantity_on_hand ?? 0}/></label><label>Low-stock threshold<input name="low_stock_threshold" type="number" min="0" step="1" defaultValue={editing?.low_stock_threshold ?? ""} placeholder={"Default: " + threshold}/></label>
      <label>Cost price<input name="cost_price" type="number" min="0" step="0.01" defaultValue={editing?.cost_price ?? ""}/></label><label>Selling price<input name="selling_price" type="number" min="0" step="0.01" defaultValue={editing?.selling_price ?? ""}/></label>
      <div className="actions wide"><button type="button" className="secondary" onClick={() => setModal(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create product"}</button></div>
    </form></section></div>}
  </div>;
}
