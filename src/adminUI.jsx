// Small shared UI primitives, pulled out of App.jsx so both App.jsx and
// AdminEmails.jsx can import them from one place instead of importing each
// other. Two files each importing the other (a circular import) happened to
// pass `vite build` but broke at runtime — whichever module's top-level code
// ran first saw the other's exports as still-undefined. Everything here has
// no imports back to App.jsx or AdminEmails.jsx, so there's no cycle.
import React from "react";
import { C } from "./theme.js";

export function Badge({ children, tone = "blue" }) {
  const styles = {
    blue: { background: C.blueLight, color: C.navy },
    yellow: { background: "#fff6dc", color: C.yellowDark },
    green: { background: "#e7f7e8", color: "#0a6b0f" },
    red: { background: "#fdecea", color: "#b3261e" },
  }[tone];
  return (
    <span style={styles} className="text-xs font-semibold px-2 py-1 rounded">
      {children}
    </span>
  );
}

export function PrimaryButton({ children, onClick, full, style, ...rest }) {
  return (
    <button
      onClick={onClick}
      style={{ background: C.blue, ...style }}
      className={`text-white font-semibold px-4 py-2.5 rounded-md hover:opacity-90 active:scale-[0.98] transition ${full ? "w-full" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, full, style, ...rest }) {
  return (
    <button
      onClick={onClick}
      style={{ borderColor: C.border, color: C.navy, ...style }}
      className={`border font-semibold px-4 py-2.5 rounded-md hover:bg-slate-50 transition ${full ? "w-full" : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AdminStatCard({ label, value, icon: Icon }) {
  return (
    <div style={{ borderColor: C.border }} className="border rounded-lg px-3 py-2.5 sm:p-4 bg-white min-w-0 flex items-center gap-3 sm:block">
      <span style={{ background: C.blueLight }} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 sm:w-auto sm:h-auto sm:bg-transparent sm:justify-start sm:mb-2">
        <Icon size={18} color={C.blue} className="shrink-0" />
      </span>
      <div className="min-w-0">
        <p style={{ color: C.ink }} className="text-lg sm:text-xl font-extrabold leading-tight truncate">{value}</p>
        <p style={{ color: C.gray600 }} className="text-xs mt-0.5 leading-tight truncate sm:whitespace-normal">{label}</p>
      </div>
    </div>
  );
}

const cellValue = (c, row) => {
  if (c.render) return c.render(row);
  const v = row[c.key];
  return v === null || v === undefined || v === "" ? "—" : v;
};

export function DataTable({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return (
      <div style={{ borderColor: C.border, color: C.gray600 }} className="border rounded-lg p-8 text-center text-sm bg-white">
        {emptyLabel}
      </div>
    );
  }

  // On phones a 560px-wide table forces sideways scrolling, so below `md` each
  // row becomes a card: first column is the title, a column with no label is
  // treated as the row's actions, and everything else is a label/value line.
  const [titleCol, ...rest] = columns;
  const actionCols = rest.filter((c) => !c.label);
  const detailCols = rest.filter((c) => c.label);

  return (
    <>
      <div className="md:hidden flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <div key={i} style={{ borderColor: C.border }} className="border rounded-lg bg-white p-3.5">
            <div style={{ color: C.ink }} className="font-semibold text-[15px] break-words">
              {cellValue(titleCol, row)}
            </div>
            <dl className="mt-2 flex flex-col gap-1.5">
              {detailCols.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                  <dt style={{ color: C.gray600 }} className="text-xs pt-0.5 shrink-0">{c.label}</dt>
                  <dd style={{ color: C.ink }} className="min-w-0 text-right break-words">{cellValue(c, row)}</dd>
                </div>
              ))}
            </dl>
            {actionCols.length > 0 && (
              <div style={{ borderColor: C.border }} className="border-t mt-3 pt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 [&_button]:text-sm [&_button]:py-1">
                {actionCols.map((c) => <React.Fragment key={c.key}>{cellValue(c, row)}</React.Fragment>)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderColor: C.border }} className="hidden md:block border rounded-lg bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr style={{ borderColor: C.border }} className="border-b">
              {columns.map((c) => (
                <th key={c.key} style={{ color: C.gray600 }} className="text-left font-semibold px-4 py-3 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderColor: C.border }} className="border-b last:border-0">
                {columns.map((c) => (
                  <td key={c.key} style={{ color: C.ink }} className="px-4 py-3 align-top">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function RoleBadge({ role }) {
  const colors = {
    Student: { bg: "#e6f2fb", fg: C.blue },
    Parent: { bg: "#fff4e0", fg: "#8a6300" },
    Owner: { bg: "#e6f7e9", fg: C.green },
    Agent: { bg: "#f3e8ff", fg: "#7c3aed" },
    Admin: { bg: "#fdecea", fg: "#b3261e" },
  };
  const c = colors[role] || { bg: C.blueLight, fg: C.blue };
  return (
    <span style={{ background: c.bg, color: c.fg }} className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
      {role}
    </span>
  );
}
