import { useState, useCallback } from "react";

export interface Visitor {
  id: string;
  visitorId: string;
  fullName: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  phone: string;
  email?: string;
  neighborhood: string;
  occupation: string;
  photo?: string;
  registrationDate: string;
}

export interface Visit {
  id: string;
  visitorId: string;
  room: "computer_lab" | "multipurpose_room";
  action: "check_in" | "check_out";
  timestamp: string;
}

export type UserRole = "admin" | "director" | "reception";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Generate visitor ID like ACG-000234
let visitorCounter = 5;
export function generateVisitorId(): string {
  visitorCounter++;
  return `ACG-${String(visitorCounter).padStart(6, "0")}`;
}

// Seed data
const seedVisitors: Visitor[] = [
  {
    id: "1",
    visitorId: "ACG-000001",
    fullName: "Jean Pierre Ndayisaba",
    gender: "male",
    dateOfBirth: "1998-05-14",
    phone: "+257 79 123 456",
    email: "jean.ndayisaba@email.com",
    neighborhood: "Mushasha",
    occupation: "Student",
    registrationDate: "2026-01-15",
  },
  {
    id: "2",
    visitorId: "ACG-000002",
    fullName: "Marie Claire Niyonzima",
    gender: "female",
    dateOfBirth: "2001-11-22",
    phone: "+257 71 987 654",
    neighborhood: "Musinzira",
    occupation: "Entrepreneur",
    registrationDate: "2026-01-20",
  },
  {
    id: "3",
    visitorId: "ACG-000003",
    fullName: "Emmanuel Hakizimana",
    gender: "male",
    dateOfBirth: "1995-03-08",
    phone: "+257 76 555 321",
    email: "emmanuel.h@email.com",
    neighborhood: "American Corner",
    occupation: "Developer",
    registrationDate: "2026-02-01",
  },
  {
    id: "4",
    visitorId: "ACG-000004",
    fullName: "Diane Iradukunda",
    gender: "female",
    dateOfBirth: "2003-07-30",
    phone: "+257 79 444 222",
    neighborhood: "Nyamurenza",
    occupation: "Student",
    registrationDate: "2026-02-10",
  },
  {
    id: "5",
    visitorId: "ACG-000005",
    fullName: "Patrick Nkurunziza",
    gender: "male",
    dateOfBirth: "1992-12-05",
    phone: "+257 72 111 888",
    email: "patrick.n@email.com",
    neighborhood: "Magarama",
    occupation: "Teacher",
    registrationDate: "2026-02-18",
  },
];

const today = new Date().toISOString().split("T")[0];

const seedVisits: Visit[] = [
  { id: "v1", visitorId: "ACG-000001", room: "computer_lab", action: "check_in", timestamp: `${today}T08:30:00` },
  { id: "v2", visitorId: "ACG-000001", room: "computer_lab", action: "check_out", timestamp: `${today}T10:45:00` },
  { id: "v3", visitorId: "ACG-000002", room: "multipurpose_room", action: "check_in", timestamp: `${today}T09:00:00` },
  { id: "v4", visitorId: "ACG-000003", room: "computer_lab", action: "check_in", timestamp: `${today}T09:15:00` },
  { id: "v5", visitorId: "ACG-000004", room: "computer_lab", action: "check_in", timestamp: `${today}T10:00:00` },
  { id: "v6", visitorId: "ACG-000005", room: "multipurpose_room", action: "check_in", timestamp: `${today}T10:30:00` },
  { id: "v7", visitorId: "ACG-000003", room: "computer_lab", action: "check_out", timestamp: `${today}T11:30:00` },
];

// Simple global store
let _visitors: Visitor[] = [...seedVisitors];
let _visits: Visit[] = [...seedVisits];
let _listeners: Set<() => void> = new Set();

function notify() {
  _listeners.forEach((l) => l());
}

export function getVisitors() { return _visitors; }
export function getVisits() { return _visits; }

export function addVisitor(v: Visitor) {
  _visitors = [..._visitors, v];
  notify();
}

export function addVisit(v: Visit) {
  _visits = [..._visits, v];
  notify();
}

export function findVisitorByQR(visitorId: string): Visitor | undefined {
  return _visitors.find((v) => v.visitorId === visitorId);
}

export function getVisitorVisits(visitorId: string): Visit[] {
  return _visits.filter((v) => v.visitorId === visitorId);
}

export function getCurrentOccupancy(room: "computer_lab" | "multipurpose_room") {
  const roomVisits = _visits.filter((v) => v.room === room);
  const checkedIn = new Set<string>();
  // Process in timestamp order
  const sorted = [...roomVisits].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const v of sorted) {
    if (v.action === "check_in") checkedIn.add(v.visitorId);
    else checkedIn.delete(v.visitorId);
  }
  return checkedIn;
}

export function isVisitorInRoom(visitorId: string, room: "computer_lab" | "multipurpose_room"): boolean {
  return getCurrentOccupancy(room).has(visitorId);
}

export function useStore() {
  const [, setTick] = useState(0);
  
  const subscribe = useCallback(() => {
    const listener = () => setTick((t) => t + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return {
    visitors: _visitors,
    visits: _visits,
  };
}

export const COMPUTER_LAB_CAPACITY = 20;
