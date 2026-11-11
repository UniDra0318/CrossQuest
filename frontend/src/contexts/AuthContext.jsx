import React, { createContext, useContext, useState, useEffect } from 'react';
import { authFetch, SESSION_EXPIRED_EVENT } from '../services/api';

export const DEMO_USERS = {
  // --- ADMINISTRATORS ---
  admin: {
    id: "016868d1-5238-49a4-9b3f-1cd205dbdc44",
    email: "joey.mallari@xworks.ph",
    name: "Joselito 'Joey' Mallari Jr.",
    title: "Principal Consultant & Lead Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "JM"
  },
  admin_general: {
    id: "5f9f8fa9-e288-4291-9ca7-acadcdd8faef",
    email: "len.mallari@xworks.ph",
    name: "Len Mallari",
    title: "Compliance Administrator & Peer Reviewer",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "LM"
  },

  // --- ACCOUNT MANAGERS (Aligned with Database) ---
  account_manager: {
    id: "81847717-dd7f-48fe-91ad-4391018fdef8",
    email: "erika.bana@crossworks.ph",
    name: "Erika Bana",
    title: "Account Manager (Enterprise Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL", "AOS", "ISLA_LPG_CORPOR", "ANALOG_DEVICE_INC", "MOS", "OCEANA_PHILS_INC", "LAARNI_UYCHUT"],
    assigned_client_accounts: ["VHL", "AOS", "ISLA_LPG_CORPOR", "ANALOG_DEVICE_INC", "MOS", "OCEANA_PHILS_INC", "LAARNI_UYCHUT"],
    initials: "EB"
  },
  am_sharon: {
    id: "0525a57b-668d-46cf-ab3b-6f6862920a9c",
    email: "sharon.devera@crossworks.ph",
    name: "Sharon De Vera",
    title: "Account Manager (Strategic Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ROP", "UNIVER_ROBINA_CORPOR", "AYALA_LAND_INC", "BIBSP", "WCD", "NSE", "DDH", "EMS", "FFHT", "IGBDSC", "NETWOR_SOLUTI_CORPOR", "SYDENH_LABORA_INC"],
    assigned_client_accounts: ["ROP", "UNIVER_ROBINA_CORPOR", "AYALA_LAND_INC", "BIBSP", "WCD", "NSE", "DDH", "EMS", "FFHT", "IGBDSC", "NETWOR_SOLUTI_CORPOR", "SYDENH_LABORA_INC"],
    initials: "SD"
  },
  am_brian: {
    id: "8049c06b-c340-4d3f-8fca-1e83a4beb4f1",
    email: "brian.mendoza@crossworks.ph",
    name: "Brian Mendoza",
    title: "Account Manager (Tech & Telecom)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["IPROY_SERVI", "SECURI_BANK_CORPOR", "PHILIP_SAVING_BANK", "XSDS", "SERVIE_PHILIP_INC", "DERIC_CENTON_MACALI", "KIMBER_ANN_ESTEBA"],
    assigned_client_accounts: ["IPROY_SERVI", "SECURI_BANK_CORPOR", "PHILIP_SAVING_BANK", "XSDS", "SERVIE_PHILIP_INC", "DERIC_CENTON_MACALI", "KIMBER_ANN_ESTEBA"],
    initials: "BM"
  },
  am_joey: {
    id: "2cc2fae0-d941-4d81-9e55-04e822726a6a",
    email: "joey.sales@crossworks.ph",
    name: "Jordan Ramos (Sales)",
    title: "Account Manager (Commercial Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["AMIHAN_SOLUTI", "EWALIC"],
    assigned_client_accounts: ["AMIHAN_SOLUTI", "EWALIC"],
    initials: "JS"
  },

  // --- FINANCE & OPERATIONS ---
  finance: {
    id: "3cce3076-e622-4468-921b-039ea82cae3b",
    email: "finance@crossworks.ph",
    name: "Elena Santos",
    title: "Finance & Billing Specialist",
    role: "finance",
    organization: "Crossworks Operations & Billing",
    company_code: "CROSSWORKS",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "ES"
  },

  // --- COMPANY STAFF (5 Pilot Client HR / L&D Accounts) ---
  staff_vertiv: {
    id: "237d39fa-651d-4e54-b78c-f85f103d007e",
    email: "staff@vertiv.com",
    name: "Elena Vance (Vertiv HR)",
    title: "Company HR & Training Coordinator",
    role: "company_staff",
    organization: "Vertiv Holdings Ltd",
    company_code: "VHL",
    assigned_companies: ["VHL"],
    assigned_client_accounts: ["VHL"],
    initials: "EV"
  },
  staff_amihan: {
    id: "2409f4c4-71ca-4666-a3be-8052dbca7755",
    email: "staff@amihansolutions.com",
    name: "Kenneth Sy (Amihan HR Manager)",
    title: "Company HR Manager",
    role: "company_staff",
    organization: "Amihan Solutions",
    company_code: "AMIHAN_SOLUTI",
    assigned_companies: ["AMIHAN_SOLUTI"],
    assigned_client_accounts: ["AMIHAN_SOLUTI"],
    initials: "KS"
  },
  staff_ewageas: {
    id: "b2b3461a-033b-42da-9085-d70ebbcffdf8",
    email: "staff@ewageas.com",
    name: "Maricar Ramos (EW Ageas Training)",
    title: "Corporate Training Specialist",
    role: "company_staff",
    organization: "EastWest Ageas Life Insurance",
    company_code: "EWALIC",
    assigned_companies: ["EWALIC"],
    assigned_client_accounts: ["EWALIC"],
    initials: "MR"
  },
  staff_iproyal: {
    id: "1bd0c216-61b5-4c6f-bd32-27d7379fa12c",
    email: "staff@iproyal.com",
    name: "Dmitri Volkov (IPRoyal Ops)",
    title: "Company Operations & Compliance",
    role: "company_staff",
    organization: "IPRoyal Services",
    company_code: "IPROY_SERVI",
    assigned_companies: ["IPROY_SERVI"],
    assigned_client_accounts: ["IPROY_SERVI"],
    initials: "DV"
  },
  staff_redoak: {
    id: "2cb15c27-c858-4a34-9c42-b1c507630d1e",
    email: "staff@redoak.com",
    name: "Patricia Tan (Red Oak L&D)",
    title: "Learning & Development Lead",
    role: "company_staff",
    organization: "Red Oak Properties",
    company_code: "ROP",
    assigned_companies: ["ROP"],
    assigned_client_accounts: ["ROP"],
    initials: "PT"
  },

  // --- LEAD TRAINERS ---
  trainer: {
    id: "467d91d2-8dae-49a8-a90d-05c903a09a81",
    email: "jordan.ramos@crossworks.ph",
    name: "Jordan Ramos",
    title: "Lead Technical Instructor: Zero-Trust & Cloud",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL", "IPROY_SERVI", "AMIHAN_SOLUTI"],
    assigned_client_accounts: ["VHL", "IPROY_SERVI", "AMIHAN_SOLUTI"],
    initials: "JR"
  },
  trainer_billy: {
    id: "bf64b24e-3195-4703-a952-f9e0a6e00003",
    email: "billy@crossworks.ph",
    name: "Billy Fernandez",
    title: "Lead Trainer: CONNECT & Executive Comm",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["EWALIC", "ISLA_LPG_CORPOR", "WCD", "XSDS"],
    assigned_client_accounts: ["EWALIC", "ISLA_LPG_CORPOR", "WCD", "XSDS"],
    initials: "BF"
  },
  trainer_jobert: {
    id: "c400ff7f-8306-4475-87d8-7fb23f5b28b9",
    email: "jobert@crossworks.ph",
    name: "Jobert Cruz",
    title: "Lead Trainer: High-Impact Coaching",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL", "IPROY_SERVI", "ROP", "AOS", "SERVIE_PHILIP_INC"],
    assigned_client_accounts: ["VHL", "IPROY_SERVI", "ROP", "AOS", "SERVIE_PHILIP_INC"],
    initials: "JC"
  },
  trainer_owen: {
    id: "12237d8b-0f61-428d-8e62-753726c260fc",
    email: "owen@crossworks.ph",
    name: "Owen Castillo",
    title: "Lead Trainer: Business Continuity (BCM)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["SECURI_BANK_CORPOR", "AMIHAN_SOLUTI", "EWALIC"],
    assigned_client_accounts: ["SECURI_BANK_CORPOR", "AMIHAN_SOLUTI", "EWALIC"],
    initials: "OC"
  },
  trainer_joey: {
    id: "76be0c39-21c3-46ae-ba5d-0cb2dd203bfe",
    email: "joey.trainer@crossworks.ph",
    name: "Jordan Ramos (Agile PME & PMP)",
    title: "Lead Trainer: Agile PME & Project Management",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ROP", "UNIVER_ROBINA_CORPOR", "AYALA_LAND_INC", "BIBSP", "PHILIP_SAVING_BANK"],
    assigned_client_accounts: ["ROP", "UNIVER_ROBINA_CORPOR", "AYALA_LAND_INC", "BIBSP", "PHILIP_SAVING_BANK"],
    initials: "JT"
  },

  // --- TRAINEES WITH REAL PILOT ACCOUNTS & RECORDS ---
  trainee: {
    id: "e335aea7-fe01-436f-a05c-9db2fee10cfd",
    email: "andrea.aguilar@vertiv.com",
    name: "Andrea Aguilar",
    title: "Vertiv Holdings Ltd (VHL)",
    role: "trainee",
    organization: "Vertiv Holdings Ltd",
    trainee_code: "TRN-8053",
    display_name: "AndreaVertiv",
    company_code: "VHL",
    assigned_companies: ["VHL", "ROP"],
    streak: 8,
    points: 13500,
    level: 4,
    quizzes_completed: 3,
    quiz_progress: {
      'act-1': { completed: true, score: 100, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 95, segments: [true, true, true, true] },
      'act-3': { completed: true, score: 90, segments: [true, true, true, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "AA"
  },
  trainee_ricardo: {
    id: "35076d4f-7548-4131-8dd1-6fc07389b17d",
    email: "ricardo.ocampo@iproyal.com",
    name: "Ricardo Ocampo",
    title: "IPRoyal Services (IPROY_SERVI)",
    role: "trainee",
    organization: "IPRoyal Services",
    trainee_code: "TRN-8059",
    display_name: "RicardoOps",
    company_code: "IPROY_SERVI",
    assigned_companies: ["IPROY_SERVI", "ROP"],
    streak: 6,
    points: 10200,
    level: 3,
    quizzes_completed: 2,
    quiz_progress: {
      'act-1': { completed: true, score: 90, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 85, segments: [true, true, true, false] },
      'act-3': { completed: false, score: null, segments: [false, false, false, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "RO"
  },
  trainee_bea: {
    id: "82dd244c-84c5-4831-9381-279bd9fd5c37",
    email: "bea.macaraeg@iproyal.com",
    name: "Bea Macaraeg",
    title: "IPRoyal Services (IPROY_SERVI)",
    role: "trainee",
    organization: "IPRoyal Services",
    trainee_code: "TRN-8126",
    display_name: "BeaMacaraeg",
    company_code: "IPROY_SERVI",
    assigned_companies: ["IPROY_SERVI", "WCD"],
    streak: 11,
    points: 14800,
    level: 5,
    quizzes_completed: 4,
    quiz_progress: {
      'act-1': { completed: true, score: 100, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 100, segments: [true, true, true, true] },
      'act-3': { completed: true, score: 95, segments: [true, true, true, true] },
      'act-4': { completed: true, score: 92, segments: [true, true, true, true] }
    },
    initials: "BM"
  },
  trainee_rafael: {
    id: "d4799846-9779-4b67-acc5-09a5d69a0ade",
    email: "rafael.dizon@amihansolutions.com",
    name: "Rafael Dizon",
    title: "Amihan Solutions (AMIHAN_SOLUTI)",
    role: "trainee",
    organization: "Amihan Solutions",
    trainee_code: "TRN-8077",
    display_name: "RafaelDev",
    company_code: "AMIHAN_SOLUTI",
    assigned_companies: ["AMIHAN_SOLUTI", "ROP", "SECURI_BANK_CORPOR"],
    streak: 4,
    points: 8100,
    level: 2,
    quizzes_completed: 1,
    quiz_progress: {
      'act-1': { completed: true, score: 85, segments: [true, true, true, false] },
      'act-2': { completed: false, score: null, segments: [false, false, false, false] },
      'act-3': { completed: false, score: null, segments: [false, false, false, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "RD"
  },
  trainee_rowena: {
    id: "7084364a-d26c-4154-b10f-b5c0cac75fe5",
    email: "rowena.cabrera@ewageas.com",
    name: "Rowena Cabrera",
    title: "EastWest Ageas (EWALIC)",
    role: "trainee",
    organization: "EastWest Ageas Life Insurance",
    trainee_code: "TRN-8105",
    display_name: "RowenaEW",
    company_code: "EWALIC",
    assigned_companies: ["EWALIC", "VHL"],
    streak: 9,
    points: 12400,
    level: 4,
    quizzes_completed: 3,
    quiz_progress: {
      'act-1': { completed: true, score: 95, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 90, segments: [true, true, true, false] },
      'act-3': { completed: true, score: 88, segments: [true, true, true, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "RC"
  },
  trainee_joshua: {
    id: "0244b2b1-e722-4461-a5a2-4c1299e7f439",
    email: "jjavier@islalpg.com",
    name: "Joshua Javier",
    title: "Isla LPG (ISLA_LPG_CORPOR)",
    role: "trainee",
    organization: "Isla LPG Corporation",
    trainee_code: "TRN-8038",
    display_name: "JoshuaLPG",
    company_code: "ISLA_LPG_CORPOR",
    assigned_companies: ["ISLA_LPG_CORPOR", "VHL"],
    streak: 5,
    points: 9900,
    level: 3,
    quizzes_completed: 2,
    quiz_progress: {
      'act-1': { completed: true, score: 90, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 80, segments: [true, true, false, false] },
      'act-3': { completed: false, score: null, segments: [false, false, false, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "JJ"
  },
  trainee_arvin: {
    id: "78ef52e6-69f3-4be7-88fa-e8c6b78984be",
    email: "arvin.natividad@urc.com.ph",
    name: "Arvin Natividad",
    title: "Universal Robina (UNIVER_ROBINA_CORPOR)",
    role: "trainee",
    organization: "Universal Robina Corporation",
    trainee_code: "TRN-8147",
    display_name: "ArvinURC",
    company_code: "UNIVER_ROBINA_CORPOR",
    assigned_companies: ["UNIVER_ROBINA_CORPOR", "ROP"],
    streak: 7,
    points: 11800,
    level: 3,
    quizzes_completed: 2,
    quiz_progress: {
      'act-1': { completed: true, score: 90, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 85, segments: [true, true, true, false] },
      'act-3': { completed: false, score: null, segments: [false, false, false, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "AN"
  },
  trainee_camille: {
    id: "d0068942-b729-4ae4-8611-916b94884110",
    email: "camille.morales@boehringer-ingelheim.com",
    name: "Camille Morales",
    title: "Boehringer Ingelheim (BIBSP)",
    role: "trainee",
    organization: "Boehringer Ingelheim",
    trainee_code: "TRN-8028",
    display_name: "CamilleBI",
    company_code: "BIBSP",
    assigned_companies: ["BIBSP", "VHL", "ROP"],
    streak: 10,
    points: 14200,
    level: 4,
    quizzes_completed: 3,
    quiz_progress: {
      'act-1': { completed: true, score: 95, segments: [true, true, true, true] },
      'act-2': { completed: true, score: 90, segments: [true, true, true, true] },
      'act-3': { completed: true, score: 85, segments: [true, true, true, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "CM"
  },
  trainee_vincent: {
    id: "7ee5f39e-efb0-4c1a-afdd-0b680128e924",
    email: "santos.vincent@ayalaland.com.ph",
    name: "Vincent Santos",
    title: "Ayala Land (AYALA_LAND_INC)",
    role: "trainee",
    organization: "Ayala Land Inc",
    trainee_code: "TRN-8025",
    display_name: "VincentAyala",
    company_code: "AYALA_LAND_INC",
    assigned_companies: ["AYALA_LAND_INC", "ROP"],
    streak: 6,
    points: 10500,
    level: 3,
    quizzes_completed: 2,
    quiz_progress: {
      'act-1': { completed: true, score: 85, segments: [true, true, true, false] },
      'act-2': { completed: true, score: 80, segments: [true, true, false, false] },
      'act-3': { completed: false, score: null, segments: [false, false, false, false] },
      'act-4': { completed: false, score: null, segments: [false, false, false, false] }
    },
    initials: "VS"
  }
};

// Demo status mix seeded by backend/seed_demo_real_accounts.py on each trainee's SESS-2026-* records.
export const DEMO_STATUS_MIX = {
  trainee:         ["Completed", "In progress"],
  trainee_ricardo: ["Completed", "Not completed"],
  trainee_bea:     ["Completed", "In progress"],
  trainee_rafael:  ["Completed", "In progress", "Not completed"],
  trainee_rowena:  ["Completed", "In progress"],
  trainee_joshua:  ["Completed", "Not completed"],
  trainee_arvin:   ["Completed", "In progress"],
  trainee_camille: ["Completed", "In progress", "Not completed"],
  trainee_vincent: ["Completed", "In progress"],
};

export function normalizeRole(role) {
  if (!role) return 'trainee';
  return String(role).toLowerCase().trim();
}

function isJwtExpired(tokenStr) {
  if (!tokenStr) return true;
  try {
    const parts = tokenStr.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    // Buffer with 30 seconds
    return (payload.exp * 1000) < (Date.now() + 30000);
  } catch {
    return true;
  }
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Find matching persona in DEMO_USERS to upgrade any stale cached object
        const matchingDemo = Object.values(DEMO_USERS).find(
          u => u.id === parsed.id || u.email === parsed.email
        );
        if (matchingDemo) {
          const upgraded = { ...matchingDemo, ...parsed, name: matchingDemo.name, title: matchingDemo.title, initials: matchingDemo.initials, assigned_companies: matchingDemo.assigned_companies, assigned_client_accounts: matchingDemo.assigned_client_accounts, company_code: matchingDemo.company_code || parsed.company_code };
          upgraded.role = normalizeRole(upgraded.role);
          // Ensure streak, points, level, and quiz_progress from DEMO_USERS if missing or stale
          if (upgraded.points === undefined || upgraded.quiz_progress === undefined) {
            upgraded.streak = matchingDemo.streak;
            upgraded.points = matchingDemo.points;
            upgraded.level = matchingDemo.level;
            upgraded.quiz_progress = matchingDemo.quiz_progress;
          }
          return upgraded;
        }
        parsed.role = normalizeRole(parsed.role);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('crossquest_auth_token') || null);

  // Listen for transparent re-authentications from api.js
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('crossquest_token_refreshed', handleTokenRefreshed);
      return () => {
        window.removeEventListener('crossquest_token_refreshed', handleTokenRefreshed);
      };
    }
  }, []);

  useEffect(() => {
    const handleRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('crossquest_token_refreshed', handleRefreshed);
      return () => window.removeEventListener('crossquest_token_refreshed', handleRefreshed);
    }
  }, []);


  const loginRole = async (roleKey) => {
    const baseUser = DEMO_USERS[roleKey] || DEMO_USERS.admin;
    const user = { ...baseUser };
    user.role = normalizeRole(user.role);

    // Re-hydrate any persisted progress for this persona across role switches
    try {
      const uid = user.id || user.email;
      const savedRaw = localStorage.getItem(`crossquest_trainee_progress_${uid}`);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.quiz_progress) {
          user.quiz_progress = { ...(user.quiz_progress || {}), ...saved.quiz_progress };
        }
        if (saved.points !== undefined) {
          user.points = saved.points;
        }
        if (saved.level !== undefined) {
          user.level = saved.level;
        }
        if (saved.quizzes_completed !== undefined) {
          user.quizzes_completed = saved.quizzes_completed;
        }
      }
    } catch (e) {
      console.warn("Could not re-hydrate persona progress:", e);
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', user.email);
      formData.append('password', 'password123');
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        let activeToken = data.access_token;
        if (data.mfa_required && data.challenge_token) {
          const mfaRes = await fetch('http://localhost:8000/api/v1/auth/mfa/verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challenge_token: data.challenge_token,
              code: 'DEV_MFA_BYPASS'
            })
          });
          if (mfaRes.ok) {
            const mfaData = await mfaRes.json();
            activeToken = mfaData.access_token;
          }
        }
        if (activeToken) {
          localStorage.setItem('crossquest_auth_token', activeToken);
          localStorage.setItem('crossquest_auth_email', user.email);
          setToken(activeToken);
        }
      }
    } catch (e) {
      console.warn("Could not acquire backend token for role switch:", e);
    }

    localStorage.setItem('crossquest_auth_user', JSON.stringify(user));
    setCurrentUser(user);
    return user;
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        // Check if MFA is required (SEC-01, OI-26)
        if (data.mfa_required) {
          return {
            success: false,
            mfa_required: true,
            challenge_token: data.challenge_token,
            role: data.role,
            full_name: data.full_name
          };
        }

        if (data.mfa_setup_required) {
          return {
            success: false,
            mfa_setup_required: true,
            setup_token: data.setup_token,
            role: data.role,
            full_name: data.full_name
          };
        }

        setToken(data.access_token);
        localStorage.setItem('crossquest_auth_token', data.access_token);

        const userRes = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (userRes.ok) {
          const profile = await userRes.json();
          const userObj = {
            ...profile,
            role: normalizeRole(profile.role),
            name: profile.full_name,
            initials: profile.full_name.split(' ').map(n => n[0]).join(''),
            organization: profile.company_name || (profile.role === 'trainee' 
              ? 'Vertiv Holdings Ltd' 
              : 'Crossworks Training & Consulting'),
            assigned_companies: profile.assigned_client_accounts || ['CORP_ALPHA'],
            streak: Number.isFinite(Number(profile.streak)) ? Number(profile.streak) : 7
          };
          setCurrentUser(userObj);
          localStorage.setItem('crossquest_auth_user', JSON.stringify(userObj));
          return { success: true, user: userObj };
        }
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Incorrect email or password' };
      }
    } catch (err) {
      console.warn("Backend login network error:", err);
      return { success: false, error: 'Could not connect to authentication server. Check backend connection.' };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const completeMfaLogin = async (challengeToken, code) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_token: challengeToken, code: code.trim() })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { success: false, error: err.detail || 'Invalid verification code' };
      }

      const data = await res.json();
      setToken(data.access_token);
      localStorage.setItem('crossquest_auth_token', data.access_token);

      const userRes = await fetch('http://localhost:8000/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      if (userRes.ok) {
        const profile = await userRes.json();
        const userObj = {
          ...profile,
          role: normalizeRole(profile.role),
          name: profile.full_name,
          initials: profile.full_name.split(' ').map(n => n[0]).join(''),
          organization: profile.company_name || (profile.role === 'trainee' 
            ? 'Vertiv Holdings Ltd' 
            : 'Crossworks Training & Consulting'),
          assigned_companies: profile.assigned_client_accounts || ['CORP_ALPHA'],
          streak: Number.isFinite(Number(profile.streak)) ? Number(profile.streak) : 7
        };
        setCurrentUser(userObj);
        localStorage.setItem('crossquest_auth_user', JSON.stringify(userObj));
        return { success: true, user: userObj };
      }
      return { success: true, user: { role: normalizeRole(data.role), full_name: data.full_name } };
    } catch (err) {
      return { success: false, error: err.message || 'MFA network error' };
    }
  };

  const logout = (reason) => {
    if (reason === 'idle' || reason === 'expired') sessionStorage.setItem('crossquest_logout_reason', reason);
    fetch('http://localhost:8000/api/v1/auth/logout', {
      method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).catch(() => {});
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('crossquest_auth_user');
    localStorage.removeItem('crossquest_auth_token');
    localStorage.removeItem('crossquest_auth_email');
  };

  // SEC-07 / OI-17: real inactivity timer (Admin/Finance 15 min, AM/Trainer/Trainee 30 min) + server-expiry listener
  useEffect(() => {
    if (!currentUser) return;
    const limitMs = (['admin', 'finance'].includes(currentUser.role) ? 15 : 30) * 60 * 1000;
    let last = Date.now();
    let lastPing = Date.now();
    const onActivity = () => {
      last = Date.now();
      // Keep the server-side idle clock aligned with real UI activity (throttled)
      if (Date.now() - lastPing > 4 * 60 * 1000) {
        lastPing = Date.now();
        authFetch('http://localhost:8000/api/v1/users/me', {}, localStorage.getItem('crossquest_auth_token')).catch(() => {});
      }
    };
    const evts = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    evts.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const timer = setInterval(() => { if (Date.now() - last > limitMs) logout('idle'); }, 5000);
    const onExpired = (e) => logout(e.detail?.reason || 'expired');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      clearInterval(timer);
      evts.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, token, loginRole, loginWithCredentials, completeMfaLogin, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
