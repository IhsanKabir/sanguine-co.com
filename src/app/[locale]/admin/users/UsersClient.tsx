"use client";

import { useState, useTransition } from "react";
import { inviteAdminUser, updateAdminUser, demoteAdminUser, deleteAdminUser, type AdminUserSummary } from "@/lib/actions/admin";
import { PERMISSIONS, SUBADMIN_TEMPLATES, type Permission, type AdminRole } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import Icon from "@/components/storefront/Icon";

type Props = { users: AdminUserSummary[]; currentUserId: string };

type AdminTierRole = Exclude<AdminRole, "customer">;
type InviteForm = {
  email: string;
  password: string;
  role: AdminTierRole;
  permissions: Permission[];
};

const ROLE_PILL: Record<AdminRole, string> = {
  owner: "pill-ok",
  admin: "pill-info",
  subadmin: "pill-warn",
  customer: "pill-err",
};

export default function UsersClient({ users, currentUserId }: Props) {
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<AdminUserSummary | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminUserSummary | null>(null);
  const [, startTransition] = useTransition();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 className="admin-h1">Users</h1>
          <p className="admin-sub">{users.length} admin-tier accounts. Owners and admins manage the maison; subadmins do scoped work.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setInviting(true)}>
          <Icon name="plus" size={14}/> Invite user
        </button>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr><th>Email</th><th>Role</th><th>Permissions</th><th>Last sign in</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.email}
                  {u.id === currentUserId && <span style={{ marginLeft: 8, fontSize: 10, color: "var(--gold-deep)", letterSpacing: ".1em" }}>(YOU)</span>}
                </td>
                <td><span className={"pill " + ROLE_PILL[u.role]}>{u.role}</span></td>
                <td style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                  {u.role === "owner" || u.role === "admin"
                    ? "all"
                    : u.permissions.length === 0 ? <em>none</em> : u.permissions.join(", ")}
                </td>
                <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{u.lastSignInAt ? formatDate(new Date(u.lastSignInAt)) : "Never"}</td>
                <td style={{ fontSize: 12, color: "var(--ink-soft)" }}>{formatDate(new Date(u.createdAt))}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="icon-btn" title="Edit role + permissions" onClick={() => setEditing(u)}><Icon name="feather" size={14}/></button>
                  {u.id !== currentUserId && u.role !== "owner" && (
                    <button className="icon-btn" title="Delete" onClick={() => setConfirmDel(u)}><Icon name="x" size={14}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviting && <InviteModal onClose={() => setInviting(false)} />}
      {editing && <EditModal user={editing} onClose={() => setEditing(null)} />}
      {confirmDel && (
        <>
          <div className="overlay" onClick={() => setConfirmDel(null)}/>
          <div className="seg-confirm">
            <h3 className="serif" style={{ margin: "0 0 12px" }}>Delete &quot;{confirmDel.email}&quot;?</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6, margin: "0 0 18px" }}>
              The Supabase Auth user will be removed. They cannot recover the account. To temporarily revoke access instead, demote them to customer via Edit.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: "var(--err)", color: "white", border: "none" }}
                onClick={() => startTransition(async () => { await deleteAdminUser(confirmDel.id); setConfirmDel(null); })}>
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<InviteForm>({ email: "", password: "", role: "subadmin", permissions: ["dashboard"] });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const applyTemplate = (k: keyof typeof SUBADMIN_TEMPLATES) => {
    setForm({ ...form, role: "subadmin", permissions: [...SUBADMIN_TEMPLATES[k].permissions] });
  };
  const togglePerm = (p: Permission) => {
    setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));
  };
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await inviteAdminUser(form);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="seg-modal" style={{ width: 720 }}>
        <div className="seg-modal-hd">
          <h3 className="serif">Invite a user</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="seg-modal-body" style={{ display: "block" }}>
            <div className="row">
              <div className="field"><label>Email</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="manager@saanguine.com"/></div>
              <div className="field"><label>Initial password</label><input type="password" autoComplete="new-password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="They can change it later"/></div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminTierRole })}>
                <option value="subadmin">Subadmin (scoped permissions)</option>
                <option value="admin">Admin (full access)</option>
                <option value="owner">Owner (full access + can manage users)</option>
              </select>
            </div>

            {form.role === "subadmin" && (
              <>
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Quick template</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {Object.entries(SUBADMIN_TEMPLATES).map(([k, t]) => (
                      <button key={k} type="button" className="filter-pill" onClick={() => applyTemplate(k as keyof typeof SUBADMIN_TEMPLATES)} title={t.description}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Permissions</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                    {PERMISSIONS.map((p) => (
                      <label key={p} className="seg-check">
                        <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} disabled={p === "users"}/>
                        {p}
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
                    The <code>users</code> permission is owner-only. Subadmins cannot manage other users.
                  </p>
                </div>
              </>
            )}

            {error && <p style={{ color: "var(--err)", fontSize: 13, marginTop: 14 }}>{error}</p>}
          </div>
          <div className="seg-modal-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Inviting…" : "Invite"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

function EditModal({ user, onClose }: { user: AdminUserSummary; onClose: () => void }) {
  const [role, setRole] = useState<AdminRole>(user.role);
  const [permissions, setPermissions] = useState<Permission[]>(user.permissions);
  const [pending, startTransition] = useTransition();
  const [, startDemote] = useTransition();
  const [demoteConfirm, setDemoteConfirm] = useState(false);

  const togglePerm = (p: Permission) => {
    setPermissions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };
  const onSave = () => {
    startTransition(async () => {
      await updateAdminUser(user.id, { role, permissions: role === "subadmin" ? permissions : [] });
      onClose();
    });
  };
  const onDemote = () => {
    setDemoteConfirm(true);
  };
  const doDemote = () => {
    setDemoteConfirm(false);
    startDemote(async () => {
      await demoteAdminUser(user.id);
      onClose();
    });
  };

  return (
    <>
      <div className="overlay" onClick={onClose}/>
      <div className="seg-modal" style={{ width: 720 }}>
        <div className="seg-modal-hd">
          <h3 className="serif">Edit · {user.email}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="seg-modal-body" style={{ display: "block" }}>
          <div className="field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              <option value="subadmin">Subadmin</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          {role === "subadmin" && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 11, letterSpacing: ".15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>Permissions</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                {PERMISSIONS.map((p) => (
                  <label key={p} className="seg-check">
                    <input type="checkbox" checked={permissions.includes(p)} onChange={() => togglePerm(p)} disabled={p === "users"}/>
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}
          {user.role !== "owner" && (
            <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              {demoteConfirm ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-soft)" }}>Demote {user.email}? They will lose admin access.</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={doDemote} style={{ padding: "3px 10px" }}>Confirm</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDemoteConfirm(false)} style={{ padding: "3px 8px" }}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" style={{ borderColor: "var(--err)", color: "var(--err)" }} onClick={onDemote}>
                  Demote to customer
                </button>
              )}
              <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 8 }}>
                Removes admin role + permissions. Account stays; user can no longer access /admin.
              </p>
            </div>
          )}
        </div>
        <div className="seg-modal-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </>
  );
}
