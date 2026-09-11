import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  detectGroupsByUrl,
  detectGroupsByFileId,
  computeGroupAllocation,
  extractDriveFileId,
  canonicalizeGoogleUrl,
  BookingParticipant,
} from "@/lib/group-detection";

describe("Group Detection", () => {
  const mockParticipants: BookingParticipant[] = [
    {
      id: "p1",
      bookingId: "b1",
      name: "Participant 1",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 100000,
      remaining: 90000,
      evidenceUrl: "https://drive.google.com/file/d/abc123def456ghi789jkl/view",
      evidenceType: "google_drive",
      evidenceId: "abc123def456ghi789jkl",
      evidenceHash: null,
    },
    {
      id: "p2",
      bookingId: "b2",
      name: "Participant 2",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 190000,
      remaining: 0,
      evidenceUrl: "https://drive.google.com/file/d/abc123def456ghi789jkl/preview?usp=sharing",
      evidenceType: "google_drive",
      evidenceId: "abc123def456ghi789jkl",
      evidenceHash: null,
    },
    {
      id: "p3",
      bookingId: "b3",
      name: "Participant 3",
      facility: "Non",
      meetingPoint: "Tugu Cimaung",
      totalBill: 110000,
      paidAmount: 110000,
      remaining: 0,
      evidenceUrl: "https://drive.google.com/file/d/xyz456abc789def123ghi/edit",
      evidenceType: "google_drive",
      evidenceId: "xyz456abc789def123ghi",
      evidenceHash: null,
    },
    {
      id: "p4",
      bookingId: "b4",
      name: "Participant 4",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 0,
      remaining: 190000,
      evidenceUrl: "https://docs.google.com/spreadsheets/d/spread123sheetId456?gid=789",
      evidenceType: "google_sheets",
      evidenceId: null,
      evidenceHash: null,
    },
    {
      id: "p5",
      bookingId: "b5",
      name: "Participant 5",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 0,
      remaining: 190000,
      evidenceUrl: "https://docs.google.com/spreadsheets/d/spread123sheetId456?gid=789",
      evidenceType: "google_sheets",
      evidenceId: null,
      evidenceHash: null,
    },
    {
      id: "p6",
      bookingId: "b6",
      name: "Participant 6",
      facility: "Non",
      meetingPoint: "Tugu Cimaung",
      totalBill: 110000,
      paidAmount: 0,
      remaining: 110000,
      evidenceUrl: "https://drive.google.com/file/d/mno789pqr012stu345vwx/view",
      evidenceType: "google_drive",
      evidenceId: "mno789pqr012stu345vwx",
      evidenceHash: null,
    },
    {
      id: "p7",
      bookingId: "b7",
      name: "Participant 7",
      facility: "Non",
      meetingPoint: "Tugu Cimaung",
      totalBill: 110000,
      paidAmount: 0,
      remaining: 110000,
      evidenceUrl: "https://docs.google.com/spreadsheets/d/differentSpreadsheetId",
      evidenceType: "google_sheets",
      evidenceId: null,
      evidenceHash: null,
    },
  ];

  describe("extractDriveFileId", () => {
    it("extracts file ID from Drive URL", () => {
      const url1 = "https://drive.google.com/file/d/abc123def456ghi789jkl/view";
      assert.strictEqual(extractDriveFileId(url1), "abc123def456ghi789jkl");

      const url2 = "https://drive.google.com/file/d/xyz456abc789def123ghi/preview?usp=sharing";
      assert.strictEqual(extractDriveFileId(url2), "xyz456abc789def123ghi");

      const url3 = "https://drive.google.com/open?id=abc123def456ghi789jkl";
      assert.strictEqual(extractDriveFileId(url3), "abc123def456ghi789jkl");

      const url4 = "abc123def456ghi789jkl";
      assert.strictEqual(extractDriveFileId(url4), "abc123def456ghi789jkl");

      const url5 = "https://example.com/no-file-id";
      assert.strictEqual(extractDriveFileId(url5), null);
    });
  });

  describe("canonicalizeGoogleUrl", () => {
    it("canonicalizes Google Drive URLs", () => {
      const url1 = "https://drive.google.com/file/d/abc123def456ghi789jkl/view?usp=sharing";
      const canonical1 = canonicalizeGoogleUrl(url1);
      assert.strictEqual(canonical1, "https://drive.google.com/file/d/abc123def456ghi789jkl/view");

      const url2 = "https://drive.google.com/open?id=xyz456abc789def123ghi";
      const canonical2 = canonicalizeGoogleUrl(url2);
      assert.strictEqual(canonical2, "https://drive.google.com/file/d/xyz456abc789def123ghi/view");

      const url3 = "abc123def456ghi789jkl";
      const canonical3 = canonicalizeGoogleUrl(url3);
      assert.strictEqual(canonical3, "abc123def456ghi789jkl");
    });

    it("canonicalizes Google Sheets URLs", () => {
      const url1 = "https://docs.google.com/spreadsheets/d/spread123sheetId456/edit?gid=789#gid=789";
      const canonical1 = canonicalizeGoogleUrl(url1);
      assert.strictEqual(canonical1, "https://docs.google.com/spreadsheets/d/spread123sheetId456?gid=789");

      const url2 = "https://docs.google.com/spreadsheets/d/spread123sheetId456";
      const canonical2 = canonicalizeGoogleUrl(url2);
      assert.strictEqual(canonical2, "https://docs.google.com/spreadsheets/d/spread123sheetId456");
    });

    it("returns original URL for non-Google URLs", () => {
      const url = "https://example.com/file.pdf";
      const canonical = canonicalizeGoogleUrl(url);
      assert.strictEqual(canonical, "https://example.com/file.pdf");
    });
  });

  describe("detectGroupsByUrl", () => {
    it("groups participants by canonical URL", () => {
      const groups = detectGroupsByUrl(mockParticipants);

      assert.strictEqual(groups.length, 2);

      const driveGroup = groups.find(g => g.matchMethod === "url_canonical" && 
        g.participants.some(p => p.id === "p1"));
      assert.ok(driveGroup);
      assert.strictEqual(driveGroup.participants.length, 2);
      assert.strictEqual(driveGroup.totalBill, 380000);
      assert.strictEqual(driveGroup.totalPaid, 290000);
      assert.strictEqual(driveGroup.remaining, 90000);
      assert.strictEqual(driveGroup.confidence, 0.95);

      const sheetsGroup = groups.find(g => g.matchMethod === "url_canonical" && 
        g.participants.some(p => p.id === "p4"));
      assert.ok(sheetsGroup);
      assert.strictEqual(sheetsGroup.participants.length, 2);
      assert.strictEqual(sheetsGroup.totalBill, 380000);
      assert.strictEqual(sheetsGroup.totalPaid, 0);
      assert.strictEqual(sheetsGroup.remaining, 380000);
    });

    it("handles participants without evidence", () => {
      const participants = mockParticipants.map(p => ({ ...p, evidenceUrl: null }));
      const groups = detectGroupsByUrl(participants);
      assert.strictEqual(groups.length, 0);
    });
  });

  describe("detectGroupsByFileId", () => {
    it("groups participants by Drive file ID", () => {
      const groups = detectGroupsByFileId(mockParticipants);

      assert.strictEqual(groups.length, 1);

      const abcGroup = groups.find(g => g.matchMethod === "file_id" && 
        g.participants.some(p => p.id === "p1"));
      assert.ok(abcGroup);
      assert.strictEqual(abcGroup.participants.length, 2);
      assert.strictEqual(abcGroup.confidence, 0.9);
    });

    it("ignores non-Drive participants", () => {
      const sheetsOnly = mockParticipants.filter(p => p.evidenceType === "google_sheets");
      const groups = detectGroupsByFileId(sheetsOnly);
      assert.strictEqual(groups.length, 0);
    });
  });

  describe("computeGroupAllocation", () => {
    const groupParticipants: BookingParticipant[] = [
      {
        id: "g1",
        bookingId: "bg1",
        name: "Group Member 1",
        facility: "Full",
        meetingPoint: "St Bandung",
        totalBill: 190000,
        paidAmount: 100000,
        remaining: 90000,
        evidenceUrl: "https://drive.google.com/file/d/groupFile123",
        evidenceType: "google_drive",
        evidenceId: "groupFile123",
        evidenceHash: null,
      },
      {
        id: "g2",
        bookingId: "bg2",
        name: "Group Member 2",
        facility: "Full",
        meetingPoint: "St Bandung",
        totalBill: 190000,
        paidAmount: 0,
        remaining: 190000,
        evidenceUrl: "https://drive.google.com/file/d/groupFile123",
        evidenceType: "google_drive",
        evidenceId: "groupFile123",
        evidenceHash: null,
      },
      {
        id: "g3",
        bookingId: "bg3",
        name: "Group Member 3",
        facility: "Non",
        meetingPoint: "Tugu Cimaung",
        totalBill: 110000,
        paidAmount: 110000,
        remaining: 0,
        evidenceUrl: "https://drive.google.com/file/d/groupFile123",
        evidenceType: "google_drive",
        evidenceId: "groupFile123",
        evidenceHash: null,
      },
    ];

    it("fully allocates when payment covers all remaining", () => {
      const paymentAmount = 280000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      assert.strictEqual(allocation.totalBill, 490000);
      assert.strictEqual(allocation.totalPaid, 210000);
      assert.strictEqual(allocation.totalRemaining, 280000);
      assert.strictEqual(allocation.totalPaymentAmount, paymentAmount);
      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.excessFunds, 0);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);

      const g1 = allocation.allocation.find(a => a.participantId === "g1");
      assert.ok(g1);
      assert.strictEqual(g1.allocated, 90000);
      assert.strictEqual(g1.remainingAfterAllocation, 0);

      const g2 = allocation.allocation.find(a => a.participantId === "g2");
      assert.ok(g2);
      assert.strictEqual(g2.allocated, 190000);
      assert.strictEqual(g2.remainingAfterAllocation, 0);

      const g3 = allocation.allocation.find(a => a.participantId === "g3");
      assert.ok(g3);
      assert.strictEqual(g3.allocated, 0);
      assert.strictEqual(g3.remainingAfterAllocation, 0);
    });

    it("partially allocates when payment is insufficient", () => {
      const paymentAmount = 150000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      assert.strictEqual(allocation.totalRemaining, 280000);
      assert.strictEqual(allocation.totalPaymentAmount, paymentAmount);
      assert.strictEqual(allocation.canFullyPay, false);
      assert.strictEqual(allocation.excessFunds, 0);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, false);

      const totalAllocated = allocation.allocation.reduce((sum, a) => sum + a.allocated, 0);
      assert.strictEqual(totalAllocated, paymentAmount);

      const g1 = allocation.allocation.find(a => a.participantId === "g1");
      assert.ok(g1);
      assert.ok(g1.allocated <= g1.remaining);

      const g2 = allocation.allocation.find(a => a.participantId === "g2");
      assert.ok(g2);
      assert.ok(g2.allocated <= g2.remaining);
      assert.ok(g2.remainingAfterAllocation > 0);
    });

    it("handles excess funds", () => {
      const paymentAmount = 350000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      assert.strictEqual(allocation.totalRemaining, 280000);
      assert.strictEqual(allocation.totalPaymentAmount, paymentAmount);
      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.excessFunds, 70000);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);

      const totalAllocated = allocation.allocation.reduce((sum, a) => sum + a.allocated, 0);
      assert.strictEqual(totalAllocated, 280000);

      allocation.allocation.forEach(item => {
        assert.strictEqual(item.remainingAfterAllocation, 0);
      });
    });

    it("allocates zero to participants with no remaining", () => {
      const paymentAmount = 500000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      const g3 = allocation.allocation.find(a => a.participantId === "g3");
      assert.ok(g3);
      assert.strictEqual(g3.remaining, 0);
      assert.strictEqual(g3.allocated, 0);
      assert.strictEqual(g3.remainingAfterAllocation, 0);
    });

    it("handles empty group", () => {
      const allocation = computeGroupAllocation([], 100000);

      assert.strictEqual(allocation.totalBill, 0);
      assert.strictEqual(allocation.totalPaid, 0);
      assert.strictEqual(allocation.totalRemaining, 0);
      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.excessFunds, 100000);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);
      assert.strictEqual(allocation.allocation.length, 0);
    });

    it("validates individual allocation limits", () => {
      const participants: BookingParticipant[] = [
        {
          id: "p1",
          bookingId: "b1",
          name: "Test Participant",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 100000,
          paidAmount: 0,
          remaining: 100000,
          evidenceUrl: "https://drive.google.com/file/d/test123",
          evidenceType: "google_drive",
          evidenceId: "test123",
          evidenceHash: null,
        },
      ];

      const paymentAmount = 150000;
      const allocation = computeGroupAllocation(participants, paymentAmount);

      const item = allocation.allocation[0];
      assert.strictEqual(item.allocated, 100000);
      assert.strictEqual(item.remainingAfterAllocation, 0);
      assert.strictEqual(allocation.excessFunds, 50000);
    });
  });
});