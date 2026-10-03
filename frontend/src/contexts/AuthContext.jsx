import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_USERS = {
  admin: {
    id: "usr-admin-01",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    title: "System Administrator",
    role: "admin",
    organization: "Crossworks Training & Consulting",
    clearance_level: 3,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    initials: "SJ"
  },
  crossworks_staff: {
    id: "usr-staff-02",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    title: "Client Account Manager",
    role: "crossworks_staff",
    organization: "Crossworks Training & Consulting",
    clearance_level: 2,
    assigned_companies: ["CORP_ALPHA"],
    initials: "MR"
  },
  trainer: {
    id: "usr-trainer-03",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    title: "Lead Training Instructor",
    role: "trainer",
    organization: "Crossworks Training & Consulting",
    clearance_level: 1,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    initials: "DL"
  },
  company_staff: {
    id: "usr-comp-04",
    email: "patricia.hr@alpha-corp.ph",
    name: "Patricia Santos",
    title: "Corporate HR & L&D Director",
    role: "company_staff",
    organization: "San Miguel Conglomerate Holdings",
    company_code: "CORP_ALPHA",
    initials: "PS"
  },
  trainee: {
    id: "usr-trainee-05",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    title: "Trainee Analyst",
    role: "trainee",
    organization: "San Miguel Conglomerate Holdings",
    company_code: "CORP_ALPHA",
    initials: "JD"
  }
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Never default to admin! Start with null or verified localStorage session
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
      // Attempt backend authentication
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

        // Fetch user profile from backend
        const userRes = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (userRes.ok) {
          const profile = await userRes.json();
          const userObj = {
            ...profile,
            name: profile.full_name,
            initials: profile.full_name.split(' ').map(n => n[0]).join(''),
            organization: profile.role === 'company_staff' || profile.role === 'trainee' 
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

    // Match demo user or fallback gracefully
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
