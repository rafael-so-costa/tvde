import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import MotoristaDashboard from "./MotoristaDashboard";
import ProprietarioDashboard from "./ProprietarioDashboard";

const Index = () => {
  const { activeRole } = useAuth();

  if (activeRole === "motorista") {
    return <MotoristaDashboard />;
  }

  if (activeRole === "proprietario") {
    return <ProprietarioDashboard />;
  }

  return <Dashboard />;
};

export default Index;
