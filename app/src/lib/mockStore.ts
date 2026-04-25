// Lightweight in-memory store for the web demo.
// Replaces WatermelonDB + Supabase so the UI runs with zero external deps.

import { create } from 'zustand';

export type VisitStatus = 'not_visited' | 'visited' | 'follow_up';

export interface Company {
  id: string;
  name: string;
  standNumber?: string;
  pavilion?: string;
  hall?: string;
  website?: string;
  email?: string;
  phone?: string;
  description?: string;
  logoUrl?: string;
}

export interface Visit {
  id: string;
  companyId: string;
  status: VisitStatus;
  notes?: string;
  aiSummary?: string;
  visitedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ImageItem {
  id: string;
  visitId: string;
  uri: string;
  caption?: string;
  takenAt: number;
}

export interface Contact {
  id: string;
  companyId?: string;
  fullName?: string;
  role?: string;
  email?: string;
  phone?: string;
  rawOcrText?: string;
  cardUri: string;
  createdAt: number;
}

const seedCompanies: Company[] = [
  { id: 'cassina', name: 'Cassina', standNumber: 'B12', pavilion: 'Pavilion 6', hall: 'Hall 6',
    website: 'https://www.cassina.com', email: 'info@cassina.com', phone: '+39 0362 372.1',
    description: 'Italian luxury furniture manufacturer founded in 1927. Iconic pieces by Le Corbusier, Gio Ponti, Mario Bellini.' },
  { id: 'molteni', name: 'Molteni&C', standNumber: 'D04', pavilion: 'Pavilion 6', hall: 'Hall 6',
    website: 'https://www.molteni.it', email: 'info@molteni.it', phone: '+39 0362 359.1',
    description: 'Modern furniture and contract solutions. Sleek architectural living systems.' },
  { id: 'poliform', name: 'Poliform', standNumber: 'A20', pavilion: 'Pavilion 8', hall: 'Hall 8',
    website: 'https://www.poliform.it', email: 'info@poliform.it', phone: '+39 031 695.701',
    description: 'Living, dining, bedroom, kitchen systems with timeless design.' },
  { id: 'b-and-b', name: 'B&B Italia', standNumber: 'C02', pavilion: 'Pavilion 6', hall: 'Hall 6',
    website: 'https://www.bebitalia.com', email: 'beb@bebitalia.it', phone: '+39 031 7951',
    description: 'Iconic Italian design since 1966. Sofas, tables, outdoor collections.' },
  { id: 'flexform', name: 'Flexform', standNumber: 'B30', pavilion: 'Pavilion 8', hall: 'Hall 8',
    website: 'https://www.flexform.it', email: 'info@flexform.it', phone: '+39 0362 3991',
    description: 'Sofas, armchairs, beds — refined modern design from Brianza.' },
  { id: 'minotti', name: 'Minotti', standNumber: 'A12', pavilion: 'Pavilion 6', hall: 'Hall 6',
    website: 'https://www.minotti.com', email: 'info@minotti.com', phone: '+39 0362 343.1',
    description: 'High-end indoor and outdoor collections.' },
  { id: 'kartell', name: 'Kartell', standNumber: 'D11', pavilion: 'Pavilion 12', hall: 'Hall 12',
    website: 'https://www.kartell.com', email: 'kartell@kartell.it', phone: '+39 02 900.121',
    description: 'Innovative plastic design furniture, accessories and lighting.' },
  { id: 'artemide', name: 'Artemide', standNumber: 'C18', pavilion: 'Pavilion 13', hall: 'Hall 13',
    website: 'https://www.artemide.com', email: 'info@artemide.com', phone: '+39 02 935.181',
    description: 'Lighting design and innovation. Tolomeo, Tizio, and other classics.' },
  { id: 'flos', name: 'Flos', standNumber: 'B22', pavilion: 'Pavilion 13', hall: 'Hall 13',
    website: 'https://www.flos.com', email: 'info@flos.it', phone: '+39 030 24381',
    description: 'Decorative and architectural lighting.' },
  { id: 'boffi', name: 'Boffi', standNumber: 'A06', pavilion: 'Pavilion 24', hall: 'Hall 24',
    website: 'https://www.boffi.com', email: 'info@boffi.com', phone: '+39 0362 5341',
    description: 'Kitchen and bathroom systems.' },
];

interface StoreState {
  companies: Company[];
  visits: Visit[];
  images: ImageItem[];
  contacts: Contact[];

  upsertVisit: (companyId: string, patch: Partial<Visit>) => Visit;
  setStatus: (companyId: string, status: VisitStatus) => void;
  setNotes: (companyId: string, notes: string) => void;
  setAiSummary: (companyId: string, summary: string) => void;
  addImage: (visitId: string, uri: string) => void;
  addContact: (data: Partial<Contact> & { cardUri: string }) => Contact;
  updateContact: (id: string, patch: Partial<Contact>) => void;

  getVisitForCompany: (companyId: string) => Visit | undefined;
  getCompany: (id: string) => Company | undefined;
  getImagesForVisit: (visitId: string) => ImageItem[];
}

const id = () => Math.random().toString(36).slice(2, 11);
const now = () => Date.now();

export const useStore = create<StoreState>((set, get) => ({
  companies: seedCompanies,
  visits: [],
  images: [],
  contacts: [],

  upsertVisit: (companyId, patch) => {
    const existing = get().visits.find((v) => v.companyId === companyId);
    if (existing) {
      const updated = { ...existing, ...patch, updatedAt: now() };
      set((s) => ({ visits: s.visits.map((v) => (v.id === existing.id ? updated : v)) }));
      return updated;
    }
    const fresh: Visit = {
      id: id(),
      companyId,
      status: 'not_visited',
      createdAt: now(),
      updatedAt: now(),
      ...patch,
    };
    set((s) => ({ visits: [...s.visits, fresh] }));
    return fresh;
  },

  setStatus: (companyId, status) => {
    get().upsertVisit(companyId, {
      status,
      visitedAt: status === 'visited' ? now() : undefined,
    });
  },

  setNotes: (companyId, notes) => {
    get().upsertVisit(companyId, { notes });
  },

  setAiSummary: (companyId, aiSummary) => {
    get().upsertVisit(companyId, { aiSummary });
  },

  addImage: (visitId, uri) => {
    set((s) => ({
      images: [...s.images, { id: id(), visitId, uri, takenAt: now() }],
    }));
  },

  addContact: (data) => {
    const fresh: Contact = {
      id: id(),
      cardUri: data.cardUri,
      fullName: data.fullName,
      role: data.role,
      email: data.email,
      phone: data.phone,
      rawOcrText: data.rawOcrText,
      companyId: data.companyId,
      createdAt: now(),
    };
    set((s) => ({ contacts: [...s.contacts, fresh] }));
    return fresh;
  },

  updateContact: (id, patch) => {
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  getVisitForCompany: (companyId) => get().visits.find((v) => v.companyId === companyId),
  getCompany: (id) => get().companies.find((c) => c.id === id),
  getImagesForVisit: (visitId) => get().images.filter((i) => i.visitId === visitId),
}));
