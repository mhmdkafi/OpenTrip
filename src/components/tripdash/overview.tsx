"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useWorkspace } from "./context";
import { TripCalendar } from "./trip-calendar";
import { dateLabel, statusLabel, todayWib, tripStatus } from "@/lib/workspace/presentation";


export function Overview() {
  const { state, basePath } = useWorkspace();
  const [selected, setSelected] = useState("");
  const today = todayWib();
  const trips = [...state.trips].sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  const current = selected ? trips.filter(t => t.departureDate === selected) : trips.filter(t => t.departureDate >= today && !["cancelled", "archived", "completed"].includes(t.status)).slice(0, 5);
  const active = state.participants.filter(p => p.status === "active");
  return <div className="section-stack">
    <div className="overview-counts"><div className="overview-count"><span>Total trips</span><strong>{trips.length}</strong></div>{(["done", "upcoming", "cancelled", "risk"] as const).map(status => {
      const list = trips.filter(t => tripStatus(t, state, today) === status);
      return <details className={`overview-count count-${status}`} key={status}><summary><span>{statusLabel[status]} <ChevronDown size={14}/></span><strong>{list.length}</strong></summary><div className="count-dropdown">{list.length ? list.map(trip => <Link key={trip.id} href={`${basePath}/trips/${trip.id}`}><span>{trip.title}</span><small>{dateLabel(trip.departureDate)}</small></Link>) : <p>No trips with this status yet.</p>}</div></details>;
    })}</div>
    <div className="overview-planner"><TripCalendar state={state} trips={trips.filter(t => t.status !== "archived")} today={today} selected={selected} onSelect={setSelected}/><section className="td-panel agenda-panel"><div className="panel-heading"><div><h2>{selected ? dateLabel(selected, true) : "Next departures"}</h2><p className="panel-subtitle">Click a trip to open its participants and attendance.</p></div></div>{current.map(trip => {
      const date = new Date(`${trip.departureDate}T12:00:00`);
      const count = active.filter(p => p.tripId === trip.id).length;
      const status = tripStatus(trip, state, today);
      return <Link className="agenda-trip" key={trip.id} href={`${basePath}/trips/${trip.id}`}><div className="date-block"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString("en-GB", { month: "short" })}</span></div><div><h3>{trip.title}</h3><p>{count} participants · min. {trip.minimumParticipants ?? 7}</p><span className={`badge ${`status-${status}`}`}>{statusLabel[status]}</span></div><ArrowRight size={17}/></Link>;
    })}{!current.length && <p className="empty-note">No {selected ? "trips on this date" : "upcoming trips"}.</p>}<Link className="text-link agenda-all" href={`${basePath}/trips`}>Full schedule <ArrowRight size={14}/></Link></section></div>
  </div>;
}
