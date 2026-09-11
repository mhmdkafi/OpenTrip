import test from "node:test";
import assert from "node:assert";
import { renderAttendanceTemplate } from "./attendance-template";
import { renderUnpaidAttachment } from "./unpaid-attachment";
import { AttendanceDocument, AttendanceParticipant } from "./types";

test("renderAttendanceTemplate generates valid HTML structure", () => {
  const document: AttendanceDocument = {
    tripId: "trip-1",
    title: "Test Trip",
    organizer: "Test Organizer",
    version: 1,
    snapshotAt: new Date("2026-09-11T08:38:47.785Z"),
  };
  const participants: AttendanceParticipant[] = [
    {
      id: "p1",
      bookingId: "b1",
      name: "John Doe",
      meetingPoint: "Jakarta",
      status: "active",
    },
  ];

  const html = renderAttendanceTemplate(document, participants);
  assert.ok(html.includes("Test Trip"));
  assert.ok(html.includes("John Doe"));
  assert.ok(html.includes("Jakarta"));
  assert.ok(html.includes("<table"));
  assert.ok(html.includes("<!doctype html"));
});

test("renderUnpaidAttachment includes participant balances", () => {
  const document: AttendanceDocument = {
    tripId: "trip-1",
    title: "Test Trip",
    organizer: "Test Organizer",
    version: 1,
    snapshotAt: new Date("2026-09-11T08:38:47.785Z"),
  };
  const participants: AttendanceParticipant[] = [
    {
      id: "p1",
      bookingId: "b1",
      name: "Jane Doe",
      meetingPoint: "Bandung",
      status: "active",
      charge: 500_000,
      paid: 200_000,
      contact: "08123456789",
    },
  ];

  const html = renderUnpaidAttachment(document, participants);
  assert.ok(html.includes("Lampiran Sisa Tagihan"));
  assert.ok(html.includes("Jane Doe"));
});
