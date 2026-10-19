import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_USERS = {
  admin: {
    id: "usr-admin-01",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    title: "System Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    initials: "SJ"
  },
  account_manager: {
    id: "usr-am-02",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    title: "Account Manager (Assigned: San Miguel)",
    role: "account_manager",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA"],
    initials: "MR"
  },
  finance: {
    id: "usr-fin-03",
    email: "elena.santos@crossworks.ph",
    name: "Elena Santos",
    title: "Finance & Operations Specialist",
    role: "finance",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    initials: "ES"
  },
  trainer: {
    id: "usr-trainer-04",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    title: "Lead Training Instructor",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    initials: "DL"
  },
  trainee: {
    id: "usr-trainee-05",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    title: "Trainee Analyst",
    role: "trainee",
    organization: "San Miguel Conglomerate Holdings",
    trainee_code: "TRN-9021",
    display_name: "CyberKnight9021",
    company_code: "CORP_ALPHA",
    assigned_companies: ["CORP_ALPHA"],
    initials: "JD"
  }
};

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
            assigned_companies: profile.assigned_client_accounts || ['CORP_ALPHA']
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
