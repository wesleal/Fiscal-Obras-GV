
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InspectionList } from './components/InspectionList';
import { InspectionDetail } from './components/InspectionDetail';
import type { Inspection, User } from './types';
import { InspectionStatus, UserRole } from './types';
import { inspectionService } from './services/inspectionService';
import { NewInspectionModal } from './components/NewInspectionModal';
import { Login } from './components/Login';
import { authService } from './services/authService';
import { UserManagement } from './components/UserManagement';

type View = 'dashboard' | 'list' | 'detail' | 'userManagement';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [view, setView] = useState<View>('dashboard');
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMapApiLoaded, setMapApiLoaded] = useState(false);
    const [initialListFilter, setInitialListFilter] = useState<InspectionStatus | 'all'>('all');

    useEffect(() => {
        const loggedInUser = authService.getCurrentUser();
        if (loggedInUser) {
            setCurrentUser(loggedInUser);
        } else {
            setIsLoading(false); // Stop loading if no user is logged in
        }

        const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (googleMapsApiKey) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setMapApiLoaded(true);
            document.head.appendChild(script);
        } else {
            console.warn("Google Maps API Key not found. Map features will be disabled.");
        }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const data = await inspectionService.getInspections();
        setInspections(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (currentUser) { // Only fetch data if a user is logged in
            fetchData();
        }
    }, [fetchData, currentUser]);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setView('dashboard');
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    const handleSelectInspection = (id: string) => {
        setSelectedInspectionId(id);
        setView('detail');
    };
    
    const handleNavigate = (newView: View, filter: InspectionStatus | 'all' = 'all') => {
        setSelectedInspectionId(null);
        setInitialListFilter(filter);
        setView(newView);
    };

    const handleInspectionUpdated = async () => {
        await fetchData();
        setView('list');
    };
    
    const handleInspectionCreated = async (newInspection: Inspection) => {
        setInspections(prev => [newInspection, ...prev]);
        setIsModalOpen(false);
        setView('list');
    };

    if (!currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-blue"></div></div>;
        }

        switch (view) {
            case 'dashboard':
                return <Dashboard inspections={inspections} onNavigate={handleNavigate} onSelectInspection={handleSelectInspection} />;
            case 'list':
                return <InspectionList inspections={inspections} onSelectInspection={handleSelectInspection} initialFilter={initialListFilter} />;
            case 'detail':
                if (selectedInspectionId) {
                    return <InspectionDetail 
                                inspectionId={selectedInspectionId} 
                                onBack={() => setView('list')} 
                                onInspectionUpdated={handleInspectionUpdated} 
                                isMapApiLoaded={isMapApiLoaded} 
                                currentUser={currentUser} 
                           />;
                }
                return null;
            case 'userManagement':
                 if (currentUser.role === UserRole.ADMIN) {
                    return <UserManagement onBack={() => setView('dashboard')} />;
                }
                return <h4>Acesso Negado</h4>; // Or a more dedicated component
            default:
                return <Dashboard inspections={inspections} onNavigate={handleNavigate} onSelectInspection={handleSelectInspection} />;
        }
    };

    return (
        <div className="min-h-screen bg-brand-gray text-brand-text">
            <Header 
                user={currentUser}
                onNavigate={handleNavigate} 
                onNewInspection={() => setIsModalOpen(true)}
                onLogout={handleLogout}
            />
            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {renderContent()}
            </main>
            {isModalOpen && (
                <NewInspectionModal
                    onClose={() => setIsModalOpen(false)}
                    onInspectionCreated={handleInspectionCreated}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
};

export default App;
