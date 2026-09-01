import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "./api.js";
import { C } from "./theme.js";
import { DataTable, AdminStatCard, RoleBadge, PrimaryButton, GhostButton } from "./adminUI.jsx";
import {
  Mail, Send, FileText, Clock, Edit3, Plus, Trash2, X, Search,
  Users, GraduationCap, UserCog, Building2, Eye, RefreshCw, Loader2,
  Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Heading2, Calendar, CheckCircle2,
  XCircle, AlertTriangle, MousePointerClick, Inbox,
} from "lucide-react";

/* ---------------------------------------------------------
   Shared bits
--------------------------------------------------------- */
const STATUS_STYLES = {
  draft: { bg: "#eef1f5", fg: "#4b5566", label: "Draft" },
  queued: { bg: "#e6f2fb", fg: C.blue, label: "Queued" },
  sending: { bg: "#e6f2fb", fg: C.blue, label: "Sending" },
  completed: { bg: "#e6f7e9", fg: C.green, label: "Completed" },
  partially_failed: { bg: "#fff4e0", fg: "#8a6300", label: "Partially failed" },
  failed: { bg: "#fdecea", fg: "#b3261e", label: "Failed" },
  scheduled: { bg: "#f0e9fb", fg: "#5b21b6", label: "Scheduled" },
  cancelled: { bg: "#eef1f5", fg: "#6b6b6b", label: "Cancelled" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || { bg: C.blueLight, fg: C.blue, label: status };
  return (
    <span style={{ background: s.bg, color: s.fg }} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
      {s.label}
    </span>
  );
}

const AUDIENCE_LABELS = { all: "All Users", Student: "Students", Parent: "Parents", Owner: "Owners", selected: "Selected Users" };
const AUDIENCE_ICONS = { all: Users, Student: GraduationCap, Parent: UserCog, Owner: Building2, selected: Users };

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div style={{ background: "#fdecea", color: "#b3261e" }} className="text-sm rounded-md px-4 py-3 mb-4 flex items-start gap-2">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

/* ---------------------------------------------------------
   Lightweight rich-text editor (contentEditable + execCommand).
   Deliberately avoids pulling in a WYSIWYG dependency — the project
   didn't have one, and this covers everything the composer needs:
   bold/italic/underline, headings, links, lists, alignment, images
   (via the existing Cloudinary upload endpoint), and a CTA button.
--------------------------------------------------------- */
function ToolbarButton({ icon: Icon, label, onClick, active }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection focused
      onClick={onClick}
      style={{ color: active ? C.blue : C.gray600, background: active ? C.blueLight : "transparent" }}
      className="rounded-md p-1.5 hover:bg-slate-100 transition"
    >
      <Icon size={16} />
    </button>
  );
}

function RichTextEditor({ value, onChange, token, placeholder }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only hydrate once on mount / template load — see loadHtml below

  // Exposed so parent (e.g. "Use Template") can force new HTML into the editor.
  useEffect(() => {
    if (ref.current && value !== undefined && ref.current.dataset.forcedValue !== value) {
      if (document.activeElement !== ref.current) {
        ref.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML || "");

  const exec = (command, arg) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertLink = () => {
    const url = window.prompt("Link URL (https://...)");
    if (!url) return;
    exec("createLink", url);
  };

  const insertButton = () => {
    const label = window.prompt("Button text", "View on BookInn") || "View on BookInn";
    const url = window.prompt("Button link URL (https://...)", "https://bookinngh.com");
    if (!url) return;
    ref.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      `<a href="${url}" style="display:inline-block;background:#0071c2;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;margin:8px 0;">${label}</a>`
    );
    emit();
  };

  const insertImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadFile(file, token);
      ref.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${url}" style="max-width:100%;border-radius:6px;margin:8px 0;" />`);
      emit();
    } catch (err) {
      window.alert(err.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ borderColor: C.border }} className="border rounded-md overflow-hidden bg-white">
      <div style={{ borderColor: C.border, background: "#f8fafc" }} className="border-b flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec("bold")} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => exec("italic")} />
        <ToolbarButton icon={Underline} label="Underline" onClick={() => exec("underline")} />
        <span style={{ background: C.border }} className="w-px h-5 mx-1" />
        <ToolbarButton icon={Heading2} label="Heading" onClick={() => exec("formatBlock", "<h2>")} />
        <ToolbarButton icon={List} label="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => exec("insertOrderedList")} />
        <span style={{ background: C.border }} className="w-px h-5 mx-1" />
        <ToolbarButton icon={AlignLeft} label="Align left" onClick={() => exec("justifyLeft")} />
        <ToolbarButton icon={AlignCenter} label="Align center" onClick={() => exec("justifyCenter")} />
        <ToolbarButton icon={AlignRight} label="Align right" onClick={() => exec("justifyRight")} />
        <span style={{ background: C.border }} className="w-px h-5 mx-1" />
        <ToolbarButton icon={Link2} label="Insert link" onClick={insertLink} />
        <label style={{ color: C.gray600 }} className="rounded-md p-1.5 hover:bg-slate-100 transition cursor-pointer flex items-center">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          <input type="file" accept="image/*" className="hidden" onChange={insertImage} disabled={uploading} />
        </label>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertButton}
          style={{ color: C.blue }}
          className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-slate-100 ml-1"
        >
          + Button
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        style={{ color: C.ink, minHeight: 220 }}
        className="px-4 py-3 text-sm outline-none prose-editor"
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: ${C.gray400};
        }
        .prose-editor h2 { font-size: 1.1rem; font-weight: 800; color: ${C.ink}; margin: 8px 0; }
        .prose-editor ul { list-style: disc; padding-left: 20px; }
        .prose-editor ol { list-style: decimal; padding-left: 20px; }
        .prose-editor a { color: ${C.blue}; }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------------------
   Recipient picker for "Selected Users" — server-side search/paginate,
   never loads the whole user table into the browser.
