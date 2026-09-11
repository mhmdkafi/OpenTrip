import { describe, it } from "node:test";
import assert from "node:assert";
import {
  detectGroupsByUrl,
  detectGroupsByFileId,
  computeGroupAllocation,
  BookingParticipant,
} from "@/lib/group-detection";

describe("Group Detection Validation Rules", () => {
  const mockParticipants: BookingParticipant[] = [
    {
      id: "p1",
      bookingId: "b1",
      name: "A",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 0,
      remaining: 190000,
      evidenceUrl: "https://drive.google.com/file/d/file1/view",
      evidenceType: "google_drive",
      evidenceId: "file1",
      evidenceHash: null,
    },
    {
      id: "p2",
      bookingId: "b2",
      name: "B",
      facility: "Full",
      meetingPoint: "St Bandung",
      totalBill: 190000,
      paidAmount: 0,
      remaining: 190000,
      evidenceUrl: "https://drive.google.com/file/d/file1/preview",
      evidenceType: "google_drive",
      evidenceId: "file1",
      evidenceHash: null,
    },
    {
      id: "p3",
      bookingId: "b3",
      name: "C",
      facility: "Non",
      meetingPoint: "Tugu Cimaung",
      totalBill: 110000,
      paidAmount: 0,
      remaining: 110000,
      evidenceUrl: "https://drive.google.com/file/d/file2/view",
      evidenceType: "google_drive",
      evidenceId: "file2",
      evidenceHash: null,
    },
    {
      id: "p4",
      bookingId: "b4",
      name: "D",
      facility: "Non",
      meetingPoint: "Tugu Cimaung",
      totalBill: 110000,
      paidAmount: 110000,
      remaining: 0,
      evidenceUrl: "https://drive.google.com/file/d/file1/edit",
      evidenceType: "google_drive",
      evidenceId: "file1",
      evidenceHash: null,
    },
  ];

  describe("Group Detection Validations", () => {
    it("requires at least 2 participants for a group", () => {
      const singleParticipant = [mockParticipants[2]];
      const urlGroups = detectGroupsByUrl(singleParticipant);
      const fileGroups = detectGroupsByFileId(singleParticipant);

      assert.strictEqual(urlGroups.length, 0);
      assert.strictEqual(fileGroups.length, 0);
    });

    it("groups participants with same canonical URL", () => {
      const groups = detectGroupsByUrl(mockParticipants);
      
      const file1Group = groups.find(g => 
        g.participants.length >= 2 && 
        g.participants.some(p => p.id === "p1") &&
        g.participants.some(p => p.id === "p2")
      );
      
      assert.ok(file1Group);
      assert.strictEqual(file1Group.participants.length, 3);
      assert.strictEqual(file1Group.matchMethod, "url_canonical");
      assert.strictEqual(file1Group.confidence, 0.95);
    });

    it("groups participants with same file ID", () => {
      const groups = detectGroupsByFileId(mockParticipants);
      
      const file1Group = groups.find(g => 
        g.groupId.includes("file_file1")
      );
      
      assert.ok(file1Group);
      assert.strictEqual(file1Group.participants.length, 3);
      assert.strictEqual(file1Group.matchMethod, "file_id");
      assert.strictEqual(file1Group.confidence, 0.9);
    });

    it("does not group participants without evidence", () => {
      const participantsWithoutEvidence = mockParticipants.map(p => ({
        ...p,
        evidenceUrl: null,
        evidenceId: null,
      }));
      
      const urlGroups = detectGroupsByUrl(participantsWithoutEvidence);
      const fileGroups = detectGroupsByFileId(participantsWithoutEvidence);
      
      assert.strictEqual(urlGroups.length, 0);
      assert.strictEqual(fileGroups.length, 0);
    });
  });

  describe("Allocation Validation Rules", () => {
    const groupParticipants = mockParticipants.slice(0, 3);

    it("validates allocation cannot exceed participant remaining", () => {
      const paymentAmount = 500000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      allocation.allocation.forEach(item => {
        assert.ok(item.allocated <= item.remaining);
        assert.ok(item.remainingAfterAllocation >= 0);
      });
    });

    it("validates total allocation cannot exceed payment amount", () => {
      const paymentAmount = 300000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      const totalAllocated = allocation.allocation.reduce((sum, a) => sum + a.allocated, 0);
      assert.ok(totalAllocated <= paymentAmount);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, false);
    });

    it("marks all participants as fully paid when payment covers all remaining", () => {
      const totalRemaining = groupParticipants.reduce((sum, p) => sum + p.remaining, 0);
      const paymentAmount = totalRemaining;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);
      allocation.allocation.forEach(item => {
        assert.strictEqual(item.remainingAfterAllocation, 0);
      });
    });

    it("calculates excess funds correctly", () => {
      const totalRemaining = groupParticipants.reduce((sum, p) => sum + p.remaining, 0);
      const paymentAmount = totalRemaining + 50000;
      const allocation = computeGroupAllocation(groupParticipants, paymentAmount);

      assert.strictEqual(allocation.excessFunds, 50000);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);
    });

    it("allocates zero to fully paid participants", () => {
      const participantsWithPaid = [
        ...groupParticipants,
        mockParticipants[3],
      ];
      
      const paymentAmount = 500000;
      const allocation = computeGroupAllocation(participantsWithPaid, paymentAmount);

      const paidParticipant = allocation.allocation.find(a => a.participantId === "p4");
      assert.ok(paidParticipant);
      assert.strictEqual(paidParticipant.remaining, 0);
      assert.strictEqual(paidParticipant.allocated, 0);
      assert.strictEqual(paidParticipant.remainingAfterAllocation, 0);
    });
  });

  describe("Edge Case Scenarios", () => {
    it("handles participants with zero total bill", () => {
      const participants: BookingParticipant[] = [
        {
          id: "zero1",
          bookingId: "bzero1",
          name: "Zero Bill 1",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 0,
          paidAmount: 0,
          remaining: 0,
          evidenceUrl: "https://drive.google.com/file/d/zeroFile/view",
          evidenceType: "google_drive",
          evidenceId: "zeroFile",
          evidenceHash: null,
        },
        {
          id: "zero2",
          bookingId: "bzero2",
          name: "Zero Bill 2",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 0,
          paidAmount: 0,
          remaining: 0,
          evidenceUrl: "https://drive.google.com/file/d/zeroFile/preview",
          evidenceType: "google_drive",
          evidenceId: "zeroFile",
          evidenceHash: null,
        },
      ];

      const groups = detectGroupsByUrl(participants);
      assert.strictEqual(groups.length, 1);
      assert.strictEqual(groups[0].participants.length, 2);
      assert.strictEqual(groups[0].totalBill, 0);
      assert.strictEqual(groups[0].remaining, 0);

      const allocation = computeGroupAllocation(participants, 100000);
      assert.strictEqual(allocation.excessFunds, 100000);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);
    });

    it("handles participants with negative remaining", () => {
      const participants: BookingParticipant[] = [
        {
          id: "neg1",
          bookingId: "bneg1",
          name: "Negative 1",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 100000,
          paidAmount: 150000,
          remaining: -50000,
          evidenceUrl: "https://drive.google.com/file/d/negFile/view",
          evidenceType: "google_drive",
          evidenceId: "negFile",
          evidenceHash: null,
        },
        {
          id: "neg2",
          bookingId: "bneg2",
          name: "Negative 2",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 100000,
          paidAmount: 100000,
          remaining: 0,
          evidenceUrl: "https://drive.google.com/file/d/negFile/preview",
          evidenceType: "google_drive",
          evidenceId: "negFile",
          evidenceHash: null,
        },
      ];

      const groups = detectGroupsByUrl(participants);
      assert.strictEqual(groups.length, 1);

      const allocation = computeGroupAllocation(participants, 50000);
      
      const neg1 = allocation.allocation.find(a => a.participantId === "neg1");
      assert.ok(neg1);
      assert.strictEqual(neg1.remaining, -50000);
      assert.strictEqual(neg1.allocated, 0);
      assert.strictEqual(neg1.remainingAfterAllocation, 0);
    });

    it("handles very large payment amounts", () => {
      const participants = mockParticipants.slice(0, 2);
      const paymentAmount = 1000000000;
      const allocation = computeGroupAllocation(participants, paymentAmount);

      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.excessFunds, 1000000000 - 380000);
      assert.strictEqual(allocation.participantsCanBeFullyPaid, true);
    });

    it("handles fractional payment amounts", () => {
      const participants = mockParticipants.slice(0, 2);
      const paymentAmount = 380000.50;
      const allocation = computeGroupAllocation(participants, paymentAmount);

      assert.strictEqual(allocation.canFullyPay, true);
      assert.strictEqual(allocation.excessFunds, 0.50);
    });
  });

  describe("Integration Scenarios", () => {
    it("complete group payment scenario", () => {
      const groupParticipants: BookingParticipant[] = [
        {
          id: "gp1",
          bookingId: "bgp1",
          name: "Group Member A",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 190000,
          paidAmount: 100000,
          remaining: 90000,
          evidenceUrl: "https://drive.google.com/file/d/groupFile/view",
          evidenceType: "google_drive",
          evidenceId: "groupFile",
          evidenceHash: null,
        },
        {
          id: "gp2",
          bookingId: "bgp2",
          name: "Group Member B",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 190000,
          paidAmount: 0,
          remaining: 190000,
          evidenceUrl: "https://drive.google.com/file/d/groupFile/preview",
          evidenceType: "google_drive",
          evidenceId: "groupFile",
          evidenceHash: null,
        },
        {
          id: "gp3",
          bookingId: "bgp3",
          name: "Group Member C",
          facility: "Non",
          meetingPoint: "Tugu Cimaung",
          totalBill: 110000,
          paidAmount: 110000,
          remaining: 0,
          evidenceUrl: "https://drive.google.com/file/d/groupFile/edit",
          evidenceType: "google_drive",
          evidenceId: "groupFile",
          evidenceHash: null,
        },
      ];

      const groups = detectGroupsByUrl(groupParticipants);
      assert.strictEqual(groups.length, 1);
      assert.strictEqual(groups[0].participants.length, 3);
      assert.strictEqual(groups[0].remaining, 280000);

      const fullPayment = 280000;
      const fullAllocation = computeGroupAllocation(groupParticipants, fullPayment);
      assert.strictEqual(fullAllocation.canFullyPay, true);
      assert.strictEqual(fullAllocation.participantsCanBeFullyPaid, true);
      assert.strictEqual(fullAllocation.excessFunds, 0);

      const partialPayment = 150000;
      const partialAllocation = computeGroupAllocation(groupParticipants, partialPayment);
      assert.strictEqual(partialAllocation.canFullyPay, false);
      assert.strictEqual(partialAllocation.participantsCanBeFullyPaid, false);
      assert.strictEqual(partialAllocation.excessFunds, 0);

      const excessPayment = 350000;
      const excessAllocation = computeGroupAllocation(groupParticipants, excessPayment);
      assert.strictEqual(excessAllocation.canFullyPay, true);
      assert.strictEqual(excessAllocation.participantsCanBeFullyPaid, true);
      assert.strictEqual(excessAllocation.excessFunds, 70000);
    });

    it("multiple groups scenario", () => {
      const participants: BookingParticipant[] = [
        ...mockParticipants,
        {
          id: "p5",
          bookingId: "b5",
          name: "E",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 190000,
          paidAmount: 0,
          remaining: 190000,
          evidenceUrl: "https://drive.google.com/file/d/file3/view",
          evidenceType: "google_drive",
          evidenceId: "file3",
          evidenceHash: null,
        },
        {
          id: "p6",
          bookingId: "b6",
          name: "F",
          facility: "Full",
          meetingPoint: "St Bandung",
          totalBill: 190000,
          paidAmount: 0,
          remaining: 190000,
          evidenceUrl: "https://drive.google.com/file/d/file3/preview",
          evidenceType: "google_drive",
          evidenceId: "file3",
          evidenceHash: null,
        },
      ];

      const urlGroups = detectGroupsByUrl(participants);
      const fileGroups = detectGroupsByFileId(participants);

      assert.ok(urlGroups.length >= 2);
      assert.ok(fileGroups.length >= 2);

      const file1Group = urlGroups.find(g => g.participants.some(p => p.id === "p1"));
      const file3Group = urlGroups.find(g => g.participants.some(p => p.id === "p5"));

      assert.ok(file1Group);
      assert.ok(file3Group);
      assert.notStrictEqual(file1Group.groupId, file3Group.groupId);

      const totalParticipantsInGroups = urlGroups.reduce((sum, g) => sum + g.participants.length, 0);
      assert.ok(totalParticipantsInGroups >= 4);
    });
  });
});