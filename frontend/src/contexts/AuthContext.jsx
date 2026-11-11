import React, { createContext, useContext, useState, useEffect } from 'react';
import { authFetch, SESSION_EXPIRED_EVENT, switchMyCompanyApi } from '../services/api';

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

  // --- ACCOUNT MANAGERS ---
  account_manager: {
    id: "81847717-dd7f-48fe-91ad-4391018fdef8",
    email: "erika.bana@crossworks.ph",
    name: "Erika Bana",
    title: "Account Manager (Enterprise Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL", "ROP", "EWALIC"],
    assigned_client_accounts: ["VHL", "ROP", "EWALIC"],
    initials: "EB"
  },
  am_sharon: {
    id: "0525a57b-668d-46cf-ab3b-6f6862920a9c",
    email: "sharon.devera@crossworks.ph",
    name: "Sharon De Vera",
    title: "Account Manager (Strategic Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["UNIVER_ROBINA_CORPOR", "ISLA_LPG_CORPOR", "AYALA_LAND_INC", "BIBSP"],
    assigned_client_accounts: ["UNIVER_ROBINA_CORPOR", "ISLA_LPG_CORPOR", "AYALA_LAND_INC", "BIBSP"],
    initials: "SD"
  },
  am_brian: {
    id: "8049c06b-c340-4d3f-8fca-1e83a4beb4f1",
    email: "brian.mendoza@crossworks.ph",
    name: "Brian Mendoza",
    title: "Account Manager (Tech & Telecom)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["IPROY_SERVI", "AMIHAN_SOLUTI", "SECURI_BANK_CORPOR", "PHILIP_SAVING_BANK", "XSDS"],
    assigned_client_accounts: ["IPROY_SERVI", "AMIHAN_SOLUTI", "SECURI_BANK_CORPOR", "PHILIP_SAVING_BANK", "XSDS"],
    initials: "BM"
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

  // --- LEAD TRAINER ---
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

  // --- TRAINEES WITH REAL PILOT ACCOUNTS & RECORDS ---
  trainee: {
    id: "e335aea7-fe01-436f-a05c-9db2fee10cfd",
    email: "andrea.aguilar@vertiv.com",
    name: "Andrea Aguilar",
    title: "Vertiv Holdings Ltd (VHL)",
    role: "trainee",
    organization: "Vertiv (Singapore) Holdings PTE LTD-ROHQ",
    trainee_code: "TRN-8000",
    display_name: "AndreaVertiv",
    company_code: "VHL",
    assigned_companies: ["VHL", "AOS", "ROP"],
    affiliations: [
      { company_code: "VHL", company_name: "Vertiv (Singapore) Holdings PTE LTD-ROHQ", is_current: true },
      { company_code: "ROP", company_name: "Red Oak Properties, Inc.", is_current: false },
      { company_code: "AOS", company_name: "Acen Operations Services Inc.", is_current: false }
    ],
    demo_note: "Completed · In progress · Not completed · 3 Companies (VHL, ROP, AOS)",
    streak: 8, points: 13500, level: 4, quizzes_completed: 1, quiz_progress: {}, initials: "AA"
  },
  trainee_ricardo: {
    id: "35076d4f-7548-4131-8dd1-6fc07389b17d",
    email: "ricardo.ocampo@iproyal.com",
    name: "Ricardo Ocampo",
    title: "IPRoyal Services (IPROY_SERVI)",
    role: "trainee",
    organization: "IPRoyal Services FZE LLC",
    trainee_code: "TRN-8001",
    display_name: "RicardoOps",
    company_code: "IPROY_SERVI",
    assigned_companies: ["IPROY_SERVI", "AMIHAN_SOLUTI", "VHL"],
    affiliations: [
      { company_code: "IPROY_SERVI", company_name: "IPRoyal Services FZE LLC", is_current: true },
      { company_code: "VHL", company_name: "Vertiv (Singapore) Holdings PTE LTD-ROHQ", is_current: false },
      { company_code: "AMIHAN_SOLUTI", company_name: "Amihan Solutions (OPC)", is_current: false }
    ],
    demo_note: "Completed · In progress · Not completed · 3 Companies (IPROY, VHL, AMIHAN)",
    streak: 6, points: 10200, level: 3, quizzes_completed: 1, quiz_progress: {}, initials: "RO"
  },
  trainee_bea: {
    id: "82dd244c-84c5-4831-9381-279bd9fd5c37",
    email: "bea.macaraeg@iproyal.com",
    name: "Bea Macaraeg",
    title: "IPRoyal Services (IPROY_SERVI)",
    role: "trainee",
    organization: "IPRoyal Services FZE LLC",
    trainee_code: "TRN-8002",
    display_name: "BeaMacaraeg",
    company_code: "IPROY_SERVI",
    assigned_companies: ["IPROY_SERVI"],
    demo_note: "Completed · In progress · Not completed",
    streak: 11, points: 14800, level: 5, quizzes_completed: 0, quiz_progress: {}, initials: "BM"
  },
  trainee_rafael: {
    id: "d4799846-9779-4b67-acc5-09a5d69a0ade",
    email: "rafael.dizon@amihansolutions.com",
    name: "Rafael Dizon",
    title: "Amihan Solutions (AMIHAN_SOLUTI)",
    role: "trainee",
    organization: "Amihan Solutions (OPC)",
    trainee_code: "TRN-8015",
    display_name: "RafaelDev",
    company_code: "AMIHAN_SOLUTI",
    assigned_companies: ["AMIHAN_SOLUTI", "SECURI_BANK_CORPOR", "ROP"],
    affiliations: [
      { company_code: "AMIHAN_SOLUTI", company_name: "Amihan Solutions (OPC)", is_current: true },
      { company_code: "ROP", company_name: "Red Oak Properties, Inc.", is_current: false },
      { company_code: "SECURI_BANK_CORPOR", company_name: "Security Bank Corporation", is_current: false }
    ],
    demo_note: "Completed · In progress · Not completed · 3 Companies (AMIHAN, ROP, SECB)",
    streak: 4, points: 8100, level: 2, quizzes_completed: 0, quiz_progress: {}, initials: "RD"
  },
  trainee_rowena: {
    id: "7084364a-d26c-4154-b10f-b5c0cac75fe5",
    email: "rowena.cabrera@ewageas.com",
    name: "Rowena Cabrera",
    title: "EastWest Ageas (EWALIC)",
    role: "trainee",
    organization: "East West Ageas Life Insurance Corporation",
    trainee_code: "TRN-8032",
    display_name: "RowenaEW",
    company_code: "EWALIC",
    assigned_companies: ["EWALIC", "VHL", "BIBSP"],
    affiliations: [
      { company_code: "EWALIC", company_name: "East West Ageas Life Insurance Corporation", is_current: true },
      { company_code: "BIBSP", company_name: "Boehringer Ingelheim Business Services Philippines Inc.", is_current: false },
      { company_code: "VHL", company_name: "Vertiv (Singapore) Holdings PTE LTD-ROHQ", is_current: false }
    ],
    demo_note: "Completed · In progress · Not completed · 3 Companies (EWALIC, BIBSP, VHL)",
    streak: 9, points: 12400, level: 4, quizzes_completed: 1, quiz_progress: {}, initials: "RC"
  },
  trainee_joshua: {
    id: "0244b2b1-e722-4461-a5a2-4c1299e7f439",
    email: "jjavier@islalpg.com",
    name: "Joshua Javier",
    title: "Isla LPG (ISLA_LPG_CORPOR)",
    role: "trainee",
    organization: "Isla LPG Corporation",
    trainee_code: "TRN-8049",
    display_name: "JoshuaLPG",
    company_code: "ISLA_LPG_CORPOR",
    assigned_companies: ["ISLA_LPG_CORPOR"],
    demo_note: "Completed · In progress · Not completed",
    streak: 5, points: 9900, level: 3, quizzes_completed: 0, quiz_progress: {}, initials: "JJ"
  },
  trainee_arvin: {
    id: "78ef52e6-69f3-4be7-88fa-e8c6b78984be",
    email: "arvin.natividad@urc.com.ph",
    name: "Arvin Natividad",
    title: "Universal Robina (UNIVER_ROBINA_CORPOR)",
    role: "trainee",
    organization: "Universal Robina Corporation",
    trainee_code: "TRN-8139",
    display_name: "ArvinURC",
    company_code: "UNIVER_ROBINA_CORPOR",
    assigned_companies: ["UNIVER_ROBINA_CORPOR"],
    demo_note: "Completed · In progress · Not completed",
    streak: 7, points: 11800, level: 3, quizzes_completed: 0, quiz_progress: {}, initials: "AN"
  },
  trainee_camille: {
    id: "d0068942-b729-4ae4-8611-916b94884110",
    email: "camille.morales@boehringer-ingelheim.com",
    name: "Camille Morales",
    title: "Boehringer Ingelheim (BIBSP)",
    role: "trainee",
    organization: "Boehringer Ingelheim Business Services Philippines Inc.",
    trainee_code: "TRN-8071",
    display_name: "CamilleBI",
    company_code: "BIBSP",
    assigned_companies: ["BIBSP"],
    demo_note: "Completed · In progress · Not completed",
    streak: 10, points: 14200, level: 4, quizzes_completed: 0, quiz_progress: {}, initials: "CM"
  },
  trainee_vincent: {
    id: "7ee5f39e-efb0-4c1a-afdd-0b680128e924",
    email: "santos.vincent@ayalaland.com.ph",
    name: "Vincent Santos",
    title: "Ayala Land (AYALA_LAND_INC)",
    role: "trainee",
    organization: "Ayala Land, Inc.",
    trainee_code: "TRN-8088",
    display_name: "VincentAyala",
    company_code: "AYALA_LAND_INC",
    assigned_companies: ["AYALA_LAND_INC"],
    demo_note: "Completed · In progress · Not completed",
    streak: 6, points: 10500, level: 3, quizzes_completed: 0, quiz_progress: {}, initials: "VS"
  },

  // --- SYNTHETIC SCENARIO TRAINEES (Round 11) ---
  scn_mia: {
    id: "u-scn_mia",
    email: "scn_mia@demo.crossquest.test",
    name: "Mia Villanueva",
    title: "Vertiv Holdings Ltd (VHL)",
    role: "trainee",
    organization: "Vertiv (Singapore) Holdings PTE LTD-ROHQ",
    trainee_code: "TRN-9001",
    display_name: "MiaV",
    company_code: "VHL",
    assigned_companies: ["VHL"],
    scenario_ids: ["SCN-01", "SCN-05", "SCN-06"],
    demo_note: "SCN-01: 2/3 quizzes done, Present, In progress",
    streak: 3, points: 200, level: 3, quizzes_completed: 2, quiz_progress: {}, initials: "MV"
  },
  scn_noel: {
    id: "u-scn_noel",
    email: "scn_noel@demo.crossquest.test",
    name: "Noel Castillo",
    title: "Vertiv Holdings Ltd (VHL)",
    role: "trainee",
    organization: "Vertiv (Singapore) Holdings PTE LTD-ROHQ",
    trainee_code: "TRN-9002",
    display_name: "NoelC",
    company_code: "VHL",
    assigned_companies: ["VHL"],
    scenario_ids: ["SCN-02"],
    demo_note: "SCN-02: 3/3 quizzes done, Absent (OI-02)",
    streak: 3, points: 300, level: 4, quizzes_completed: 3, quiz_progress: {}, initials: "NC"
  },
  scn_paolo: {
    id: "u-scn_paolo",
    email: "scn_paolo@demo.crossquest.test",
    name: "Paolo Reyes",
    title: "Red Oak Properties (ROP)",
    role: "trainee",
    organization: "Red Oak Properties, Inc.",
    trainee_code: "TRN-9003",
    display_name: "PaoloR",
    company_code: "ROP",
    assigned_companies: ["ROP"],
    scenario_ids: ["SCN-03"],
    demo_note: "SCN-03: Future-dated session (sign-off blocked)",
    streak: 1, points: 0, level: 1, quizzes_completed: 0, quiz_progress: {}, initials: "PR"
  },
  scn_carla: {
    id: "u-scn_carla",
    email: "scn_carla@demo.crossquest.test",
    name: "Carla Mendoza",
    title: "EastWest Ageas (EWALIC)",
    role: "trainee",
    organization: "East West Ageas Life Insurance Corporation",
    trainee_code: "TRN-9004",
    display_name: "CarlaM",
    company_code: "EWALIC",
    assigned_companies: ["EWALIC"],
    scenario_ids: ["SCN-04"],
    demo_note: "SCN-04: Completed with wrong score (62%) for Admin correction",
    streak: 4, points: 400, level: 5, quizzes_completed: 1, quiz_progress: {}, initials: "CM"
  },
  scn_ines: {
    id: "u-scn_ines",
    email: "scn_ines@demo.crossquest.test",
    name: "Ines Bautista",
    title: "Vertiv Holdings Ltd (VHL)",
    role: "trainee",
    organization: "Vertiv (Singapore) Holdings PTE LTD-ROHQ",
    trainee_code: "TRN-9005",
    display_name: "InesB",
    company_code: "VHL",
    assigned_companies: ["VHL"],
    scenario_ids: ["SCN-08"],
    demo_note: "SCN-08: Expiring PMP (25d) & Expired CAPM",
    streak: 2, points: 100, level: 2, quizzes_completed: 1, quiz_progress: {}, initials: "IB"
  },
  scn_gabe: {
    id: "u-scn_gabe",
    email: "scn_gabe@demo.crossquest.test",
    name: "Gabe Soriano",
    title: "Red Oak Properties (ROP)",
    role: "trainee",
    organization: "Red Oak Properties, Inc.",
    trainee_code: "TRN-9006",
    display_name: "GabeS",
    company_code: "ROP",
    assigned_companies: ["ROP"],
    scenario_ids: ["SCN-10"],
    demo_note: "SCN-10: Pending single-use activation & account lifecycle",
    streak: 0, points: 0, level: 1, quizzes_completed: 0, quiz_progress: {}, initials: "GS"
  },
  scn_ivy: {
    id: "u-scn_ivy",
    email: "scn_ivy@demo.crossquest.test",
    name: "Ivy Navarro",
    title: "Individual Client (BIBSP)",
    role: "trainee",
    organization: "Boehringer Ingelheim Business Services Philippines Inc.",
    trainee_code: "TRN-9007",
    display_name: "IvyN",
    company_code: "BIBSP",
    assigned_companies: ["BIBSP"],
    scenario_ids: ["SCN-12"],
    demo_note: "SCN-12: Individual self-paying client assigned to Sharon",
    streak: 2, points: 100, level: 2, quizzes_completed: 0, quiz_progress: {}, initials: "IN"
  }

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

  const [token, setToken] = useState(null);
  const [personas, setPersonas] = useState(DEMO_USERS);

  useEffect(() => {
    try { localStorage.removeItem('crossquest_auth_token'); } catch {}
    if (!import.meta.env.DEV) return;
    fetch('http://localhost:8000/api/v1/dev/personas', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.personas)) return;
        setPersonas((prev) => {
          const next = { ...prev };
          const byEmail = {};
          Object.entries(next).forEach(([k, v]) => { if (v?.email) byEmail[v.email.toLowerCase()] = k; });
          data.personas.forEach((dp) => {
            const existingKey = next[dp.key] ? dp.key : byEmail[(dp.email || '').toLowerCase()];
            if (existingKey) {
              next[existingKey] = {
                ...next[existingKey],
                id: dp.id || next[existingKey].id,
                email: dp.email || next[existingKey].email,
                name: dp.name || next[existingKey].name,
                company_code: dp.company_code || next[existingKey].company_code,
                trainee_code: dp.trainee_code || next[existingKey].trainee_code,
                display_name: dp.display_name || next[existingKey].display_name,
              };
            }
          });
          return next;
        });
      })
      .catch(() => {});
  }, []);

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
    const baseUser = personas[roleKey] || DEMO_USERS[roleKey] || personas.admin || DEMO_USERS.admin;
    const user = { ...baseUser };
    user.role = normalizeRole(user.role);

    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('crossquest_trainee_progress_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {}

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
          try { localStorage.removeItem('crossquest_auth_token'); } catch {}
          localStorage.setItem('crossquest_auth_email', user.email);
          setToken(activeToken);
          try {
            const meRes = await fetch('http://localhost:8000/api/v1/users/me', {
              headers: { Authorization: `Bearer ${activeToken}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.company_name) user.organization = meData.company_name;
              if (meData.company_code) user.company_code = meData.company_code;
              if (Array.isArray(meData.affiliations) && meData.affiliations.length > 0) user.affiliations = meData.affiliations;
              if (Array.isArray(meData.assigned_client_accounts) && meData.assigned_client_accounts.length > 0) {
                user.assigned_companies = meData.assigned_client_accounts;
              }
            }
          } catch {}
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
        try { localStorage.removeItem('crossquest_auth_token'); } catch {}

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
      try { localStorage.removeItem('crossquest_auth_token'); } catch {}

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

  const switchCompany = async (companyCode) => {
    if (!currentUser || !companyCode) return null;
    const res = await switchMyCompanyApi(companyCode, token);
    const nextAffs = (currentUser.affiliations || []).map((a) => ({
      ...a,
      is_current: a.company_code === res.company_code,
    }));
    const updated = {
      ...currentUser,
      company_code: res.company_code,
      organization: res.company_name,
      title: `${res.company_name} (${res.company_code})`,
      affiliations: nextAffs,
    };
    setCurrentUser(updated);
    localStorage.setItem('crossquest_auth_user', JSON.stringify(updated));
    return updated;
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
        authFetch('http://localhost:8000/api/v1/users/me', {}, token).catch(() => {});
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
    <AuthContext.Provider value={{ currentUser, token, loginRole, loginWithCredentials, completeMfaLogin, logout, switchCompany, DEMO_USERS: personas }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