--------------------------------------------------------- */
function RecipientPicker({ token, selected, setSelected }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.searchEmailUsers({ search, role: role === "All" ? "" : role, page, limit }, token);
      setResults(data.users);
      setTotal(data.total);
    } catch {
      // non-fatal — recipient search failing shouldn't block the rest of the composer
    } finally {
      setLoading(false);
    }
  }, [search, role, page, token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, role]);

  const selectedIds = useMemo(() => new Set(selected.map((u) => u.id)), [selected]);

  const toggle = (u) => {
    if (selectedIds.has(u.id)) {
      setSelected(selected.filter((s) => s.id !== u.id));
    } else {
      setSelected([...selected, u]);
    }
  };

  return (
    <div style={{ borderColor: C.border }} className="border rounded-md p-3 bg-white">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} style={{ color: C.gray400 }} className="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ borderColor: C.border }}
            className="w-full border rounded-md pl-8 pr-2 py-1.5 text-sm outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ borderColor: C.border, color: C.ink }}
          className="border rounded-md px-2 py-1.5 text-sm outline-none"
        >
          {["All", "Student", "Parent", "Owner"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <p style={{ color: C.gray600 }} className="text-xs mb-2">{selected.length} recipient{selected.length === 1 ? "" : "s"} selected</p>

      <div className="max-h-56 overflow-y-auto flex flex-col divide-y" style={{ borderColor: C.border }}>
        {loading ? (
          <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">Loading recipients…</p>
        ) : results.length ? (
          results.map((u) => (
            <label key={u.id} className="flex items-center gap-2.5 py-2 cursor-pointer">
              <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggle(u)} />
              <span className="min-w-0 flex-1">
                <span style={{ color: C.ink }} className="text-sm font-medium block truncate">{u.name}</span>
                <span style={{ color: C.gray600 }} className="text-xs block truncate">{u.email}</span>
              </span>
              <RoleBadge role={u.role} />
            </label>
          ))
        ) : (
          <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">No users found.</p>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-2 text-xs" style={{ color: C.gray600 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 font-semibold">← Prev</button>
          <span>Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
          <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 font-semibold">Next →</button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
          {selected.slice(0, 12).map((u) => (
            <span key={u.id} style={{ background: C.blueLight, color: C.navy }} className="text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              {u.name}
              <button onClick={() => toggle(u)}><X size={12} /></button>
            </span>
          ))}
          {selected.length > 12 && <span style={{ color: C.gray600 }} className="text-xs self-center">+{selected.length - 12} more</span>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Preview modal
--------------------------------------------------------- */
function PreviewModal({ subject, content, onBack, onSend, token, sending }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.previewEmail({ subject, content }, token)
      .then((data) => { if (!cancelled) setPreview(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, content, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.6)" }}>
      <div style={{ background: C.white }} className="rounded-lg max-w-xl w-full max-h-[85vh] overflow-y-auto">
        <div style={{ borderColor: C.border }} className="border-b px-5 py-4 flex items-center justify-between sticky top-0 bg-white">
          <h3 style={{ color: C.ink }} className="font-bold text-base flex items-center gap-2"><Eye size={16} color={C.blue} /> Preview email</h3>
          <button onClick={onBack}><X size={18} color={C.gray600} /></button>
        </div>
        <div className="p-5">
          <ErrorBanner error={error} />
          {loading ? (
            <p style={{ color: C.gray600 }} className="text-sm text-center py-10">Loading preview…</p>
          ) : preview ? (
            <>
              <p style={{ color: C.gray600 }} className="text-xs mb-2">Subject</p>
              <p style={{ color: C.ink }} className="font-semibold mb-4">{preview.subject}</p>
              <div style={{ borderColor: C.border }} className="border rounded-md overflow-hidden" dangerouslySetInnerHTML={{ __html: preview.html }} />
              <p style={{ color: C.gray400 }} className="text-xs mt-3">
                Shown with sample values ({preview.sample?.name} · {preview.sample?.role}) — each recipient will see their own name, email, and role.
              </p>
            </>
          ) : null}
        </div>
        <div style={{ borderColor: C.border }} className="border-t px-5 py-4 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <GhostButton onClick={onBack}>Back to Edit</GhostButton>
          <PrimaryButton onClick={onSend} disabled={sending || loading}>{sending ? "Sending…" : "Send Email"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Confirm-send modal
--------------------------------------------------------- */
function ConfirmSendModal({ subject, audienceLabel, recipientCount, onCancel, onConfirm, sending, mode, scheduledAt }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.6)" }}>
      <div style={{ background: C.white }} className="rounded-lg max-w-sm w-full p-6">
        <h3 style={{ color: C.ink }} className="font-bold text-lg mb-1">{mode === "schedule" ? "Confirm scheduled email" : "Confirm email"}</h3>
        <p style={{ color: C.gray600 }} className="text-sm mb-4">
          {mode === "schedule"
            ? `This will send automatically on ${scheduledAt ? fmtDateTime(scheduledAt) : "the scheduled date"}.`
            : "This will send immediately. This action can't be undone."}
        </p>
        <div style={{ borderColor: C.border, background: "#f8fafc" }} className="border rounded-md p-3 mb-5 text-sm flex flex-col gap-1.5">
          <div className="flex justify-between"><span style={{ color: C.gray600 }}>Audience</span><span style={{ color: C.ink }} className="font-semibold">{audienceLabel}</span></div>
          <div className="flex justify-between"><span style={{ color: C.gray600 }}>Recipients</span><span style={{ color: C.ink }} className="font-semibold">{recipientCount.toLocaleString()}</span></div>
          <div className="flex justify-between gap-3"><span style={{ color: C.gray600 }} className="shrink-0">Subject</span><span style={{ color: C.ink }} className="font-semibold text-right truncate">{subject}</span></div>
        </div>
        <p style={{ color: C.ink }} className="text-sm font-medium mb-4">
          Are you sure you want to send this email{recipientCount > 1 ? ` to ${recipientCount.toLocaleString()} people` : ""}?
        </p>
        <div className="flex items-center justify-end gap-2">
          <GhostButton onClick={onCancel} disabled={sending}>Cancel</GhostButton>
          <PrimaryButton onClick={onConfirm} disabled={sending}>{sending ? "Sending…" : "Confirm & Send"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Compose view
--------------------------------------------------------- */
function ComposeView({ token, templates, editingCampaign, onDone, onSaved, audienceCounts }) {
  const [subject, setSubject] = useState(editingCampaign?.subject || "");
  const [content, setContent] = useState(editingCampaign?.content || "");
  const [audienceType, setAudienceType] = useState(editingCampaign?.audienceType || "all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [templateId, setTemplateId] = useState(editingCampaign?.templateId || null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmMode, setConfirmMode] = useState(null); // 'send' | 'schedule' | null
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());
  const [editorSeed, setEditorSeed] = useState(0);

  // If reopening a "Selected Users" draft, hydrate the picker from stored ids.
  useEffect(() => {
    if (editingCampaign?.audienceType === "selected" && editingCampaign.selectedUserIds?.length) {
      api.getEmailCampaignRecipients(editingCampaign.id, { limit: 1000 }, token)
        .then((data) => setSelectedUsers(data.recipients.map((r) => ({ id: r.userId, name: r.name, email: r.email, role: "" }))))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCampaign?.id]);

  const recipientCount = useMemo(() => {
    if (audienceType === "selected") return selectedUsers.length;
    if (!audienceCounts) return 0;
    if (audienceType === "all") return audienceCounts.eligible.all;
    return audienceCounts.eligible[audienceType] || 0;
  }, [audienceType, selectedUsers, audienceCounts]);

  const audienceOptions = [
    { key: "all", count: audienceCounts?.eligible.all },
    { key: "Student", count: audienceCounts?.eligible.Student },
    { key: "Parent", count: audienceCounts?.eligible.Parent },
    { key: "Owner", count: audienceCounts?.eligible.Owner },
    { key: "selected", count: selectedUsers.length },
  ];

  const applyTemplate = (t) => {
    setSubject(t.subject || "");
    setContent(t.content || "");
    setTemplateId(t.id);
    setEditorSeed((n) => n + 1); // forces the editor to re-hydrate from `content`
    setShowTemplates(false);
  };

  const validate = (forSend) => {
    if (forSend) {
      if (!subject.trim()) return "Please enter an email subject.";
      if (!content.trim() || content === "<br>") return "Please write a message before sending.";
    }
    if (audienceType === "selected" && forSend && !selectedUsers.length) return "Please select at least one recipient.";
    return "";
  };

  const buildPayload = (action) => ({
    subject, content, audienceType,
    selectedUserIds: audienceType === "selected" ? selectedUsers.map((u) => u.id) : [],
    templateId,
    action,
    idempotencyKey: idempotencyKey.current,
  });

  const saveDraft = async () => {
    setError("");
    setSavingDraft(true);
    try {
      if (editingCampaign && editingCampaign.status === "draft") {
        await api.updateEmailCampaign(editingCampaign.id, buildPayload("draft"), token);
      } else {
        await api.createEmailCampaign(buildPayload("draft"), token);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const doSend = async () => {
    const v = validate(true);
    if (v) { setError(v); setConfirmMode(null); setShowPreview(false); return; }
    setSending(true);
    setError("");
    try {
      if (editingCampaign && ["draft", "scheduled", "cancelled"].includes(editingCampaign.status)) {
        // Persist any edits first, then trigger send on that same campaign.
        await api.updateEmailCampaign(editingCampaign.id, buildPayload("draft"), token);
        await api.sendEmailCampaign(editingCampaign.id, { action: "send", idempotencyKey: idempotencyKey.current }, token);
      } else {
        await api.createEmailCampaign(buildPayload("send"), token);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      setConfirmMode(null);
      setShowPreview(false);
    }
  };

  const doSchedule = async () => {
    const v = validate(true);
    if (v) { setError(v); return; }
    if (!scheduleAt || new Date(scheduleAt).getTime() <= Date.now()) {
      setError("Please choose a future date and time to schedule this email.");
      return;
    }
    setSending(true);
    setError("");
    try {
      if (editingCampaign && ["draft", "scheduled", "cancelled"].includes(editingCampaign.status)) {
        await api.updateEmailCampaign(editingCampaign.id, buildPayload("draft"), token);
        await api.sendEmailCampaign(editingCampaign.id, { action: "schedule", scheduledAt: scheduleAt, idempotencyKey: idempotencyKey.current }, token);
      } else {
        await api.createEmailCampaign({ ...buildPayload("schedule"), scheduledAt: scheduleAt }, token);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      setConfirmMode(null);
    }
  };

  return (
    <div>
      <ErrorBanner error={error} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <label style={{ color: C.gray600 }} className="text-xs font-semibold block mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New hostels are now available"
              style={{ borderColor: C.border }}
              className="w-full border rounded-md px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ color: C.gray600 }} className="text-xs font-semibold">Message</label>
              <button onClick={() => setShowTemplates(true)} style={{ color: C.blue }} className="text-xs font-semibold hover:underline flex items-center gap-1">
                <FileText size={13} /> Use Template
              </button>
            </div>
            <RichTextEditor key={editorSeed} value={content} onChange={setContent} token={token} placeholder="Write your message… use {{name}}, {{email}}, {{role}} to personalize." />
            <p style={{ color: C.gray400 }} className="text-xs mt-1.5">
              Personalize with <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{role}}"}</code> — filled in per recipient when the email is sent.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div style={{ borderColor: C.border }} className="border rounded-lg p-4 bg-white">
            <p style={{ color: C.ink }} className="font-bold text-sm mb-3">Recipients</p>
            <div className="flex flex-col gap-1.5">
              {audienceOptions.map((opt) => {
                const Icon = AUDIENCE_ICONS[opt.key];
                return (
                  <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                    <input type="radio" name="audience" checked={audienceType === opt.key} onChange={() => setAudienceType(opt.key)} />
                    <Icon size={14} style={{ color: C.gray600 }} />
                    <span style={{ color: C.ink }} className="flex-1">{AUDIENCE_LABELS[opt.key]}</span>
                    <span style={{ color: C.gray600 }} className="text-xs font-semibold">{opt.count ?? "…"}</span>
                  </label>
                );
              })}
            </div>
            {audienceType === "selected" && (
              <div className="mt-3">
                <RecipientPicker token={token} selected={selectedUsers} setSelected={setSelectedUsers} />
              </div>
            )}
            <div style={{ borderColor: C.border }} className="border-t mt-3 pt-3 flex items-center justify-between text-sm">
              <span style={{ color: C.gray600 }}>Total recipients</span>
              <span style={{ color: C.ink }} className="font-extrabold">{recipientCount.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ borderColor: C.border }} className="border rounded-lg p-4 bg-white flex flex-col gap-2">
            <PrimaryButton
              full
              onClick={() => { const v = validate(true); if (v) { setError(v); return; } setError(""); setShowPreview(true); }}
            >
              <span className="flex items-center justify-center gap-2"><Eye size={15} /> Preview Email</span>
            </PrimaryButton>
            <GhostButton full onClick={saveDraft} disabled={savingDraft}>
              {savingDraft ? "Saving…" : "Save as Draft"}
            </GhostButton>
            <div style={{ borderColor: C.border }} className="border-t pt-2 mt-1 flex flex-col gap-2">
              <label style={{ color: C.gray600 }} className="text-xs font-semibold flex items-center gap-1.5"><Calendar size={13} /> Schedule for later</label>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                style={{ borderColor: C.border }}
                className="w-full border rounded-md px-2.5 py-2 text-sm outline-none"
              />
              <GhostButton
                full
                onClick={() => { const v = validate(true); if (v) { setError(v); return; } setError(""); doSchedule(); }}
                disabled={sending || !scheduleAt}
              >
                Schedule
              </GhostButton>
            </div>
            {onDone && <button onClick={onDone} style={{ color: C.gray600 }} className="text-xs font-semibold text-center hover:underline mt-1">Cancel</button>}
          </div>
        </div>
      </div>

      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.6)" }} onClick={() => setShowTemplates(false)}>
          <div style={{ background: C.white }} className="rounded-lg max-w-md w-full max-h-[75vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ color: C.ink }} className="font-bold text-base">Choose a template</h3>
              <button onClick={() => setShowTemplates(false)}><X size={18} color={C.gray600} /></button>
            </div>
            {templates.length ? (
              <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
                {templates.map((t) => (
                  <button key={t.id} onClick={() => applyTemplate(t)} className="text-left py-3 hover:bg-slate-50 px-2 -mx-2 rounded-md">
                    <p style={{ color: C.ink }} className="text-sm font-semibold">{t.name}</p>
                    <p style={{ color: C.gray600 }} className="text-xs truncate">{t.subject}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: C.gray600 }} className="text-sm">No templates yet.</p>
            )}
          </div>
        </div>
      )}

      {showPreview && (
        <PreviewModal
          subject={subject}
          content={content}
          token={token}
          sending={sending}
          onBack={() => setShowPreview(false)}
          onSend={() => { setShowPreview(false); setConfirmMode("send"); }}
        />
      )}

      {confirmMode && (
        <ConfirmSendModal
          subject={subject}
          audienceLabel={AUDIENCE_LABELS[audienceType]}
          recipientCount={recipientCount}
          mode={confirmMode}
          scheduledAt={scheduleAt}
          sending={sending}
          onCancel={() => setConfirmMode(null)}
          onConfirm={doSend}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Templates manager
--------------------------------------------------------- */
function TemplateEditorModal({ token, template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState(template?.category || "General");
  const [subject, setSubject] = useState(template?.subject || "");
  const [content, setContent] = useState(template?.content || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!name.trim()) { setError("Please enter a template name."); return; }
    setSaving(true);
    setError("");
    try {
      if (template) {
        await api.updateEmailTemplate(template.id, { name, category, subject, content }, token);
      } else {
        await api.createEmailTemplate({ name, category, subject, content }, token);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.6)" }}>
      <div style={{ background: C.white }} className="rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: C.ink }} className="font-bold text-base">{template ? "Edit template" : "New template"}</h3>
          <button onClick={onClose}><X size={18} color={C.gray600} /></button>
        </div>
        <ErrorBanner error={error} />
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: C.gray600 }} className="text-xs font-semibold block mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ borderColor: C.border }} className="w-full border rounded-md px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label style={{ color: C.gray600 }} className="text-xs font-semibold block mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ borderColor: C.border }} className="w-full border rounded-md px-3 py-2 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label style={{ color: C.gray600 }} className="text-xs font-semibold block mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ borderColor: C.border }} className="w-full border rounded-md px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label style={{ color: C.gray600 }} className="text-xs font-semibold block mb-1">Content</label>
            <RichTextEditor value={content} onChange={setContent} token={token} placeholder="Template body…" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save template"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function TemplatesView({ token, templates, onChanged, onUse }) {
  const [editing, setEditing] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const remove = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.deleteEmailTemplate(t.id, token);
      onChanged();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p style={{ color: C.gray600 }} className="text-sm">{templates.length} template{templates.length === 1 ? "" : "s"}</p>
        <PrimaryButton onClick={() => setShowNew(true)}>
          <span className="flex items-center gap-1.5"><Plus size={15} /> New Template</span>
        </PrimaryButton>
      </div>
      {templates.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} style={{ borderColor: C.border }} className="border rounded-lg p-4 bg-white flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p style={{ color: C.ink }} className="font-bold text-sm">{t.name}</p>
                <span style={{ background: C.blueLight, color: C.navy }} className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">{t.category}</span>
              </div>
              <p style={{ color: C.gray600 }} className="text-xs truncate">{t.subject}</p>
              <div className="flex items-center gap-3 mt-1 text-xs font-semibold">
                <button onClick={() => onUse(t)} style={{ color: C.blue }} className="hover:underline">Use Template</button>
                <button onClick={() => setEditing(t)} style={{ color: C.gray600 }} className="hover:underline">Edit</button>
                <button onClick={() => remove(t)} style={{ color: "#b3261e" }} className="hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ borderColor: C.border, color: C.gray600 }} className="border rounded-lg p-8 text-center text-sm bg-white">No templates yet.</div>
      )}
      {(editing || showNew) && (
        <TemplateEditorModal
          token={token}
          template={editing}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSaved={() => { setEditing(null); setShowNew(false); onChanged(); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Campaign detail modal (recipient-level delivery info)
--------------------------------------------------------- */
function CampaignDetailModal({ token, campaignId, onClose }) {
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        api.getEmailCampaign(campaignId, token),
        api.getEmailCampaignRecipients(campaignId, { page, limit }, token),
      ]);
      setCampaign(c.campaign);
      setRecipients(r.recipients);
      setTotal(r.total);
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, token]);

  useEffect(() => { load(); }, [load]);

  const RECIPIENT_ICON = { delivered: CheckCircle2, sent: Send, opened: Eye, clicked: MousePointerClick, failed: XCircle, bounced: XCircle, queued: Clock };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(10,20,35,0.6)" }} onClick={onClose}>
      <div style={{ background: C.white }} className="rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div style={{ borderColor: C.border }} className="border-b px-5 py-4 flex items-center justify-between sticky top-0 bg-white">
          <h3 style={{ color: C.ink }} className="font-bold text-base truncate pr-4">{campaign?.subject || "Campaign"}</h3>
          <button onClick={onClose}><X size={18} color={C.gray600} /></button>
        </div>
        {loading || !campaign ? (
          <p style={{ color: C.gray600 }} className="text-sm text-center py-10">Loading…</p>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Audience</span><span style={{ color: C.ink }} className="font-semibold">{AUDIENCE_LABELS[campaign.audienceType] || campaign.audienceType}</span></div>
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Status</span><StatusPill status={campaign.status} /></div>
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Recipients</span><span style={{ color: C.ink }} className="font-semibold">{campaign.recipientCount}</span></div>
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Delivered</span><span style={{ color: C.ink }} className="font-semibold">{campaign.deliveredCount}</span></div>
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Failed</span><span style={{ color: C.ink }} className="font-semibold">{campaign.failedCount}</span></div>
              <div style={{ borderColor: C.border }} className="border rounded-md p-3 text-sm flex justify-between"><span style={{ color: C.gray600 }}>Created</span><span style={{ color: C.ink }} className="font-semibold">{fmtDate(campaign.createdAt)}</span></div>
            </div>
            {campaign.error && <ErrorBanner error={campaign.error} />}
            <p style={{ color: C.ink }} className="font-bold text-sm mb-2">Recipients</p>
            <div className="flex flex-col divide-y max-h-72 overflow-y-auto" style={{ borderColor: C.border }}>
              {recipients.map((r) => {
                const Icon = RECIPIENT_ICON[r.status] || Clock;
                const tone = ["delivered", "opened", "clicked"].includes(r.status) ? C.green : ["failed", "bounced"].includes(r.status) ? "#b3261e" : C.gray600;
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm gap-2">
                    <span className="min-w-0 truncate" style={{ color: C.ink }}>{r.name || r.email}</span>
                    <span style={{ color: tone }} className="flex items-center gap-1 font-semibold text-xs shrink-0">
                      <Icon size={13} /> {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>
                );
              })}
              {!recipients.length && <p style={{ color: C.gray600 }} className="text-sm py-4 text-center">No recipient records.</p>}
            </div>
            {total > limit && (
              <div className="flex items-center justify-between mt-3 text-xs" style={{ color: C.gray600 }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 font-semibold">← Prev</button>
                <span>Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
                <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 font-semibold">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Campaign history / drafts / scheduled — same list view, different filter
--------------------------------------------------------- */
function CampaignListView({ token, statusFilter, onEditDraft, refreshKey }) {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(statusFilter || "");
  const [audience, setAudience] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEmailCampaigns({ search, status, audience, page, limit }, token);
      setCampaigns(data.campaigns);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, status, audience, page, token]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(1); }, [search, status, audience]);

  const cancelCampaign = async (id) => {
    if (!window.confirm("Cancel this scheduled email?")) return;
    try {
      await api.cancelEmailCampaign(id, token);
      load();
    } catch (err) { window.alert(err.message); }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await api.deleteEmailCampaign(id, token);
      load();
    } catch (err) { window.alert(err.message); }
  };

  const sendNow = async (id) => {
    if (!window.confirm("Send this campaign now?")) return;
    try {
      await api.sendEmailCampaign(id, { action: "send", idempotencyKey: crypto.randomUUID() }, token);
      load();
    } catch (err) { window.alert(err.message); }
  };

  const columns = [
    { key: "subject", label: "Subject", render: (c) => <button onClick={() => setDetailId(c.id)} style={{ color: C.blue }} className="font-semibold hover:underline text-left">{c.subject || "(no subject)"}</button> },
    { key: "audience", label: "Audience", render: (c) => AUDIENCE_LABELS[c.audienceType] || c.audienceType },
    { key: "recipientCount", label: "Recipients" },
    { key: "sentCount", label: "Sent" },
    { key: "deliveredCount", label: "Delivered" },
    { key: "failedCount", label: "Failed" },
    { key: "date", label: "Date", render: (c) => fmtDate(c.scheduledAt && c.status === "scheduled" ? c.scheduledAt : (c.sentAt || c.createdAt)) },
    { key: "status", label: "Status", render: (c) => <StatusPill status={c.status} /> },
    {
      key: "actions", label: "", render: (c) => (
        <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
          {c.status === "draft" && <button onClick={() => onEditDraft(c)} style={{ color: C.blue }} className="hover:underline">Edit</button>}
          {c.status === "draft" && <button onClick={() => sendNow(c.id)} style={{ color: C.green }} className="hover:underline">Send</button>}
          {c.status === "draft" && <button onClick={() => deleteCampaign(c.id)} style={{ color: "#b3261e" }} className="hover:underline">Delete</button>}
          {["scheduled", "queued"].includes(c.status) && <button onClick={() => cancelCampaign(c.id)} style={{ color: "#b3261e" }} className="hover:underline">Cancel</button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} style={{ color: C.gray400 }} className="absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject…" style={{ borderColor: C.border }} className="w-full border rounded-md pl-8 pr-2 py-2 text-sm outline-none" />
        </div>
        {!statusFilter && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-2 py-2 text-sm outline-none">
            <option value="">All statuses</option>
            {Object.keys(STATUS_STYLES).filter((s) => s !== "draft").map((s) => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
          </select>
        )}
        <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-2 py-2 text-sm outline-none">
          <option value="">All audiences</option>
          {Object.entries(AUDIENCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: C.gray600 }} className="text-sm">Loading…</p>
      ) : (
        <DataTable columns={columns} rows={campaigns} emptyLabel={statusFilter === "draft" ? "No drafts saved." : statusFilter === "scheduled" ? "No scheduled emails." : "No campaigns yet."} />
      )}

      {total > limit && (
        <div className="flex items-center justify-between mt-3 text-xs" style={{ color: C.gray600 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40 font-semibold">← Prev</button>
          <span>Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
          <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40 font-semibold">Next →</button>
        </div>
      )}

      {detailId && <CampaignDetailModal token={token} campaignId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */
function DashboardView({ stats, loading, onOpenCampaign }) {
  if (loading || !stats) return <p style={{ color: C.gray600 }} className="text-sm">Loading email statistics…</p>;
  const cards = [
    { label: "Total emails sent", value: stats.totalSent.toLocaleString(), icon: Send },
    { label: "Delivered", value: stats.totalDelivered.toLocaleString(), icon: CheckCircle2 },
    { label: "Failed", value: stats.totalFailed.toLocaleString(), icon: XCircle },
    { label: "Sent this month", value: stats.sentThisMonth.toLocaleString(), icon: Calendar },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {cards.map((c) => <AdminStatCard key={c.label} {...c} />)}
      </div>
      <div style={{ borderColor: C.border }} className="border rounded-lg bg-white p-4 sm:p-5">
        <h3 style={{ color: C.ink }} className="font-bold text-sm mb-3 flex items-center gap-1.5"><Clock size={15} color={C.blue} /> Recent campaigns</h3>
        {stats.recentCampaigns?.length ? (
          <div className="flex flex-col divide-y" style={{ borderColor: C.border }}>
            {stats.recentCampaigns.map((c) => (
              <button key={c.id} onClick={() => onOpenCampaign(c.id)} className="flex items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50 px-2 -mx-2 rounded-md">
                <span className="min-w-0">
                  <span style={{ color: C.ink }} className="text-sm font-semibold block truncate">{c.subject || "(no subject)"}</span>
                  <span style={{ color: C.gray600 }} className="text-xs">{AUDIENCE_LABELS[c.audienceType]} · {c.recipientCount} recipients · {fmtDate(c.sentAt || c.createdAt)}</span>
                </span>
                <StatusPill status={c.status} />
              </button>
            ))}
          </div>
        ) : (
          <p style={{ color: C.gray600 }} className="text-sm">No campaigns sent yet.</p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Root component
--------------------------------------------------------- */
export default function PlatformAdminEmails({ token }) {
  const SUBTABS = [
    { key: "dashboard", label: "Dashboard" },
    { key: "compose", label: "Compose Email" },
    { key: "history", label: "Campaign History" },
    { key: "templates", label: "Templates" },
    { key: "drafts", label: "Drafts" },
    { key: "scheduled", label: "Scheduled" },
  ];
  const [subtab, setSubtab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [audienceCounts, setAudienceCounts] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [openCampaignId, setOpenCampaignId] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [error, setError] = useState("");

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    Promise.all([api.getEmailStats(token), api.getEmailAudienceCounts(token)])
      .then(([s, a]) => { setStats(s); setAudienceCounts(a); })
      .catch((err) => setError(err.message))
      .finally(() => setStatsLoading(false));
  }, [token]);

  const loadTemplates = useCallback(() => {
    api.getEmailTemplates(token).then((d) => setTemplates(d.templates)).catch(() => {});
  }, [token]);

  useEffect(() => { loadStats(); loadTemplates(); }, [loadStats, loadTemplates]);

  const goToComposeWithTemplate = (t) => {
    setEditingCampaign(null);
    setSubtab("compose");
    // ComposeView reads templates itself via "Use Template" modal, but coming
    // from the Templates tab we want it preloaded — pass via a synthetic
    // "draft" shape so ComposeView's normal template application path applies.
    setTimeout(() => window.dispatchEvent(new CustomEvent("bookinn:use-template", { detail: t })), 0);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Mail size={18} color={C.blue} />
        <p style={{ color: C.gray600 }} className="text-sm">Send announcements, manage templates, and track delivery</p>
      </div>

      <ErrorBanner error={error} />

      <div className="flex gap-2 overflow-x-auto mb-5 pb-1">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setSubtab(t.key); if (t.key !== "compose") setEditingCampaign(null); }}
            style={{ background: subtab === t.key ? C.navy : C.white, color: subtab === t.key ? C.white : C.ink, borderColor: C.border }}
            className="border rounded-md px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => { loadStats(); loadTemplates(); setHistoryRefreshKey((k) => k + 1); }} style={{ borderColor: C.border, color: C.ink }} className="border rounded-md px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5 bg-white ml-auto shrink-0">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {subtab === "dashboard" && (
        <DashboardView stats={stats} loading={statsLoading} onOpenCampaign={(id) => setOpenCampaignId(id)} />
      )}

      {subtab === "compose" && (
        <ComposeViewWithTemplateBridge
          token={token}
          templates={templates}
          editingCampaign={editingCampaign}
          audienceCounts={audienceCounts}
          onDone={() => { setEditingCampaign(null); setSubtab("dashboard"); }}
          onSaved={() => { setEditingCampaign(null); loadStats(); setHistoryRefreshKey((k) => k + 1); setSubtab("history"); }}
        />
      )}

      {subtab === "history" && (
        <CampaignListView token={token} onEditDraft={(c) => { setEditingCampaign(c); setSubtab("compose"); }} refreshKey={historyRefreshKey} />
      )}

      {subtab === "templates" && (
        <TemplatesView token={token} templates={templates} onChanged={loadTemplates} onUse={goToComposeWithTemplate} />
      )}

      {subtab === "drafts" && (
        <CampaignListView token={token} statusFilter="draft" onEditDraft={(c) => { setEditingCampaign(c); setSubtab("compose"); }} refreshKey={historyRefreshKey} />
      )}

      {subtab === "scheduled" && (
        <CampaignListView token={token} statusFilter="scheduled" onEditDraft={(c) => { setEditingCampaign(c); setSubtab("compose"); }} refreshKey={historyRefreshKey} />
      )}

      {openCampaignId && <CampaignDetailModal token={token} campaignId={openCampaignId} onClose={() => setOpenCampaignId(null)} />}
    </div>
  );
}

// Bridges the "Use Template" click from the Templates tab into a fresh
// Compose session preloaded with that template (ComposeView itself only
// knows about `editingCampaign`, not templates chosen from elsewhere).
function ComposeViewWithTemplateBridge(props) {
  const [seedCampaign, setSeedCampaign] = useState(props.editingCampaign);

  useEffect(() => setSeedCampaign(props.editingCampaign), [props.editingCampaign]);

  useEffect(() => {
    const handler = (e) => {
      const t = e.detail;
      setSeedCampaign({ subject: t.subject, content: t.content, audienceType: "all", templateId: t.id, status: "new" });
    };
    window.addEventListener("bookinn:use-template", handler);
    return () => window.removeEventListener("bookinn:use-template", handler);
  }, []);

  return <ComposeView {...props} editingCampaign={seedCampaign} key={seedCampaign?.templateId || seedCampaign?.id || "blank"} />;
}
