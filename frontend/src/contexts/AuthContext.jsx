import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_USERS = {
  // --- ADMINISTRATORS ---
  admin: {
    id: "usr-admin-01",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    title: "System Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    assigned_client_accounts: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    initials: "SJ"
  },
  admin_roel: {
    id: "usr-admin-02",
    email: "admin2@crossworks.ph",
    name: "Prof. Roel Traballo",
    title: "Co-Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    assigned_client_accounts: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    initials: "RT"
  },

  // --- ACCOUNT MANAGERS (SCOPED MULTI-TENANT CLIENTS) ---
  account_manager: {
    id: "usr-am-02",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    title: "AM: San Miguel & BDO (CORP_ALPHA, BANK_DELTA)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "BANK_DELTA"],
    assigned_client_accounts: ["CORP_ALPHA", "BANK_DELTA"],
    initials: "MR"
  },
  am_andrea: {
    id: "usr-am-03",
    email: "andrea.salazar@crossworks.ph",
    name: "Andrea Salazar",
    title: "AM: Maya & Ayala (FINTECH_BETA, RETAIL_GAMMA)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["FINTECH_BETA", "RETAIL_GAMMA"],
    assigned_client_accounts: ["FINTECH_BETA", "RETAIL_GAMMA"],
    initials: "AS"
  },

  // --- FINANCE & OPERATIONS (ENTERPRISE VIEW) ---
  finance: {
    id: "usr-fin-03",
    email: "elena.santos@crossworks.ph",
    name: "Elena Santos",
    title: "Finance & Operations Lead",
    role: "finance",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    assigned_client_accounts: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA", "BANK_DELTA", "TELCO_EPSILON"],
    initials: "ES"
  },
  finance_victor: {
    id: "usr-fin-04",
    email: "victor.cruz@crossworks.ph",
    name: "Victor Cruz",
    title: "Financial Auditor",
    role: "finance",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    assigned_client_accounts: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    initials: "VC"
  },

  // --- TRAINERS ---
  trainer: {
    id: "usr-trainer-04",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    title: "Lead Trainer (San Miguel & Maya)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    assigned_client_accounts: ["CORP_ALPHA", "FINTECH_BETA"],
    initials: "DL"
  },
  trainer_maria: {
    id: "usr-trainer-05",
    email: "maria.hernandez@crossworks.ph",
    name: "Maria Hernandez",
    title: "Lead Trainer (Ayala & BDO)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["RETAIL_GAMMA", "BANK_DELTA"],
    assigned_client_accounts: ["RETAIL_GAMMA", "BANK_DELTA"],
    initials: "MH"
  },
  trainer_alex: {
    id: "usr-trainer-06",
    email: "alex.santos@crossworks.ph",
    name: "Engr. Alex Santos",
    title: "Lead Trainer (Globe Telecom)",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["TELCO_EPSILON"],
    assigned_client_accounts: ["TELCO_EPSILON"],
    initials: "AS"
  },

  // --- TRAINEES ACROSS DIFFERENT CLIENT COMPANIES ---
  trainee: {
    id: "4bf4b74e-d001-4ab5-8ccf-325565adf3b1",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    title: "San Miguel Corp (CORP_ALPHA)",
    role: "trainee",
    organization: "San Miguel Conglomerate Holdings",
    trainee_code: "TRN-9021",
    display_name: "CyberKnight9021",
    company_code: "CORP_ALPHA",
    assigned_companies: ["CORP_ALPHA"],
    streak: 7,
    initials: "JD"
  },
  trainee_beatrice: {
    id: "ebda330c-24f7-4625-b713-acafbc0d4f00",
    email: "beatrice.tan@alpha-corp.ph",
    name: "Beatrice Tan",
    title: "San Miguel Corp (CORP_ALPHA)",
    role: "trainee",
    organization: "San Miguel Conglomerate Holdings",
    trainee_code: "TRN-9045",
    display_name: "BeaSecOps",
    company_code: "CORP_ALPHA",
    assigned_companies: ["CORP_ALPHA"],
    streak: 12,
    initials: "BT"
  },
  trainee_maria: {
    id: "b45c7419-02c7-4aa6-bc17-04f9568c213b",
    email: "maria.clara@maya-fintech.ph",
    name: "Maria Clara",
    title: "Maya FinTech (FINTECH_BETA)",
    role: "trainee",
    organization: "Maya FinTech Digital Innovations",
    trainee_code: "TRN-9088",
    display_name: "MayaFinPro",
    company_code: "FINTECH_BETA",
    assigned_companies: ["FINTECH_BETA"],
    streak: 5,
    initials: "MC"
  },
  trainee_liam: {
    id: "403cd7cd-a014-42e0-8165-f16e8ed85371",
    email: "liam.chen@maya-fintech.ph",
    name: "Liam Chen",
    title: "Maya FinTech (FINTECH_BETA)",
    role: "trainee",
    organization: "Maya FinTech Digital Innovations",
    trainee_code: "TRN-9092",
    display_name: "LiamDevSec",
    company_code: "FINTECH_BETA",
    assigned_companies: ["FINTECH_BETA"],
    streak: 3,
    initials: "LC"
  },
  trainee_gabriel: {
    id: "ddcb84b6-48aa-4bdb-a73f-19919d6730fa",
    email: "g.ramos@ayala-retail.ph",
    name: "Gabriel Ramos",
    title: "Ayala Retail (RETAIL_GAMMA)",
    role: "trainee",
    organization: "Ayala Retail Omnichannel Corp",
    trainee_code: "TRN-9114",
    display_name: "RetailOpsRamos",
    company_code: "RETAIL_GAMMA",
    assigned_companies: ["RETAIL_GAMMA"],
    streak: 9,
    initials: "GR"
  },
  trainee_chloe: {
    id: "bd398658-8eff-4215-975a-baf703936d7f",
    email: "chloe.garcia@ayala-retail.ph",
    name: "Chloe Garcia",
    title: "Ayala Retail (RETAIL_GAMMA)",
    role: "trainee",
    organization: "Ayala Retail Omnichannel Corp",
    trainee_code: "TRN-9125",
    display_name: "ChloeCloud",
    company_code: "RETAIL_GAMMA",
    assigned_companies: ["RETAIL_GAMMA"],
    streak: 4,
    initials: "CG"
  }
};

DEMO_USERS.crossworks_staff = DEMO_USERS.account_manager;
DEMO_USERS.company_staff = DEMO_USERS.finance;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('crossquest_auth_user');
      return saved ? JSON.parse(saved) : null;
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
      if (!storedToken || !token) {
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
    const user = DEMO_USERS[roleKey] || DEMO_USERS.admin;
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
        setToken(data.access_token);
        localStorage.setItem('crossquest_auth_token', data.access_token);

        const userRes = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (userRes.ok) {
          const profile = await userRes.json();
          const userObj = {
            ...profile,
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
      }
    } catch (err) {
      console.warn("Backend login fallback to local simulation:", err);
    }

    const found = Object.values(DEMO_USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    const fallbackUser = found || DEMO_USERS.admin;
    setCurrentUser(fallbackUser);
    localStorage.setItem('crossquest_auth_user', JSON.stringify(fallbackUser));
    return { success: true, user: fallbackUser };
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('crossquest_auth_user');
    localStorage.removeItem('crossquest_auth_token');
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, loginRole, loginWithCredentials, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
