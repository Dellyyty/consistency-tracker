import AuthGate from '@/components/AuthGate';
import NavBar from '@/components/NavBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <NavBar />
    </AuthGate>
  );
}
