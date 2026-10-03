import React, { createContext, useContext, useState, useEffect } from 'react';

export const DEMO_USERS = {
  admin: {
    id: "usr-admin-01",
    email: "admin@crossworks.ph",
    name: "Dr. Sarah Jenkins",
    title: "Chief Information Security Officer & Admin",
    role: "admin",
    organization: "Crossworks Training & Consulting Corp.",
    clearance_level: 3,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA", "RETAIL_GAMMA"],
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    initials: "SJ"
  },
  crossworks_staff: {
    id: "usr-staff-02",
    email: "marcus.reyes@crossworks.ph",
    name: "Marcus Reyes",
    title: "Senior Client Account Manager",
    role: "crossworks_staff",
    organization: "Crossworks Training & Consulting Corp.",
    clearance_level: 2,
    assigned_companies: ["CORP_ALPHA"], // Only assigned to Alpha
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
    initials: "MR"
  },
  trainer: {
    id: "usr-trainer-03",
    email: "david.lim@crossworks.ph",
    name: "David Lim",
    title: "Principal Cybersecurity Instructor",
    role: "trainer",
    organization: "Crossworks Training & Consulting Corp.",
    clearance_level: 1,
    assigned_companies: ["CORP_ALPHA", "FINTECH_BETA"],
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    initials: "DL"
  },
  company_staff: {
    id: "usr-comp-04",
    email: "patricia.hr@alpha-corp.ph",
    name: "Patricia Santos",
    title: "Head of Learning & Corporate Development",
    role: "company_staff",
    organization: "San Miguel Conglomerate Holdings",
    company_code: "CORP_ALPHA",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    initials: "PS"
  },
  trainee: {
    id: "usr-trainee-05",
    email: "juan.delacruz@alpha-corp.ph",
    name: "Juan Dela Cruz",
    title: "Cybersecurity Analyst Trainee",
    role: "trainee",
    organization: "San Miguel Conglomerate Holdings",
    company_code: "CORP_ALPHA",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    initials: "JD"
  }
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Default to null or saved user from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('crossquest_auth_user');
    return saved ? JSON.parse(saved) : DEMO_USERS.admin;
  });

  const login = (roleKey) => {
    const user = DEMO_USERS[roleKey] || DEMO_USERS.admin;
    setCurrentUser(user);
    localStorage.setItem('crossquest_auth_user', JSON.stringify(user));
  };

  const loginWithCredentials = (email, password) => {
    // Find matching demo user or fallback
    const found = Object.values(DEMO_USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    const userToLogin = found || DEMO_USERS.admin;
    setCurrentUser(userToLogin);
    localStorage.setItem('crossquest_auth_user', JSON.stringify(userToLogin));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crossquest_auth_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithCredentials, logout, DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
