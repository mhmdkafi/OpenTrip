"use client";
import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Package,
  Pencil,
  Trash2,
  RotateCcw,
  ArrowUpRight,
  AlertTriangle,
  Boxes,
  Tent,
  Wrench,
} from "lucide-react";
import { availableStock, type Inventory as Item } from "@/lib/workspace/types";
import { useWorkspace } from "./context";
import {
  Field,
  Form,
  number,
  Submit,
  text,
  TripSelect,
  Modal,
  Select,
} from "./ui";
import { InventoryEditor } from "./inventory-editor";
import { Dropdown } from "./dropdown";

const TYPE_OPTIONS = [{ value: "", label: "All types", icon: Boxes }, { value: "operational", label: "Operational", icon: Wrench }, { value: "rental", label: "Rental", icon: Tent }];

export function Inventory() {
  const { state, mutate, run, busy } = useWorkspace();
  const [search, setSearch] = useState(""),
    [kind, setKind] = useState(""),
    [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Item | "new" | null>(null),
    [deleting, setDeleting] = useState<Item | null>(null),
    [moving, setMoving] = useState<Item | null>(null);
  const [incident, setIncident] = useState<Item | null>(null),
    [incidentKind, setIncidentKind] = useState("note"),
    [incidentLoan, setIncidentLoan] = useState("");
  const [viewing, setViewing] = useState<Item | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  const [tripId, setTripId] = useState(
    state.trips.find((t) => t.status === "active")?.id ?? "",
  );
  const items = state.inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (!kind || i.kind === kind),
  );
  const current = Math.min(page, Math.max(0, Math.ceil(items.length / 8) - 1));
  const low = state.inventory
    .filter(
      (i) =>
        i.consumable &&
        i.stockTracked !== false &&
        availableStock(i) <= (i.reorderLevel ?? 5),
    )
    .sort((a, b) => availableStock(a) - availableStock(b));
  return (
    <div className="ov inv-page">
    <div className="page-heading ov-heading"><h1>Inventory</h1><button className="ts-primary" onClick={() => setEditing("new")}><Plus size={16}/> Add item</button></div>
    <div className="inventory-layout inventory-v2">
      <section className="inventory-list-panel">
        <div className="ov-card ts-filters inv-filters">
          <label className="ts-field ts-field-search"><span className="ts-field-label">Search</span><span className="ts-control"><Search size={16}/><input placeholder="Search items" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}/></span></label>
          <div className="ts-field inv-field-type"><span className="ts-field-label">Type</span><Dropdown label="Item type" value={kind} options={TYPE_OPTIONS} onChange={(value) => { setKind(value); setPage(0); }}/></div>
        </div>
        <div className="inventory-list-head" aria-hidden="true">
          <span>Item</span>
          <span>Available / total</span>
          <span>Actions</span>
        </div>
        <div className="inventory-list">
          {items.slice(current * 8, current * 8 + 8).map((item) => {
            const available = availableStock(item),
              used = item.total - item.damaged - available;
            return (
              <article className="inventory-row" key={item.id}>
                <div className="inventory-row-main">
                  <div className="inventory-product">
                    {item.imageUrl ? (
                      <button
                        className="inventory-photo-button"
                        aria-label={`Enlarge photo of ${item.name}`}
                        onClick={() => setViewing(item)}
                      >
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={420}
                          height={280}
                          unoptimized
                        />
                        <span>Enlarge photo</span>
                      </button>
                    ) : (
                      <button
                        className="product-placeholder"
                        aria-label={`Add a photo of ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Package size={40} strokeWidth={1.4} />
                        <span>Add photo</span>
                      </button>
                    )}
                    <div>
                      <h2>
                        <button
                          className="item-name-link"
                          onClick={() => setDetail(item)}
                        >
                          {item.name}
                        </button>
                      </h2>
                      <p>
                        {item.consumable
                          ? "Consumable"
                          : item.kind === "rental"
                            ? "Rental"
                            : "Operational"}
                      </p>
                    </div>
                  </div>
                  <div className="inventory-stock">
                    {item.stockTracked === false ? (
                      <span className="stock-untracked">
                        Quantity not tracked
                      </span>
                    ) : (
                      <>
                        <strong>
                          {available}
                          <small> / {item.total}</small>
                        </strong>
                        <span>
                          {used ? `${used} on loan` : "Available"}
                          {item.damaged ? ` · ${item.damaged} damaged` : ""}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="inventory-row-actions">
                    <button
                      className="table-icon"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <Pencil size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="table-icon danger-button"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!items.length && (
          <div className="empty-state">
            <h3>No matching items</h3>
            <p>Change your search or add an item.</p>
          </div>
        )}
        {items.length > 8 && <div className="table-foot">
          <span>
            {items.length ? current * 8 + 1 : 0}–
            {Math.min((current + 1) * 8, items.length)} of {items.length}{" "}
            items
          </span>
          <div className="pagination">
            <button
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            <span>{current + 1}</span>
            <button
              disabled={(current + 1) * 8 >= items.length}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        </div>}
      </section>
      <aside className="stock-reminders">
        <h2>
          Low stock <span className="reminder-count">{low.length}</span>
        </h2>
        {low.map((item) => (
          <button
            key={item.id}
            className="stock-reminder"
            onClick={() => setEditing(item)}
          >
            <strong>{item.name}</strong>
            <span>{availableStock(item)} left</span>
            <small>
              Update stock <ArrowUpRight size={13} />
            </small>
          </button>
        ))}
        {!low.length && (
          <div className="stock-clear">
            All stock is above its reminder level.
          </div>
        )}
      </aside>
      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)} wide>
          <Image
            className="inventory-full-photo"
            src={viewing.imageUrl!}
            alt={viewing.name}
            width={1000}
            height={800}
            unoptimized
          />
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p className="empty-note">
            {detail.consumable
              ? "Consumable"
              : detail.kind === "rental"
                ? "Rental"
                : "Operational"}
          </p>
          {detail.stockTracked === false ? (
            <p className="empty-note">Quantity not tracked</p>
          ) : (
            <div className="inventory-stock">
              <strong>
                {availableStock(detail)}
                <small> / {detail.total}</small>
              </strong>
              <span>
                {detail.total - detail.damaged - availableStock(detail)
                  ? `${detail.total - detail.damaged - availableStock(detail)} on loan`
                  : "Available"}
                {detail.damaged ? ` · ${detail.damaged} damaged` : ""}
              </span>
            </div>
          )}
          {detail.stockTracked !== false && (
            <button
              className="text-link"
              disabled={!availableStock(detail)}
              onClick={() => {
                setMoving(detail);
                setDetail(null);
              }}
            >
              {detail.consumable ? "Record usage" : "Record loan"}
              <ArrowUpRight size={14} />
            </button>
          )}
          <button
            className="text-link inventory-note-action"
            onClick={() => {
              setIncident(detail);
              setIncidentKind("note");
              setIncidentLoan("");
              setDetail(null);
            }}
          >
            Log incident (lost/damaged)
            <AlertTriangle size={14} />
          </button>
          {detail.loans.some((l) => !l.returned) && (
            <div className="loan-list">
              <h3>Active loans</h3>
              {detail.loans
                .filter((l) => !l.returned)
                .map((loan) => (
                  <div className="loan-line" key={loan.id}>
                    <div>
                      <strong>
                        {state.trips.find((t) => t.id === loan.tripId)
                          ?.title ?? "Trip not found"}
                      </strong>
                      <small>
                        {loan.quantity} units
                        {loan.notes ? ` · ${loan.notes}` : ""}
                      </small>
                    </div>
                    <button
                      className="td-secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          mutate({
                            action: "inventory.return",
                            itemId: detail.id,
                            loanId: loan.id,
                          }),
                        )
                      }
                    >
                      <RotateCcw size={14} /> Return
                    </button>
                  </div>
                ))}
            </div>
          )}
          {!!detail.incidents?.length && (
            <div className="incident-list">
              <h3>Incident history</h3>
              {detail.incidents
                .slice()
                .reverse()
                .map((note) => (
                  <div className="inventory-incident" key={note.id}>
                    <strong>{note.description}</strong>
                    <small>
                      {new Date(note.at).toLocaleDateString("en-GB")}
                      {note.kind === "lost" && ` · ${note.quantity} lost`}
                      {note.kind === "damaged" && ` · ${note.quantity} damaged`}
                    </small>
                  </div>
                ))}
            </div>
          )}
        </Modal>
      )}
      {editing && (
        <InventoryEditor
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <Modal title="Delete item" onClose={() => setDeleting(null)}>
          <p className="empty-note">
            Delete {deleting.name} from inventory? Items on loan must be
            returned first.
          </p>
          <div className="confirm-actions">
            <button className="td-secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="td-button danger-solid"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await mutate({
                    action: "inventory.delete",
                    itemId: deleting.id,
                  });
                  setDeleting(null);
                })
              }
            >
              Delete item
            </button>
          </div>
        </Modal>
      )}
      {incident && (
        <Modal
          title={`Incident — ${incident.name}`}
          onClose={() => setIncident(null)}
        >
          <Form
            onSave={async (data) => {
              await mutate({
                action: "inventory.incident",
                itemId: incident.id,
                kind: incidentKind as "lost" | "damaged" | "note",
                description: text(data, "description"),
                quantity:
                  incidentKind === "note" ? 0 : number(data, "quantity"),
                ...(incidentLoan ? { loanId: incidentLoan } : {}),
              });
              setIncident(null);
            }}
          >
            <Field
              label="Incident note"
              name="description"
              placeholder="Example: tent lost"
              maxLength={200}
              required
            />
            <Select
              label="Stock impact"
              value={incidentKind}
              onChange={setIncidentKind}
            >
              <option value="note">Note only</option>
              <option value="lost">Item lost</option>
              <option value="damaged">Item damaged</option>
            </Select>
            {incidentKind !== "note" && (
              <>
                <Select
                  label="Item location"
                  value={incidentLoan}
                  onChange={setIncidentLoan}
                >
                  <option value="">Available stock in storage</option>
                  {incident.loans
                    .filter((l) => !l.returned)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {state.trips.find((t) => t.id === l.tripId)?.title} ·{" "}
                        {l.quantity} on loan
                      </option>
                    ))}
                </Select>
                <Field
                  label="Affected quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  required
                />
                <p className="empty-note">
                  Lost items reduce total stock. Damaged items reduce
                  available stock.
                </p>
              </>
            )}
            <Submit>Save note</Submit>
          </Form>
        </Modal>
      )}
      {moving && (
        <Modal
          title={moving.consumable ? "Record usage" : "Record loan"}
          onClose={() => setMoving(null)}
        >
          <p className="empty-note">
            {moving.name} · {availableStock(moving)} units available
          </p>
          {!moving.consumable && (
            <TripSelect
              value={tripId}
              onChange={setTripId}
              all="Select an active trip"
              activeOnly
            />
          )}
          <Form
            onSave={async (data) => {
              if (!moving.consumable && !tripId)
                throw new Error("Select an active trip first.");
              await mutate(
                moving.consumable
                  ? {
                      action: "inventory.consume",
                      itemId: moving.id,
                      quantity: number(data, "quantity"),
                      reason: text(data, "reason"),
                    }
                  : {
                      action: "inventory.lend",
                      itemId: moving.id,
                      tripId,
                      quantity: number(data, "quantity"),
                      notes: text(data, "notes"),
                    },
              );
              setMoving(null);
            }}
          >
            <Field
              label="Units"
              name="quantity"
              type="number"
              min={1}
              max={availableStock(moving)}
              required
            />
            {moving.consumable ? (
              <Field label="Purpose" name="reason" required />
            ) : (
              <Field
                label="Loan note"
                name="notes"
                placeholder="Example: taken by the logistics team to Malabar"
                maxLength={500}
              />
            )}
            <Submit>
              {moving.consumable ? "Save usage" : "Save loan"}
            </Submit>
          </Form>
        </Modal>
      )}
    </div>
    </div>
  );
}
