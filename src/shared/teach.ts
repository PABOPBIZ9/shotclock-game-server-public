/**
 * FUTURE: "Teach on SHOTCLOCK" data model (scaffold only — not wired to storage).
 * Instructors publish courses (lessons + decks) and run live sessions or
 * tournaments on them.
 */
export interface Instructor {
  id: string;
  displayName: string;
  bio: string;
  avatar: string;
  verified: boolean;
  payoutWallet?: string; // public address only; revenue share is future + needs legal review
}

export interface CourseVersion {
  id: string;
  courseId: string;
  version: number;
  deckId: string; // Deck in src/shared/decks.ts format
  publishedAt?: number;
  reviewStatus: "draft" | "in_review" | "approved" | "rejected";
}

export interface Course {
  id: string;
  instructorId: string;
  title: string;
  topic: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  visibility: "private" | "unlisted" | "public";
  currentVersionId?: string;
  premiumOnly: boolean;
}

export interface LiveSession {
  id: string;
  courseId: string;
  instructorId: string;
  kind: "study_hall" | "quiz_show" | "tournament";
  format?: "headsup" | "sng" | "tournament";
  maxSeats?: number;
  speed?: import("./match").Speed;
  startsAt: number;
  tier: "free"; // paid sessions only after legal review
  status: "scheduled" | "live" | "ended" | "cancelled";
}

export interface Enrollment {
  userId: string;
  courseId: string;
  lessonsDone: string[];
  bestExam?: number;
}
