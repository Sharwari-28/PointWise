import { useEffect, useState } from "react";
import api from "../api";

const emptyItem = { productName: "", points: "", price: "", quantity: 1 };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewBill() {
  const [downlines, setDownlines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [monthPoints, setMonthPoints] = useState({});
  const [downlineId, setDownlineId] = useState("");
  const [brandPartner, setBrandPartner] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMonthPoints = () => {
    api.get(`/bills/points?month=${currentMonth()}`)
      .then((res) => {
        const map = {};
        res.data.forEach((r) => { map[r.downlineId] = Number(r.points); });
        setMonthPoints(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    api.get("/downlines")
      .then((res) => setDownlines(res.data))
      .catch(() => setError("Could not load downlines. Is the backend running?"))
      .finally(() => setLoaded(true));
    loadMonthPoints();
  }, []);

  const updateItem = (index, field, value) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  };

  const addRow = () => setItems([...items, { ...emptyItem }]);

  const removeRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPoints = items.reduce(
    (sum, i) => sum + (Number(i.points) || 0) * (Number(i.quantity) || 0), 0);
  const totalAmount = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);

  const soFar = monthPoints[downlineId] || 0;

  const handleDownlineChange = (e) => {
    const id = e.target.value;
    setDownlineId(id);
    const chosen = downlines.find((d) => String(d.id) === id);
    setBrandPartner(chosen?.brandPartner || "");
  };

  const save = (asDraft) => {
    setMessage("");
    setError("");

    if (!downlineId) return setError("Please choose a downline.");
    for (const i of items) {
      if (!i.productName.trim()) return setError("Every row needs a product name.");
      if (i.points === "" || Number(i.points) < 0) return setError("Every row needs points (0 or more).");
      if (!(Number(i.price) > 0)) return setError("Every row needs a price above 0.");
      if (!(Number(i.quantity) >= 1)) return setError("Quantity must be at least 1.");
    }

    const payload = {
      downlineId: Number(downlineId),
      brandPartner: brandPartner.trim() || null,
      items: items.map((i) => ({
        productName: i.productName.trim(),
        points: Number(i.points),
        price: Number(i.price),
        quantity: Number(i.quantity),
      })),
    };

    api.post(asDraft ? "/bills/draft" : "/bills", payload)
      .then((res) => {
        const b = res.data;
        setMessage(
          asDraft
            ? `Draft saved (total ₹${b.totalAmount}, ${b.totalPoints} points, ${b.monthPointsTotal} points this month if issued).`
            : `Bill ${b.billNo} issued. This bill ₹${b.totalAmount}, previous balance ₹${b.previousBalance}, total payable ₹${b.amountDue}. Points this month: ${b.monthPointsTotal}.`
        );
        setItems([{ ...emptyItem }]);
        loadMonthPoints();
      })
      .catch((err) => {
        const data = err.response?.data;
        setError(
          data?.message || (data ? Object.values(data).join(", ") : "Could not save the bill")
        );
      });
  };

  return (
    <>
      <h2>New Bill</h2>

      {loaded && downlines.length === 0 && !error && (
        <p className="error">No downlines found. Add one on the Downlines page first.</p>
      )}

      <div className="card form-row">
        <select value={downlineId} onChange={handleDownlineChange}>
          <option value="">Choose downline *</option>
          {downlines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.consultantId ? ` (${d.consultantId})` : ""}
            </option>
          ))}
        </select>
        <input placeholder="Brand partner (optional)" value={brandPartner}
               onChange={(e) => setBrandPartner(e.target.value)} />
      </div>

      {downlineId && (
        <p className="muted">
          Points this month so far: <strong>{soFar}</strong>
          {" "}→ after this order: <strong>{soFar + totalPoints}</strong>
        </p>
      )}

      <div className="card">
        <div className="item-row item-head">
          <span>Product</span><span>Points (each)</span>
          <span>Price (each)</span><span>Qty</span><span></span>
        </div>

        {items.map((item, index) => (
          <div className="item-row" key={index}>
            <input placeholder="Product name" value={item.productName}
                   onChange={(e) => updateItem(index, "productName", e.target.value)} />
            <input type="number" min="0" placeholder="Points" value={item.points}
                   onChange={(e) => updateItem(index, "points", e.target.value)} />
            <input type="number" min="0" placeholder="Price" value={item.price}
                   onChange={(e) => updateItem(index, "price", e.target.value)} />
<input type="number" min="1" placeholder="Qty" value={item.quantity}
                   onChange={(e) => updateItem(index, "quantity", e.target.value)} />
            <button type="button" className="danger" onClick={() => removeRow(index)}>✕</button>
          </div>
        ))}

        <button type="button" className="secondary" onClick={addRow}>+ Add product</button>

        <div className="totals">
          <div>Total points: <strong>{totalPoints}</strong></div>
          <div>Total amount: <strong>₹{totalAmount.toFixed(2)}</strong></div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="actions">
        <button type="button" className="secondary" onClick={() => save(true)}>Save as Draft</button>
        <button type="button" onClick={() => save(false)}>Issue Bill</button>
      </div>
    </>
  );
}