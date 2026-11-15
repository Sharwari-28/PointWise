import { useEffect, useState } from "react";
import api from "../api";

const emptyForm = { consultantId: "", name: "", phone: "", brandPartner: "" };

export default function Downlines() {
  const [downlines, setDownlines] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    api.get("/downlines")
      .then((res) => setDownlines(res.data))
      .catch(() => setError("Cannot reach the backend. Is it running?"));
  };

  useEffect(load, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const showError = (err) => {
    const data = err.response?.data;
    if (data?.message) setError(data.message);
    else if (data) setError(Object.values(data).join(", "));
    else setError("Something went wrong");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const request = editingId
      ? api.put(`/downlines/${editingId}`, form)
      : api.post("/downlines", form);

    request
      .then(() => {
        resetForm();
        load();
      })
      .catch(showError);
  };

  const startEdit = (d) => {
    setError("");
    setEditingId(d.id);
    setForm({
      consultantId: d.consultantId || "",
      name: d.name || "",
      phone: d.phone || "",
      brandPartner: d.brandPartner || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (d) => {
    if (!window.confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    setError("");
    api.delete(`/downlines/${d.id}`)
      .then(() => {
        if (editingId === d.id) resetForm();
        load();
      })
      .catch(showError);
  };

  return (
    <>
      <h2>Downlines</h2>

      <form className="card form-row" onSubmit={handleSubmit}>
        <input name="consultantId" placeholder="Consultant ID" value={form.consultantId} onChange={handleChange} />
        <input name="name" placeholder="Name *" value={form.name} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
        <input name="brandPartner" placeholder="Brand partner (optional)"
               value={form.brandPartner} onChange={handleChange} />
        <button type="submit">{editingId ? "Save changes" : "Add"}</button>
        {editingId && (
          <button type="button" className="secondary" onClick={resetForm}>Cancel</button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Consultant ID</th><th>Name</th><th>Phone</th><th>Brand partner</th><th></th></tr>
          </thead>
          <tbody>
            {downlines.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.consultantId}</td>
                <td>{d.name}</td>
                <td>{d.phone}</td>
                <td>{d.brandPartner}</td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => startEdit(d)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(d)}>Delete</button>
                </td>
              </tr>
            ))}
            {downlines.length === 0 && (
              <tr><td colSpan="6">No downlines yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}