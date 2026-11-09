import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_USERS = {
  // --- ADMINISTRATORS ---
  admin: {
    id: "016868d1-5238-49a4-9b3f-1cd205dbdc44",
    email: "admin@crossworks.ph",
    name: "Dr. Julian Mercer",
    title: "Principal Security Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "JM"
  },
  admin_general: {
    id: "d3c5e17f-1854-488d-8f0f-36ff72ed1745",
    email: "info@crossworks.ph",
    name: "Crossworks Administration",
    title: "Operations & Peer Review Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "CA"
  },

  // --- ACCOUNT MANAGERS ---
  account_manager: {
    id: "0525a57b-668d-46cf-ab3b-6f6862920a9c",
    email: "sharon@crossworks.ph",
    name: "Sharon De Vera",
    title: "Account Manager (Vertiv, Red Oak, EastWest)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL_2", "ROP_3", "EWALIC_2"],
    assigned_client_accounts: ["VHL_2", "ROP_3", "EWALIC_2"],
    initials: "SD"
  },
  am_brian: {
    id: "8049c06b-c340-4d3f-8fca-1e83a4beb4f1",
    email: "brian@crossworks.ph",
    name: "Brian Mendoza",
    title: "Account Manager (IPRoyal & Amihan)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["IPROY_SERVI_2", "AMIHAN_SOLUTI_2"],
    assigned_client_accounts: ["IPROY_SERVI_2", "AMIHAN_SOLUTI_2"],
    initials: "BM"
  },
  am_quel: {
    id: "d6cfb2eb-07d2-4629-8f41-60fee732c5d3",
    email: "quel@crossworks.ph",
    name: "Raquel 'Quel' Santos",
    title: "Account Manager (Universal Robina & Isla LPG)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["UNIVER_ROBINA_CORPOR_3", "ISLA_LPG_CORPOR"],
    assigned_client_accounts: ["UNIVER_ROBINA_CORPOR_3", "ISLA_LPG_CORPOR"],
    initials: "QS"
  },
  am_joey: {
    id: "2cc2fae0-d941-4d81-9e55-04e822726a6a",
    email: "jordan.sales@crossworks.ph",
    name: "Jordan Ramos (Sales)",
    title: "Account Manager (Ayala Land & Boehringer)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["AYALA_LAND_INC_2", "BIBSP_2"],
    assigned_client_accounts: ["AYALA_LAND_INC_2", "BIBSP_2"],
    initials: "JR"
  },
  am_cez: {
    id: "e9c51def-d5a4-40ec-b61e-e3461921b8fe",
    email: "cez@crossworks.ph",
    name: "Cezanne Garcia",
    title: "Account Manager (Enterprise Accounts)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL_2", "AMIHAN_SOLUTI_2"],
    assigned_client_accounts: ["VHL_2", "AMIHAN_SOLUTI_2"],
    initials: "CG"
  },

  // --- TRAINERS ---
  trainer: {
    id: "76be0c39-21c3-46ae-ba5d-0cb2dd203bfe",
    email: "trainer.lead@crossworks.ph",
    name: "Jordan Ramos (Trainer)",
    title: "Lead Technical Trainer (Cybersecurity & GenAI)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["VHL_2", "IPROY_SERVI_2", "AMIHAN_SOLUTI_2"],
    assigned_client_accounts: ["VHL_2", "IPROY_SERVI_2", "AMIHAN_SOLUTI_2"],
    initials: "JR"
  },
  trainer_billy: {
    id: "ad5d83e0-c70b-4bef-851e-6e4bddc44b87",
    email: "billy@crossworks.ph",
    name: "Billy Fernandez",
    title: "Senior Trainer (Cloud & Infrastructure)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["EWALIC_2", "ROP_3"],
    assigned_client_accounts: ["EWALIC_2", "ROP_3"],
    initials: "BF"
  },
  trainer_jobert: {
    id: "58b734d7-e08d-4fb4-829f-38fa0d53f4b1",
    email: "jobert@crossworks.ph",
    name: "Jobert Cruz",
    title: "Senior Trainer (Enterprise Architecture & Data)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["ISLA_LPG_CORPOR", "UNIVER_ROBINA_CORPOR_3"],
    assigned_client_accounts: ["ISLA_LPG_CORPOR", "UNIVER_ROBINA_CORPOR_3"],
    initials: "JC"
  },
  trainer_owen: {
    id: "da0ea449-ace9-49a6-9ce8-5afdc4b4edd2",
    email: "owen@crossworks.ph",
    name: "Owen Castillo",
    title: "Senior Trainer (Modern App Dev & Security)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["AYALA_LAND_INC_2", "BIBSP_2"],
    assigned_client_accounts: ["AYALA_LAND_INC_2", "BIBSP_2"],
    initials: "OC"
  },

  // --- FINANCE & OPERATIONS ---
  finance: {
    id: "553b1112-b37b-4a4a-9e03-575caa636bea",
    email: "finance@crossworks.ph",
    name: "Elena Vance",
    title: "Finance & Operations Specialist",
    role: "finance",
    organization: "Crossworks Operations & Billing",
    company_code: "CROSSWORKS",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "EV"
  },
  finance_maricar: {
    id: "5265ad2f-ce42-4678-9ef4-cd8e198ba655",
    email: "maricar.finance@crossworks.ph",
    name: "Maricar Ramos",
    title: "Billing & Audit Analyst",
    role: "finance",
    organization: "Crossworks Operations & Billing",
    company_code: "CROSSWORKS",
    assigned_companies: ["ALL"],
    assigned_client_accounts: ["ALL"],
    initials: "MR"
  },

  // --- TRAINEES WITH REAL PILOT ACCOUNTS & RECORDS ---
  trainee: {
    id: "e335aea7-fe01-436f-a05c-9db2fee10cfd",
    email: "andrea.aguilar@vertiv.com",
    name: "Andrea Aguilar",
    title: "Vertiv Holdings Ltd (VHL_2)",
    role: "trainee",
    organization: "Vertiv Holdings Ltd",
    trainee_code: "TRN-8000",
    display_name: "AndreaVertiv",
    company_code: "VHL_2",
    assigned_companies: ["VHL_2"],
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
    title: "IPRoyal Services (IPROY_SERVI_2)",
    role: "trainee",
    organization: "IPRoyal Services",
    trainee_code: "TRN-8001",
    display_name: "RicardoOps",
    company_code: "IPROY_SERVI_2",
    assigned_companies: ["IPROY_SERVI_2"],
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
    title: "IPRoyal Services (IPROY_SERVI_2)",
    role: "trainee",
    organization: "IPRoyal Services",
    trainee_code: "TRN-8002",
    display_name: "BeaMacaraeg",
    company_code: "IPROY_SERVI_2",
    assigned_companies: ["IPROY_SERVI_2"],
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
    title: "Amihan Solutions (AMIHAN_SOLUTI_2)",
    role: "trainee",
    organization: "Amihan Solutions",
    trainee_code: "TRN-8015",
    display_name: "RafaelDev",
    company_code: "AMIHAN_SOLUTI_2",
    assigned_companies: ["AMIHAN_SOLUTI_2"],
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
    title: "EastWest Ageas (EWALIC_2)",
    role: "trainee",
    organization: "EastWest Ageas Life Insurance",
    trainee_code: "TRN-8032",
    display_name: "RowenaEW",
    company_code: "EWALIC_2",
    assigned_companies: ["EWALIC_2"],
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
    trainee_code: "TRN-8049",
    display_name: "JoshuaLPG",
    company_code: "ISLA_LPG_CORPOR",
    assigned_companies: ["ISLA_LPG_CORPOR"],
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
    title: "Universal Robina (UNIVER_ROBINA_CORPOR_3)",
    role: "trainee",
    organization: "Universal Robina Corporation",
    trainee_code: "TRN-8139",
    display_name: "ArvinURC",
    company_code: "UNIVER_ROBINA_CORPOR_3",
    assigned_companies: ["UNIVER_ROBINA_CORPOR_3"],
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
    title: "Boehringer Ingelheim (BIBSP_2)",
    role: "trainee",
    organization: "Boehringer Ingelheim",
    trainee_code: "TRN-8071",
    display_name: "CamilleBI",
    company_code: "BIBSP_2",
    assigned_companies: ["BIBSP_2"],
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
    title: "Ayala Land (AYALA_LAND_INC_2)",
    role: "trainee",
    organization: "Ayala Land Inc",
    trainee_code: "TRN-8088",
    display_name: "VincentAyala",
    company_code: "AYALA_LAND_INC_2",
    assigned_companies: ["AYALA_LAND_INC_2"],
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

export function normalizeRole(role) {
  if (!role) return 'trainee';
  const r = String(role).toLowerCase().trim();
  if (r === 'crossworks_staff') return 'account_manager';
  if (r === 'company_staff') return 'finance';
  return r;
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
          u => u.id === parsed.id || u.email === parsed.email || u.role === parsed.role
        );
        if (matchingDemo) {
          const upgraded = { ...matchingDemo, ...parsed, name: matchingDemo.name, title: matchingDemo.title, initials: matchingDemo.initials };
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

  // Resilient token synchronization: on mount or whenever currentUser changes, verify/acquire token
  useEffect(() => {
    let isMounted = true;
    const syncToken = async () => {
      const activeUser = currentUser || (localStorage.getItem('crossquest_auth_user') ? JSON.parse(localStorage.getItem('crossquest_auth_user')) : null);
      if (!activeUser?.email) return;

      const storedToken = localStorage.getItem('crossquest_auth_token');
      const storedEmail = localStorage.getItem('crossquest_auth_email');
      if (!storedToken || !token || storedEmail !== activeUser.email) {
        try {
          const formData = new URLSearchParams();
          formData.append('username', activeUser.email);
          formData.append('password', 'password123');
          const res = await fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
          });
          if (res.ok && isMounted) {
            const data = await res.json();
            setToken(data.access_token);
            localStorage.setItem('crossquest_auth_token', data.access_token);
            localStorage.setItem('crossquest_auth_email', activeUser.email);
          }
        } catch (e) {
          console.warn("AuthContext auto-sync warning:", e);
        }
      }
    };
    syncToken();
    return () => { isMounted = false; };
  }, [currentUser]);


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

    setCurrentUser(user);
    localStorage.setItem('crossquest_auth_user', JSON.stringify(user));

    try {
      const formData = new URLSearchParams();
      formData.append('username', user.email);
      formData.append('password', 'password123');
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        localStorage.setItem('crossquest_auth_token', data.access_token);
        localStorage.setItem('crossquest_auth_email', user.email);
      }
    } catch (e) {
      console.warn("Could not acquire backend token for role switch:", e);
    }
    return user;
  };

  const loginWithCredentials = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
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
            organization: profile.role === 'trainee' 
              ? 'San Miguel Conglomerate' 
              : 'Crossworks Training & Consulting',
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
          organization: profile.role === 'trainee' 
            ? 'San Miguel Conglomerate' 
            : 'Crossworks Training & Consulting',
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

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('crossquest_auth_user');
    localStorage.removeItem('crossquest_auth_token');
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, loginRole, loginWithCredentials, completeMfaLogin, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
