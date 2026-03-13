// Dummy auth hook - the app doesn't use authentication
// This is only here to satisfy unused LoginScreen/RegisterScreen imports

export const useAuth = () => {
  return {
    login: async (email: string, password: string) => {
      // No-op - app doesn't use authentication
      return Promise.resolve();
    },
    register: async (email: string, password: string, name?: string) => {
      // No-op - app doesn't use authentication
      return Promise.resolve();
    },
    logout: async () => {
      // No-op - app doesn't use authentication
      return Promise.resolve();
    },
    isAuthenticated: true,
    user: null,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Pass through - app doesn't use authentication
  return <>{children}</>;
};