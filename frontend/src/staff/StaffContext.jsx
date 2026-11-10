import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStaffMe, getPortfolios, getStaffRecords, decryptRecord } from '../api/staff';

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const { currentUser, token } = useAuth();
  const [me, setMe] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [records, setRecords] = useState([]);
  const [decryptedRecords, setDecryptedRecords] = useState({});
  const [deniedAttempts, setDeniedAttempts] = useState({});
  const [decryptingId, setDecryptingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, portData, recData] = await Promise.all([
        getStaffMe(),
        getPortfolios(),
        getStaffRecords()
      ]);
      setMe(userData);
      setPortfolios(portData);
      setRecords(recData);
    } catch (err) {
      console.warn("Could not load staff portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, token]);

  const handleDecrypt = async (record) => {
    setDecryptingId(record.id);
    try {
      const dec = await decryptRecord(record.id);
      setDecryptedRecords(prev => ({ ...prev, [record.id]: dec }));
      setDeniedAttempts(prev => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      return { success: true, data: dec };
    } catch (err) {
      setDeniedAttempts(prev => ({
        ...prev,
        [record.id]: err.message || 'Access Denied: Out of authorized client scope.'
      }));
      return { success: false, error: err };
    } finally {
      setDecryptingId(null);
    }
  };

  return (
    <StaffContext.Provider
      value={{
        me,
        portfolios,
        records,
        decryptedRecords,
        deniedAttempts,
        decryptingId,
        loading,
        handleDecrypt,
        reload: loadData
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (!context) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
}
